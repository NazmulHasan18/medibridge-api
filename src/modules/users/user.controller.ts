import { Request, Response } from "express";
import { UserRole, UserStatus } from "@prisma/client";

import { UserService } from "./user.service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import AppError from "../../errors/AppError.js";
import httpStatus from "http-status";

/* -------------------------------------------------------------------------- */
/*                                CREATE                                      */
/* -------------------------------------------------------------------------- */

const createUser = catchAsync(async (req: Request, res: Response) => {
  if (req.file?.path) {
    req.body.profileImage = req.file.path;
  }

  const result = await UserService.createUser(req.body);

  sendResponse(res, {
    data: result,
    message: "User created successfully",
  });
});

/* -------------------------------------------------------------------------- */
/*                               USER LIST                                    */
/* -------------------------------------------------------------------------- */

const getUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getUsers({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    role: req.query.role as UserRole,
    status: req.query.status as UserStatus,
    search: req.query.search as string,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as "asc" | "desc",
  });

  sendResponse(res, {
    data: result.data,
    meta: result.meta,
    message: "Users fetched successfully",
  });
});

/* -------------------------------------------------------------------------- */
/*                             USER DETAILS                                   */
/* -------------------------------------------------------------------------- */

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getUserById(Number(req.params.userId));

  sendResponse(res, {
    data: result,
    message: "User fetched successfully",
  });
});

/* -------------------------------------------------------------------------- */
/*                               UPDATE USER                                  */
/* -------------------------------------------------------------------------- */

const updateUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateUser(Number(req.params.userId), req.body);

  sendResponse(res, {
    data: result,
    message: "User updated successfully",
  });
});

/* -------------------------------------------------------------------------- */
/*                           UPDATE DOCTOR                                    */
/* -------------------------------------------------------------------------- */

const updateDoctor = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateDoctor(Number(req.params.userId), req.body);

  sendResponse(res, {
    data: result,
    message: "Doctor updated successfully",
  });
});

/* -------------------------------------------------------------------------- */
/*                           UPDATE STATUS                                    */
/* -------------------------------------------------------------------------- */

const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateStatus(Number(req.params.userId), req.body.status);

  sendResponse(res, {
    data: result,
    message: "Status updated successfully",
  });
});

/* -------------------------------------------------------------------------- */
/*                              UPDATE ROLE                                   */
/* -------------------------------------------------------------------------- */

const updateRole = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateRole(Number(req.params.userId), req.body.role);

  sendResponse(res, {
    data: result,
    message: "Role updated successfully",
  });
});

/* -------------------------------------------------------------------------- */
/*                              DELETE                                        */
/* -------------------------------------------------------------------------- */

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.deleteUser(Number(req.params.userId));

  sendResponse(res, {
    data: result,
    message: "User deleted successfully",
  });
});

/* -------------------------------------------------------------------------- */
/*                              RESTORE                                       */
/* -------------------------------------------------------------------------- */

const restoreUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.restoreUser(Number(req.params.userId));

  sendResponse(res, {
    data: result,
    message: "User restored successfully",
  });
});

/* -------------------------------------------------------------------------- */
/*                          PERMANENT DELETE                                  */
/* -------------------------------------------------------------------------- */

const permanentlyDeleteUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.permanentlyDeleteUser(Number(req.params.userId));

  sendResponse(res, {
    data: result,
    message: "User permanently deleted",
  });
});

/* -------------------------------------------------------------------------- */
/*                          BULK STATUS                                       */
/* -------------------------------------------------------------------------- */

const bulkUpdateStatus = catchAsync(async (req: Request, res: Response) => {
  const { ids, status } = req.body;

  const result = await UserService.bulkUpdateStatus(ids, status);

  sendResponse(res, {
    data: result,
    message: "Users updated successfully",
  });
});

/* -------------------------------------------------------------------------- */
/*                          DASHBOARD STATS                                   */
/* -------------------------------------------------------------------------- */

const getStatistics = catchAsync(async (_req: Request, res: Response) => {
  const result = await UserService.getStatistics();

  sendResponse(res, {
    data: result,
    message: "Statistics fetched successfully",
  });
});

/* -------------------------------------------------------------------------- */
/*                          RECENT USERS                                      */
/* -------------------------------------------------------------------------- */

const getRecentUsers = catchAsync(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 10;

  const result = await UserService.getRecentUsers(limit);

  sendResponse(res, {
    data: result,
    message: "Recent users fetched successfully",
  });
});

/* -------------------------------------------------------------------------- */
/*                               EXPORT                                       */
/* -------------------------------------------------------------------------- */

const exportUsers = catchAsync(async (_req: Request, res: Response) => {
  const result = await UserService.exportUsers();

  sendResponse(res, {
    data: result,
    message: "Users exported successfully",
  });
});

export const UserController = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateDoctor,
  updateStatus,
  updateRole,
  deleteUser,
  restoreUser,
  permanentlyDeleteUser,
  bulkUpdateStatus,
  getStatistics,
  getRecentUsers,
  exportUsers,
};
