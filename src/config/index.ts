import dotenv from "dotenv";

dotenv.config({ path: process.cwd() + "/env" });

export const config = {
  accessSecret: process.env.JWT_ACCESS_SECRET as string,
  sessionSecret: process.env.JWT_SESSION_SECRET as string,
};
