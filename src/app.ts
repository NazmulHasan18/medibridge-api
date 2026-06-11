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
import { appointmentRoutes } from "./modules/appointments/appointments.route.js";
import { sendEmail } from "./helpers/sendEmail.js";
import prescriptionRoutes from "./modules/prescriptions/prescripitons.routes.js";
import { blogRoutes } from "./modules/blogs/blogs.route.js";
import { patientRoute } from "./modules/patients/patient.route.js";
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

app.use("/api/v1/patients", patientRoute);
app.use("/api/v1/blogs", blogRoutes);
app.use("/api/v1/prescriptions", prescriptionRoutes);
app.use("/api/v1/appointment", appointmentRoutes);
app.use("/api/v1/doctors-schedule/:publicId", scheduleRoute);
app.use("/api/v1/doctors", doctorRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/auth", AuthRoute);

app.get("/test", async (req, res) => {
  const response = await sendEmail({
    to: "nazmul182218@gmail.com",
    subject: "New Appointment Booked",
    template: "newAppointmentDoctor",
    data: {
      patientName: "patientName",
      appointmentDate: String(new Date()),
    },
  });
  res.json({ response });
});

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
