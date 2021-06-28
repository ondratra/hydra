import { ApiPromise } from '@polkadot/api'
import spies from 'chai-spies'
import chai from 'chai'
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

chai.use(spies)

//const sandbox = chai.spy.sandbox()

// You need to be connected to a development chain for this example to work.
const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'

const txAmount = 10000

describe('MappingsProcessor', () => {
  setupEnvironment()

  it('does my little test', async () => {
    console.log('ok aaaa')

    const blockHeight = await transfer(ALICE, BOB, txAmount)
    console.log(blockHeight)

    await waitForProcessorToCatchUp(blockHeight)
  })
})

function setupEnvironment() {
  globalThis.WebSocket = require('ws')

  before(async () => {
    dotenv.config({ path: __dirname + '/.env' })
    await createApi(process.env.WS_PROVIDER_URI || '')

    initProcessor()
  })

  after(async () => {
    const api = Container.get<ApiPromise>('ApiPromise')
    console.log('Disconnecting from the chain')
    await api.disconnect()

    Container.get<SubscriptionClient>('SubscriptionClient').close()
  })

  //afterEach(() => {
  //  sandbox.restore()
  //})
}

function initProcessor() {
console.log('-----aaaa', process.env.PROCESSOR_ENDPOINT_URL)
  Container.set(
    'ProcessorClient',
    new GraphQLClient(process.env.PROCESSOR_ENDPOINT_URL || '')
  )

  Container.set(
    'SubscriptionClient',
    new SubscriptionClient(process.env.PROCESSOR_ENDPOINT_URL || '', {
      reconnect: true,
      lazy: false,
      connectionCallback: (error) => {
        error && console.error(error)
      },
    })
  )
console.log('Subscribing to processor status')
  subscribeToProcessorStatus()
}

async function waitForProcessorToCatchUp(blockHeight: number) {
  // wait until the indexer indexes the block and the processor picks it up
  await pWaitFor(
    async () => {
      console.log('Waiting for processor to catch up')
      const currentBlock = (await getProcessorStatus()).lastCompleteBlock

      console.log('Current block:', currentBlock, 'target block: ', blockHeight)

      return (
        currentBlock > blockHeight.valueOf()
      )
    },
    { interval: 50 }
  )
  console.log(`The processor processed block ${blockHeight}`)
}