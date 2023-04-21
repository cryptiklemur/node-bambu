import { Entity, OneToMany, PrimaryColumn } from 'typeorm';

import { Printer } from './Printer';
import { StatusMessage } from './StatusMessage';
import { Subscription } from './Subscription';

@Entity()
export class Owner {
  @PrimaryColumn('varchar')
  public id: string;

  @OneToMany(() => Printer, (printer) => printer.createdBy)
  public printers: Printer[];

  @OneToMany(() => StatusMessage, (statusMessage) => statusMessage.createdBy)
  public statusMessages: StatusMessage[];

  @OneToMany(() => Subscription, (subscription) => subscription.createdBy)
  public subscription: Subscription[];

  public constructor(id: string) {
    this.id = id;
  }
}
