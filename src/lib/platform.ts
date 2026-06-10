import { z } from "zod";

export type ID = string;

export const roles = ["Owner", "Admin", "Manager", "Member", "Viewer"] as const;
export type Role = (typeof roles)[number];

export const projectStatuses = ["Planning", "Active", "On Hold", "Completed", "Archived"] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export const projectPriorities = ["Low", "Medium", "High", "Critical"] as const;
export type ProjectPriority = (typeof projectPriorities)[number];

export const taskPriorities = ["Low", "Medium", "High", "Urgent"] as const;
export type TaskPriority = (typeof taskPriorities)[number];

export const taskColumns = [
  { id: "backlog", title: "Backlog", accent: "bg-slate-400" },
  { id: "todo", title: "Todo", accent: "bg-sky-500" },
  { id: "in-progress", title: "In Progress", accent: "bg-violet-500" },
  { id: "review", title: "Review", accent: "bg-amber-500" },
  { id: "done", title: "Done", accent: "bg-emerald-500" },
] as const;
export type TaskStatus = (typeof taskColumns)[number]["id"];

export const invitationStatuses = ["Pending", "Accepted", "Expired"] as const;
export type InvitationStatus = (typeof invitationStatuses)[number];

export const notificationTypes = [
  "TaskAssigned",
  "TaskCompleted",
  "Mentioned",
  "Invitation",
  "DueDateReminder",
  "System",
] as const;
export type NotificationType = (typeof notificationTypes)[number];

export const permissionMatrix = {
  manageBilling: ["Owner"],
  manageTeam: ["Owner", "Admin"],
  deleteOrganization: ["Owner"],
  manageProjects: ["Owner", "Admin", "Manager"],
  manageBoards: ["Owner", "Admin", "Manager"],
  createTasks: ["Owner", "Admin", "Manager", "Member"],
  assignTasks: ["Owner", "Admin", "Manager"],
  comment: ["Owner", "Admin", "Manager", "Member"],
  uploadFiles: ["Owner", "Admin", "Manager", "Member"],
  readOnly: ["Owner", "Admin", "Manager", "Member", "Viewer"],
} satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof permissionMatrix;

export type User = {
  id: ID;
  name: string;
  email: string;
  avatar: string;
  department: string;
  title: string;
  timezone: string;
};

export type Organization = {
  id: ID;
  name: string;
  slug: string;
  plan: "Starter" | "Growth" | "Enterprise";
  domain: string;
  createdAt: string;
};

export type Membership = {
  id: ID;
  organizationId: ID;
  userId: ID;
  role: Role;
  joinedAt: string;
};

export type Invitation = {
  id: ID;
  organizationId: ID;
  email: string;
  role: Role;
  status: InvitationStatus;
  invitedById: ID;
  expiresAt: string;
  createdAt: string;
};

export type Project = {
  id: ID;
  organizationId: ID;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  endDate: string;
  teamIds: ID[];
  progress: number;
  createdAt: string;
};

export type Label = {
  id: ID;
  organizationId: ID;
  name: string;
  color: string;
};

export type ChecklistItem = {
  id: ID;
  text: string;
  completed: boolean;
};

export type Task = {
  id: ID;
  organizationId: ID;
  projectId: ID;
  title: string;
  description: string;
  richText: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assigneeId: ID;
  reporterId: ID;
  labelIds: ID[];
  checklist: ChecklistItem[];
  fileIds: ID[];
  order: number;
  estimateHours: number;
  completedAt?: string;
  updatedAt: string;
  createdAt: string;
};

export type Comment = {
  id: ID;
  organizationId: ID;
  taskId: ID;
  authorId: ID;
  parentId?: ID;
  body: string;
  reactions: Record<string, ID[]>;
  editedAt?: string;
  createdAt: string;
};

export type StoredFile = {
  id: ID;
  organizationId: ID;
  projectId?: ID;
  taskId?: ID;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedById: ID;
  createdAt: string;
};

export type ActivityLog = {
  id: ID;
  organizationId: ID;
  userId: ID;
  action: string;
  entity: "Organization" | "Project" | "Board" | "Task" | "Comment" | "File" | "Invitation" | "AIInsight";
  entityId: ID;
  createdAt: string;
};

export type Notification = {
  id: ID;
  organizationId: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  entityId?: ID;
  createdAt: string;
};

export type AIInsight = {
  id: ID;
  organizationId: ID;
  projectId: ID;
  title: string;
  summary: string;
  severity: "low" | "medium" | "high";
  recommendations: string[];
  createdAt: string;
};

export type Note = {
  id: ID;
  organizationId: ID;
  projectId: ID;
  title: string;
  content: string;
  updatedAt: string;
};

export const signInSchema = z.object({
  email: z.string().email("Use a valid work email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const signUpSchema = z
  .object({
    name: z.string().min(2, "Enter your full name."),
    email: z.string().email("Use a valid work email."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password."),
    organization: z.string().min(2, "Enter an organization name."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match.",
  });

export const projectSchema = z.object({
  name: z.string().min(3, "Project name is required."),
  description: z.string().min(8, "Add a useful description."),
  status: z.enum(projectStatuses),
  priority: z.enum(projectPriorities),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export const taskSchema = z.object({
  title: z.string().min(3, "Task title is required."),
  description: z.string().min(3, "Describe the task."),
  priority: z.enum(taskPriorities),
  dueDate: z.string().min(1),
  assigneeId: z.string().min(1),
});

export const inviteSchema = z.object({
  email: z.string().email("Use a valid email."),
  role: z.enum(roles),
});

export function can(role: Role | undefined, permission: Permission) {
  if (!role) return false;
  return (permissionMatrix[permission] as readonly Role[]).includes(role);
}

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function isoDaysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function dateInputValue(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(iso));
}

export function formatRelativeDate(iso: string) {
  const today = new Date();
  const target = new Date(iso);
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 1) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

export function bytesToSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function parseSmartTask(input: string): { title: string; dueDate: string; priority: TaskPriority } {
  const lower = input.toLowerCase();
  let dueDate = isoDaysFromNow(7);
  if (lower.includes("today")) dueDate = isoDaysFromNow(0);
  if (lower.includes("tomorrow")) dueDate = isoDaysFromNow(1);
  if (lower.includes("friday")) {
    const date = new Date();
    const daysUntilFriday = (5 - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilFriday);
    dueDate = date.toISOString();
  }
  const priority: TaskPriority = lower.includes("urgent") || lower.includes("critical")
    ? "Urgent"
    : lower.includes("high")
      ? "High"
      : "Medium";
  const title = input
    .replace(/before\s+friday/gi, "")
    .replace(/by\s+tomorrow/gi, "")
    .replace(/today|tomorrow|urgent|critical|high priority/gi, "")
    .trim()
    .replace(/^build/i, "Build")
    .replace(/^create/i, "Create");
  return { title: title || "New AI generated task", dueDate, priority };
}

export function calculateProjectProgress(tasks: Task[], projectId: ID) {
  const projectTasks = tasks.filter((task) => task.projectId === projectId);
  if (projectTasks.length === 0) return 0;
  const done = projectTasks.filter((task) => task.status === "done").length;
  return Math.round((done / projectTasks.length) * 100);
}

const now = new Date().toISOString();

export const seedUsers: User[] = [
  {
    id: "usr_ava",
    name: "Ava Patel",
    email: "ava@acme.test",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
    department: "Product",
    title: "VP Product",
    timezone: "America/New_York",
  },
  {
    id: "usr_miles",
    name: "Miles Chen",
    email: "miles@acme.test",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
    department: "Engineering",
    title: "Staff Engineer",
    timezone: "America/Los_Angeles",
  },
  {
    id: "usr_noor",
    name: "Noor Haddad",
    email: "noor@acme.test",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=80",
    department: "Design",
    title: "Product Designer",
    timezone: "Europe/London",
  },
  {
    id: "usr_elena",
    name: "Elena Garcia",
    email: "elena@acme.test",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80",
    department: "Customer Success",
    title: "Implementation Lead",
    timezone: "Europe/Madrid",
  },
  {
    id: "usr_omar",
    name: "Omar Brooks",
    email: "omar@northstar.test",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80",
    department: "Operations",
    title: "Program Manager",
    timezone: "America/Chicago",
  },
  {
    id: "usr_jules",
    name: "Jules Rivera",
    email: "jules@northstar.test",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&q=80",
    department: "Engineering",
    title: "Frontend Engineer",
    timezone: "America/Denver",
  },
];

export const seedOrganizations: Organization[] = [
  {
    id: "org_acme",
    name: "Acme Cloud",
    slug: "acme-cloud",
    plan: "Enterprise",
    domain: "acme.test",
    createdAt: isoDaysFromNow(-120),
  },
  {
    id: "org_northstar",
    name: "Northstar Labs",
    slug: "northstar-labs",
    plan: "Growth",
    domain: "northstar.test",
    createdAt: isoDaysFromNow(-62),
  },
];

export const seedMemberships: Membership[] = [
  { id: "mem_ava_acme", organizationId: "org_acme", userId: "usr_ava", role: "Owner", joinedAt: isoDaysFromNow(-120) },
  { id: "mem_miles_acme", organizationId: "org_acme", userId: "usr_miles", role: "Admin", joinedAt: isoDaysFromNow(-88) },
  { id: "mem_noor_acme", organizationId: "org_acme", userId: "usr_noor", role: "Manager", joinedAt: isoDaysFromNow(-72) },
  { id: "mem_elena_acme", organizationId: "org_acme", userId: "usr_elena", role: "Member", joinedAt: isoDaysFromNow(-35) },
  { id: "mem_ava_northstar", organizationId: "org_northstar", userId: "usr_ava", role: "Viewer", joinedAt: isoDaysFromNow(-20) },
  { id: "mem_omar_northstar", organizationId: "org_northstar", userId: "usr_omar", role: "Owner", joinedAt: isoDaysFromNow(-62) },
  { id: "mem_jules_northstar", organizationId: "org_northstar", userId: "usr_jules", role: "Member", joinedAt: isoDaysFromNow(-58) },
];

export const seedProjects: Project[] = [
  {
    id: "prj_launch",
    organizationId: "org_acme",
    name: "Customer Portal Launch",
    description: "Ship the enterprise customer portal with onboarding, billing, support, and account controls.",
    status: "Active",
    priority: "Critical",
    startDate: dateInputValue(isoDaysFromNow(-18)),
    endDate: dateInputValue(isoDaysFromNow(24)),
    teamIds: ["usr_ava", "usr_miles", "usr_noor", "usr_elena"],
    progress: 58,
    createdAt: isoDaysFromNow(-20),
  },
  {
    id: "prj_ai",
    organizationId: "org_acme",
    name: "AI Assistant Beta",
    description: "Add task summaries, smart task extraction, and health analysis to project workflows.",
    status: "Planning",
    priority: "High",
    startDate: dateInputValue(isoDaysFromNow(2)),
    endDate: dateInputValue(isoDaysFromNow(45)),
    teamIds: ["usr_ava", "usr_miles", "usr_noor"],
    progress: 16,
    createdAt: isoDaysFromNow(-6),
  },
  {
    id: "prj_migration",
    organizationId: "org_northstar",
    name: "Warehouse Migration",
    description: "Move warehouse dashboards and alerts from legacy scripts into the Northstar data platform.",
    status: "Active",
    priority: "Medium",
    startDate: dateInputValue(isoDaysFromNow(-12)),
    endDate: dateInputValue(isoDaysFromNow(32)),
    teamIds: ["usr_omar", "usr_jules"],
    progress: 35,
    createdAt: isoDaysFromNow(-13),
  },
];

export const seedLabels: Label[] = [
  { id: "lbl_api", organizationId: "org_acme", name: "API", color: "bg-sky-500" },
  { id: "lbl_design", organizationId: "org_acme", name: "Design", color: "bg-fuchsia-500" },
  { id: "lbl_security", organizationId: "org_acme", name: "Security", color: "bg-rose-500" },
  { id: "lbl_growth", organizationId: "org_acme", name: "Growth", color: "bg-emerald-500" },
  { id: "lbl_data", organizationId: "org_northstar", name: "Data", color: "bg-indigo-500" },
];

export const seedTasks: Task[] = [
  {
    id: "tsk_oauth",
    organizationId: "org_acme",
    projectId: "prj_launch",
    title: "Harden OAuth onboarding flow",
    description: "Add invite-only enforcement, secure cookie review, and audit trails for new accounts.",
    richText: "## Acceptance criteria\n- Invite-only signup path\n- CSRF token validation\n- Audit log entry for each account event",
    status: "in-progress",
    priority: "Urgent",
    dueDate: isoDaysFromNow(3),
    assigneeId: "usr_miles",
    reporterId: "usr_ava",
    labelIds: ["lbl_api", "lbl_security"],
    checklist: [
      { id: "chk_oauth_1", text: "Threat model callback routes", completed: true },
      { id: "chk_oauth_2", text: "Add rate limit coverage", completed: false },
      { id: "chk_oauth_3", text: "Document session rotation", completed: false },
    ],
    fileIds: ["file_scope"],
    order: 0,
    estimateHours: 12,
    updatedAt: isoDaysFromNow(-1),
    createdAt: isoDaysFromNow(-7),
  },
  {
    id: "tsk_billing",
    organizationId: "org_acme",
    projectId: "prj_launch",
    title: "Connect billing usage ledger",
    description: "Expose plan usage, invoice previews, and seat limits to workspace owners.",
    richText: "Usage must be tenant scoped and reconcile daily against Stripe events.",
    status: "todo",
    priority: "High",
    dueDate: isoDaysFromNow(9),
    assigneeId: "usr_ava",
    reporterId: "usr_miles",
    labelIds: ["lbl_api", "lbl_growth"],
    checklist: [
      { id: "chk_billing_1", text: "Define metering model", completed: false },
      { id: "chk_billing_2", text: "Build invoice preview endpoint", completed: false },
    ],
    fileIds: [],
    order: 0,
    estimateHours: 18,
    updatedAt: isoDaysFromNow(-2),
    createdAt: isoDaysFromNow(-8),
  },
  {
    id: "tsk_design",
    organizationId: "org_acme",
    projectId: "prj_launch",
    title: "Polish onboarding empty states",
    description: "Create useful empty states for projects, boards, files, and team invitations.",
    richText: "Focus on first-run confidence and clear calls to action.",
    status: "review",
    priority: "Medium",
    dueDate: isoDaysFromNow(5),
    assigneeId: "usr_noor",
    reporterId: "usr_ava",
    labelIds: ["lbl_design"],
    checklist: [
      { id: "chk_design_1", text: "Copy review", completed: true },
      { id: "chk_design_2", text: "Responsive QA", completed: true },
    ],
    fileIds: [],
    order: 0,
    estimateHours: 7,
    updatedAt: isoDaysFromNow(-1),
    createdAt: isoDaysFromNow(-9),
  },
  {
    id: "tsk_webhooks",
    organizationId: "org_acme",
    projectId: "prj_launch",
    title: "Implement support webhook retries",
    description: "Support retry policy, dead-letter state, and customer-visible delivery history.",
    richText: "Retry backoff should be exponential and idempotent by event ID.",
    status: "backlog",
    priority: "Medium",
    dueDate: isoDaysFromNow(14),
    assigneeId: "usr_elena",
    reporterId: "usr_ava",
    labelIds: ["lbl_api"],
    checklist: [],
    fileIds: [],
    order: 0,
    estimateHours: 10,
    updatedAt: isoDaysFromNow(-3),
    createdAt: isoDaysFromNow(-4),
  },
  {
    id: "tsk_release",
    organizationId: "org_acme",
    projectId: "prj_launch",
    title: "Publish release checklist",
    description: "Lock the go-live checklist, owners, rollback criteria, and communication plan.",
    richText: "Include support staffing and launch-day command center links.",
    status: "done",
    priority: "High",
    dueDate: isoDaysFromNow(-1),
    assigneeId: "usr_elena",
    reporterId: "usr_ava",
    labelIds: ["lbl_growth"],
    checklist: [
      { id: "chk_release_1", text: "SRE signoff", completed: true },
      { id: "chk_release_2", text: "CS enablement", completed: true },
    ],
    fileIds: [],
    order: 0,
    estimateHours: 4,
    completedAt: isoDaysFromNow(-1),
    updatedAt: isoDaysFromNow(-1),
    createdAt: isoDaysFromNow(-11),
  },
  {
    id: "tsk_ai_notes",
    organizationId: "org_acme",
    projectId: "prj_ai",
    title: "Prototype meeting notes summarizer",
    description: "Generate summary, action items, risks, and owners from pasted meeting notes.",
    richText: "Use streaming later; current version returns structured JSON.",
    status: "todo",
    priority: "High",
    dueDate: isoDaysFromNow(12),
    assigneeId: "usr_miles",
    reporterId: "usr_ava",
    labelIds: ["lbl_api"],
    checklist: [],
    fileIds: [],
    order: 0,
    estimateHours: 16,
    updatedAt: isoDaysFromNow(-1),
    createdAt: isoDaysFromNow(-2),
  },
  {
    id: "tsk_pipeline",
    organizationId: "org_northstar",
    projectId: "prj_migration",
    title: "Move pipeline monitors to new warehouse",
    description: "Recreate SLA alerts and ownership metadata for critical ingestion jobs.",
    richText: "Coordinate alert thresholds with operations before cutover.",
    status: "in-progress",
    priority: "High",
    dueDate: isoDaysFromNow(7),
    assigneeId: "usr_jules",
    reporterId: "usr_omar",
    labelIds: ["lbl_data"],
    checklist: [],
    fileIds: [],
    order: 0,
    estimateHours: 14,
    updatedAt: isoDaysFromNow(-1),
    createdAt: isoDaysFromNow(-5),
  },
];

export const seedComments: Comment[] = [
  {
    id: "cmt_oauth_1",
    organizationId: "org_acme",
    taskId: "tsk_oauth",
    authorId: "usr_ava",
    body: "Please include @Noor Haddad on the copy review once the secure states are wired.",
    reactions: { eyes: ["usr_miles"], rocket: ["usr_noor"] },
    createdAt: isoDaysFromNow(-2),
  },
  {
    id: "cmt_design_1",
    organizationId: "org_acme",
    taskId: "tsk_design",
    authorId: "usr_noor",
    body: "Review build is posted. I left notes on mobile spacing and keyboard focus order.",
    reactions: { check: ["usr_ava"] },
    createdAt: isoDaysFromNow(-1),
  },
];

export const seedFiles: StoredFile[] = [
  {
    id: "file_scope",
    organizationId: "org_acme",
    projectId: "prj_launch",
    taskId: "tsk_oauth",
    name: "security-scope.pdf",
    type: "application/pdf",
    size: 842_300,
    url: "#security-scope.pdf",
    uploadedById: "usr_ava",
    createdAt: isoDaysFromNow(-4),
  },
];

export const seedActivities: ActivityLog[] = [
  { id: "act_1", organizationId: "org_acme", userId: "usr_miles", action: "moved Harden OAuth onboarding flow to In Progress", entity: "Task", entityId: "tsk_oauth", createdAt: isoDaysFromNow(-1) },
  { id: "act_2", organizationId: "org_acme", userId: "usr_noor", action: "requested review on onboarding empty states", entity: "Task", entityId: "tsk_design", createdAt: isoDaysFromNow(-1) },
  { id: "act_3", organizationId: "org_acme", userId: "usr_ava", action: "invited finance@acme.test as Admin", entity: "Invitation", entityId: "inv_finance", createdAt: isoDaysFromNow(-2) },
  { id: "act_4", organizationId: "org_northstar", userId: "usr_omar", action: "created Warehouse Migration", entity: "Project", entityId: "prj_migration", createdAt: isoDaysFromNow(-12) },
];

export const seedNotifications: Notification[] = [
  {
    id: "ntf_1",
    organizationId: "org_acme",
    userId: "usr_miles",
    type: "TaskAssigned",
    title: "Task assigned",
    body: "Ava assigned you to Harden OAuth onboarding flow.",
    read: false,
    entityId: "tsk_oauth",
    createdAt: isoDaysFromNow(-1),
  },
  {
    id: "ntf_2",
    organizationId: "org_acme",
    userId: "usr_ava",
    type: "DueDateReminder",
    title: "Launch date approaching",
    body: "Customer Portal Launch has 24 days remaining.",
    read: false,
    entityId: "prj_launch",
    createdAt: isoDaysFromNow(-1),
  },
];

export const seedInvitations: Invitation[] = [
  {
    id: "inv_finance",
    organizationId: "org_acme",
    email: "finance@acme.test",
    role: "Admin",
    status: "Pending",
    invitedById: "usr_ava",
    expiresAt: isoDaysFromNow(6),
    createdAt: isoDaysFromNow(-2),
  },
  {
    id: "inv_research",
    organizationId: "org_northstar",
    email: "research@northstar.test",
    role: "Viewer",
    status: "Expired",
    invitedById: "usr_omar",
    expiresAt: isoDaysFromNow(-3),
    createdAt: isoDaysFromNow(-17),
  },
];

export const seedInsights: AIInsight[] = [
  {
    id: "ins_1",
    organizationId: "org_acme",
    projectId: "prj_launch",
    title: "OAuth work is on the critical path",
    summary: "Security hardening has urgent priority and is due in 3 days. If retries are added after this work, go-live risk stays manageable.",
    severity: "high",
    recommendations: ["Pair an engineer with security review today", "Move webhook retries behind launch if OAuth slips"],
    createdAt: isoDaysFromNow(-1),
  },
];

export const seedNotes: Note[] = [
  {
    id: "note_launch",
    organizationId: "org_acme",
    projectId: "prj_launch",
    title: "Launch Room Notes",
    content: "# Customer Portal Launch\n\n## Decisions\n- Billing usage appears only to Owners and Admins.\n- Release checklist is the go/no-go source of truth.\n\n## Risks\n- OAuth review is critical path.\n- Support webhook retries can be deferred if needed.\n\n## Action Items\n- @Miles Chen validates rate limits.\n- @Noor Haddad finishes responsive QA.",
    updatedAt: now,
  },
  {
    id: "note_ai",
    organizationId: "org_acme",
    projectId: "prj_ai",
    title: "AI Assistant Discovery",
    content: "# AI Assistant Beta\n\nUse structured extraction first. Summaries should include decisions, risks, and owners.",
    updatedAt: now,
  },
];