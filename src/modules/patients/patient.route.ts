import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { UserRole } from "@prisma/client";
import { patientController } from "./patient.controller.js";

const router = Router();

router.get("/my", auth(UserRole.DOCTOR), patientController.fetchPatient);
router.get("/appointment/:patientId", auth(UserRole.DOCTOR), patientController.fetchPatientAppointments);

export const patientRoute = router;
