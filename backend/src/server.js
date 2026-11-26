import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import prisma from "./config/prisma.js";

import authRoutes from "./modules/auth/auth.routes.js";
import attendanceRoutes from "./modules/attendance/attendance.routes.js";
import overtimeRoutes from "./modules/overtime/overtime.routes.js";
import shiftRoutes from "./modules/shifts/shift.routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/overtime", overtimeRoutes);
app.use("/api/shifts", shiftRoutes);

// Root health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "THYO Softtech HRMS Backend is running",
  });
});

// Database health check
app.get("/api/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "Database connected successfully",
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`THYO Softtech HRMS Backend running on port ${PORT}`);
});
