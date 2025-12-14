import "reflect-metadata";
import express from "express";
import { initializeDatabase, AppDataSource } from "./data-source";
import { StatusCodes } from "http-status-codes";
import { In } from "typeorm";
import { Category } from "./entity/Category";
import { Product } from "./entity/Product";
import { Orders } from "./entity/Order";
import { OrderItem } from "./entity/OrderItem";

// Aplikacja Express
const app = express();
const PORT = 3000;

app.use(express.json());

app
  .route("/products")
  .get(async (req: express.Request, res: express.Response) => {
    try {
      const products = await AppDataSource
        .getRepository(Product)
        .find();

      res.status(StatusCodes.OK).json(products);
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error fetching products",
        error,
      });
    }
  })

    .post(async (req: express.Request, res: express.Response) => {
    const product = req.body as Product;

    // puste pola
    if (!product.name || product.name.trim() === "") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Nazwa produktu nie może być pusta." });
    }

    if (!product.description || product.description.trim() === "") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Opis produktu nie może być pusty." });
    }

    try {
      const savedProduct = await AppDataSource
        .getRepository(Product)
        .save(product);

      res.status(StatusCodes.CREATED).json(savedProduct);
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error saving product",
        error,
      });
    }
  });

// pobieranie produktu po id
  app.get("/products/:id", async (req: express.Request, res: express.Response) => {
  const productId = parseInt(req.params.id, 10);

  if (isNaN(productId)) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid product ID" });
  }

  try {
    const product = await AppDataSource
      .getRepository(Product)
      .findOneBy({ id: productId });

    if (!product) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Product not found" });
    }

    res.status(StatusCodes.OK).json(product);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error fetching product",
      error,
    });
  }
});

app
  .route("/orders")
  .get((req: express.Request, res: express.Response) => {
    AppDataSource
      .getRepository(Orders)
      .find({
        relations: ["orderItems", "orderItems.product", "orderState"],
      })
      .then(orders => {
        res.status(StatusCodes.OK).json(orders);
      })
      .catch(error => {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          message: "Error fetching orders",
          error,
        });
      });
  })
  .post((req: express.Request, res: express.Response) => {
    const order = req.body as Orders;

    //ilosc elementow w zamowieniu
    if (!order.orderItems || !Array.isArray(order.orderItems) || order.orderItems.length === 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Zamówienie musi zawierać co najmniej jeden element." });
    }

    for (const item of order.orderItems as OrderItem[]) {
      if (!item.product) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Każdy element zamówienia musi mieć produkt." });
      }

      if (
        item.quantity === undefined ||
        typeof item.quantity !== "number" ||
        item.quantity <= 0
      ) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Ilość produktu musi być większa od 0." });
      }
    }

    if (!order.orderState) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Zamówienie musi mieć stan (orderState)." });
    }

    //zapis
    AppDataSource
      .getRepository(Orders)
      .save(order)
      .then(savedOrder => {
        res.status(StatusCodes.CREATED).json(savedOrder);
      })
      .catch(error => {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          message: "Error saving order",
          error,
        });
      });
  });

app.get("/categories", async(req: express.Request, res: express.Response) => {
  try {
    const categories = await AppDataSource
      .getRepository(Category)
      .find();

    res.status(StatusCodes.OK).json(categories);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error fetching categories",
      error,
    });
  }
});

// Asynchroniczna funkcja główna
async function main() {
  try {
    await initializeDatabase();

    // 2. Uruchomienie serwera Express.
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    // Logowanie błędu, jeśli inicjalizacja bazy nie powiedzie się
    console.error("Failed to start server due to database error:", error);
    process.exit(1);
  }
}

// Uruchomienie aplikacji
main();
