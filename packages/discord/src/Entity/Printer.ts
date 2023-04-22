import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { StatusMessage } from './StatusMessage';
import { Subscription } from './Subscription';
import { Owner } from './Owner';

@Entity()
@Unique('name', ['name'])
@Unique('host-and-port', ['host', 'port'])
@Unique('serialNumber', ['serialNumber'])
export class Printer {
  @PrimaryGeneratedColumn('increment')
  public id: number;

  @Column('varchar')
  public name: string;

  @CreateDateColumn()
  public insertDate: Date;

  @UpdateDateColumn()
  public updateDate: Date;

  @ManyToOne(() => Owner, (owner) => owner.printers)
  public createdBy: Owner;

  @Column('varchar')
  public host: string;

  @Column('smallint')
  public port: number;

  @Column('varchar')
  public serialNumber: string;

  @Column('varchar')
  public token: string;

  @Column('varchar')
  public streamUrl: string;

  @Column('varchar', { nullable: true })
  public iconUrl: string | undefined;

  @OneToMany(() => StatusMessage, (statusMessage) => statusMessage.printer)
  public statusMessages: StatusMessage[];

  @OneToMany(() => Subscription, (subscription) => subscription.printer)
  public subscriptions: Subscription[];

  @ManyToMany(() => Owner)
  @JoinTable()
  public owners: Owner[];

  public constructor(init?: Partial<Printer>) {
    Object.assign(this, init);
  }
}