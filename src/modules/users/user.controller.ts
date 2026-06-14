import { Request, Response } from "express";
import { UserService } from "./user.service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { UserRole } from "@prisma/client";
import AppError from "../../errors/AppError.js";
import httpStatus from "http-status";

const createUser = catchAsync(async (req: Request, res: Response) => {
  if (req.file?.path) {
    req.body.profileImage = req.file?.path;
  }

  const result = await UserService.createUser(req.body);

  sendResponse(res, { data: result, message: "User created successfully" });
});

const fetchAllUserByRole = catchAsync(async (req: Request, res: Response) => {
  const role = req.params.role as UserRole;
  if (!role) {
    throw new AppError("User role is required", httpStatus.BAD_REQUEST);
  }
  const result = await UserService.fetchAllUserByRole(role);

  sendResponse(res, { data: result.data, meta: result.meta, message: `${role} fetched successfully` });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId;
  if (!userId) {
    throw new AppError("User id is required", httpStatus.BAD_REQUEST);
  }
  const result = await UserService.deleteUser(Number(userId));

  sendResponse(res, { data: result, message: "User deleted successfully" });
});

export const UserController = {
  createUser,
  fetchAllUserByRole,
  deleteUser,
};
