import AppError from "../../errors/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { transactionService } from "./transaction.service.js";
import { transactionListQuerySchema } from "./transaction.validation.js";
import httpStatus from "http-status";

// GET /api/v1/transactions
const getMyTransactions = catchAsync(async (req, res) => {
  const query = transactionListQuerySchema.parse(req.query);

  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("User Id is required", httpStatus.BAD_REQUEST);
  }

  const result = await transactionService.getMyTransactions(userId, query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Transactions fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

// GET /api/v1/transactions/summary
const getTransactionSummary = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("User Id is required", httpStatus.BAD_REQUEST);
  }
  const result = await transactionService.getTransactionSummary(userId);

  console.log(result);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Transaction summary fetched successfully",
    data: result,
  });
});

// GET /api/v1/transactions/:publicId
const getTransactionByPublicId = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("User Id is required", httpStatus.BAD_REQUEST);
  }
  const result = await transactionService.getTransactionByPublicId(userId, req.params.publicId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Transaction fetched successfully",
    data: result,
  });
});

export const transactionController = {
  getMyTransactions,
  getTransactionSummary,
  getTransactionByPublicId,
};
