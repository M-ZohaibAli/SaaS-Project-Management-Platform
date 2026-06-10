# Security Model

## Authentication

- Store password hashes with Argon2id or bcrypt at cost 12 or higher.
- Use Auth.js/NextAuth database sessions or signed JWT sessions with short expiration.
- Rotate refresh tokens on every refresh and revoke previous tokens.
- Store session and refresh cookies as `HttpOnly`, `Secure`, `SameSite=Lax` or `Strict`.
- Require CSRF tokens for state-changing browser requests.
- Invalidate all sessions after password reset.

## Authorization

- Resolve the active organization from a verified membership.
- Enforce RBAC in middleware before route handlers.
- Scope every Prisma query by `organizationId` for tenant-owned resources.
- Owners are the only role allowed to delete organizations or manage billing.
- Viewers are read-only and cannot create comments, tasks, files, projects, boards, or invitations.

## API Protection

- Validate all request bodies, params, and query strings with Zod.
- Use Prisma parameterized queries to prevent SQL injection.
- Sanitize rich text HTML before rendering or persist markdown/plain text only.
- Apply Redis-backed rate limits by IP, user id, organization id, and route family.
- Add idempotency keys for uploads, webhook ingestion, and task move endpoints.
- Log all mutations to ActivityLog with user, entity, timestamp, IP, and user agent.

## Headers

- Content-Security-Policy denies frame ancestors and restricts scripts, connections, images, and forms.
- X-Frame-Options is DENY.
- X-Content-Type-Options is nosniff.
- Referrer-Policy is strict-origin-when-cross-origin.
- Permissions-Policy disables camera, microphone, and geolocation by default.
- HSTS should be enabled at the edge for production domains.

## File Uploads

- Use UploadThing or S3 presigned URLs with tenant-prefixed object keys.
- Store metadata only after upload completion callback validation.
- Restrict MIME types and max file size by plan.
- Virus scan files asynchronously before broad sharing.
- Never trust client-provided file names for storage keys.

## Realtime

- Authenticate Socket.io handshakes with the same session verifier as HTTP.
- Join only tenant rooms the user is a member of.
- Validate event payloads with Zod before broadcasting.
- Do not broadcast private task data to users outside the organization.