import { SubstrateEvent, DatabaseManager } from '@joystream/hydra-common'
import { TestEntity } from './test-entities'

/* eslint-disable */
export async function balances_Transfer(db: DatabaseManager, event: SubstrateEvent) {

  await tryToSaveNullCharacter(db)
  console.log('Here')

  throw 'niiiice'
}

export async function balances_TransferCall() {
  console.log('Here')
}

export async function handleSudoEvent() {}
export async function handleSudoCall() {}
export async function preBlockHook1(aaa: any, bbb: any) {
  console.log(aaa,bbb)
  console.log('preBlockHook1')
}
export async function preBlockHook2() {}
export async function postBlockHook1() {}
export async function postBlockHook2() {}

async function tryToSaveNullCharacter(db: DatabaseManager) {
  const nullCharacter = '\0'

  const testEntity = new TestEntity({
      //description: "asdfasdf",
      description: nullCharacter,
  })

  await db.save<TestEntity>(testEntity)
}