import { Router } from "express";
import { UserController } from "./user.controller";
import { validate } from "../../middlewares/validator";
import { createUserSchema } from "./user.validations";
import { upload } from "../../middlewares/uploader";

const router = Router();

router.post("/", upload.single("photo"), validate(createUserSchema), UserController.createUser);

export const userRoute = router;
