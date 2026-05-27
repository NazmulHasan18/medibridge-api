import dotenv from "dotenv";

dotenv.config({ path: process.cwd() + "/env" });

export const config = {
  accessSecret: process.env.JWT_ACCESS_SECRET as string,
  sessionSecret: process.env.JWT_SESSION_SECRET as string,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
};
