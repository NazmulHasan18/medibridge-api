import { Router } from "express";
import { DoctorController } from "./doctor.controller";
import { validate } from "../../middlewares/validator";
import { createUserSchema } from "./doctor.validations";
import { upload } from "../../middlewares/uploader";
import { parseJsonFields } from "../../middlewares/parser";

const router = Router();

router.get("/", DoctorController.getAllDoctor);

export const doctorRoute = router;
