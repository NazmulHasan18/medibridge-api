import compression from "compression";
import cors from "cors";
import express from "express";
import { prisma } from "./lib/prisma";
import { userRoute } from "./modules/users/user.route";
import globalErrorHandler from "./errors/globalErrorHandler";
import { AuthRoute } from "./modules/auth/auth.route";
import cookieParser from "cookie-parser";
import morgan from "morgan";
const app = express();

// Middleware
app.use(cors()); // Enables Cross-Origin Resource Sharing
app.use(compression()); // Compresses response bodies for faster delivery
app.use(express.json()); // Parse incoming JSON requests
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(morgan("tiny"));

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
