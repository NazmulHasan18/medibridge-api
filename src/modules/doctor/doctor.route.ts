import { Router } from "express";
import { DoctorController } from "./doctor.controller.js";
import { auth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validator.js";
import { updateDoctorSchema } from "./doctor.validations.js";

const router = Router();

router.get("/", DoctorController.getAllDoctor);
router.get("/fetch", auth("ADMIN", "SUPER_ADMIN"), DoctorController.fetchAllDoctor);
router.get("/:id", auth(), DoctorController.getDoctorById);
router.patch(
  "/:id",
  auth("ADMIN", "SUPER_ADMIN"),
  validate(updateDoctorSchema),
  DoctorController.updateDoctor,
);
router.delete("/:id", auth("ADMIN", "SUPER_ADMIN"), DoctorController.deleteDoctor);

export const doctorRoute = router;
