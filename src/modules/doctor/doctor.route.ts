import { Router } from "express";
import { DoctorController } from "./doctor.controller.js";

const router = Router();

router.get("/", DoctorController.getAllDoctor);

export const doctorRoute = router;
