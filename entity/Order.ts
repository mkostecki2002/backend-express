import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
} from "typeorm";
import { OrderItem } from "./OrderItem";
import { OrderState } from "./OrderState";

//Zamówienie: data zatwierdzenia (data, dopuszczalny null), stan zamówienia (jedno obowiązkowe odniesienie do encji Stan Zamówienia) nazwa użytkownika, email (oba typu tekst), numer telefonu (typu tekst), lista zamówionych towarów wraz z liczbą sztuk każdego towaru (liczby całkowite dodatnie), ceną jednostkową towaru w danym zamówieniu, opcjonalnie: stawka vat, rabat, itp. Należy dodać odpowiednie tabele w bazie danych.

//Stan Zamówienia: nazwa (typu tekst) - predefiniowane w bazie stany: NIEZATWIERDZONE, ZATWIERDZONE, ANULOWANE, ZREALIZOWANE (nazwy można przetłumaczyć na angielski)

@Entity()
export class Orders {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "timestamp", nullable: true })
  approvalDate!: Date | null;

  @Column()
  username!: string;

  @Column()
  email!: string;

  @Column()
  phoneNumber!: string;

  @ManyToOne(() => OrderState, orderState => orderState.name)
  orderState!: OrderState;

  @OneToMany(() => OrderItem, orderItem => orderItem.order, {
    cascade: true,
  })
  orderItems!: OrderItem[];
}
