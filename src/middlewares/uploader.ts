// src/middlewares/uploader.ts

import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";
import { Request } from "express";
import { config } from "../config";

// cloudinary config
cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
});

// storage config
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => {
    return {
      folder: "medibridge",
      resource_type: "auto",

      // optional
      allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"],

      // unique file name
      public_id: `${Date.now()}-${file.originalname.split(".")[0].replace(/\s+/g, "-")}`,
    };
  },
});

// multer uploader
export const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});
