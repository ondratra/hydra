import { ApiPromise } from '@polkadot/api'
import { assert } from 'chai'
import { transfer, createApi } from './api/substrate-api'
import * as dotenv from 'dotenv'
import Container from 'typedi'
import pWaitFor from 'p-wait-for'
import {
  getProcessorStatus,
} from './api/processor-api'
import { GraphQLClient } from 'graphql-request'
import { SubscriptionClient } from 'graphql-subscriptions-client'
import { subscribeToProcessorStatus } from './api/processor-api'
import dbConfig from '../src/db/ormconfig'
import { Connection, EntityManager, getConnection } from 'typeorm'
import { parseManifest } from '../src/start/manifest'
import { createDBConnection } from '../src/db'
import { TestEntity } from './fixtures/test-entities'
import { ProcessedEventsLogEntity } from '../src/entities/ProcessedEventsLogEntity'

// You need to be connected to a development chain for this example to work.
const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'

const txAmount = 10000

describe('MappingsProcessor', () => {
  const environment = setupEnvironment()

  it('does my little test', async () => {
    console.log('ok aaaa')

    const blockHeight = await transfer(ALICE, BOB, txAmount)
    console.log(blockHeight)

    const db = environment.db.manager

    await waitForProcessorToCatchUp(db, blockHeight)

    const testEntity = await db.findOne(TestEntity, { order: { primaryKey: 'DESC' } })

    assert.isOk(testEntity)

    // this escape from is teoretically not needed, but chai types miss assert guards (available in TS 3.7+)
    if (!testEntity) {
      return
    }

    assert.equal(testEntity.description, '')
  })
})

function setupEnvironment() {
  globalThis.WebSocket = require('ws')

  const environment: {db: Connection} = {
    db: null as any
  }

  before(async () => {
    dotenv.config({ path: __dirname + '/.env' })
    await createApi(process.env.WS_PROVIDER_URI || '')

    environment.db = await synchronizeDb()
  })

  after(async () => {
    const api = Container.get<ApiPromise>('ApiPromise')
    console.log('Disconnecting from the chain')
    await api.disconnect()

    // disconnect db if needed
    if (environment.db) {
      return environment.db.close()
    }
  })

  return environment
}

/*
  Synchronizes DB with entites from both test manifest.
*/
async function synchronizeDb() {
  const manifest = parseManifest(__dirname + '/fixtures/manifest.yml')

  const connection = await createDBConnection(manifest.entities)

  await connection.synchronize()

  return connection
}

async function waitForProcessorToCatchUp(db: EntityManager, blockHeight: number) {
  // wait until the indexer indexes the block and the processor picks it up
  await pWaitFor(async () => {
    try {
      const record = await db.findOne(ProcessedEventsLogEntity, { where: { lastScannedBlock: blockHeight } })

      return !!record
    } catch (error) {
      // catch error thrown if db has not been initialized yet
      return false
    }
  }, { interval: 50 })
}
