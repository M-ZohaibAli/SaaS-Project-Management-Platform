# REST API Contract

Every authenticated request includes a secure session cookie and the active tenant header:

```http
x-organization-id: org_123
```

The server must ignore organization identifiers supplied in request bodies unless they are validated against the authenticated membership.

## Authentication

| Method | Path | Purpose | Validation |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | Create user, organization, owner membership, and session | name, email, password, confirmPassword, organization |
| POST | `/api/auth/login` | Verify password hash and create signed session | email, password |
| POST | `/api/auth/forgot-password` | Generate single-use reset token | email |
| POST | `/api/auth/reset-password` | Rotate password hash and invalidate tokens | token, password |
| GET | `/api/auth/session` | Return user, memberships, active organization | session cookie |
| POST | `/api/auth/refresh` | Rotate refresh token and extend session | refresh cookie |
| POST | `/api/auth/logout` | Revoke session and refresh token | session cookie |

## Organizations and Members

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/api/organizations` | readOnly | List organizations for current user |
| POST | `/api/organizations` | authenticated | Create organization and Owner membership |
| PATCH | `/api/organizations/:id` | manageTeam | Rename or update settings |
| DELETE | `/api/organizations/:id` | deleteOrganization | Soft delete tenant and cascade owned resources |
| GET | `/api/members` | readOnly | List tenant members |
| PATCH | `/api/members/:id/role` | manageTeam | Change member role |
| DELETE | `/api/members/:id` | manageTeam | Remove member from organization |
| GET | `/api/invitations` | manageTeam | List invitations |
| POST | `/api/invitations` | manageTeam | Invite by email |
| POST | `/api/invitations/:token/accept` | authenticated | Accept invitation |

## Projects and Boards

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/api/projects` | readOnly | List tenant projects with filters |
| POST | `/api/projects` | manageProjects | Create project, board, and default columns |
| PATCH | `/api/projects/:id` | manageProjects | Update project metadata |
| DELETE | `/api/projects/:id` | manageProjects | Archive or delete project |
| GET | `/api/boards/:projectId` | readOnly | Get board columns and tasks |
| POST | `/api/boards` | manageBoards | Create board |
| PATCH | `/api/columns/:id` | manageBoards | Rename or reorder column |

## Tasks

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/api/tasks` | readOnly | Search and filter tasks by assignee, priority, status, due date, labels |
| POST | `/api/tasks` | createTasks | Create task and notification |
| PATCH | `/api/tasks/:id` | createTasks | Update fields, assignee, priority, due date, rich text |
| PATCH | `/api/tasks/:id/move` | manageBoards | Move between columns and reorder |
| DELETE | `/api/tasks/:id` | manageBoards | Soft delete task |
| POST | `/api/tasks/:id/checklist` | createTasks | Add checklist item |
| PATCH | `/api/checklist-items/:id` | createTasks | Toggle checklist item |

## Comments

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/api/tasks/:id/comments` | readOnly | List comments and replies |
| POST | `/api/tasks/:id/comments` | comment | Create comment or reply and notify mentions |
| PATCH | `/api/comments/:id` | comment | Edit own comment or admin-moderated comment |
| DELETE | `/api/comments/:id` | comment | Delete own comment or admin-moderated comment |
| POST | `/api/comments/:id/reactions` | comment | Toggle reaction |

## Files

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/api/files` | readOnly | List file metadata |
| POST | `/api/files/upload-url` | uploadFiles | Create UploadThing or S3 presigned upload |
| POST | `/api/files/complete` | uploadFiles | Persist metadata after upload |
| DELETE | `/api/files/:id` | uploadFiles | Delete object and metadata |

## Collaboration

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/api/activity` | readOnly | Timeline of audit events |
| GET | `/api/notifications` | readOnly | Notification center |
| PATCH | `/api/notifications/:id/read` | readOnly | Mark one read |
| PATCH | `/api/notifications/read-all` | readOnly | Mark all read |
| GET | `/api/search` | readOnly | Fuzzy global search |
| GET | `/api/calendar` | readOnly | Tasks grouped by due date |
| GET | `/api/notes/:projectId` | readOnly | Fetch project note |
| PUT | `/api/notes/:projectId` | createTasks | Autosave project note |

## Analytics and AI

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/api/analytics` | readOnly | Workload, completion, burn down, productivity, progress |
| POST | `/api/ai/tasks/extract` | createTasks | Extract title, due date, priority from natural language |
| POST | `/api/ai/tasks/:id/summary` | readOnly | Summarize task and comments |
| POST | `/api/ai/meetings/summary` | readOnly | Summarize notes into decisions, risks, action items |
| POST | `/api/ai/projects/:id/health` | readOnly | Create AIInsight with risks and recommendations |

## Realtime Events

Socket rooms are tenant-scoped. A user joins `org:{organizationId}` only after membership verification.

| Event | Direction | Payload |
| --- | --- | --- |
| `presence:join` | client to server | organizationId, projectId |
| `presence:update` | server to clients | online user ids |
| `task:created` | both | task payload |
| `task:moved` | both | taskId, fromStatus, toStatus, order |
| `comment:created` | both | comment payload |
| `typing:start` | client to server | taskId |
| `typing:stop` | client to server | taskId |
| `notification:created` | server to clients | notification payload |