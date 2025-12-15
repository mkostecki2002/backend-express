import { Request, Response, Router } from "express";
import { User } from "../entity/User";
import { AppDataSource } from "../data-source";
import { StatusCodes } from "http-status-codes";
import { hash, compare } from "bcryptjs";
import { generateJwt } from "../Authentication";

const router = Router();
const userRepository = AppDataSource.getRepository(User);

router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body as User;
  if (!username || !password) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Username and password are required" });
  }
  try {
    const user = await userRepository.findOneBy({ username: String(username) });
    if (!user || (await compare(password, user.password)) === false) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Invalid credentials" });
    }
    const token = generateJwt({ sub: user.id });
    res.setHeader("Authorization", `Bearer ${token}`);

    res
      .status(StatusCodes.OK)
      .json({ token: generateJwt({ sub: user.id, role: user.role }) });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error", error });
  }
});

router.post("/register", async (req: Request, res: Response) => {
  const user = req.body as User;

  user.password = await hash(user.password, 10);
  if (!user.username || !user.password) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Username and password are required" });
  }
  try {
    const emailRepeatedUser = await userRepository.findOneBy({
      email: user.email,
    });
    if (emailRepeatedUser) {
      return res
        .status(StatusCodes.CONFLICT)
        .json({ message: "User with given email already exists" });
    }
    const usernameRepeatedUser = await userRepository.findOneBy({
      username: user.username,
    });
    if (usernameRepeatedUser) {
      return res
        .status(StatusCodes.CONFLICT)
        .json({ message: "User with given username already exists" });
    }
    console.log("Registering user:", user);
    const savedUser = await userRepository.save(user);
    res.status(StatusCodes.CREATED).json(savedUser);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error", error });
  }
});

export default router;
