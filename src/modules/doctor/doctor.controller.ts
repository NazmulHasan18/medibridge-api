import { Request, Response } from "express";
import { DoctorService } from "./doctor.service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

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

export const DoctorController = {
  getAllDoctor,
  fetchAllDoctor,
  getDoctorById,
  deleteDoctor,
  updateDoctor,
};
