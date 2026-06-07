import { Request, Response, NextFunction } from "express";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import httpStatus from "http-status";
import { DoctorScheduleService } from "./schedule.service.js";
import AppError from "../../errors/AppError.js";

// ─── Schedule Controllers ─────────────────────────────────────────────────────

/**
 * POST /doctors/:publicId/schedules
 * Create a new weekly schedule for a doctor.
 */
const createSchedule = catchAsync(async (req: Request, res: Response) => {
  const { publicId } = req.params;
  const schedule = await DoctorScheduleService.createSchedule(publicId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Schedule created successfully",
    data: schedule,
  });
});

/**
 * GET /doctors/:publicId/schedules
 * List all schedules for a doctor.
 */
const getSchedulesByDoctor = catchAsync(async (req: Request, res: Response) => {
  const { publicId } = req.params;
  const schedules = await DoctorScheduleService.getSchedulesByDoctor(publicId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Schedules fetched successfully",
    data: schedules,
  });
});

/**
 * GET /doctors/:publicId/schedules/:scheduleId
 * Get a single schedule.
 */
const getScheduleById = catchAsync(async (req: Request, res: Response) => {
  const { publicId, scheduleId } = req.params;
  const schedule = await DoctorScheduleService.getScheduleById(publicId, Number(scheduleId));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Schedule fetched successfully",
    data: schedule,
  });
});

/**
 * PATCH /doctors/:publicId/schedules/:scheduleId
 * Update a schedule. Response includes a `timingChanged` flag so the
 * frontend knows to prompt the user to regenerate slots.
 */
const updateSchedule = catchAsync(async (req: Request, res: Response) => {
  const { publicId, scheduleId } = req.params;
  const result = await DoctorScheduleService.updateSchedule(publicId, Number(scheduleId), req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.timingChanged
      ? "Schedule updated. Consider regenerating slots for future dates."
      : "Schedule updated successfully",
    data: result.schedule,
  });
});

/**
 * DELETE /doctors/:publicId/schedules/:scheduleId
 * Delete a schedule and its future unbooked slots.
 */
const deleteSchedule = catchAsync(async (req: Request, res: Response) => {
  const { publicId, scheduleId } = req.params;
  await DoctorScheduleService.deleteSchedule(publicId, Number(scheduleId));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Schedule and future unbooked slots deleted successfully",
    data: null,
  });
});

// ─── Slot Controllers ─────────────────────────────────────────────────────────

/**
 * POST /doctors/:publicId/schedules/:scheduleId/slots/generate
 * Generate slots from a schedule for a given array of dates.
 */
const generateSlots = catchAsync(async (req: Request, res: Response) => {
  const { publicId, scheduleId } = req.params;
  const result = await DoctorScheduleService.generateSlots(publicId, Number(scheduleId), req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `Generated ${result.created} slot(s)`,
    data: result,
  });
});

/**
 * GET /doctors/:publicId/slots
 * Get slots for a doctor. Supports ?date=YYYY-MM-DD and ?available=true|false
 */
const getSlotsByDoctor = catchAsync(async (req: Request, res: Response) => {
  const { publicId } = req.params;

  const query = req.query as { date?: string; available?: string; page?: string; limit?: string };

  const response = await DoctorScheduleService.getSlotsByDoctor(publicId, {
    date: query.date,
    available: query.available !== undefined ? query.available === "true" : undefined,
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 10,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Slots fetched successfully",
    data: response,
  });
});

/**
 * PATCH /doctors/:publicId/slots/:slotId/cancel
 * Cancel a specific slot.
 */
const cancelSlot = catchAsync(async (req: Request, res: Response) => {
  const { publicId, slotId } = req.params;
  const slot = await DoctorScheduleService.cancelSlot(publicId, Number(slotId));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Slot cancelled successfully",
    data: slot,
  });
});

/**
 * DELETE /doctors/:publicId/slots
 * Delete all future unbooked slots for a doctor.
 * Optional query: ?scheduleId=<number> to scope to one schedule.
 */
const deleteFutureUnbookedSlots = catchAsync(async (req: Request, res: Response) => {
  const { publicId } = req.params;
  const scheduleId = req.query.scheduleId ? Number(req.query.scheduleId) : undefined;
  const result = await DoctorScheduleService.deleteFutureUnbookedSlots(publicId, scheduleId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Deleted ${result.deleted} future unbooked slot(s)`,
    data: result,
  });
});

export const DoctorScheduleController = {
  // Schedules
  createSchedule,
  getSchedulesByDoctor,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  // Slots
  generateSlots,
  getSlotsByDoctor,
  cancelSlot,
  deleteFutureUnbookedSlots,
};
