import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Orders } from "./Order";
import { Product } from "./Product";

@Entity()
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  quantity!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  unitPrice!: number;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  discount!: number | null;

  @ManyToOne(() => Orders, order => order.id, {
    nullable: false,
    onDelete: "CASCADE",
  })
  order!: Orders;

  @ManyToOne(() => Product, product => product.id, {
    nullable: false,
    onDelete: "CASCADE",
  })
  product!: Product;
}
