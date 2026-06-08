import { UserRole } from "@prisma/client";
import express from "express";
import { auth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validator.js";
import { paymentValidationSchema } from "./appointments.validation.js";
import { appointmentController } from "./appointments.controller.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// Create appointment + get payment URL
router.post(
  "/",
  auth(UserRole.PATIENT),
  validate(paymentValidationSchema.createAppointment),
  appointmentController.createAppointment,
);

// My appointments list
router.get("/appointments", auth(), appointmentController.getMyAppointments);

// Single appointment
router.get("/:publicId", auth(), appointmentController.getAppointmentByPublicId);

// Reschedule
router.patch(
  "/:publicId/reschedule",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DOCTOR),
  validate(paymentValidationSchema.rescheduleAppointment),
  appointmentController.rescheduleAppointment,
);

// Cancel
router.patch("/:publicId/cancel", auth(UserRole.PATIENT), appointmentController.cancelAppointment);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN / DOCTOR ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// Update appointment status (BOOKED, COMPLETED, CANCELLED etc.)
router.patch(
  "/:publicId/status",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DOCTOR),
  validate(paymentValidationSchema.updateAppointmentStatus),
  appointmentController.updateAppointmentStatus,
);

// ─────────────────────────────────────────────────────────────────────────────
// SSLCOMMERZ PAYMENT CALLBACKS  (no auth — called by SSLCommerz servers)
// ─────────────────────────────────────────────────────────────────────────────

// SSLCommerz POSTs form data to these URLs
router.get("/payment/success", appointmentController.paymentSuccess);
router.post("/payment/success", appointmentController.paymentSuccess);
router.get("/payment/fail", appointmentController.paymentFail);
router.post("/payment/fail", appointmentController.paymentFail);
router.get("/payment/cancel", appointmentController.paymentCancel);
router.post("/payment/cancel", appointmentController.paymentCancel);

// IPN — server-to-server notification (most reliable)
router.post("/payment/ipn", appointmentController.paymentIPN);

export const appointmentRoutes = router;
