import { Router } from "express";
import { UserRole } from "@prisma/client";

import { UserController } from "./user.controller.js";
import { validate } from "../../middlewares/validator.js";
import { createUserSchema, updateDoctorSchema, updateUserSchema } from "./user.validations.js";
import { upload } from "../../middlewares/uploader.js";
import { parseJsonFields } from "../../middlewares/parser.js";
import { auth } from "../../middlewares/auth.js";

const router = Router();

/* ----------------------------- Public ----------------------------- */

router.post(
  "/",
  upload.single("photo"),
  parseJsonFields(["doctor"]),
  validate(createUserSchema),
  UserController.createUser,
);

/* ----------------------------- Admin ------------------------------ */

router.get("/", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), UserController.getUsers);
router.get("/statistics", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), UserController.getStatistics);
router.get("/recent", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), UserController.getRecentUsers);
router.get("/export", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), UserController.exportUsers);
router.get("/:userId", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), UserController.getUserById);
router.patch("/:userId", auth(), validate(updateUserSchema), UserController.updateUser);
router.patch(
  "/:userId/doctor",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DOCTOR),
  validate(updateDoctorSchema),
  UserController.updateDoctor,
);
router.patch("/:userId/status", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), UserController.updateStatus);
router.patch("/:userId/role", auth(UserRole.SUPER_ADMIN), UserController.updateRole);
router.patch("/:userId/restore", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), UserController.restoreUser);
router.patch("/bulk/status", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), UserController.bulkUpdateStatus);
router.delete("/:userId", auth(UserRole.ADMIN, UserRole.SUPER_ADMIN), UserController.deleteUser);
router.delete("/:userId/permanent", auth(UserRole.SUPER_ADMIN), UserController.permanentlyDeleteUser);

export const userRoute = router;
