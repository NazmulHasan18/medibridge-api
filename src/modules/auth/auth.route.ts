import { Router } from "express";
import { AuthController } from "./auth.controller";
import { auth } from "../../middlewares/auth";

const router = Router();

router.post("/login", AuthController.login);
router.post("/google-login", AuthController.googleLogin);
router.get("/refresh-token", AuthController.refreshAccessToken);
router.get("/logout", AuthController.logout);
router.get("/me", auth(), AuthController.getMe);

export const AuthRoute = router;
