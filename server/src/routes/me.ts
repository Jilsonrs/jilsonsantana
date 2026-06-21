import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/me — any authenticated user. Echoes the session user.
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
