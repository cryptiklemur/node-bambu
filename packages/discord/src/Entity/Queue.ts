import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

import { Owner } from './Owner';
import { QueueItem } from './QueueItem';

@Entity()
@Unique('name', ['name'])
export class Queue {
  @PrimaryGeneratedColumn('increment')
  public id: number;

  @Column('varchar')
  public name: string;

  @Column('text')
  public description: string;

  @OneToMany(() => QueueItem, (item) => item.queue, { eager: true, cascade: ['remove'] })
  public items: QueueItem[] | undefined;

  @Column('varchar', { nullable: true })
  public channel: string | undefined;

  @Column('varchar', { nullable: true })
  public message: string | undefined;

  @CreateDateColumn()
  public insertDate: Date;

  @UpdateDateColumn()
  public updateDate: Date;

  @ManyToOne(() => Owner, (owner) => owner.queues)
  public createdBy: Owner;

  public constructor(init?: Partial<Queue>) {
    Object.assign(this, init);
  }
}
