import "reflect-metadata";
import express from "express";
import { initializeDatabase, AppDataSource } from "./data-source";
import { StatusCodes } from "http-status-codes";
import { In } from "typeorm";

// Aplikacja Express
const app = express();
const PORT = 3000;

app.use(express.json());

app
  .route("/products")
  .get((req: express.Request, res: express.Response) => {
    AppDataSource.getRepository("Product")
      .find()
      .then(products => {
        res.status(StatusCodes.OK).json(products);
      });
  })
  .post(express.json(), (req: express.Request, res: express.Response) => {
    const newProduct = req.body;
    //Walidacja danych powinna być tutaj
    AppDataSource.getRepository("Product")
      .save(newProduct)
      .then(savedProduct => {
        res.status(StatusCodes.CREATED).json(savedProduct);
      })
      .catch(error => {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error saving product", error: error });
      });
  });

app
  .route("/orders")
  .get((req: express.Request, res: express.Response) => {
    AppDataSource.getRepository("Orders")
      .find({ relations: ["orderItems", "orderItems.product", "orderState"] })
      .then(orders => {
        res.status(StatusCodes.OK).json(orders);
      });
  })
  .post((req: express.Request, res: express.Response) => {
    const newOrder = req.body;

    //Walidacja danych powinna być tutaj
    AppDataSource.getRepository("Orders")
      .save(newOrder)
      .then(savedOrder => {
        res.status(StatusCodes.CREATED).json(savedOrder);
      })
      .catch(error => {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error saving order", error: error });
      });
  });

app.get("/products/:id", (req: express.Request, res: express.Response) => {
  const productId = parseInt(req.params.id, 10);
  AppDataSource.getRepository("Product")
    .findOneBy({ id: productId })
    .then(product => {
      if (product) {
        res.status(StatusCodes.OK).json(product);
      } else {
        res.status(StatusCodes.NOT_FOUND).json({ message: "Product not found" });
      }
    });
});

app.get("/categories", (req: express.Request, res: express.Response) => {
  AppDataSource.getRepository("Category")
    .find()
    .then(category => {
      res.status(StatusCodes.OK).json(category);
    });
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
