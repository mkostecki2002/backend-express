import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Category } from "./Category";
import { OrderItem } from "./OrderItem";

//Produkt: nazwa, opis (oba pola to tekst, opis może być w formie HTML), cena jednostkowa, waga jednostkowa (liczby z przecinkiem), kategoria towaru (jedno obowiązkowe odniesienie do encji Kategoria)

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  priceUnit!: number;

  @Column({ type: "float" })
  weightUnit!: number;

  @ManyToOne(() => Category, category => category.name, {
    nullable: false,
    onDelete: "CASCADE",
  })
  category!: Category;
}
