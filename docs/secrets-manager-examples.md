# Secrets Manager Examples

This file provides example approaches for keeping API keys out of the browser and in a server-side secret store.

Preferred approach (production):

- Store provider API keys in a secrets manager (AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault).
- At runtime fetch secrets from the manager in server-side code (e.g. API routes), not in the browser.
- Minimize environment variables; prefer ephemeral short-lived credentials where possible.

Minimal examples and pointers:

- AWS Secrets Manager: use `@aws-sdk/client-secrets-manager` to call `GetSecretValueCommand`.
- GCP Secret Manager: use `@google-cloud/secret-manager` to access `accessSecretVersion()`.
- HashiCorp Vault: use the HTTP API or client libraries to read kv v2 secrets.

Integration tip for this repo:

1. Add the secret name or identifier to `process.env` in deployment manifests (not checked into source).
2. Use `src/lib/secrets.ts` to centralize retrieval; replace the placeholder stubs with concrete implementations.
3. Update `src/app/api/llm/route.ts` to prefer `getProviderApiKey(providerId)` when running in production.
