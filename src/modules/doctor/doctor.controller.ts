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

  sendResponse(res, { data: result });
});

export const DoctorController = {
  getAllDoctor,
};
