import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// GET /api/admin/ping — admins only (403 for authenticated non-admins).
router.get("/admin/ping", requireAdmin, (req, res) => {
  res.json({ ok: true, user: req.user });
});

export default router;
