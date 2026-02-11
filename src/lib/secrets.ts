// Lightweight secrets manager abstraction for server-side API key retrieval.
// This module prefers environment variables but provides placeholders
// for integrating with Vault/AWS/GCP secret stores.

export type SecretsProvider = "env" | "aws" | "gcp" | "vault";

// Map known provider IDs to environment variable names used by the app.
const PROVIDER_ENV_MAP: Record<string, string> = {
  gemini: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  claude: "CLAUDE_API_KEY",
  kimi: "KIMI_API_KEY",
  kimi_url: "KIMI_API_URL",
  // image/video providers
  kling: "KLING_API_KEY",
};

// Simple in-memory cache with TTL to avoid repeated secret manager calls.
const secretCache = new Map<string, { value: string; expiresAt: number }>();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch a secret value for a provider. Order of precedence:
 * 1. Environment variable (e.g. GEMINI_API_KEY)
 * 2. SECRET_NAME_<PROVIDER> environment variable pointing to AWS Secret Name
 * 3. AWS Secrets Manager when SECRET_PROVIDER=aws
 * 4. null
 */
export async function getProviderSecret(providerId: string): Promise<string | null> {
  // 1) Check environment variables first
  const envKey = PROVIDER_ENV_MAP[providerId] || null;
  if (envKey && process.env[envKey]) return process.env[envKey] as string;

  // 2) Check explicit secret name env var (SECRET_NAME_<PROVIDER>)
  const secretNameEnv = process.env[`SECRET_NAME_${providerId.toUpperCase()}`];
  const secretProvider = (process.env.SECRET_PROVIDER || "env") as SecretsProvider;

  if (secretProvider === "env") return secretNameEnv ? process.env[secretNameEnv] ?? null : null;

  // If caching present and not expired, return cached
  const cacheKey = `${secretProvider}:${providerId}`;
  const cached = secretCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  if (secretProvider === "aws") {
    // Prefer explicit secret name; otherwise allow mapping via PROVIDER_ENV_MAP name
    const secretName = secretNameEnv || process.env[`SECRET_NAME`] || providerId;
    try {
      const { SecretsManagerClient, GetSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");

      const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
      const client = new SecretsManagerClient({ region });
      const cmd = new GetSecretValueCommand({ SecretId: secretName });
      const res = await client.send(cmd);
      const secretString = (res.SecretString as string) || null;
      if (!secretString) return null;

      // Secret may be JSON -> try to parse and extract by key (e.g., { "GEMINI_API_KEY": "..." })
      try {
        const parsed = JSON.parse(secretString);
        // If parsed is object and contains our envKey, use that value
        if (envKey && parsed && typeof parsed === "object" && parsed[envKey]) {
          secretCache.set(cacheKey, { value: parsed[envKey], expiresAt: Date.now() + DEFAULT_TTL_MS });
          return parsed[envKey];
        }
      } catch (e) {
        // Not JSON, fall through
      }

      // If secretString is plain text, return it
      secretCache.set(cacheKey, { value: secretString, expiresAt: Date.now() + DEFAULT_TTL_MS });
      return secretString;
    } catch (err) {
      // Bubble up or return null — callers should handle missing secrets gracefully
      throw new Error(`Failed to retrieve secret for ${providerId} from AWS Secrets Manager: ${String(err)}`);
    }
  }

  // TODO: add GCP / Vault implementations here
  if (secretProvider === "gcp" || secretProvider === "vault") {
    throw new Error(`${secretProvider} secret retrieval not implemented in this build`);
  }

  return null;
}

export async function getProviderApiKey(providerId: string): Promise<string | null> {
  try {
    return await getProviderSecret(providerId);
  } catch (err) {
    // Don't crash the server; upstream callers should handle nulls and log as needed.
    return null;
  }
}

export default {
  getProviderApiKey,
  getProviderSecret,
};
