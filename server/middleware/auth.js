import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "notice-board-secret-key-change-in-prod";

export function signToken(user) {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.role,
      adminType: user.adminType,
      status: user.status,
      name: user.name,
      college: user.college,
      department: user.department,
      year: user.year,
      section: user.section,
      regNo: user.regNo,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }
    if (user.status !== "approved") {
      return res.status(403).json({
        error: "Your account is pending approval by the Dean or HOD. Please contact administration.",
      });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
  }
}

export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.status === "approved") {
      req.user = user;
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin privileges required" });
  }
  if (req.user.status !== "approved") {
    return res.status(403).json({ error: "Your account is pending approval" });
  }
  next();
}

export function requireHODorDean(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  if (req.user.adminType !== "HOD" && req.user.adminType !== "Dean") {
    return res.status(403).json({ error: "Forbidden: HOD or Dean privileges required" });
  }
  next();
}

export function requireDean(req, res, next) {
  if (!req.user || req.user.role !== "admin" || req.user.adminType !== "Dean") {
    return res.status(403).json({ error: "Forbidden: Dean privileges required" });
  }
  next();
}
