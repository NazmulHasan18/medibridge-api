import AppError from "../../errors/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import httpStatus from "http-status";
import { patientDashboardService } from "./patientDashboard.service.js";

// GET /api/v1/dashboard/patient/overview
const getPatientOverview = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("User Id is required", httpStatus.BAD_REQUEST);
  }
  const result = await patientDashboardService.getPatientOverview(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Patient overview fetched successfully",
    data: result,
  });
});

// GET /api/v1/dashboard/patient/recent-activity?limit=10
const getRecentActivity = catchAsync(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("User Id is required", httpStatus.BAD_REQUEST);
  }
  const result = await patientDashboardService.getRecentActivity(userId, limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Recent activity fetched successfully",
    data: result,
  });
});

export const paymentDashboardController = { getPatientOverview, getRecentActivity };
