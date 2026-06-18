import { Request, Response } from "express";
import { DoctorService } from "./doctor.service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import AppError from "../../errors/AppError.js";

const getAllDoctor = catchAsync(async (req: Request, res: Response) => {
  const { search, page, limit, specialization } = req?.query;

  const result = await DoctorService.getAllDoctor({
    search: search as string,
    page: Number(page) || 1,
    limit: Number(limit) || 10,
    specialization: specialization as string,
  });

  sendResponse(res, { data: result, message: "Doctors fetched successfully" });
});

const fetchAllDoctor = catchAsync(async (req: Request, res: Response) => {
  const { search, page, limit, specialization } = req?.query;

  const result = await DoctorService.fetchAllDoctor({
    search: search as string,
    page: Number(page) || 1,
    limit: Number(limit) || 10,
    specialization: specialization as string,
  });

  sendResponse(res, { data: result, message: "Doctors fetched successfully" });
});

const getDoctorById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req?.params;

  if (!id) {
    throw new Error("Doctor ID is required");
  }

  const result = await DoctorService.getDoctorById(id);

  sendResponse(res, { data: result, message: "Doctor fetched successfully" });
});

const deleteDoctor = catchAsync(async (req: Request, res: Response) => {
  const { id } = req?.params;

  if (!id) {
    throw new Error("Doctor ID is required");
  }

  const result = await DoctorService.deleteDoctor(id);
  sendResponse(res, { data: result, message: "Doctor deleted successfully" });
});

const updateDoctor = catchAsync(async (req: Request, res: Response) => {
  const { id } = req?.params;

  if (!id) {
    throw new Error("Doctor ID is required");
  }

  const result = await DoctorService.updateDoctor(id, req.body);

  sendResponse(res, { data: result, message: "Doctor updated successfully" });
});

const getAvailableDoctors = catchAsync(async (req, res) => {
  const { specialization, appointmentDate } = req.query;

  if (!specialization || !appointmentDate) {
    throw new AppError("Specialization and appointmentDate is required", 400);
  }

  const result = await DoctorService.getAllAvailableDoctor({
    specialization: specialization as string,
    appointmentDate: appointmentDate as string,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.available ? "Available doctors retrieved successfully." : result.message,
    data: result,
  });
});
const getAllSpecializations = catchAsync(async (req, res) => {
  const result = await DoctorService.getAllSpecialization();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Fetch all specializations",
    data: result,
  });
});

export const DoctorController = {
  getAllDoctor,
  fetchAllDoctor,
  getDoctorById,
  deleteDoctor,
  updateDoctor,
  getAvailableDoctors,
  getAllSpecializations,
};
