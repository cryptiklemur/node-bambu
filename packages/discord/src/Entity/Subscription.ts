import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Printer } from './Printer';
import { Owner } from './Owner';

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn('increment')
  public id: number;

  @Column('varchar')
  public channelId: string;

  @CreateDateColumn()
  public insertDate: Date;

  @ManyToOne(() => Owner, (owner) => owner.subscriptions)
  public createdBy: Owner;

  @ManyToOne(() => Printer, (printer) => printer.subscriptions, { eager: true })
  public printer: Printer;

  public constructor(init?: Partial<Subscription>) {
    Object.assign(this, init);
  }
}
