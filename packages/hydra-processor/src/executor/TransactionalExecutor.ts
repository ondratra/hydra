import { getConnection, EntityManager } from 'typeorm'
import { getConfig as conf } from '../start/config'
import Debug from 'debug'
import { info } from '../util/log'
import { BlockData } from '../queue'
import { getDeterministicIdManager, getMappingsLookup, IMappingExecutor } from '.'
import { IMappingsLookup } from './IMappingsLookup'
import {
  DeepPartial,
  FindOneOptions,
  DatabaseManager,
} from '@joystream/hydra-common'
import { TxAwareBlockContext } from './tx-aware'
import { DeterministicIdManager } from './DeterministicIdManager'

const debug = Debug('hydra-processor:mappings-executor')

export class TransactionalExecutor implements IMappingExecutor {
  private mappingsLookup!: IMappingsLookup
  private deterministicIdManager!: DeterministicIdManager

  // "expose" transaction EntityManager to tests (is meant to be read despite being private)
  private entityManager: EntityManager | null = null

  async init(): Promise<void> {
    info('Initializing mappings executor')
    this.mappingsLookup = await getMappingsLookup()
    this.deterministicIdManager = await getDeterministicIdManager()
  }

  async executeBlock(
    blockData: BlockData,
    onSuccess: (data: BlockData) => Promise<void>,
  ): Promise<void> {
    await getConnection().transaction(async (entityManager: EntityManager) => {
      this.entityManager = entityManager

      const allMappings = this.mappingsLookup.lookupHandlers(blockData)
      if (conf().VERBOSE)
        debug(
          `Mappings for block ${blockData.block.id}: ${JSON.stringify(
            allMappings,
            null,
            2
          )}`
        )

      const { pre, post, mappings } = allMappings

      const store = makeDatabaseManager(entityManager, blockData)

      for (const hook of pre) {
        await this.mappingsLookup.call(hook, {
          ...blockData,
          store,
        })
      }

      let i = 0
      for (const mapping of mappings) {
        const { event } = blockData.events[i]
        debug(`Processing event ${event.id}`)

        if (conf().VERBOSE) debug(`JSON: ${JSON.stringify(event, null, 2)}`)

        const ctx = {
          ...blockData,
          event,
          store,
          extrinsic: event.extrinsic,
        }

        await this.mappingsLookup.call(mapping, ctx)
        i++

        debug(`Event ${event.id} done`)
      }

      for (const hook of post) {
        await this.mappingsLookup.call(hook, { ...blockData, store })
      }

      await onSuccess({ ...blockData, entityManager } as TxAwareBlockContext)

      // ensure deterministic id state is saved inside of transaction
      await this.deterministicIdManager.save()

      this.entityManager = null
    })
  }
}

/**
 * Create database manager.
 * @param entityManager EntityManager
 */
export function makeDatabaseManager(
  entityManager: EntityManager,
  blockData: BlockData,
): DatabaseManager {
  return {
    save: async <T>(entity: DeepPartial<T>): Promise<void> => {
      entity = await fillRequiredWarthogFields(entity, blockData)

      await entityManager.save(entity)
    },
    remove: async <T>(entity: DeepPartial<T>): Promise<void> => {
      await entityManager.remove(entity)
    },
    get: async <T>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entity: { new (...args: any[]): T },
      options: FindOneOptions<T>
    ): Promise<T | undefined> => {
      return await entityManager.findOne(entity, options)
    },
    getMany: async <T>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entity: { new (...args: any[]): T },
      options: FindOneOptions<T>
    ): Promise<T[]> => {
      return await entityManager.find(entity, options)
    },
  } as DatabaseManager
}

/**
 * Fixes compatibility between typeorm and warthog models.
 *
 * @tutorial Warthog add extra properties to its BaseModel and some of these properties are
 * required. This function mutate the entity to make it compatible with warthog models.
 * Warthog throw error if required properties contains null values.
 *
 * @param entity: DeepPartial<T>
 */
async function fillRequiredWarthogFields<T>(
  entity: DeepPartial<T>,
  { block }: BlockData,
): Promise<DeepPartial<T>> {
  let deterministicId = !entity.hasOwnProperty('id') || !entity.hasOwnProperty('createdById')
    ? await (await getDeterministicIdManager()).generateNextId()
    : 0 // value doesn't matter in this case as it will never be used

  // eslint-disable-next-line no-prototype-builtins
  if (!entity.hasOwnProperty('id')) {
    Object.assign(entity, { id: deterministicId })
  }
  // eslint-disable-next-line no-prototype-builtins
  if (!entity.hasOwnProperty('createdById')) {
    Object.assign(entity, { createdById: deterministicId })
  }
  // eslint-disable-next-line no-prototype-builtins
  if (!entity.hasOwnProperty('version')) {
    Object.assign(entity, { version: 1 })
  }

  // set createdAt to the block timestamp if not set
  if (
    // eslint-disable-next-line no-prototype-builtins
    !entity.hasOwnProperty('createdAt') ||
    (entity as { createdAt: unknown }).createdAt === undefined
  ) {
    Object.assign(entity, {
      createdAt: new Date(block.timestamp),
    })
  }

  // set updatedAt to the block timestamp if not set
  if (
    // eslint-disable-next-line no-prototype-builtins
    !entity.hasOwnProperty('updatedAt') ||
    (entity as { updatedAt: unknown }).updatedAt === undefined
  ) {
    Object.assign(entity, {
      updatedAt: new Date(block.timestamp),
    })
  }

  return entity
}
