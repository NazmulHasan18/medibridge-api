import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { UserRole } from "@prisma/client";
import { validate } from "../../middlewares/validator.js";
import { createPrescriptionSchema, updatePrescriptionSchema } from "./prescriptions.validations.js";
import PrescriptionController from "./prescriptions.controller.js";

const router = Router();

// ─── Doctor routes ────────────────────────────────────────────────────────────

// Create prescription
router.post(
  "/",
  auth(UserRole.DOCTOR),
  validate(createPrescriptionSchema),
  PrescriptionController.createPrescription,
);

// Update prescription
router.patch(
  "/:publicId",
  auth(UserRole.DOCTOR),
  validate(updatePrescriptionSchema),
  PrescriptionController.updatePrescription,
);

// ─── Shared routes (doctor + patient) ─────────────────────────────────────────

// Get my prescriptions (doctor → written by me, patient → my history)
router.get("/my", auth(UserRole.DOCTOR, UserRole.PATIENT), PrescriptionController.getMyPrescriptions);

// Get by appointment ID
router.get(
  "/appointment/:appointmentId",
  auth(UserRole.DOCTOR, UserRole.PATIENT),
  PrescriptionController.getPrescriptionByAppointment,
);

// Get single prescription by publicId
router.get(
  "/:publicId",
  auth(UserRole.DOCTOR, UserRole.PATIENT, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  PrescriptionController.getPrescriptionById,
);

const prescriptionRoutes = router;
export default prescriptionRoutes;
