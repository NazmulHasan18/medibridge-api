import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { UserRole } from "@prisma/client";
import { transactionController } from "./transaction.controller.js";

const router = Router();

router.use(auth(UserRole.PATIENT));

// ORDER MATTERS: /summary before /:publicId
router.get("/summary", transactionController.getTransactionSummary);
router.get("/", transactionController.getMyTransactions);
router.get("/:publicId", transactionController.getTransactionByPublicId);

export const transactionRoute = router;
