import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { UserRole } from "@prisma/client";
import { dashboardController } from "./dashboard.controller.js";

const router = Router();

router.get("/patient/overview", auth(UserRole.PATIENT), dashboardController.getPatientOverview);
router.get("/patient/recent-activity", auth(UserRole.PATIENT), dashboardController.getRecentActivity);

router.get("/doctor/stats", auth(UserRole.DOCTOR), dashboardController.getDoctorDashboardStats);

router.get(
  "/doctor/appointment-breakdown",
  auth(UserRole.DOCTOR),
  dashboardController.getDoctorAppointmentBreakdown,
);

router.get(
  "/doctor/recent-appointments",
  auth(UserRole.DOCTOR),
  dashboardController.getDoctorRecentAppointments,
);

router.get("/doctor/upcoming-schedule", auth(UserRole.DOCTOR), dashboardController.getDoctorUpcomingSchedule);

// =========================== ADMIN DASHBOARD ROUTES ===========================

router.get(
  "/admin/stats",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  dashboardController.getAdminDashboardStats,
);

router.get(
  "/admin/appointment-breakdown",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  dashboardController.getAdminAppointmentBreakdown,
);

router.get(
  "/admin/user-role-breakdown",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  dashboardController.getAdminUserRoleBreakdown,
);

router.get(
  "/admin/revenue-chart",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  dashboardController.getAdminRevenueChart,
);

router.get(
  "/admin/recent-appointments",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  dashboardController.getAdminRecentAppointments,
);

router.get(
  "/admin/recent-transactions",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  dashboardController.getAdminRecentTransactions,
);

router.get(
  "/admin/top-doctors",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  dashboardController.getAdminTopDoctors,
);

export const dashboardRoute = router;
