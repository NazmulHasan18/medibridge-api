import dotenv from "dotenv";

dotenv.config({ path: process.cwd() + "/env" });

export const config = {
  nodeEnv: process.env.NODE_ENV as string,
  //db url
  dbUrl: process.env.DATABASE_URL as string,
  // jwt secret
  accessSecret: process.env.JWT_ACCESS_SECRET as string,
  sessionSecret: process.env.JWT_SESSION_SECRET as string,
  // file upload
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET as string,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY as string,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME as string,
  //payment
  sslcommerz: {
    storeId: process.env.SSL_STORE_ID as string,
    storePassword: process.env.SSL_STORE_PASS as string,
    isSandbox: process.env.NODE_ENV !== "production",
  },
  serverUrl: process.env.SERVER_URL as string,
  clientUrl: process.env.CLIENT_URL as string,
  meetingBaseUrl: process.env.MEETING_BASE_URL as string,

  // google
  googleClientId: process.env.GOOGLE_CLIENT_ID as string,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  googleRedirectUrl: process.env.GOOGLE_REDIRECT_URL as string,
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN as string,
  // resend
  resendApiKey: process.env.RESEND_API_KEY as string,
  mailFrom: process.env.MAIL_FROM as string,
  // openAi
  groq_api_key: process.env.GROQ_API_KEY as string,
};
