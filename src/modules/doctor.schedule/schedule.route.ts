import express from "express";

import { createScheduleSchema, updateScheduleSchema, generateSlotsSchema } from "./schedule.validations.js";
import { DoctorScheduleController } from "./schedule.controller.js";
import { validate } from "../../middlewares/validator.js";
import { auth } from "../../middlewares/auth.js";

const router = express.Router({ mergeParams: true }); // mergeParams to inherit :publicId

/**
 * All schedule/slot routes are mounted under:
 *   /api/v1/doctors-schedule/:publicId/...
 *
 * In your main doctor.route.ts, mount this as:
 *   doctorRouter.use("/:publicId", scheduleSlotRouter);
 */

// ─── Schedule Routes ──────────────────────────────────────────────────────────

router
  .route("/")
  /**
   * POST /doctors-schedule/:publicId
   * Create a schedule for a doctor. (Admin or the doctor themselves)
   */
  .post(
    auth("ADMIN", "SUPER_ADMIN", "DOCTOR"),
    validate(createScheduleSchema),
    DoctorScheduleController.createSchedule,
  )
  /**
   * GET /doctors-schedule/:publicId
   * Fetch all schedules. Public.
   */
  .get(DoctorScheduleController.getSchedulesByDoctor);

router
  .route("/:scheduleId")
  /**
   * GET /doctors-schedule/:publicId/:scheduleId
   * Fetch a single schedule. Public.
   */
  .get(DoctorScheduleController.getScheduleById)
  /**
   * PATCH /doctors-schedule/:publicId/:scheduleId
   * Update a schedule.
   */
  .patch(
    auth("ADMIN", "SUPER_ADMIN", "DOCTOR"),
    validate(updateScheduleSchema),
    DoctorScheduleController.updateSchedule,
  )
  /**
   * DELETE /doctors-schedule/:publicId/:scheduleId
   * Delete a schedule + future unbooked slots.
   */
  .delete(auth("ADMIN", "SUPER_ADMIN", "DOCTOR"), DoctorScheduleController.deleteSchedule);

// ─── Slot generation (scoped to a schedule) ───────────────────────────────────

/**
 * POST /doctors-schedule/:publicId/:scheduleId/slots/generate
 * Generate slots for specific dates from a schedule.
 */
router.post(
  "/:scheduleId/slots/generate",
  auth("ADMIN", "SUPER_ADMIN", "DOCTOR"),
  validate(generateSlotsSchema),
  DoctorScheduleController.generateSlots,
);

// ─── Slot Routes (doctor-level) ───────────────────────────────────────────────

router
  .route("/get/slots")
  /**
   * GET /doctors-schedule/:publicId/slots?date=YYYY-MM-DD&available=true
   * Fetch slots for a doctor. Public – used by patients to book.
   */
  .get(DoctorScheduleController.getSlotsByDoctor)
  /**
   * DELETE /doctors-schedule/:publicId/slots?scheduleId=<id>
   * Bulk-delete future unbooked slots (optionally scoped to a schedule).
   */
  .delete(auth("ADMIN", "SUPER_ADMIN", "DOCTOR"), DoctorScheduleController.deleteFutureUnbookedSlots);

/**
 * PATCH /doctors-schedule/:publicId/slots/:slotId/cancel
 * Cancel a specific slot.
 */
router.patch(
  "/slots/:slotId/cancel",
  auth("ADMIN", "SUPER_ADMIN", "DOCTOR"),
  DoctorScheduleController.cancelSlot,
);

export const scheduleRoute = router;
