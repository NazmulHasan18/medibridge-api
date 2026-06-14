import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { UserRole } from "@prisma/client";
import { paymentController } from "./payment.controller.js";

const router = Router();

router.use(auth(UserRole.PATIENT));

// ORDER MATTERS: specific routes before param routes
router.get("/appointment/:appointmentPublicId", paymentController.getPaymentByAppointment);
router.get("/", paymentController.getMyPayments);
router.get("/:publicId", paymentController.getPaymentByPublicId);

export const paymentRoute = router;
