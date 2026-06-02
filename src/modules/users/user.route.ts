import { Router } from "express";
import { UserController } from "./user.controller.js";
import { validate } from "../../middlewares/validator.js";
import { createUserSchema } from "./user.validations.js";
import { upload } from "../../middlewares/uploader.js";
import { parseJsonFields } from "../../middlewares/parser.js";

const router = Router();

router.post(
  "/",
  upload.single("photo"),
  parseJsonFields(["doctor"]),
  validate(createUserSchema),
  UserController.createUser,
);

export const userRoute = router;
