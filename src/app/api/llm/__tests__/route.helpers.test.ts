import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateWithClaude, generateWithKimi } from "../route";

describe("LLM helper functions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generateWithClaude returns trimmed completion text", async () => {
    const fakeJson = { completion: "Assistant: Hello from Claude\n" };
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(fakeJson) } as any)) as any;

    const result = await generateWithClaude("Say hi", "gpt-4.1-mini", 0.5, 100, [], "req-1", "fake-key");
    expect(result).toBe("Hello from Claude");
  });

  it("generateWithKimi posts to custom API URL and returns text", async () => {
    const fakeJson = { text: "Hello from Kimi" };
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(fakeJson) } as any)) as any;

    const result = await generateWithKimi("Say hi", "gpt-4.1-mini", 0.5, 100, [], "req-2", "fake-key", "https://kimi.example/api/v1/chat");
    expect(result).toBe("Hello from Kimi");
  });
});
