import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Printer } from './Printer';
import { Owner } from './Owner';

@Entity()
export class StatusMessage {
  @PrimaryGeneratedColumn('increment')
  public id: number;

  @Column('varchar')
  public channelId: string;

  @Column('varchar')
  public messageId: string;

  @CreateDateColumn()
  public insertDate: Date;

  @ManyToOne(() => Owner, (owner) => owner.statusMessages, { nullable: true })
  public createdBy: Owner | undefined;

  @Column({ type: 'simple-enum', enum: ['permanent', 'semi-permanent', 'subscription'] })
  public type: 'permanent' | 'semi-permanent' | 'subscription';

  @ManyToOne(() => Printer, (printer) => printer.statusMessages, { eager: true })
  public printer: Printer;

  public constructor(init?: Partial<StatusMessage>) {
    Object.assign(this, init);
  }
}
