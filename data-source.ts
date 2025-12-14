import { DataSource } from "typeorm";
import { Product } from "./entity/Product";
import { Orders } from "./entity/Order";
import { Category, CategoryName } from "./entity/Category";
import { OrderItem } from "./entity/OrderItem";
import { OrderState, OrderStateName } from "./entity/OrderState";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "mydb",
  entities: [Product, Category, Orders, OrderItem, OrderState],
  logging: true,
  synchronize: true,
});

// Funkcja do inicjalizacji
export async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    console.log("Data Source has been initialized!");
    //Zakomentowane, zeby nie dodawalo danych przy kazdym uruchomieniu albo zmianie w kodzie
    // await fillDatabase();
  } catch (error) {
    console.error("Error during Data Source initialization", error);
    throw error;
  }
}

async function fillDatabase() {
  const categoryRepo = AppDataSource.getRepository(Category);
  const statusRepo = AppDataSource.getRepository(OrderState);
  const productRepo = AppDataSource.getRepository(Product);
  const orderRepo = AppDataSource.getRepository(Orders);
  const orderItemRepo = AppDataSource.getRepository(OrderItem);

  // Czyszczenie tabel przed dodaniem danych
  orderItemRepo.query(`DELETE FROM "order_item";`);
  orderRepo.query(`DELETE FROM "orders";`);
  productRepo.query(`DELETE FROM "product";`);
  statusRepo.query(`DELETE FROM "order_state";`);
  categoryRepo.query(`DELETE FROM "category";`);

  // --- 1. Dodawanie KATEGORII ---
  let electronicsCategory: Category | null = null;
  for (const name of Object.values(CategoryName)) {
    let category = await categoryRepo.findOneBy({ name: name });
    if (!category) {
      category = await categoryRepo.save({ name: name });
    }
    if (name === CategoryName.Electronics) {
      electronicsCategory = category;
    }
  }

  // --- 2. Dodawanie STANÓW ZAMÓWIENIA ---
  const statuses: { [key in OrderStateName]?: OrderState } = {};
  for (const name of Object.values(OrderStateName)) {
    let status = await statusRepo.findOneBy({ name: name });
    if (!status) {
      status = await statusRepo.save({ name: name });
    }
    statuses[name] = status;
  }

  // --- 3. Dodawanie PRZYKŁADOWYCH PRODUKTÓW ---
  let laptop: Product | null = null;
  let mouse: Product | null = null;

  if (electronicsCategory) {
    laptop = await productRepo.findOneBy({ name: "Laptop Business Pro" });
    if (!laptop) {
      laptop = await productRepo.save({
        name: "Laptop Business Pro",
        description: "Potężny laptop do pracy biurowej i zdalnej.",
        priceUnit: 1500.0,
        weightUnit: 1.85,
        category: electronicsCategory,
      });
    }
    mouse = await productRepo.findOneBy({ name: "Mysz Bezprzewodowa Pro" });
    if (!mouse) {
      mouse = await productRepo.save({
        name: "Mysz Bezprzewodowa Pro",
        description: "Ergonomiczna mysz laserowa.",
        priceUnit: 75.5,
        weightUnit: 0.1,
        category: electronicsCategory,
      });
    }
  }

  // --- 4. Dodawanie PRZYKŁADOWEGO ZAMÓWIENIA ---
  if (statuses[OrderStateName.Confirmed] && laptop && mouse) {
    // Po wyczyszczeniu tabel tworzymy nowe zamówienie
    const newOrder = new Orders();
    newOrder.username = "Anna Nowak";
    newOrder.email = "anna.nowak@example.com";
    newOrder.phoneNumber = "987654321";
    newOrder.orderState = statuses[OrderStateName.Confirmed]!;
    newOrder.approvalDate = new Date();

    newOrder.orderItems = [
      {
        product: laptop,
        quantity: 1,
        unitPrice: 1500.0,
        discount: null,
      } as OrderItem,
      {
        product: mouse,
        quantity: 3,
        unitPrice: 75.5,
        discount: 0.15,
      } as OrderItem,
    ];

    await orderRepo.save(newOrder);
    console.log("Przykładowe zamówienie zostało zapisane (Anna Nowak).");
  }

  console.log("Seedowanie zakończone pomyślnie!");
}
