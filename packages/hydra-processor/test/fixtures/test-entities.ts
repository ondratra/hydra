import { Entity, PrimaryGeneratedColumn, PrimaryColumn, Column, BaseEntity } from 'typeorm'
import { IDType } from 'warthog'

import 'reflect-metadata'

/*
    Entity without a particular use that can be used in mapping tests.
*/
@Entity()
export class TestEntity extends BaseEntity {

    @PrimaryGeneratedColumn()
    primaryKey!: IDType;

    @Column()
    id!: string;

    @Column()
    description!: string

    @Column()
    alternativeDescription?: string

    constructor(init?: Partial<TestEntity>) {
        super()
        Object.assign(this, init)
    }
}
