import AppError from "../../errors/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import httpStatus from "http-status";
import { dashboardService } from "./dashboard.service.js";

// GET /api/v1/dashboard/patient/overview
const getPatientOverview = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("User Id is required", httpStatus.BAD_REQUEST);
  }
  const result = await dashboardService.getPatientOverview(userId);

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
  const result = await dashboardService.getRecentActivity(userId, limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Recent activity fetched successfully",
    data: result,
  });
});

const getDoctorDashboardStats = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("User id not found", 404);
  }
  const result = await dashboardService.getDoctorDashboardStats(userId, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Doctor dashboard stats retrieved successfully",
    data: result,
  });
});

const getDoctorAppointmentBreakdown = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("User id not found", 404);
  }
  const result = await dashboardService.getDoctorAppointmentBreakdown(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Doctor appointment breakdown retrieved successfully",
    data: result,
  });
});

const getDoctorRecentAppointments = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("User id not found", 404);
  }
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const result = await dashboardService.getDoctorRecentAppointments(userId, limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Recent appointments retrieved successfully",
    data: result,
  });
});

const getDoctorUpcomingSchedule = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("User id not found", 404);
  }
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const result = await dashboardService.getDoctorUpcomingSchedule(userId, limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Upcoming schedule retrieved successfully",
    data: result,
  });
});

// =========================== ADMIN DASHBOARD ===========================

const getAdminDashboardStats = catchAsync(async (req, res) => {
  const result = await dashboardService.getAdminDashboardStats(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin dashboard stats retrieved successfully",
    data: result,
  });
});

const getAdminAppointmentBreakdown = catchAsync(async (req, res) => {
  const result = await dashboardService.getAdminAppointmentBreakdown();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Appointment status breakdown retrieved successfully",
    data: result,
  });
});

const getAdminUserRoleBreakdown = catchAsync(async (req, res) => {
  const result = await dashboardService.getAdminUserRoleBreakdown();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User role breakdown retrieved successfully",
    data: result,
  });
});

const getAdminRevenueChart = catchAsync(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;
  const result = await dashboardService.getAdminRevenueChart(
    startDate as string,
    endDate as string,
    groupBy as "day" | "week" | "month",
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Revenue chart data retrieved successfully",
    data: result,
  });
});

const getAdminRecentAppointments = catchAsync(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const result = await dashboardService.getAdminRecentAppointments(limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Recent appointments retrieved successfully",
    data: result,
  });
});

const getAdminRecentTransactions = catchAsync(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const result = await dashboardService.getAdminRecentTransactions(limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Recent transactions retrieved successfully",
    data: result,
  });
});

const getAdminTopDoctors = catchAsync(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const result = await dashboardService.getAdminTopDoctors(limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Top doctors retrieved successfully",
    data: result,
  });
});

export const dashboardController = {
  getDoctorDashboardStats,
  getDoctorAppointmentBreakdown,
  getDoctorRecentAppointments,
  getDoctorUpcomingSchedule,
  getAdminDashboardStats,
  getAdminAppointmentBreakdown,
  getAdminUserRoleBreakdown,
  getAdminRevenueChart,
  getAdminRecentAppointments,
  getAdminRecentTransactions,
  getAdminTopDoctors,
  getPatientOverview,
  getRecentActivity,
};
