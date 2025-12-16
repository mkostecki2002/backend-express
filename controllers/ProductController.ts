import { NextFunction, Request, Response, Router } from "express";
import { AppDataSource } from "../data-source";
import { StatusCodes } from "http-status-codes";
import { Product } from "../entity/Product";
import { generateSeoDesc } from "../services/SeoDescService";
import { parse } from "csv-parse/sync";

const router = Router();
const productRepository = AppDataSource.getRepository(Product);

export const validateSingleProduct = (
  product: Partial<Product>
): string | null => {
  if (!product.name || product.name.trim() === "")
    return "Product name cannot be empty.";
  if (!product.description || product.description.trim() === "")
    return "Product description cannot be empty.";
  if (
    product.priceUnit === undefined ||
    typeof product.priceUnit !== "number" ||
    product.priceUnit <= 0
  )
    return "Product price must be greater than 0.";
  if (
    product.weightUnit === undefined ||
    typeof product.weightUnit !== "number" ||
    product.weightUnit <= 0
  )
    return "Product weight must be greater than 0.";
  return null;
};

const validateProductMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error = validateSingleProduct(req.body);
  if (error)
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error });
  next();
};

export const validateProductsArray = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const products: Partial<Product>[] = Array.isArray(req.body)
    ? req.body
    : parse(req.body);

  for (const p of products) {
    const error = validateSingleProduct(p);
    if (error) return res.status(400).json({ message: error });
  }

  next();
};

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

  .post(validateProductMiddleware, async (req: Request, res: Response) => {
    const product = req.body as Product;
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
router.get("/:id", async (req: Request, res: Response) => {
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
router.put("/:id", async (req: Request, res: Response) => {
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
        .json({ message: "Product name cannot be empty." });
    }

    if (
      updatedData.description !== undefined &&
      (typeof updatedData.description !== "string" ||
        updatedData.description.trim() === "")
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Product description cannot be empty." });
    }

    //walidacja zmiana ceny
    if (
      updatedData.priceUnit !== undefined &&
      (typeof updatedData.priceUnit !== "number" || updatedData.priceUnit <= 0)
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Product price must be greater than 0." });
    }

    //walidacja zmiana wagi
    if (
      updatedData.weightUnit !== undefined &&
      (typeof updatedData.weightUnit !== "number" ||
        updatedData.weightUnit <= 0)
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Product weight must be greater than 0." });
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

//generowanie SEO opisu dla produktu
router.get("/:id/seo-description", async (req: Request, res: Response) => {
  const productId = parseInt(req.params.id);

  if (isNaN(productId)) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid product ID" });
  }

  try {
    const product = await productRepository.findOne({
      where: { id: productId },
      relations: ["category"],
    });

    if (!product) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Product not found" });
    }

    const seoDescription = await generateSeoDesc(product);

    res.status(StatusCodes.OK).type("text/html").send(seoDescription);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error generating SEO description",
      error,
    });
  }
});

export default router;
