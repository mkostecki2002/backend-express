import { Request, Response, Router } from "express";
import { AppDataSource } from "../data-source";
import { Order } from "../entity/Order";
import { StatusCodes } from "http-status-codes";
import { OrderState, OrderStateName } from "../entity/OrderState";
import { OrderItem } from "../entity/OrderItem";
import verifyJwt, { requireRole } from "../Authentication";
import { UserRole } from "../entity/User";
import { OrderStateFlow } from "../entity/OrderState";
import { Product } from "../entity/Product";

const router = Router();

const orderRepository = AppDataSource.getRepository(Order);
const stateRepository = AppDataSource.getRepository(OrderState);
const productRepository = AppDataSource.getRepository(Product);

//Zamówienia
router
  .route("/")
  //pozniej sie doda weryfikacje JWT i role do endpointow
  // na razie tylko dla get orders zrobilem
  .get(
    verifyJwt,
    requireRole(UserRole.Customer),
    (req: Request, res: Response) => {
      orderRepository
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
    }
  )

  .post(async (req: Request, res: Response) => {
    const order = req.body as Order;

    //walidacja pola username
    if (!order.username || order.username.trim() === "") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Pole username nie może być puste." });
    }

    //pusty mail
    if (!order.email || order.email.trim() === "") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Pole email nie może być puste." });
    }

    //format maila
    if (!/^\S+@\S+\.\S+$/.test(order.email)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Pole email musi zawierać poprawny adres e-mail." });
    }

    //pusty telefon
    if (!order.phoneNumber || order.phoneNumber.trim() === "") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Pole phoneNumber nie może być puste." });
    }

    //format telefonu
    if (!/^[0-9]+$/.test(order.phoneNumber)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Numer telefonu może zawierać wyłącznie cyfry." });
    }

    //ilosc elementow w zamowieniu
    if (
      !order.orderItems ||
      !Array.isArray(order.orderItems) ||
      order.orderItems.length === 0
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Zamówienie musi zawierać co najmniej jeden element.",
      });
    }

    for (const item of order.orderItems as OrderItem[]) {
      if (!item.product || typeof item.product.id !== "number") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message:
            "Każdy element zamówienia musi zawierać poprawne ID produktu.",
        });
      }

      const existingProduct = await productRepository.findOneBy({
        id: item.product.id,
      });

      if (!existingProduct) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: `Produkt o ID ${item.product.id} nie istnieje.`,
        });
      }

      if (
        item.quantity === undefined ||
        typeof item.quantity !== "number" ||
        item.quantity <= 0
      ) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: `Nieprawidłowa ilość dla produktu ID ${item.product.id}. Ilość musi być > 0.`,
        });
      }

      // przypisanie encji z bazy
      item.product = existingProduct;
    }

    //stan zamowienia
    if (!order.orderState) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Zamówienie musi mieć stan (orderState)." });
    }

    //zapis zamowienia
    orderRepository
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

//aktualizacja stanu zamówienia po id
router.patch("/orders/:id", async (req: Request, res: Response) => {
  const orderId = parseInt(req.params.id, 10);

  if (isNaN(orderId)) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid order ID" });
  }

  const { orderState } = req.body;

  if (
    !orderState ||
    !orderState.name ||
    !Object.values(OrderStateName).includes(orderState.name)
  ) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Valid orderState.name is required" });
  }

  try {
    const existingOrder = await orderRepository.findOne({
      where: { id: orderId },
      relations: ["orderState"],
    });

    //brak zamówienia
    if (!existingOrder) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Order not found" });
    }

    //zmiana anulowanego zamówienia
    if (existingOrder.orderState.name === OrderStateName.Cancelled) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message:
          "Nie można zmienić statusu zamówienia, które zostało anulowane.",
      });
    }

    const newState = await stateRepository.findOneBy({
      name: orderState.name,
    });

    if (!newState) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Order state does not exist" });
    }

    //walidacja nielegalnego przejścia stanu
    const currentIndex = OrderStateFlow.indexOf(existingOrder.orderState.name);
    const newIndex = OrderStateFlow.indexOf(newState.name);

    if (currentIndex === -1 || newIndex === -1) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Nieprawidłowy stan zamówienia w procesie" });
    }

    if (newIndex < currentIndex) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: `Nie można cofnąć statusu z ${existingOrder.orderState.name} na ${newState.name}`,
      });
    }

    existingOrder.orderState = newState;
    await orderRepository.save(existingOrder);
    res.status(StatusCodes.OK).json(existingOrder);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error updating order state",
      error,
    });
  }
});

//pobieranie zamówień po statusie
router.get("/orders/status/:name", async (req: Request, res: Response) => {
  const stateName = req.params.name;

  //walidacja enum
  if (!Object.values(OrderStateName).includes(stateName as OrderStateName)) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid order status" });
  }

  try {
    const orders = await orderRepository.find({
      where: {
        orderState: {
          name: stateName as OrderStateName,
        },
      },
      relations: ["orderItems", "orderItems.product", "orderState"],
    });

    res.status(StatusCodes.OK).json(orders);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error fetching orders by status",
      error,
    });
  }
});

export default router;
