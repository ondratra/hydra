import spies from 'chai-spies'
import chai from 'chai'
import { transfer } from './api/substrate-api'

chai.use(spies)

const sandbox = chai.spy.sandbox()

// You need to be connected to a development chain for this example to work.
const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'

const txAmount1 = 232323

describe('MappingsProcessor', () => {
  afterEach(() => {
    sandbox.restore()
  })

  it('does my little test', () => {
    console.log('ok aaaa')
  })
})
