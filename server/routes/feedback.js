import express from "express";
import { Feedback } from "../models/Feedback.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

// POST /api/feedback - Submit feedback/support request
router.post("/", optionalAuth, async (req, res) => {
  try {
    const { name, email, category, message } = req.body;

    if (!message || message.trim().length < 5) {
      return res.status(400).json({ error: "Please enter a feedback message (at least 5 characters)." });
    }

    const feedback = new Feedback({
      name: (name && name.trim()) || req.user?.name || "Anonymous Student",
      email: (email && email.trim()) || req.user?.email || "anonymous@vignan.ac.in",
      category: category || "Suggestion",
      message: message.trim(),
      userId: req.user ? req.user._id : null,
    });

    await feedback.save();

    return res.status(201).json({
      message: "Thank you! Your feedback has been submitted successfully to college administration.",
      id: feedback._id,
    });
  } catch (err) {
    console.error("Feedback error:", err);
    return res.status(500).json({ error: "Failed to submit feedback. Please try again." });
  }
});

export default router;
