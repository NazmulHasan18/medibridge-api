import { Router } from "express";
import { UserController } from "./user.controller.js";
import { validate } from "../../middlewares/validator.js";
import { createUserSchema } from "./user.validations.js";
import { upload } from "../../middlewares/uploader.js";
import { parseJsonFields } from "../../middlewares/parser.js";
import { auth } from "../../middlewares/auth.js";
import { UserRole } from "@prisma/client";

const router = Router();

router.post(
  "/",
  upload.single("photo"),
  parseJsonFields(["doctor"]),
  validate(createUserSchema),
  UserController.createUser,
);
router.get("/:role", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), UserController.fetchAllUserByRole);
router.delete("/delete/:userId", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), UserController.deleteUser);

export const userRoute = router;
