import { Request, Response, NextFunction, Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Product } from "../entity/Product";
import { parse } from "csv-parse/sync";

const validateSingleProduct = (product: Partial<Product>): string | null => {
  if (!product.name || product.name.trim() === "")
    return "Nazwa produktu nie może być pusta.";
  if (!product.description || product.description.trim() === "")
    return "Opis produktu nie może być pusty.";
  if (
    product.priceUnit === undefined ||
    typeof product.priceUnit !== "number" ||
    product.priceUnit <= 0
  )
    return "Cena produktu musi być większa od 0.";
  if (
    product.weightUnit === undefined ||
    typeof product.weightUnit !== "number" ||
    product.weightUnit <= 0
  )
    return "Waga produktu musi być większa od 0.";
  return null;
};

export const validateProductMiddleware = (
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
