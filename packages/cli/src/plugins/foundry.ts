import dedent from 'dedent'
import { execa, execaCommandSync } from 'execa'
import { fdir } from 'fdir'
import { default as fs } from 'fs-extra'

import { basename, extname, join, resolve } from 'pathe'
import pc from 'picocolors'
import { z } from 'zod'

import type { ContractConfig, Plugin } from '../config.js'
import * as logger from '../logger.js'
import type { Compute, RequiredBy } from '../types.js'

export const foundryDefaultExcludes = [
  'Base.sol/**',
  'Common.sol/**',
  'Components.sol/**',
  'IERC165.sol/**',
  'IERC20.sol/**',
  'IERC721.sol/**',
  'IMulticall2.sol/**',
  'MockERC20.sol/**',
  'MockERC721.sol/**',
  'Script.sol/**',
  'StdAssertions.sol/**',
  'StdChains.sol/**',
  'StdCheats.sol/**',
  'StdError.sol/**',
  'StdInvariant.sol/**',
  'StdJson.sol/**',
  'StdMath.sol/**',
  'StdStorage.sol/**',
  'StdStyle.sol/**',
  'StdToml.sol/**',
  'StdUtils.sol/**',
  'Test.sol/**',
  'Vm.sol/**',
  'build-info/**',
  'console.sol/**',
  'console2.sol/**',
  'safeconsole.sol/**',
  '**.s.sol/*.json',
  '**.t.sol/*.json',
]

export type FoundryConfig = {
  /**
   * Project's artifacts directory.
   *
   * Same as your project's `--out` (`-o`) option.
   *
   * @default foundry.config#out | 'out'
   */
  artifacts?: string | undefined
  /**
   * Mapping of addresses to attach to artifacts.
   * Can be either a single address or a chain-id mapped address
   */
  deployments?:
    | {
        [contractName: string]:
          | ContractConfig['address']
          | Record<string, ContractConfig['address']>
      }
    | undefined
  /** Artifact files to exclude. */
  exclude?: string[] | undefined
  /** [Forge](https://book.getfoundry.sh/forge) configuration */
  forge?:
    | {
        /**
         * Remove build artifacts and cache directories on start up.
         *
         * @default false
         */
        clean?: boolean | undefined
        /**
         * Build Foundry project before fetching artifacts.
         *
         * @default true
         */
        build?: boolean | undefined
        /**
         * Path to `forge` executable command
         *
         * @default "forge"
         */
        path?: string | undefined
        /**
         * Rebuild every time a watched file or directory is changed.
         *
         * @default true
         */
        rebuild?: boolean | undefined
      }
    | undefined
  /** Artifact files to include. */
  include?: string[] | undefined
  /** Optional prefix to prepend to artifact names. */
  namePrefix?: string | undefined
  /** Path to foundry project. */
  project?: string | undefined
}

type FoundryResult = Compute<
  RequiredBy<Plugin, 'contracts' | 'validate' | 'watch'>
>

const FoundryConfigSchema = z.object({
  out: z.string().default('out'),
  src: z.string().default('src'),
})

/** Resolves ABIs from [Foundry](https://github.com/foundry-rs/foundry) project. */
export function foundry(config: FoundryConfig = {}): FoundryResult {
  const {
    artifacts,
    deployments = {},
    exclude = foundryDefaultExcludes,
    forge: {
      clean = false,
      build = true,
      path: forgeExecutable = 'forge',
      rebuild = true,
    } = {},
    include = ['*.json'],
    namePrefix = '',
  } = config

  function getContractName(artifactPath: string, usePrefix = true) {
    const filename = basename(artifactPath)
    const extension = extname(artifactPath)
    return `${usePrefix ? namePrefix : ''}${filename.replace(extension, '')}`
  }

  async function getContract(
    artifactPath: string,
  ): Promise<ContractConfig | ContractConfig[]> {
    const artifact = await fs.readJSON(artifactPath)
    const baseName = getContractName(artifactPath, false)
    const deployment = deployments[baseName]

    // Check if ABI exists and is an array
    if (!artifact.abi || !Array.isArray(artifact.abi)) {
      return {
        abi: [],
        address: deployment as ContractConfig['address'],
        name: getContractName(artifactPath),
      }
    }

    // Sort ABI to ensure consistent order
    const sortedAbi = [...artifact.abi].sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type)
      if ('name' in a && 'name' in b) return a.name.localeCompare(b.name)
      return 0
    })

    // Handle case where deployment is a record of multiple addresses
    if (
      deployment &&
      typeof deployment === 'object' &&
      !('address' in deployment)
    ) {
      // Create separate contracts for each deployment address
      const contracts: ContractConfig[] = []
      for (const [key, address] of Object.entries(deployment)) {
        contracts.push({
          abi: sortedAbi,
          address: address as ContractConfig['address'],
          name: `${baseName}_${key}`,
        })
      }
      return contracts
    }

    // Handle single address case
    return {
      abi: sortedAbi,
      address: deployment as ContractConfig['address'],
      name: getContractName(artifactPath),
    }
  }

  function getArtifactPaths(artifactsDirectory: string) {
    const crawler = new fdir().withBasePath().globWithOptions(
      include.map((x) => `${artifactsDirectory}/**/${x}`),
      {
        dot: true,
        ignore: exclude.map((x) => `${artifactsDirectory}/**/${x}`),
      },
    )
    return crawler.crawl(artifactsDirectory).withPromise()
  }

  const project = resolve(process.cwd(), config.project ?? '')

  let foundryConfig: z.infer<typeof FoundryConfigSchema> = {
    out: 'out',
    src: 'src',
  }
  try {
    foundryConfig = FoundryConfigSchema.parse(
      JSON.parse(
        execaCommandSync(`${forgeExecutable} config --json --root ${project}`)
          .stdout,
      ),
    )
  } catch {
  } finally {
    foundryConfig = {
      ...foundryConfig,
      out: artifacts ?? foundryConfig.out,
    }
  }

  const artifactsDirectory = join(project, foundryConfig.out)

  return {
    async contracts() {
      if (clean) await execa(forgeExecutable, ['clean', '--root', project])
      if (build) await execa(forgeExecutable, ['build', '--root', project])
      if (!fs.pathExistsSync(artifactsDirectory))
        throw new Error('Artifacts not found.')

      const artifactPaths = await getArtifactPaths(artifactsDirectory)
      const contracts = []
      for (const artifactPath of artifactPaths) {
        const result = await getContract(artifactPath)
        if (Array.isArray(result)) {
          // Handle multiple contracts case
          for (const contract of result) {
            if (!contract.abi?.length) continue
            contracts.push(contract)
          }
        } else {
          // Handle single contract case
          if (!result.abi?.length) continue
          contracts.push(result)
        }
      }
      return contracts
    },
    name: 'Foundry',
    async validate() {
      // Check that project directory exists
      if (!(await fs.pathExists(project)))
        throw new Error(`Foundry project ${pc.gray(config.project)} not found.`)

      // Ensure forge is installed
      if (clean || build || rebuild)
        try {
          await execa(forgeExecutable, ['--version'])
        } catch (_error) {
          throw new Error(dedent`
            forge must be installed to use Foundry plugin.
            To install, follow the instructions at https://book.getfoundry.sh/getting-started/installation
          `)
        }
    },
    watch: {
      command: rebuild
        ? async () => {
            logger.log(
              `${pc.magenta('Foundry')} Watching project at ${pc.gray(
                project,
              )}`,
            )
            const subprocess = execa(forgeExecutable, [
              'build',
              '--watch',
              '--root',
              project,
            ])
            subprocess.stdout?.on('data', (data) => {
              process.stdout.write(`${pc.magenta('Foundry')} ${data}`)
            })

            process.once('SIGINT', shutdown)
            process.once('SIGTERM', shutdown)
            function shutdown() {
              subprocess?.cancel()
            }
          }
        : undefined,
      paths: [
        ...include.map((x) => `${artifactsDirectory}/**/${x}`),
        ...exclude.map((x) => `!${artifactsDirectory}/**/${x}`),
      ],
      async onAdd(path): Promise<ContractConfig | undefined> {
        const result = await getContract(path)
        return Array.isArray(result) ? result[0] : result
      },
      async onChange(path): Promise<ContractConfig | undefined> {
        const result = await getContract(path)
        return Array.isArray(result) ? result[0] : result
      },
      async onRemove(path): Promise<string | undefined> {
        return getContractName(path)
      },
    },
  }
}
