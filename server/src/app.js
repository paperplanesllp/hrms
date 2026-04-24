import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { corsOptions } from "./config/cors.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { noCache } from "./middleware/noCache.js";
import { authErrorLogger } from "./middleware/errorLogging.js";

import authRoutes from "./modules/auth/auth.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import attendanceRoutes from "./modules/attendance/attendance.routes.js";
import leaveRoutes from "./modules/leave/leave.routes.js";
import leaveTypeRoutes from "./modules/leaveType/leaveType.routes.js";
import newsRoutes from "./modules/news/news.routes.js";
import policyRoutes from "./modules/policy/policy.routes.js";
import policiesRoutes from "./modules/policies/policies.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";
import payrollRoutes from "./modules/payroll/payroll.routes.js";
import calendarRoutes from "./modules/calendar/calendar.routes.js";
import worksheetRoutes from "./modules/worksheet/worksheet.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import chatRoutes from "./modules/chat/chat.routes.js";
import auditRoutes from "./modules/audit/audit.routes.js";
import complaintRoutes from "./modules/complaints/complaints.routes.js";
import departmentRoutes from "./modules/department/department.routes.js";
import documentRoutes from "./modules/documents/document.routes.js";
import activityRoutes from "./modules/activity/activity.routes.js";
import tasksRoutes from "./modules/tasks/tasks.routes.js";
import extensionRoutes from "./modules/tasks/extension.routes.js";
import callsRoutes from "./modules/calls/call.routes.js";

export function createApp() {
  const app = express();

  // Get absolute path to uploads directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const uploadsPath = path.join(__dirname, "../uploads");

  console.log("📁 [SERVER] Uploads directory:", uploadsPath);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          frameAncestors: ["'self'", "http://localhost:5174", "http://localhost:5175"],
        },
      },
    })
  );
  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  // Serve static files from uploads directory with CORS headers and proper Content-Type
  app.use("/uploads", (req, res, next) => {
    const fullPath = path.join(uploadsPath, req.path);
    console.log("📥 [STATIC] Requested file:", req.path);
    console.log("📥 [STATIC] Full path:", fullPath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  [STATIC] File not found: ${fullPath}`);
    }
    
    // Set proper Content-Type and headers based on file type
    if (req.path.toLowerCase().endsWith('.pdf')) {
      res.type('application/pdf');
      res.header("Content-Disposition", "attachment");
      console.log("📄 [STATIC] Serving PDF file");
    } else if (req.path.toLowerCase().endsWith('.png')) {
      res.type('image/png');
    } else if (req.path.toLowerCase().endsWith('.jpg') || req.path.toLowerCase().endsWith('.jpeg')) {
      res.type('image/jpeg');
    }
    
    // CORS headers
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Cache-Control", "public, max-age=3600");
    next();
  }, express.static(uploadsPath, { 
    setHeaders: (res, path, stat) => {
      console.log("📥 [STATIC] Serving file successfully:", path);
    }
  }));

  app.get("/health", (req, res) => res.json({ ok: true }));

  // Apply no-cache headers to all API routes (must be before route mounting)
  app.use("/api", noCache);

  app.use("/api/auth", authRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/leave", leaveRoutes);
  app.use("/api/leave-types", leaveTypeRoutes);
  app.use("/api/news", newsRoutes);
  app.use("/api/policy", policyRoutes);
  app.use("/api/policies", policiesRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/payroll", payrollRoutes);
  app.use("/api/calendar", calendarRoutes);
  app.use("/api/worksheet", worksheetRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/audit", auditRoutes);
  app.use("/api/complaints", complaintRoutes);
  app.use("/api/department", departmentRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/activity", activityRoutes);
  app.use("/api/tasks", tasksRoutes);
  app.use("/api/extensions", extensionRoutes);
  app.use("/api/calls", callsRoutes);

  app.use(notFound);
  app.use(authErrorLogger);  // ✅ Log auth errors before global error handler
  app.use(errorHandler);

  return app;
}