import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import { blogService } from "./blogs.service.js";
import AppError from "../../errors/AppError.js";
import sendResponse from "../../utils/sendResponse.js";

const createBlog = catchAsync(async (req: Request, res: Response) => {
  // req.user is set by your auth middleware
  const doctorId = req.user?.id;
  const doctorName = req.user?.name;

  if (!doctorId) {
    throw new AppError("Doctor id is required", httpStatus.BAD_REQUEST);
  }
  if (!doctorName) {
    throw new AppError("Doctor Name is required", httpStatus.BAD_REQUEST);
  }
  const result = await blogService.createBlog(doctorId, doctorName, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Blog created successfully",
    data: result,
  });
});

const getAllBlogs = catchAsync(async (req: Request, res: Response) => {
  const result = await blogService.getAllBlogs({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: req.query.search as string,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blogs fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});
const getMyBlogs = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("UserId required", httpStatus.BAD_REQUEST);
  }

  const result = await blogService.getMyBlogs(userId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: req.query.search as string,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My Blogs fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getBlogByPublicId = catchAsync(async (req: Request, res: Response) => {
  const result = await blogService.getBlogByPublicId(req.params.publicId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blog fetched successfully",
    data: result,
  });
});

const updateBlog = catchAsync(async (req: Request, res: Response) => {
  const doctorId = req.user?.id;

  if (!doctorId) {
    throw new AppError("Doctor id is required", httpStatus.BAD_REQUEST);
  }

  const result = await blogService.updateBlog(req.params.publicId, doctorId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blog updated successfully",
    data: result,
  });
});

const deleteBlog = catchAsync(async (req: Request, res: Response) => {
  const requesterId = req.user?.id;
  const role = req.user?.role;

  if (!requesterId) {
    throw new AppError("Doctor id is required", httpStatus.BAD_REQUEST);
  }
  if (!role) {
    throw new AppError("Role is required", httpStatus.BAD_REQUEST);
  }
  await blogService.deleteBlog(req.params.publicId, requesterId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blog deleted successfully",
    data: null,
  });
});

const addComment = catchAsync(async (req: Request, res: Response) => {
  const { content } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError("Doctor id is required", httpStatus.BAD_REQUEST);
  }

  const result = await blogService.addComment(req.params.publicId, userId, content);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Comment added successfully",
    data: result,
  });
});

const deleteComment = catchAsync(async (req: Request, res: Response) => {
  const requesterId = req.user?.id;
  const role = req.user?.role;

  if (!requesterId) {
    throw new AppError("Doctor id is required", httpStatus.BAD_REQUEST);
  }
  if (!role) {
    throw new AppError("Role is required", httpStatus.BAD_REQUEST);
  }

  await blogService.deleteComment(req.params.publicId, req.params.commentPublicId, requesterId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Comment deleted successfully",
    data: null,
  });
});

export const blogController = {
  createBlog,
  getAllBlogs,
  getMyBlogs,
  getBlogByPublicId,
  updateBlog,
  deleteBlog,
  addComment,
  deleteComment,
};
