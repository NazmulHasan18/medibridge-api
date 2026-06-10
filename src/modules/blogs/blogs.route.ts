import express from "express";
import { blogController } from "./blogs.controller.js";
import { auth } from "../../middlewares/auth.js";
import { UserRole } from "@prisma/client";

const router = express.Router();

// Public routes
router.get("/", blogController.getAllBlogs);
router.get("/my", auth(UserRole.DOCTOR), blogController.getMyBlogs);
router.get("/:publicId", blogController.getBlogByPublicId);

// Comment routes (user & doctor)
router.post(
  "/:publicId/comments",
  auth(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  blogController.addComment,
);
router.delete(
  "/:publicId/comments/:commentPublicId",
  auth(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  blogController.deleteComment,
);

// Doctor routes
router.post("/", auth(UserRole.DOCTOR), blogController.createBlog);
router.patch("/:publicId", auth(UserRole.DOCTOR), blogController.updateBlog);
router.delete(
  "/:publicId",
  auth(UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  blogController.deleteBlog,
);

export const blogRoutes = router;
