import httpStatus from "http-status";
import slugify from "slugify"; // npm i slugify
import { prisma } from "../../lib/prisma.js";
import AppError from "../../errors/AppError.js";
import { Prisma } from "@prisma/client";

// ─── Blog Services ────────────────────────────────────────────────

const createBlog = async (
  userId: number,
  doctorName: string,
  payload: {
    title: string;
    content: string;
    thumbnail?: string;
  },
) => {
  const doctor = await prisma.doctor.findUniqueOrThrow({ where: { userId } });
  const doctorId = doctor.id;

  const slug = slugify(payload.title, { lower: true, strict: true });

  // Ensure slug uniqueness
  const existing = await prisma.blog.findUnique({ where: { slug } });
  if (existing) {
    throw new AppError("A blog with this title already exists", httpStatus.CONFLICT);
  }

  const blog = await prisma.blog.create({
    data: {
      ...payload,
      doctorId,
      doctorName,
      slug,
    },
  });

  return blog;
};

const getAllBlogs = async (query: { page?: number; limit?: number; search?: string }) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const where = query.search
    ? {
        OR: [
          { title: { contains: query.search, mode: "insensitive" as const } },
          { doctorName: { contains: query.search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [blogs, total] = await Promise.all([
    prisma.blog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { comments: true } },
        doctor: { select: { specialization: true } },
      },
    }),
    prisma.blog.count({ where }),
  ]);

  return {
    data: blogs,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};
const getMyBlogs = async (userId: number, query: { page?: number; limit?: number; search?: string }) => {
  const doctor = await prisma.doctor.findUniqueOrThrow({ where: { userId } });

  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const where: Prisma.BlogWhereInput = query.search
    ? {
        OR: [
          { title: { contains: query.search, mode: "insensitive" as const } },
          { doctorName: { contains: query.search, mode: "insensitive" as const } },
        ],
        doctorId: doctor.id,
      }
    : { doctorId: doctor.id };

  const [blogs, total] = await Promise.all([
    prisma.blog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { comments: true } },
      },
    }),
    prisma.blog.count({ where }),
  ]);

  return {
    data: blogs,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getBlogByPublicId = async (publicId: string) => {
  const blog = await prisma.blog.findUnique({
    where: { publicId },
    include: {
      comments: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, profileImage: true },
          },
        },
      },
    },
  });

  if (!blog) {
    throw new AppError("Blog not found", httpStatus.NOT_FOUND);
  }

  return blog;
};

const updateBlog = async (
  publicId: string,
  userId: number,
  payload: Partial<{ title: string; content: string; thumbnail: string }>,
) => {
  const blog = await prisma.blog.findUnique({ where: { publicId } });

  if (!blog) {
    throw new AppError("Blog not found", httpStatus.NOT_FOUND);
  }

  const doctor = await prisma.doctor.findUniqueOrThrow({ where: { userId } });

  const doctorId = doctor.id;
  // Only the owning doctor can update
  if (blog.doctorId !== doctorId) {
    throw new AppError("You are not authorized to update this blog", httpStatus.FORBIDDEN);
  }

  // Re-slug if title changed
  let slug = blog.slug;
  if (payload.title && payload.title !== blog.title) {
    slug = slugify(payload.title, { lower: true, strict: true });
    const existing = await prisma.blog.findFirst({
      where: { slug, NOT: { publicId } },
    });
    if (existing) {
      throw new AppError("A blog with this title already exists", httpStatus.CONFLICT);
    }
  }

  return prisma.blog.update({
    where: { publicId },
    data: { ...payload, slug },
  });
};

const deleteBlog = async (publicId: string, requesterId: number, role: string) => {
  const blog = await prisma.blog.findUnique({ where: { publicId } });

  if (!blog) {
    throw new AppError("Blog not found", httpStatus.NOT_FOUND);
  }

  // Admin can delete any blog; doctor can only delete their own
  if (role === "doctor" && blog.doctorId !== requesterId) {
    throw new AppError("You are not authorized to delete this blog", httpStatus.FORBIDDEN);
  }

  await prisma.blog.delete({ where: { publicId } });
};

// ─── Comment Services ─────────────────────────────────────────────

const addComment = async (blogPublicId: string, userId: number, content: string) => {
  const blog = await prisma.blog.findUnique({ where: { publicId: blogPublicId } });

  if (!blog) {
    throw new AppError("Blog not found", httpStatus.NOT_FOUND);
  }

  return prisma.comment.create({
    data: {
      content,
      userId,
      blogId: blog.id,
    },
    include: {
      user: { select: { id: true, name: true, profileImage: true } },
    },
  });
};

const deleteComment = async (
  blogPublicId: string,
  commentPublicId: string,
  requesterId: number,
  role: string,
) => {
  const blog = await prisma.blog.findUnique({ where: { publicId: blogPublicId } });
  if (!blog) throw new AppError("Blog not found", httpStatus.NOT_FOUND);

  const comment = await prisma.comment.findUnique({ where: { publicId: commentPublicId } });
  if (!comment) throw new AppError("Comment not found", httpStatus.NOT_FOUND);

  // Admin can delete any comment
  // Doctor can delete comments on their own blogs
  // User can delete only their own comments
  const isAdmin = role === "admin";
  const isDoctorOwner = role === "doctor" && blog.doctorId === requesterId;
  const isCommentOwner = comment.userId === requesterId;

  if (!isAdmin && !isDoctorOwner && !isCommentOwner) {
    throw new AppError("You are not authorized to delete this comment", httpStatus.FORBIDDEN);
  }

  await prisma.comment.delete({ where: { publicId: commentPublicId } });
};

export const blogService = {
  createBlog,
  getAllBlogs,
  getMyBlogs,
  getBlogByPublicId,
  updateBlog,
  deleteBlog,
  addComment,
  deleteComment,
};
