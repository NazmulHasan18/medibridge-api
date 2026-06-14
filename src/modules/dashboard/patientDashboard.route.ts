import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { UserRole } from "@prisma/client";
import { paymentDashboardController } from "./patientDashboard.controller.js";

const router = Router();

router.use(auth(UserRole.PATIENT));

router.get("/overview", paymentDashboardController.getPatientOverview);
router.get("/recent-activity", paymentDashboardController.getRecentActivity);

export const paymentDashboardRoute = router;
