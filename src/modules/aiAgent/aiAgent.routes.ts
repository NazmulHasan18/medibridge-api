import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { UserRole } from "@prisma/client";
import { chat } from "./aiAgent.controller.js";

const router = Router();
router.post("/chat", auth(UserRole.PATIENT), chat);

export const AgentRoutes = router;
