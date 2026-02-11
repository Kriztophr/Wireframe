import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, createRateLimitResponse, isValidKeyFormat, validateOrigin, createCorsErrorResponse, isProductionSecureMode, sanitizeErrorMessage } from "@/lib/security";
import { logger } from "@/utils/logger";

// Rate limit: 10 saves per minute per IP
const SAVE_KEYS_LIMIT = 10;

export async function POST(request: NextRequest) {
  try {
    // Validate CORS origin
    const originCheck = validateOrigin(request);
    if (!originCheck.allowed) {
      logger.warn('api.error', 'CORS validation failed for save-keys', { reason: originCheck.reason });
      return createCorsErrorResponse(originCheck.reason);
    }

    // Get client IP for rate limiting
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimitKey = `save-keys:${clientIp}`;

    // Check rate limit
    const rateLimit = checkRateLimit(rateLimitKey, SAVE_KEYS_LIMIT);
    if (!rateLimit.allowed) {
      logger.warn('api.error', 'Rate limit exceeded for save-keys', { clientIp, remaining: rateLimit.remaining });
      return createRateLimitResponse(rateLimit.resetTime);
    }

    const body = await request.json();
    if (!body || typeof body !== "object") {
      logger.warn('workflow.validation', 'Invalid request body for save-keys', { clientIp });
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    // Validate all keys in the request
    const providers = Object.keys(body);
    for (const provider of providers) {
      const keyData = body[provider];
      if (keyData && keyData.key && !isValidKeyFormat(keyData.key)) {
        logger.warn('workflow.validation', 'Invalid key format in save-keys request', { clientIp, provider });
        return NextResponse.json(
          { success: false, error: "Invalid key format" },
          { status: 400 }
        );
      }
    }

    logger.info('api.error', 'API keys save request received', {
      clientIp,
      providers: providers.length,
      remaining: rateLimit.remaining,
    });

    // In production with SECURE_KEY_STORAGE=true, refuse to store keys client-side
    if (isProductionSecureMode()) {
      logger.warn('api.error', 'Key storage refused in production secure mode', { clientIp });
      return NextResponse.json(
        {
          success: false,
          error: "Keys must be configured via environment variables or secrets manager in production",
        },
        { status: 403 }
      );
    }

    // Keys are stored on the client side via localStorage for development
    // This endpoint can be extended to:
    // 1. Save keys to a secure backend service
    // 2. Write to .env.local during development
    // 3. Sync keys across devices
    // 4. Audit log key operations

    logger.info('api.error', 'API keys saved (client-side storage)', {
      clientIp,
      providers: providers.length,
    });

    return NextResponse.json({
      success: true,
      message: "Keys saved (client-side storage)",
    });
  } catch (error) {
    logger.error('api.error', 'Error saving API keys', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        success: false,
        error: sanitizeErrorMessage(error instanceof Error ? error : String(error)),
      },
      { status: 500 }
    );
  }
}
