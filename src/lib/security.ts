/**
 * Security utilities for API key handling and protection
 * Prevents sensitive data disclosure and enforces security boundaries
 */

import { NextRequest, NextResponse } from "next/server";

// PRODUCTION MODE: if true, API keys are NEVER stored in browser localStorage
const PRODUCTION_MODE = process.env.NODE_ENV === "production" || process.env.SECURE_KEY_STORAGE === "true";

// Rate limiting in-memory store: requestId -> { count, resetTime }
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Constants for rate limiting
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const VALIDATE_KEY_LIMIT = 5; // 5 validations per minute
const SAVE_KEYS_LIMIT = 10; // 10 saves per minute

/**
 * Rate limiter for API endpoints
 * Returns { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number = RATE_LIMIT_WINDOW_MS
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  let count = 0;
  let resetTime = now + windowMs;

  if (entry && entry.resetTime > now) {
    // Window is still active
    count = entry.count + 1;
    resetTime = entry.resetTime;
  } else {
    // Window has expired or doesn't exist
    count = 1;
    resetTime = now + windowMs;
  }

  rateLimitStore.set(identifier, { count, resetTime });

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetTime,
  };
}

/**
 * Validate CORS origin - ensure request comes from our app, not a third-party
 * Returns { allowed: boolean, reason?: string }
 */
export function validateOrigin(request: NextRequest): { allowed: boolean; reason?: string } {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // In development, allow localhost
  if (process.env.NODE_ENV === "development") {
    return { allowed: true };
  }

  const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",").map((o) => o.trim()).filter((o) => o.length > 0);

  if (allowedOrigins.length === 0) {
    // If no origins are configured, reject cross-origin requests in production
    if (!origin || !origin.includes("localhost")) {
      return { allowed: false, reason: "Missing CORS configuration" };
    }
  } else if (!allowedOrigins.includes(origin || "")) {
    return { allowed: false, reason: "Origin not allowed" };
  }

  return { allowed: true };
}

/**
 * Sanitize error messages to not leak sensitive information
 * Maps detailed errors to generic messages in production
 */
export function sanitizeErrorMessage(error: Error | string, isProduction: boolean = PRODUCTION_MODE): string {
  const message = typeof error === "string" ? error : error.message;

  if (!isProduction) {
    return message; // Show full error in development
  }

  // In production, map specific errors to generic messages
  if (message.includes("API_KEY") || message.includes("GEMINI_API_KEY") || message.includes("OPENAI_API_KEY")) {
    return "Configuration incomplete. Contact administrator.";
  }
  if (message.includes("401") || message.includes("403") || message.includes("Unauthorized")) {
    return "Authentication failed. Please verify your configuration.";
  }
  if (message.includes("429") || message.includes("rate limit")) {
    return "Too many requests. Please try again later.";
  }
  if (message.includes("fetch") || message.includes("network") || message.includes("ECONNREFUSED")) {
    return "Service unavailable. Please try again later.";
  }

  return "Operation failed. Please try again later.";
}

/**
 * Validate API key format to prevent injection attacks
 * Keys should be alphanumeric with hyphens/underscores
 */
export function isValidKeyFormat(key: string): boolean {
  if (!key || typeof key !== "string") return false;
  if (key.length < 10 || key.length > 500) return false;

  // Allow alphanumeric, hyphens, underscores, dots (common in API keys)
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  return validPattern.test(key);
}

/**
 * Hash a key for logging/audit purposes (non-reversible)
 * Shows only first 8 and last 4 characters
 */
export function hashKeyForLogging(key: string): string {
  if (!key || key.length < 12) return "***";
  return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
}

/**
 * Create a rate limit error response
 */
export function createRateLimitResponse(resetTime: number): NextResponse {
  const secondsUntilReset = Math.ceil((resetTime - Date.now()) / 1000);
  return NextResponse.json(
    {
      success: false,
      error: "Too many requests. Please try again later.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(secondsUntilReset),
        "X-RateLimit-Reset": new Date(resetTime).toISOString(),
      },
    }
  );
}

/**
 * Create a CORS error response
 */
export function createCorsErrorResponse(reason?: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: "Request not allowed",
    },
    { status: 403 }
  );
}

/**
 * Check if production mode requires server-side secrets only
 */
export function isProductionSecureMode(): boolean {
  return PRODUCTION_MODE;
}

/**
 * List of sensitive headers that should never be logged or exposed
 */
export const SENSITIVE_HEADERS = ["authorization", "x-gemini-api-key", "x-openai-api-key", "x-claude-api-key", "x-kimi-api-key", "x-replicate-api-key", "x-fal-api-key", "x-kling-api-key"];

/**
 * Sanitize headers for logging - remove sensitive headers
 */
export function sanitizeHeadersForLogging(headers: Headers): Record<string, string> {
  const safe: Record<string, string> = {};

  for (const [key, value] of headers.entries()) {
    if (!SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      safe[key] = value;
    }
  }

  return safe;
}

export default {
  checkRateLimit,
  validateOrigin,
  sanitizeErrorMessage,
  isValidKeyFormat,
  hashKeyForLogging,
  createRateLimitResponse,
  createCorsErrorResponse,
  isProductionSecureMode,
  SENSITIVE_HEADERS,
  sanitizeHeadersForLogging,
};
