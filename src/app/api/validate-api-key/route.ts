import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, key } = body;

    if (!provider || !key) {
      return NextResponse.json(
        { valid: false, error: "Missing provider or key" },
        { status: 400 }
      );
    }

    // Validate key format and make a test call to each provider
    switch (provider) {
      case "gemini":
        return validateGeminiKey(key);
      case "openai":
        return validateOpenAIKey(key);
      case "replicate":
        return validateReplicateKey(key);
      case "fal":
        return validateFalKey(key);
      default:
        return NextResponse.json(
          { valid: false, error: "Unknown provider" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("API key validation error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: "Validation failed",
      },
      { status: 500 }
    );
  }
}

async function validateGeminiKey(key: string): Promise<NextResponse> {
  try {
    // Basic format check for Gemini keys
    if (!key || key.length < 20) {
      return NextResponse.json({ valid: false, error: "Invalid key format" });
    }

    // Make a test request to Gemini API
    const response = await fetch("https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + key, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "test",
              },
            ],
          },
        ],
      }),
    });

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({ valid: false, error: "Invalid API key" });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Gemini validation error:", error);
    return NextResponse.json({ valid: false, error: "Unable to validate" });
  }
}

async function validateOpenAIKey(key: string): Promise<NextResponse> {
  try {
    // Basic format check
    if (!key.startsWith("sk-") || key.length < 20) {
      return NextResponse.json({ valid: false, error: "Invalid OpenAI key format" });
    }

    // Make a test request to OpenAI API
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    if (response.status === 401) {
      return NextResponse.json({ valid: false, error: "Invalid API key" });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("OpenAI validation error:", error);
    return NextResponse.json({ valid: false, error: "Unable to validate" });
  }
}

async function validateReplicateKey(key: string): Promise<NextResponse> {
  try {
    if (!key || key.length < 20) {
      return NextResponse.json({ valid: false, error: "Invalid key format" });
    }

    // Make a test request to Replicate API
    const response = await fetch("https://api.replicate.com/v1/account", {
      headers: {
        Authorization: `Token ${key}`,
      },
    });

    if (response.status === 401) {
      return NextResponse.json({ valid: false, error: "Invalid API key" });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Replicate validation error:", error);
    return NextResponse.json({ valid: false, error: "Unable to validate" });
  }
}

async function validateFalKey(key: string): Promise<NextResponse> {
  try {
    if (!key || key.length < 20) {
      return NextResponse.json({ valid: false, error: "Invalid key format" });
    }

    // Fal.ai keys are typically used in client headers
    // We'll just do basic format validation
    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Fal validation error:", error);
    return NextResponse.json({ valid: false, error: "Unable to validate" });
  }
}
