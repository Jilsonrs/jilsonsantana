import type { Response } from "express";

// Request-binding helpers. They live server-side (not in core/) because they
// touch the Express `res` — the *schemas* they validate are the shared core/
// ones. Both follow the same contract: on bad input they send the error response
// and return null, so the caller does `const x = validate(...); if (x === null) return;`.

// Structural shape of a Zod schema's safeParse — intentionally NOT importing a
// `ZodSchema` type from "zod". The server tree carries two Zod majors (core uses
// zod 3; better-auth pulls zod 4 into server/node_modules), so a `import { ZodSchema }
// from "zod"` here would resolve to a DIFFERENT zod than the one that built the
// core/ schemas, breaking generic inference. Typing structurally decouples this
// helper from the version entirely — any Zod schema satisfies it.
interface SafeParser<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: { issues: unknown[] } };
}

// Validate a request body against a shared Zod schema. Returns the parsed data,
// or null after sending 400 (Express 5 auto-catches thrown async errors, so we
// surface validation failures explicitly rather than throwing).
export function validate<T>(schema: SafeParser<T>, body: unknown, res: Response): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: "ValidationError", issues: result.error.issues });
    return null;
  }
  return result.data;
}

// Parse a numeric route param (e.g. /lessons/:id). Returns the positive integer,
// or null after sending 400 for anything non-numeric / non-positive.
//
// Accepts `string[]` too: with @types/express v5, routes that carry middleware
// (e.g. requireAdmin) lose the path-literal param inference and `req.params.id`
// widens to `string | string[]`. At runtime a `:id` param is always a single
// string; an array would be malformed → rejected.
export function parseId(param: string | string[] | undefined, res: Response): number | null {
  const raw = Array.isArray(param) ? param[0] : param;
  const id = Number(raw);
  if (!raw || !Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "InvalidId" });
    return null;
  }
  return id;
}
