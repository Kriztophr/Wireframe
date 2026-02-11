import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Keys are stored on the client side via localStorage for security
    // This endpoint is optional and can be extended to:
    // 1. Save keys to a secure backend service
    // 2. Write to .env.local during development
    // 3. Sync keys across devices

    // For now, we return success as the keys are managed client-side
    console.log("API keys saved request received");

    return NextResponse.json({
      success: true,
      message: "Keys saved (client-side storage)",
    });
  } catch (error) {
    console.error("Error saving API keys:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save keys" },
      { status: 500 }
    );
  }
}
