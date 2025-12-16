import { Request, Response, Router } from "express";
import { AppDataSource } from "../data-source";
import { Order } from "../entity/Order";
import { StatusCodes } from "http-status-codes";
import { OrderState, OrderStateName } from "../entity/OrderState";
import { OrderItem } from "../entity/OrderItem";
import { requireRole, verifyAccess } from "../Authentication";
import { UserRole } from "../entity/User";
import { OrderStateFlow } from "../entity/OrderState";
import { Product } from "../entity/Product";
import { Opinion } from "../entity/Opinion";

const router = Router();

const orderRepository = AppDataSource.getRepository(Order);
const stateRepository = AppDataSource.getRepository(OrderState);
const productRepository = AppDataSource.getRepository(Product);
const opinionRepository = AppDataSource.getRepository(Opinion);

//Zamówienia
router
  .route("/")
  //pozniej sie doda weryfikacje JWT i role do endpointow
  // na razie tylko dla get orders zrobilem
  .get(
    verifyAccess,
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
        .json({ message: "Username cannot be empty." });
    }

    //pusty mail
    if (!order.email || order.email.trim() === "") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Email cannot be empty." });
    }

    //format maila
    if (!/^\S+@\S+\.\S+$/.test(order.email)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Email must have a valid format." });
    }

    //pusty telefon
    if (!order.phoneNumber || order.phoneNumber.trim() === "") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Phone number cannot be empty." });
    }

    //format telefonu
    if (!/^[0-9]+$/.test(order.phoneNumber)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Phone number can contain digits only." });
    }

    //ilosc elementow w zamowieniu
    if (
      !order.orderItems ||
      !Array.isArray(order.orderItems) ||
      order.orderItems.length === 0
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Order must contain at least one item.",
      });
    }

    for (const item of order.orderItems as OrderItem[]) {
      if (!item.product || typeof item.product.id !== "number") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message:
            "Each order item must contain a valid product ID.",
        });
      }

      const existingProduct = await productRepository.findOneBy({
        id: item.product.id,
      });

      if (!existingProduct) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: `Product with ID ${item.product.id} does not exist.`,
        });
      }

      if (
        item.quantity === undefined ||
        typeof item.quantity !== "number" ||
        item.quantity <= 0
      ) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: `Invalid quantity for product ID ${item.product.id}. Quantity must be greater than 0.`,
        });
      }

      // przypisanie encji z bazy
      item.product = existingProduct;
      item.unitPrice = existingProduct.priceUnit;
    }

    //stan zamowienia
    if (!order.orderState) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Order must have an order state." });
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
router.patch("/:id", async (req: Request, res: Response) => {
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
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({message:"Cancelled order cannot be modified.",});
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
        .json({ message: "Invalid order state in workflow" });
    }

    if (newIndex < currentIndex) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: `Cannot change order state from ${existingOrder.orderState.name} to ${newState.name}`,
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
router.get("/status/:name", async (req: Request, res: Response) => {
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

router.post("/:id/opinions", async (req: Request, res: Response) => {
  const orderId = parseInt(req.params.id, 10);
  const { rating, content } = req.body;
  const user = (req as any).user;

  if (isNaN(orderId)) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({message: "Invalid order ID"});
  }

  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({message: "Rating must be an integer between 1 and 5"});
  }

  if (!content || typeof content !== "string" || content.trim() === "") {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({message: "Opinion content cannot be empty"});
  }

  const order = await orderRepository.findOne({
    where: { id: orderId },
    relations: ["orderState"],
  });

  if (!order) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({message: "Order not found"});
  }

  if (!order.orderState) {
  return res
    .status(StatusCodes.BAD_REQUEST)
    .json({ message: "Order has no state assigned" });
}

  //zamowienie musi byc zrealizowane lub anulowane
  if (order.orderState.name !== OrderStateName.Completed && order.orderState.name !== OrderStateName.Cancelled) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({message: "Opinion can be added only to completed or cancelled orders"});
  }

  //opinia tylko do wlasnego zamowienia
  if (user && user.username !== order.username) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({message: "You can add opinion only to your own order"});
  }

  const opinion = opinionRepository.create({
    rating,
    content,
    order
  });

  await opinionRepository.save(opinion);

  return res.status(StatusCodes.CREATED).json(opinion);
});


export default router;
