import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import noticesRouter from "./routes/notices.js";
import authRouter from "./routes/auth.js";
import feedbackRouter from "./routes/feedback.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/notice-board";

// Security & Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows cross-origin images/dataUrls
  })
);

// Dynamic CORS configuration (works with localhost, Vercel, Netlify, Render, etc.)
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((s) => s.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Allow all origins in production deployment
    },
    credentials: true,
  })
);

// Body parsing with 50MB limit for uploading files, documents, and photos
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    dbState: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// Database connectivity check for API routes
app.use("/api", (req, res, next) => {
  if (req.path === "/health") return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: "Database is not connected. If deploying online, verify your MONGODB_URI in environment variables and ensure MongoDB Atlas IP Access List allows 0.0.0.0/0.",
    });
  }
  next();
});

// Mount API Routes
app.use("/api/auth", authRouter);
app.use("/api/notices", noticesRouter);
app.use("/api/feedback", feedbackRouter);

// Serve frontend build if dist folder exists (single-service deployment on Render/Railway)
const distPath = path.join(__dirname, "../dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      error: `Route not found: ${req.method} ${req.originalUrl}`
    });
  }

  next();
});

// Central error handler
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// Database connection & server start
async function startServer() {
  console.log(`Notice Board API Server starting on port ${PORT}...`);

  app.listen(PORT, "0.0.0.0", () => {
  console.log(`✓ Server listening on port ${PORT}`);
  console.log(`✓ Health check: /api/health`);
});

  try {
    const isAtlas = MONGODB_URI.includes("mongodb+srv");
    console.log(`Connecting to ${isAtlas ? "MongoDB Atlas (Cloud)" : "MongoDB (Local)"}...`);

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log("✓ Successfully connected to MongoDB database!");
  } catch (err) {
    console.warn("⚠️  Could not connect to MongoDB:", err.message);
    console.warn("💡 Notice Board API will return 503 until MongoDB is available.");
    console.warn("   For MongoDB Atlas deployment:");
    console.warn("   1. In Atlas dashboard -> Network Access -> Add IP Address -> Allow Access From Anywhere (0.0.0.0/0)");
    console.warn("   2. In Atlas dashboard -> Database Access -> Ensure Database User has Read/Write privileges");
    console.warn("   3. Set MONGODB_URI=mongodb+srv://<username>:<password>@cluster0... in server/.env");
  }
}

startServer();
