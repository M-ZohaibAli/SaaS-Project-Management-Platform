# OrbitDesk Architecture

OrbitDesk is structured as a multi-tenant SaaS project-management platform. The runnable app in this repository is a Vite, React 19, TypeScript, Tailwind CSS v4 workspace implementation. Production backend contracts, Prisma schema, Docker, CI, and deployment documents are included for the requested SaaS architecture.

## Product Modules

- Authentication: signup, login, password recovery, reset tokens, sessions, refresh flow, and sign out.
- Tenant management: organizations, membership isolation, invitations, and organization settings.
- RBAC: Owner, Admin, Manager, Member, and Viewer permissions mapped to product actions.
- Project management: project portfolio, status, priority, dates, team membership, and progress.
- Kanban execution: backlog, todo, in progress, review, done, drag-and-drop ordering, optimistic local updates, and activity logs.
- Task management: rich text, assignees, due dates, labels, attachments, checklists, comments, mentions, reactions, edit, and delete.
- Collaboration: in-app notifications, presence indicators, activity feed, live editing indicator, and Socket.io event contract.
- Knowledge base: project notes with markdown-friendly editing and autosave.
- Files: drag-and-drop uploads, progress, preview, download, delete, and metadata tracking.
- Search: fuzzy global search across projects, tasks, members, files, and notes.
- Calendar: monthly, weekly, daily controls and drag-to-reschedule tasks.
- Analytics: completion, productivity trend, workload, progress, CSV export, and PDF export.
- AI: smart task creation, meeting-note summaries, project health analysis, risk detection, and recommendations.

## Tenant Isolation

All persistent models include `organizationId` where tenant ownership is required. API middleware must derive the active organization from authenticated membership, not from untrusted request bodies. Queries use composite constraints such as:

```ts
const task = await prisma.task.findFirstOrThrow({
  where: { id: taskId, organizationId: ctx.organizationId },
});
```

Mutation endpoints must also validate membership role before writes. The frontend store mirrors this by filtering all workspace data by `currentOrgId` and membership.

## Recommended Production Runtime

- Frontend: Next.js 15 App Router or this Vite build served behind a CDN.
- API: Next.js Route Handlers or Express on Node 22.
- Database: PostgreSQL 16 with Prisma.
- Realtime: Socket.io with Redis adapter for multi-instance fanout.
- Cache and rate limits: Redis.
- Storage: UploadThing for managed uploads or S3 with presigned URLs.
- Auth: Auth.js/NextAuth with database sessions, refresh token rotation, secure cookies, and CSRF checks.
- Observability: OpenTelemetry traces, structured JSON logs, Sentry, and database slow-query alerts.

## Data Flow

1. The authenticated user selects an organization.
2. Middleware verifies membership and attaches `{ userId, organizationId, role }` to the request context.
3. Route validation uses Zod schemas before hitting Prisma.
4. Prisma queries include organization boundaries and indexed filters.
5. Mutations write ActivityLog entries and enqueue notifications.
6. Socket.io emits tenant-room events such as `task:moved`, `comment:created`, and `notification:created`.
7. Clients apply optimistic updates, reconcile server payloads, and show notification/presence changes.

## Scale Plan

- Use cursor pagination on tasks, comments, files, activity, and search endpoints.
- Use Redis pub/sub or Socket.io Redis adapter for realtime scale.
- Use background queues for AI analysis, exports, file virus scanning, and reminder notifications.
- Store large notes and rich task bodies with update versioning if collaborative editing requires CRDTs later.
- Add read replicas for analytics and full-text search via PostgreSQL `tsvector` or OpenSearch when needed.