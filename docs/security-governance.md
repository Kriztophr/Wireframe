Security & Governance Guidance
===============================

This project now includes server-side hardening and performance improvements (security headers, compression, rate limiting, caching). The guidance below outlines additional best practices and governance frameworks to adopt when deploying to production.

1) Secrets & Key Management
- Do NOT store production API keys in browser localStorage. Use server-side secrets or a secrets manager (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, Google Secret Manager).
- Limit environment access: only CI/CD and runtime hosts should have access to production secrets.
- Rotate keys regularly and maintain an audit trail for key access/changes.

2) Network & Transport
- Enforce HTTPS, HSTS, and strong TLS cipher suites at the load balancer or ingress (e.g., CloudFront, ALB, nginx, Cloudflare).
- Use `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`, and CSP headers (tuned per deployment) — the server sets conservative defaults via `helmet`.

3) Authentication & Access Control
- Integrate SSO/Identity Providers (Okta, Auth0, Azure AD) for developer and admin access.
- Enforce RBAC for any administrative UI/API endpoints.
- Use short-lived tokens where possible and multi-factor authentication for admin accounts.

4) Observability & Audit
- Emit structured logs (JSON) with request IDs and correlate logs with traces.
- Use centralized logging and monitoring (e.g., Datadog, New Relic, Loki, ELK) and configure alerts for unusual activity.
- Retain audit logs per your compliance requirements.

5) Vulnerability & Dependency Management
- Run SCA tools in CI (Dependabot, npm audit, Snyk) and enforce PR checks.
- Scan container images for CVEs (Trivy, Clair) and rebuild images on vulnerable dependency updates.

6) CI/CD & Testing
- Use signed commits and protected branches for production deployments.
- Require passing unit/integration tests, linting, and SCA checks before deployment.
- Use canary/blue-green deployments for safe rollouts.

7) Data Governance
- Classify and document sensitive data flows (PII, API keys, generated content).
- Define retention and deletion policies for generated artifacts (videos/images) and user data.
- Implement anonymization or encryption-at-rest for sensitive persisted data.

8) Rate Limiting & Abuse Prevention
- Rate limit public APIs and require authentication for heavier endpoints.
- Use WAF (Cloudflare, AWS WAF) to block known bad actors and bots.

9) Incident Response
- Maintain an incident response playbook and run regular tabletop exercises.
- Configure automated alerts for high-severity incidents and integrate with paging systems (PagerDuty).

10) Compliance Frameworks
- Assess which frameworks apply to your use-case (SOC2, ISO27001, GDPR, CCPA). Implement controls and documentation accordingly.

Quick checklist to deploy safely:
- Move API keys to a secrets manager and remove any stored browser keys for production.
- Configure TLS and HSTS at the ingress layer.
- Enable SCA in CI and add dependency auto-fixes where safe.
- Configure centralized logging and monitoring with alerting.
- Review CSP and allowlists for third-party endpoints.

For deployment-specific templates (Terraform, Kubernetes manifests, Helm charts) and audit-ready config, I can scaffold those next if you'd like.