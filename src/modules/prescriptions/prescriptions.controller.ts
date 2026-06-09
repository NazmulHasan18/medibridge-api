import { Request, Response } from "express";
import httpStatus from "http-status";
import PrescriptionService from "./prescriptions.service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { prisma } from "../../lib/prisma.js";

// ─── Helper to get the internal DB id from req.user ─────────────────────────
// Assumes req.user = { id: number (user id), role: string }
// And that Doctor/Patient records have been joined onto the request in auth middleware
// OR we resolve it here via the service. Adjust per your auth setup.

async function getDoctorOrPatientId(req: Request): Promise<number> {
  if (req.user?.role === "DOCTOR") {
    const doctor = await prisma.doctor.findUniqueOrThrow({ where: { userId: req.user?.id } });
    return doctor.id;
  } else if (req.user?.role === "PATIENT") {
    const patient = await prisma.patient.findUniqueOrThrow({ where: { userId: req.user?.id } });
    return patient.id;
  } else {
    return Number(req.user?.id);
  }
}

// ─── Controllers ─────────────────────────────────────────────────────────────

const createPrescription = catchAsync(async (req: Request, res: Response) => {
  const doctorId = await getDoctorOrPatientId(req);
  const prescription = await PrescriptionService.createPrescription({
    ...req.body,
    doctorId,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Prescription created successfully",
    data: prescription,
  });
});

const updatePrescription = catchAsync(async (req: Request, res: Response) => {
  const doctorId = await getDoctorOrPatientId(req);
  const { publicId } = req.params;

  const prescription = await PrescriptionService.updatePrescription(publicId, doctorId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Prescription updated successfully",
    data: prescription,
  });
});

const getPrescriptionByAppointment = catchAsync(async (req: Request, res: Response) => {
  const requesterId = await getDoctorOrPatientId(req);
  const requesterRole = (req.user as any).role as string;
  const appointmentId = Number(req.params.appointmentId);

  const prescription = await PrescriptionService.getPrescriptionByAppointment(
    appointmentId,
    requesterId,
    requesterRole,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Prescription fetched successfully",
    data: prescription,
  });
});

const getPrescriptionById = catchAsync(async (req: Request, res: Response) => {
  const requesterId = await getDoctorOrPatientId(req);
  const requesterRole = (req.user as any).role as string;
  const { publicId } = req.params;

  const prescription = await PrescriptionService.getPrescriptionById(publicId, requesterId, requesterRole);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Prescription fetched successfully",
    data: prescription,
  });
});

const getMyPrescriptions = catchAsync(async (req: Request, res: Response) => {
  const id = await getDoctorOrPatientId(req);
  const role = (req.user as any).role as string;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  let result;
  if (role === "PATIENT") {
    result = await PrescriptionService.getPatientPrescriptions(id, page, limit);
  } else {
    result = await PrescriptionService.getDoctorPrescriptions(id, page, limit);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Prescriptions fetched successfully",
    data: result.prescriptions,
    meta: result.meta,
  });
});

const PrescriptionController = {
  createPrescription,
  updatePrescription,
  getPrescriptionByAppointment,
  getPrescriptionById,
  getMyPrescriptions,
};

export default PrescriptionController;
