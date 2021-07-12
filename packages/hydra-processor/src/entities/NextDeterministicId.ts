import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

@Entity()
export class NextDeterministicId {
  @PrimaryGeneratedColumn()
  id!: number

  // next sequential identifier; used to create unique ids
  @Column()
  nextId!: string
}
