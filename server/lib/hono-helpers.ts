/**
 * Small helpers shared across the Hono route modules.
 */
import type { Context } from 'hono';

/**
 * Parse a JSON request body, returning `null` instead of throwing when the
 * body is missing or malformed. Mirrors the old Express `req.body ?? null`
 * behavior (Express pre-parsed the body via `express.json()`; Hono parses on
 * demand and throws on empty/invalid input).
 */
export async function readJson<T>(c: Context): Promise<T | null> {
  try {
    return (await c.req.json()) as T;
  } catch {
    return null;
  }
}
