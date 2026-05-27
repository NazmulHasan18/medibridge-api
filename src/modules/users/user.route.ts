import { Router } from "express";
import { UserController } from "./user.controller";
import { validate } from "../../middlewares/validator";
import { createUserSchema } from "./user.validations";

const router = Router();

router.post("/", validate(createUserSchema), UserController.createUser);

export const userRoute = router;
