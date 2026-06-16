import AppError from "../../errors/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import httpStatus from "http-status";
import sendResponse from "../../utils/sendResponse.js";
import { patientService } from "./patient.service.js";

const fetchMyPatient = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("User id is required", httpStatus.BAD_REQUEST);
  }

  const result = await patientService.fetchMyPatient(userId);

  sendResponse(res, {
    message: "Fetch Patient successfully",
    data: result,
    statusCode: 200,
    success: true,
  });
});
const fetchPatient = catchAsync(async (req, res) => {
  const result = await patientService.fetchAllPatients(req.query);

  sendResponse(res, {
    message: "Fetch all Patient successfully",
    data: result.data,
    meta: result.meta,
    statusCode: 200,
    success: true,
  });
});
const fetchPatientAppointments = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("User id is required", httpStatus.BAD_REQUEST);
  }
  const { patientId } = req.params;
  if (!patientId) {
    throw new AppError("Patient id is required", httpStatus.BAD_REQUEST);
  }

  const result = await patientService.fetchPatientAppointment(userId, patientId);

  sendResponse(res, {
    message: "Fetch Patient Appointment successfully",
    data: result,
    statusCode: 200,
    success: true,
  });
});
const fetchPatientAllAppointments = catchAsync(async (req, res) => {
  const { patientId } = req.params;
  if (!patientId) {
    throw new AppError("Patient id is required", httpStatus.BAD_REQUEST);
  }

  const result = await patientService.fetchPatientAllAppointment(patientId);

  sendResponse(res, {
    message: "Fetch Patient All Appointment successfully",
    data: result.data,
    meta: result.meta,
    statusCode: 200,
    success: true,
  });
});

export const patientController = {
  fetchMyPatient,
  fetchPatientAppointments,
  fetchPatientAllAppointments,
  fetchPatient,
};
