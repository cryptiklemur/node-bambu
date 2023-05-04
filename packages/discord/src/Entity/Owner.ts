import { Entity, OneToMany, PrimaryColumn } from 'typeorm';

import { Printer } from './Printer';
import { StatusMessage } from './StatusMessage';
import { Subscription } from './Subscription';
import { Queue } from './Queue';

@Entity()
export class Owner {
  @PrimaryColumn('varchar')
  public id: string;

  @OneToMany(() => Printer, (printer) => printer.createdBy)
  public printers: Printer[];

  @OneToMany(() => StatusMessage, (statusMessage) => statusMessage.createdBy)
  public statusMessages: StatusMessage[];

  @OneToMany(() => Subscription, (subscription) => subscription.createdBy)
  public subscriptions: Subscription[];

  @OneToMany(() => Queue, (queue) => queue.createdBy)
  public queues: Queue[];

  public constructor(id: string) {
    this.id = id;
  }

  public toString() {
    return this.id;
  }
}
