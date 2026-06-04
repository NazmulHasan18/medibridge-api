import compression from "compression";
import cors from "cors";
import express from "express";
import { userRoute } from "./modules/users/user.route.js";
import globalErrorHandler from "./errors/globalErrorHandler.js";
import { AuthRoute } from "./modules/auth/auth.route.js";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { doctorRoute } from "./modules/doctor/doctor.route.js";
import { scheduleRoute } from "./modules/doctor.schedule/schedule.route.js";
const app = express();

// Middleware
// app.use(cors());
app.use(
  cors({
    origin: ["http://localhost:3000", "https://medibridge-patient.vercel.app"],
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json());
app.use(cookieParser());

app.use(morgan("tiny"));

app.use("/api/v1/doctors-schedule/:publicId", scheduleRoute);
app.use("/api/v1/doctors", doctorRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/auth", AuthRoute);

// Default route for testing
app.get("/", (_req, res) => {
  res.send("API is running");
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

app.use(globalErrorHandler);

export default app;
