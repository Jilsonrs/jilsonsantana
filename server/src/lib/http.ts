import type { Response } from "express";
import type { ZodSchema } from "zod";

// Request-binding helpers. They live server-side (not in core/) because they
// touch the Express `res` — the *schemas* they validate are the shared core/
// ones. Both follow the same contract: on bad input they send the error response
// and return null, so the caller does `const x = validate(...); if (x === null) return;`.

// Validate a request body against a shared Zod schema. Returns the parsed data,
// or null after sending 400 (Express 5 auto-catches thrown async errors, so we
// surface validation failures explicitly rather than throwing).
export function validate<T>(schema: ZodSchema<T>, body: unknown, res: Response): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: "ValidationError", issues: result.error.issues });
    return null;
  }
  return result.data;
}

// Parse a numeric route param (e.g. /lessons/:id). Returns the positive integer,
// or null after sending 400 for anything non-numeric / non-positive.
export function parseId(param: string | undefined, res: Response): number | null {
  const id = Number(param);
  if (!param || !Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "InvalidId" });
    return null;
  }
  return id;
}
