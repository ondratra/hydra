import { EntityManager } from 'typeorm'
import { NextDeterministicId } from '../entities'

/*
  Manager for creating unique and deterministic ids used mainly for entities' identifiers.
  It can be used to minimize the number of reads and write from/to the database.
*/
export class DeterministicIdManager {
  private db: EntityManager
  private record?: NextDeterministicId

  constructor(db: EntityManager) {
    this.db = db
  }

  /*
    Loads the next id value from the database.
  */
  private async init(): Promise<void> {
    let record = await this.db.findOne(NextDeterministicId)

    // ensure record in db
    if (!record) {
      const newRecord = new NextDeterministicId()
      newRecord.id = 1 // this value doesn't matter because there will only be 1 record ever
      newRecord.nextId = BigInt(1).toString()

      record = await this.db.save<NextDeterministicId>(newRecord)
    }

    this.record = record
  }

  /*
    Returns the next id and increments the internal counter.
    Loads the state from db if not loaded already.
  */
  async generateNextId(): Promise<string> {
    if (!this.record) {
      await this.init()
    }

    // remember next id
    const result: string = (this.record as NextDeterministicId).nextId

    // increase next id counter
    ; (this.record as NextDeterministicId).nextId = (BigInt(result) + BigInt(1)).toString()

    return result
  }

  /*
    Saves current internal counter to database.
  */
  async save() {
    if (!this.record) {
      return // nothing to be saved as nextId hasn't been changed
    }

    await this.db.save<NextDeterministicId>(this.record)
  }
}
