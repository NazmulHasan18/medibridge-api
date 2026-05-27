import { Request, Response } from "express";
import { UserService } from "./user.service";

const createUser = async (req: Request, res: Response) => {
  const result = await UserService.createUser(req.body);

  res.status(201).json(result);
};

export const UserController = {
  createUser,
};
