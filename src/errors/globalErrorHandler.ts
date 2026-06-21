import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

import AppError from "./AppError.js";
import logger from "../lib/logger.js";

const handlePrismaError = (err: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (err.code) {
    case "P2002": {
      const meta = err.meta as any;

      const fields = meta?.target || meta?.driverAdapterError?.cause?.constraint?.fields || [];

      const formatted = Array.isArray(fields) ? fields.join(", ") : String(fields);

      return new AppError(`${formatted} already exists`, 409);
    }

    case "P2025":
      return new AppError((err.meta?.cause as string) || "Record not found", 404);

    case "P2003":
      return new AppError("Foreign key constraint failed", 400);

    case "P2014":
      return new AppError("Invalid relation", 400);

    case "P2000":
      return new AppError("Input value too long", 400);

    default:
      return new AppError("Database error", 500);
  }
};

const globalErrorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  let error = err as AppError;

  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    error = handlePrismaError(err);
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    error = new AppError("Invalid data provided", 400);
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    error = new AppError("Database connection failed", 503);
  }

  const statusCode = error.statusCode || 500;
  const status = error.status || "error";

  if (process.env.NODE_ENV === "development") {
    res.status(statusCode).json({
      success: false,
      status,
      message: error.message,
      stack: error.stack,
    });
    return;
  }

  if (error.isOperational) {
    res.status(statusCode).json({
      success: false,
      status,
      message: error.message,
    });
    return;
  }

  // Unexpected errors
  logger.error({
    message: "Unexpected error",
    error: err,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
  });

  res.status(500).json({
    success: false,
    status: "error",
    message: "Something went wrong",
  });
};

export default globalErrorHandler;
