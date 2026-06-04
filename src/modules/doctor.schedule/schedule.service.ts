import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../errors/AppError.js";
import type {
  CreateScheduleInput,
  UpdateScheduleInput,
  GenerateSlotsInput,
  GetSlotsByDoctorQuery,
} from "./schedule.validations.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "HH:MM" string into { hours, minutes } */
function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

/**
 * Given a date string "YYYY-MM-DD" and "HH:MM" time, build a UTC Date
 * that represents that local wall-clock time (stored as-is in DB).
 */
function buildDateTime(dateStr: string, timeStr: string): Date {
  const { hours, minutes } = parseTime(timeStr);
  const date = new Date(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/** Map JS getDay() (0=Sun) to Prisma WeekDay enum */
const JS_DAY_TO_WEEKDAY: Record<number, string> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

// ─── Resolve doctor by publicId ───────────────────────────────────────────────

async function resolveDoctorByPublicId(publicId: string) {
  if (!publicId) {
    throw new AppError("Public id required", 404);
  }
  const user = await prisma.user.findUnique({
    where: { publicId, deletedAt: null },
    include: { doctor: true },
  });
  const doctor = user?.doctor;

  if (!doctor) throw new AppError("Doctor not found", 404);
  return doctor;
}

// ─── Schedule Services ────────────────────────────────────────────────────────

/**
 * Create a weekly recurring schedule for a doctor.
 * Prevents duplicate day entries (same doctor + same day).
 */
const createSchedule = async (doctorPublicId: string, input: CreateScheduleInput) => {
  const doctor = await resolveDoctorByPublicId(doctorPublicId);

  // Guard: no duplicate day for this doctor
  const existing = await prisma.doctorSchedule.findFirst({
    where: { doctorId: doctor.id, day: input.day as any },
  });
  if (existing) {
    throw new AppError(`A schedule for ${input.day} already exists for this doctor`, 409);
  }

  // Validate time ordering
  const start = parseTime(input.startTime);
  const end = parseTime(input.endTime);
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  if (endMinutes <= startMinutes) {
    throw new AppError("endTime must be after startTime", 400);
  }
  if (endMinutes - startMinutes < input.slotDuration) {
    throw new AppError("Time window is smaller than slotDuration — no slots can be generated", 400);
  }

  return prisma.doctorSchedule.create({
    data: {
      doctorId: doctor.id,
      day: input.day as any,
      startTime: input.startTime,
      endTime: input.endTime,
      slotDuration: input.slotDuration,
      maxPatients: input.maxPatients,
      isActive: input.isActive,
    },
  });
};

/** Get all schedules for a doctor */
const getSchedulesByDoctor = async (doctorPublicId: string) => {
  const doctor = await resolveDoctorByPublicId(doctorPublicId);
  return prisma.doctorSchedule.findMany({
    where: { doctorId: doctor.id },
    orderBy: { day: "asc" },
  });
};

/** Get a single schedule by its id (scoped to doctor) */
const getScheduleById = async (doctorPublicId: string, scheduleId: number) => {
  const doctor = await resolveDoctorByPublicId(doctorPublicId);
  const schedule = await prisma.doctorSchedule.findFirst({
    where: { id: scheduleId, doctorId: doctor.id },
  });
  if (!schedule) throw new AppError("Schedule not found", 404);
  return schedule;
};

/** Update a schedule. If timing fields change, warn consumer to regenerate slots. */
const updateSchedule = async (doctorPublicId: string, scheduleId: number, input: UpdateScheduleInput) => {
  const doctor = await resolveDoctorByPublicId(doctorPublicId);
  const schedule = await prisma.doctorSchedule.findFirst({
    where: { id: scheduleId, doctorId: doctor.id },
  });
  if (!schedule) throw new AppError("Schedule not found", 404);

  // If day is being changed, check no duplicate
  if (input.day && input.day !== (schedule.day as string)) {
    const dup = await prisma.doctorSchedule.findFirst({
      where: { doctorId: doctor.id, day: input.day as any, id: { not: scheduleId } },
    });
    if (dup) throw new AppError(`Schedule for ${input.day} already exists`, 409);
  }

  const updated = await prisma.doctorSchedule.update({
    where: { id: scheduleId },
    data: input as Prisma.DoctorScheduleUpdateInput,
  });

  const timingChanged =
    input.startTime !== undefined || input.endTime !== undefined || input.slotDuration !== undefined;

  return { schedule: updated, timingChanged };
};

/** Delete a schedule and all its future unbooked slots */
const deleteSchedule = async (doctorPublicId: string, scheduleId: number) => {
  const doctor = await resolveDoctorByPublicId(doctorPublicId);
  const schedule = await prisma.doctorSchedule.findFirst({
    where: { id: scheduleId, doctorId: doctor.id },
  });
  if (!schedule) throw new AppError("Schedule not found", 404);

  // Delete future unbooked slots, then the schedule
  await prisma.$transaction([
    prisma.doctorSlot.deleteMany({
      where: {
        scheduleId,
        isBooked: false,
        isCancelled: false,
        startTime: { gte: new Date() },
      },
    }),
    prisma.doctorSchedule.delete({ where: { id: scheduleId } }),
  ]);

  return true;
};

// ─── Slot Services ────────────────────────────────────────────────────────────

/**
 * Generate DoctorSlot rows for given dates from a schedule.
 * Skips slots that already exist (idempotent).
 * Only generates slots whose date's weekday matches the schedule's day.
 */
const generateSlots = async (doctorPublicId: string, scheduleId: number, input: GenerateSlotsInput) => {
  const doctor = await resolveDoctorByPublicId(doctorPublicId);
  const schedule = await prisma.doctorSchedule.findFirst({
    where: { id: scheduleId, doctorId: doctor.id },
  });
  if (!schedule) throw new AppError("Schedule not found", 404);
  if (!schedule.isActive) throw new AppError("Schedule is inactive", 400);

  const created: Array<{ startTime: Date; endTime: Date }> = [];
  const skipped: string[] = [];

  for (const dateStr of input.dates) {
    const date = new Date(dateStr);
    const weekday = JS_DAY_TO_WEEKDAY[date.getDay()];
    if (weekday !== (schedule.day as string)) {
      skipped.push(`${dateStr} (not a ${schedule.day})`);
      continue;
    }

    // Build all time slots for this date
    const startMinutes = parseTime(schedule.startTime).hours * 60 + parseTime(schedule.startTime).minutes;
    const endMinutes = parseTime(schedule.endTime).hours * 60 + parseTime(schedule.endTime).minutes;

    const slotPairs: Array<{ startTime: Date; endTime: Date }> = [];
    for (
      let cursor = startMinutes;
      cursor + schedule.slotDuration <= endMinutes;
      cursor += schedule.slotDuration
    ) {
      const slotStartTime = buildDateTime(
        dateStr,
        `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`,
      );
      const slotEndTime = buildDateTime(
        dateStr,
        `${String(Math.floor((cursor + schedule.slotDuration) / 60)).padStart(2, "0")}:${String((cursor + schedule.slotDuration) % 60).padStart(2, "0")}`,
      );
      slotPairs.push({ startTime: slotStartTime, endTime: slotEndTime });
    }

    // Upsert: skip existing slots (same doctor + startTime)
    for (const pair of slotPairs) {
      const exists = await prisma.doctorSlot.findFirst({
        where: { doctorId: doctor.id, startTime: pair.startTime },
      });
      if (!exists) {
        await prisma.doctorSlot.create({
          data: {
            doctorId: doctor.id,
            scheduleId: schedule.id,
            startTime: pair.startTime,
            endTime: pair.endTime,
          },
        });
        created.push(pair);
      }
    }
  }

  return {
    created: created.length,
    skippedDates: skipped,
  };
};

/**
 * Get available (unbooked, uncancelled, future) slots for a doctor.
 * Optionally filter by date.
 */
const getSlotsByDoctor = async (doctorPublicId: string, query: GetSlotsByDoctorQuery) => {
  const doctor = await resolveDoctorByPublicId(doctorPublicId);

  const where: Prisma.DoctorSlotWhereInput = {
    doctorId: doctor.id,
    startTime: { gte: new Date() },
    ...(query.available !== undefined && {
      isBooked: !query.available,
      isCancelled: false,
    }),
    ...(query.date && {
      startTime: {
        gte: new Date(`${query.date}T00:00:00`),
        lte: new Date(`${query.date}T23:59:59`),
      },
    }),
  };

  return prisma.doctorSlot.findMany({
    where,
    include: { schedule: true },
    orderBy: { startTime: "asc" },
  });
};

/** Cancel a slot (sets isCancelled = true). Cannot cancel already-booked slots. */
const cancelSlot = async (doctorPublicId: string, slotId: number) => {
  const doctor = await resolveDoctorByPublicId(doctorPublicId);
  const slot = await prisma.doctorSlot.findFirst({
    where: { id: slotId, doctorId: doctor.id },
  });
  if (!slot) throw new AppError("Slot not found", 404);
  if (slot.isBooked) throw new AppError("Cannot cancel a booked slot", 400);
  if (slot.isCancelled) throw new AppError("Slot is already cancelled", 400);

  return prisma.doctorSlot.update({
    where: { id: slotId },
    data: { isCancelled: true },
  });
};

/** Delete future unbooked slots in bulk for a doctor (cleanup utility) */
const deleteFutureUnbookedSlots = async (doctorPublicId: string, scheduleId?: number) => {
  const doctor = await resolveDoctorByPublicId(doctorPublicId);
  const { count } = await prisma.doctorSlot.deleteMany({
    where: {
      doctorId: doctor.id,
      isBooked: false,
      isCancelled: false,
      startTime: { gte: new Date() },
      ...(scheduleId !== undefined && { scheduleId }),
    },
  });
  return { deleted: count };
};

// ─── Re-export existing doctor services alongside new ones ────────────────────

export const DoctorScheduleService = {
  // Schedules
  createSchedule,
  getSchedulesByDoctor,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  // Slots
  generateSlots,
  getSlotsByDoctor,
  cancelSlot,
  deleteFutureUnbookedSlots,
};
