import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { UserRole } from "@prisma/client";
import { patientController } from "./patient.controller.js";

const router = Router();

router.get("/my", auth(UserRole.DOCTOR), patientController.fetchMyPatient);
router.get("/all", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), patientController.fetchPatient);
router.get("/appointment/:patientId", auth(UserRole.DOCTOR), patientController.fetchPatientAppointments);
router.get(
  "/all-appointment/:patientId",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  patientController.fetchPatientAllAppointments,
);

export const patientRoute = router;
