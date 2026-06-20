import express from "express";

import { createScheduleSchema, updateScheduleSchema, generateSlotsSchema } from "./schedule.validations.js";
import { DoctorScheduleController } from "./schedule.controller.js";
import { validate } from "../../middlewares/validator.js";
import { auth } from "../../middlewares/auth.js";

const router = express.Router({ mergeParams: true }); // mergeParams to inherit :publicId

router
  .route("/")
  .post(
    auth("ADMIN", "SUPER_ADMIN", "DOCTOR"),
    validate(createScheduleSchema),
    DoctorScheduleController.createSchedule,
  )
  .get(DoctorScheduleController.getSchedulesByDoctor);

router
  .route("/:scheduleId")
  .get(DoctorScheduleController.getScheduleById)
  .patch(
    auth("ADMIN", "SUPER_ADMIN", "DOCTOR"),
    validate(updateScheduleSchema),
    DoctorScheduleController.updateSchedule,
  )

  .delete(auth("ADMIN", "SUPER_ADMIN", "DOCTOR"), DoctorScheduleController.deleteSchedule);

// ─── Slot generation (scoped to a schedule) ───────────────────────────────────

router.post(
  "/:scheduleId/slots/generate",
  auth("ADMIN", "SUPER_ADMIN", "DOCTOR"),
  validate(generateSlotsSchema),
  DoctorScheduleController.generateSlots,
);

// ─── Slot Routes (doctor-level) ───────────────────────────────────────────────

router
  .route("/get/slots")

  .get(DoctorScheduleController.getSlotsByDoctor)

  .delete(auth("ADMIN", "SUPER_ADMIN", "DOCTOR"), DoctorScheduleController.deleteFutureUnbookedSlots);

router.patch(
  "/slots/:slotId/cancel",
  auth("ADMIN", "SUPER_ADMIN", "DOCTOR"),
  DoctorScheduleController.cancelSlot,
);

export const scheduleRoute = router;
