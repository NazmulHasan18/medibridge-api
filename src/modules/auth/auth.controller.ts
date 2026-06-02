import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync.js";
import { AuthService } from "./auth.service.js";
import sendResponse from "../../utils/sendResponse.js";
import AppError from "../../errors/AppError.js";

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);

  sendResponse(res, { data: result, message: "User login successfully" });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  const sessionToken = req.cookies?.sessionToken;

  if (!sessionToken) throw new AppError("Session token not found", 401);
  const result = await AuthService.logout({ sessionToken });

  sendResponse(res, { data: result, message: "User logout successfully" });
});

const refreshAccessToken = catchAsync(async (req: Request, res: Response) => {
  const sessionToken = req.cookies?.sessionToken;

  if (!sessionToken) throw new AppError("Session token not found", 401);

  const result = await AuthService.refreshAccessToken({ sessionToken });

  sendResponse(res, { data: result, message: "Refresh token got successfully" });
});

const googleLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.googleLogin(req.body);

  sendResponse(res, { data: result, message: "User login successfully" });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const result = await AuthService.getMe(req.user.id);

  sendResponse(res, { data: result, message: "User Fetched successfully" });
});

export const AuthController = {
  login,
  refreshAccessToken,
  googleLogin,
  logout,
  getMe,
};
