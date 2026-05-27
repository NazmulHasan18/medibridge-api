import { Request, Response } from "express";
import { UserService } from "./user.service";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

const createUser = catchAsync(async (req: Request, res: Response) => {
  if (req.file?.path) {
    req.body.profileImage = req.file?.path;
  }

  const result = await UserService.createUser(req.body);

  sendResponse(res, { data: result });
});

export const UserController = {
  createUser,
};
