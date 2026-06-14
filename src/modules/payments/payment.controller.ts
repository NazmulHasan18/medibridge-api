import AppError from "../../errors/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { paymentService } from "./payment.service.js";
import { paymentListQuerySchema } from "./payment.validation.js";
import httpStatus from "http-status";

// GET /api/v1/payments
const getMyPayments = catchAsync(async (req, res) => {
  const query = paymentListQuerySchema.parse(req.query);
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("User Id is required", httpStatus.BAD_REQUEST);
  }
  const result = await paymentService.getMyPayments(userId, query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payments fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

// GET /api/v1/payments/:publicId
const getPaymentByPublicId = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("User Id is required", httpStatus.BAD_REQUEST);
  }
  const result = await paymentService.getPaymentByPublicId(userId, req.params.publicId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment fetched successfully",
    data: result,
  });
});

// GET /api/v1/payments/appointment/:appointmentPublicId
const getPaymentByAppointment = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("User Id is required", httpStatus.BAD_REQUEST);
  }
  const result = await paymentService.getPaymentByAppointment(userId, req.params.appointmentPublicId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment fetched successfully",
    data: result,
  });
});

export const paymentController = {
  getMyPayments,
  getPaymentByPublicId,
  getPaymentByAppointment,
};
