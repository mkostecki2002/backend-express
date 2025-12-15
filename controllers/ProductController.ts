import { Request, Response, Router } from "express";
import { AppDataSource } from "../data-source";
import { StatusCodes } from "http-status-codes";
import { Product } from "../entity/Product";

const router = Router();
const productRepository = AppDataSource.getRepository(Product);

//Produkty
router
  .route("/")
  .get(async (req: Request, res: Response) => {
    try {
      const products = await productRepository.find();

      res.status(StatusCodes.OK).json(products);
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error fetching products",
        error,
      });
    }
  })

  .post(async (req: Request, res: Response) => {
    const product = req.body as Product;

    //puste pole nazwa
    if (!product.name || product.name.trim() === "") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Nazwa produktu nie może być pusta." });
    }

    //puste pole opis
    if (!product.description || product.description.trim() === "") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Opis produktu nie może być pusty." });
    }

    //walidacja ceny
    if (
      product.priceUnit === undefined ||
      typeof product.priceUnit !== "number" ||
      product.priceUnit <= 0
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Cena produktu musi być liczbą większą od 0." });
    }

    //walidacja wagi
    if (
      product.weightUnit === undefined ||
      typeof product.weightUnit !== "number" ||
      product.weightUnit <= 0
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Waga produktu musi być liczbą większą od 0." });
    }

    try {
      const savedProduct = await productRepository.save(product);

      res.status(StatusCodes.CREATED).json(savedProduct);
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error saving product",
        error,
      });
    }
  });

//pobieranie produktu po id
router.get("/products/:id", async (req: Request, res: Response) => {
  const productId = parseInt(req.params.id, 10);

  if (isNaN(productId)) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid product ID" });
  }

  try {
    const product = await productRepository.findOneBy({
      id: productId,
    });

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

//aktualizacja produktu
router.put("/products/:id", async (req: Request, res: Response) => {
  const productId = parseInt(req.params.id, 10);

  if (isNaN(productId)) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid product ID" });
  }

  try {
    const existingProduct = await productRepository.findOneBy({
      id: productId,
    });

    if (!existingProduct) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Product not found" });
    }

    const updatedData = req.body as Partial<Product>;

    if (
      updatedData.name !== undefined &&
      (typeof updatedData.name !== "string" || updatedData.name.trim() === "")
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Nazwa produktu nie może być pusta." });
    }

    if (
      updatedData.description !== undefined &&
      (typeof updatedData.description !== "string" ||
        updatedData.description.trim() === "")
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Opis produktu nie może być pusty." });
    }

    //walidacja zmiana ceny
    if (
      updatedData.priceUnit !== undefined &&
      (typeof updatedData.priceUnit !== "number" || updatedData.priceUnit <= 0)
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Cena produktu musi być liczbą większą od 0." });
    }

    //walidacja zmiana wagi
    if (
      updatedData.weightUnit !== undefined &&
      (typeof updatedData.weightUnit !== "number" ||
        updatedData.weightUnit <= 0)
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Waga produktu musi być liczbą większą od 0." });
    }

    const updatedProduct = productRepository.merge(
      existingProduct,
      updatedData
    );
    await productRepository.save(updatedProduct);

    res.status(StatusCodes.OK).json(updatedProduct);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error updating product",
      error,
    });
  }
});

export default router;
