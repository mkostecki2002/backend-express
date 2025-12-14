import "reflect-metadata";
import express from "express";
import { initializeDatabase, AppDataSource } from "./data-source";

// Aplikacja Express
const app = express();
const PORT = 3000;

app
  .route("/products")
  .get((req: express.Request, res: express.Response) => {
    AppDataSource.getRepository("Product")
      .find()
      .then(products => {
        res.json(products);
      });
  })
  .post(express.json(), (req: express.Request, res: express.Response) => {
    const newProduct = req.body;
    //Walidacja danych powinna być tutaj
    AppDataSource.getRepository("Product")
      .save(newProduct)
      .then(savedProduct => {
        //MAGIC NUMBERS
        res.status(201).json(savedProduct);
      })
      .catch(error => {
        //MAGIC NUMBERS
        res.status(500).json({ message: "Error saving product", error: error });
      });
  });

app
  .route("/orders")
  .get((req: express.Request, res: express.Response) => {
    AppDataSource.getRepository("Orders")
      .find({ relations: ["orderItems", "orderItems.product", "orderState"] })
      .then(orders => {
        res.json(orders);
      });
  })
  .post((req: express.Request, res: express.Response) => {
    const newOrder = req.body;

    //Walidacja danych powinna być tutaj
    AppDataSource.getRepository("Orders")
      .save(newOrder)
      .then(savedOrder => {
        //MAGIC NUMBERS
        res.status(201).json(savedOrder);
      })
      .catch(error => {
        //MAGIC NUMBERS
        res.status(500).json({ message: "Error saving order", error: error });
      });
  });

app.get("/products/:id", (req: express.Request, res: express.Response) => {
  const productId = parseInt(req.params.id, 10);
  AppDataSource.getRepository("Product")
    .findOneBy({ id: productId })
    .then(product => {
      if (product) {
        res.json(product);
      } else {
        //Magic Numbers do zmiany
        res.status(404).json({ message: "Product not found" });
      }
    });
});

app.get("/categories", (req: express.Request, res: express.Response) => {
  AppDataSource.getRepository("Category")
    .find()
    .then(category => {
      res.json(category);
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
