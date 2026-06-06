import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import { appointmentService } from "./appointments.service.js";
import AppError from "../../errors/AppError.js";
import sendResponse from "../../utils/sendResponse.js";
import { config } from "../../config/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// CREATE APPOINTMENT  →  returns payment URL
// ─────────────────────────────────────────────────────────────────────────────
const createAppointment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id; // from auth middleware

  if (!userId) {
    throw new AppError("UserId is required", 400);
  }

  const result = await appointmentService.createAppointment(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Appointment created. Redirecting to payment...",
    data: result,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT SUCCESS  (SSLCommerz redirect)
// ─────────────────────────────────────────────────────────────────────────────
const paymentSuccess = catchAsync(async (req: Request, res: Response) => {
  const { tran_id, val_id } = (req.body && Object.keys(req.body).length ? req.body : req.query) as {
    tran_id?: string;
    val_id?: string;
  };
  const { appointmentId } = req.query as { appointmentId?: string };

  if (!tran_id || !appointmentId) {
    throw new AppError("Missing payment data", httpStatus.BAD_REQUEST);
  }

  await appointmentService.handlePaymentSuccess(tran_id, val_id || "", appointmentId);

  // Redirect to frontend success page
  res.redirect(`${config.clientUrl}/appointments/${appointmentId}/success`);
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT FAIL  (SSLCommerz redirect)
// ─────────────────────────────────────────────────────────────────────────────
const paymentFail = catchAsync(async (req: Request, res: Response) => {
  const { tran_id } = (req.body && Object.keys(req.body).length ? req.body : req.query) as {
    tran_id?: string;
  };
  const { appointmentId } = req.query as { appointmentId?: string };

  if (!tran_id || !appointmentId) {
    throw new AppError("Missing payment data", httpStatus.BAD_REQUEST);
  }

  await appointmentService.handlePaymentFail(tran_id, appointmentId);

  res.redirect(`${config.clientUrl}/appointments/${appointmentId}/failed`);
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT CANCEL  (SSLCommerz redirect)
// ─────────────────────────────────────────────────────────────────────────────
const paymentCancel = catchAsync(async (req: Request, res: Response) => {
  const { tran_id } = (req.body && Object.keys(req.body).length ? req.body : req.query) as {
    tran_id?: string;
  };
  const { appointmentId } = req.query as { appointmentId?: string };

  if (!tran_id || !appointmentId) {
    throw new AppError("Missing payment data", httpStatus.BAD_REQUEST);
  }

  // Treat cancel same as fail — release slot
  await appointmentService.handlePaymentFail(tran_id, appointmentId);

  res.redirect(`${config.clientUrl}/appointments/${appointmentId}/cancelled`);
});

// ─────────────────────────────────────────────────────────────────────────────
// IPN — Instant Payment Notification (server-to-server, no redirect)
// ─────────────────────────────────────────────────────────────────────────────
const paymentIPN = catchAsync(async (req: Request, res: Response) => {
  await appointmentService.handleIPN(req.body);
  res.status(httpStatus.OK).json({ message: "IPN received" });
});

// ─────────────────────────────────────────────────────────────────────────────
// RESCHEDULE
// ─────────────────────────────────────────────────────────────────────────────
const rescheduleAppointment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError("UserId is required", httpStatus.BAD_REQUEST);
  }

  const { publicId } = req.params;
  const result = await appointmentService.rescheduleAppointment(userId, publicId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Appointment rescheduled successfully",
    data: result,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE STATUS  (admin / doctor)
// ─────────────────────────────────────────────────────────────────────────────
const updateAppointmentStatus = catchAsync(async (req: Request, res: Response) => {
  const { publicId } = req.params;
  const { appointmentStatus } = req.body;
  const result = await appointmentService.updateAppointmentStatus(publicId, appointmentStatus);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Appointment status updated",
    data: result,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET MY APPOINTMENTS
// ─────────────────────────────────────────────────────────────────────────────
const getMyAppointments = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError("UserId is required", httpStatus.BAD_REQUEST);
  }

  const { status, page, limit } = req.query;

  const result = await appointmentService.getMyAppointments(userId, {
    status: status as any,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 10,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Appointments retrieved successfully",
    meta: result.meta,
    data: result.appointments,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE APPOINTMENT
// ─────────────────────────────────────────────────────────────────────────────
const getAppointmentByPublicId = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError("UserId is required", 400);
  }

  const { publicId } = req.params;
  const result = await appointmentService.getAppointmentByPublicId(publicId, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Appointment retrieved successfully",
    data: result,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL APPOINTMENT
// ─────────────────────────────────────────────────────────────────────────────
const cancelAppointment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError("UserId is required", 400);
  }

  const { publicId } = req.params;
  await appointmentService.cancelAppointment(publicId, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Appointment cancelled successfully",
    data: null,
  });
});

export const appointmentController = {
  createAppointment,
  paymentSuccess,
  paymentFail,
  paymentCancel,
  paymentIPN,
  rescheduleAppointment,
  updateAppointmentStatus,
  getMyAppointments,
  getAppointmentByPublicId,
  cancelAppointment,
};
