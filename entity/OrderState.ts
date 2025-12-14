import { Entity, PrimaryColumn } from "typeorm";

export enum OrderStateName {
  Unconfirmed = "UNCONFIRMED",
  Confirmed = "CONFIRMED",
  Cancelled = "CANCELLED",
  Completed = "COMPLETED",
}

@Entity()
export class OrderState {
  @PrimaryColumn()
  name!: OrderStateName;
}
