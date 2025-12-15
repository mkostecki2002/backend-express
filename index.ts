import "reflect-metadata";
import express, { Request, Response } from "express";
import "./controllers/OrderController";
import ProductController from "./controllers/ProductController";
import OrderController from "./controllers/OrderController";
import AuthController from "./controllers/AuthController";
import { initializeDatabase, AppDataSource } from "./data-source";
import { StatusCodes } from "http-status-codes";
import { Category } from "./entity/Category";

// Aplikacja Express
const app = express();
const PORT = 3000;

app.use(express.json());

app.use("/orders", OrderController);
app.use("/products", ProductController);
app.use("/", AuthController);

//Kategorie
app.get("/categories", async (req: Request, res: Response) => {
  try {
    const categories = await AppDataSource.getRepository(Category).find();

    res.status(StatusCodes.OK).json(categories);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error fetching categories",
      error,
    });
  }
});

// Jeszcze trzeba poprawic
// app.post(
//   "/init",
//   requireRole(UserRole.Admin),
//   async (req: Request, res: Response) => {
//     try {
//       const product = await AppDataSource.getRepository(Product).find();
//       if (product) {
//         return res
//           .status(StatusCodes.CONFLICT)
//           .json({ message: "Products are already in database" });
//       }
//       return res
//         .status(StatusCodes.OK)
//         .json({ message: "Database initialized successfully" });
//     } catch (error) {
//       res
//         .status(StatusCodes.INTERNAL_SERVER_ERROR)
//         .json({ message: "Error initializing database", error });
//     }
//   }
// );

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
