import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type ActivityLog,
  type AIInsight,
  type Comment,
  type ID,
  type Invitation,
  type Membership,
  type Note,
  type Notification,
  type Organization,
  type Project,
  type ProjectPriority,
  type ProjectStatus,
  type Role,
  type StoredFile,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type User,
  calculateProjectProgress,
  isoDaysFromNow,
  newId,
  parseSmartTask,
  seedActivities,
  seedComments,
  seedFiles,
  seedInsights,
  seedInvitations,
  seedLabels,
  seedMemberships,
  seedNotes,
  seedNotifications,
  seedOrganizations,
  seedProjects,
  seedTasks,
  seedUsers,
  slugify,
  type Label,
} from "@/lib/platform";

export type View =
  | "dashboard"
  | "projects"
  | "board"
  | "notes"
  | "calendar"
  | "team"
  | "analytics"
  | "files"
  | "activity"
  | "settings";

type AuthResult = { ok: true } | { ok: false; message: string };

type ClientSession = {
  id: ID;
  userId: ID;
  refreshToken: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
};

type PasswordReset = {
  token: string;
  email: string;
  expiresAt: string;
  used: boolean;
};

type ProjectInput = {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  endDate: string;
};

type TaskInput = {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  assigneeId: ID;
};

type UploadedFileInput = {
  name: string;
  type: string;
  size: number;
  url: string;
  projectId?: ID;
  taskId?: ID;
};

type WorkspaceState = {
  users: User[];
  organizations: Organization[];
  memberships: Membership[];
  invitations: Invitation[];
  projects: Project[];
  labels: Label[];
  tasks: Task[];
  comments: Comment[];
  files: StoredFile[];
  activities: ActivityLog[];
  notifications: Notification[];
  insights: AIInsight[];
  notes: Note[];
  credentials: Record<string, string>;
  resetTokens: PasswordReset[];
  sessions: ClientSession[];
  currentUserId: ID | null;
  currentSessionId: ID | null;
  currentOrgId: ID | null;
  activeProjectId: ID | null;
  view: View;
  darkMode: boolean;
  onlineUserIds: ID[];
  typingTaskId: ID | null;
  setView: (view: View) => void;
  toggleDarkMode: () => void;
  signIn: (email: string, password: string) => AuthResult;
  signUp: (name: string, email: string, password: string, organizationName: string) => AuthResult;
  signOut: () => void;
  requestPasswordReset: (email: string) => { ok: boolean; token?: string; message: string };
  resetPassword: (token: string, password: string) => AuthResult;
  refreshSession: () => void;
  setCurrentOrg: (organizationId: ID) => void;
  createOrganization: (name: string) => ID | null;
  renameOrganization: (name: string) => void;
  deleteOrganization: () => void;
  inviteMember: (email: string, role: Role) => ID | null;
  changeMemberRole: (membershipId: ID, role: Role) => void;
  removeMember: (membershipId: ID) => void;
  createProject: (input: ProjectInput) => ID | null;
  updateProject: (projectId: ID, patch: Partial<ProjectInput>) => void;
  deleteProject: (projectId: ID) => void;
  setActiveProject: (projectId: ID) => void;
  createTask: (input: TaskInput & { status?: TaskStatus; projectId?: ID }) => ID | null;
  updateTask: (taskId: ID, patch: Partial<Omit<Task, "id" | "organizationId" | "createdAt">>) => void;
  moveTask: (taskId: ID, status: TaskStatus, index: number) => void;
  addChecklistItem: (taskId: ID, text: string) => void;
  toggleChecklistItem: (taskId: ID, checklistItemId: ID) => void;
  addComment: (taskId: ID, body: string, parentId?: ID) => ID | null;
  updateComment: (commentId: ID, body: string) => void;
  deleteComment: (commentId: ID) => void;
  reactToComment: (commentId: ID, reaction: string) => void;
  uploadFile: (input: UploadedFileInput) => ID | null;
  deleteFile: (fileId: ID) => void;
  markNotificationRead: (notificationId: ID) => void;
  markAllNotificationsRead: () => void;
  updateNote: (projectId: ID, content: string) => void;
  createSmartTask: (prompt: string) => ID | null;
  generateInsight: (projectId: ID) => ID | null;
  setTypingTask: (taskId: ID | null) => void;
  addActivity: (action: string, entity: ActivityLog["entity"], entityId: ID) => void;
};

const seedCredentials = Object.fromEntries(seedUsers.map((user) => [user.email.toLowerCase(), "Password123!"]));

function currentMembership(state: WorkspaceState) {
  if (!state.currentUserId || !state.currentOrgId) return undefined;
  return state.memberships.find(
    (membership) => membership.userId === state.currentUserId && membership.organizationId === state.currentOrgId,
  );
}

function activityEntry(state: WorkspaceState, action: string, entity: ActivityLog["entity"], entityId: ID): ActivityLog | null {
  if (!state.currentUserId || !state.currentOrgId) return null;
  return {
    id: newId("act"),
    organizationId: state.currentOrgId,
    userId: state.currentUserId,
    action,
    entity,
    entityId,
    createdAt: new Date().toISOString(),
  };
}

function recalculateProjects(projects: Project[], tasks: Task[]) {
  return projects.map((project) => ({ ...project, progress: calculateProjectProgress(tasks, project.id) }));
}

function defaultProjectForOrg(projects: Project[], organizationId: ID) {
  return projects.find((project) => project.organizationId === organizationId)?.id ?? null;
}

function notify(state: WorkspaceState, userId: ID, type: Notification["type"], title: string, body: string, entityId?: ID): Notification | null {
  if (!state.currentOrgId) return null;
  return {
    id: newId("ntf"),
    organizationId: state.currentOrgId,
    userId,
    type,
    title,
    body,
    read: false,
    entityId,
    createdAt: new Date().toISOString(),
  };
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      users: seedUsers,
      organizations: seedOrganizations,
      memberships: seedMemberships,
      invitations: seedInvitations,
      projects: seedProjects,
      labels: seedLabels,
      tasks: seedTasks,
      comments: seedComments,
      files: seedFiles,
      activities: seedActivities,
      notifications: seedNotifications,
      insights: seedInsights,
      notes: seedNotes,
      credentials: seedCredentials,
      resetTokens: [],
      sessions: [],
      currentUserId: "usr_ava",
      currentSessionId: "ses_demo",
      currentOrgId: "org_acme",
      activeProjectId: "prj_launch",
      view: "dashboard",
      darkMode: false,
      onlineUserIds: ["usr_ava", "usr_miles", "usr_noor"],
      typingTaskId: null,
      setView: (view) => set({ view }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      signIn: (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const state = get();
        const user = state.users.find((candidate) => candidate.email.toLowerCase() === normalizedEmail);
        if (!user || state.credentials[normalizedEmail] !== password) {
          return { ok: false, message: "Invalid email or password." };
        }
        const membership = state.memberships.find((candidate) => candidate.userId === user.id);
        if (!membership) return { ok: false, message: "No active organization membership found." };
        const session: ClientSession = {
          id: newId("ses"),
          userId: user.id,
          refreshToken: newId("rft"),
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          expiresAt: isoDaysFromNow(7),
        };
        set({
          currentUserId: user.id,
          currentSessionId: session.id,
          currentOrgId: membership.organizationId,
          activeProjectId: defaultProjectForOrg(state.projects, membership.organizationId),
          sessions: [...state.sessions, session],
          onlineUserIds: Array.from(new Set([...state.onlineUserIds, user.id])),
        });
        return { ok: true };
      },
      signUp: (name, email, password, organizationName) => {
        const normalizedEmail = email.trim().toLowerCase();
        const state = get();
        if (state.users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
          return { ok: false, message: "An account already exists for this email." };
        }
        const userId = newId("usr");
        const organizationId = newId("org");
        const projectId = newId("prj");
        const sessionId = newId("ses");
        const user: User = {
          id: userId,
          name,
          email: normalizedEmail,
          avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}`,
          department: "Product",
          title: "Workspace Owner",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        const organization: Organization = {
          id: organizationId,
          name: organizationName,
          slug: slugify(organizationName),
          plan: "Starter",
          domain: normalizedEmail.split("@")[1] ?? "company.test",
          createdAt: new Date().toISOString(),
        };
        const project: Project = {
          id: projectId,
          organizationId,
          name: "Workspace rollout",
          description: "Plan the first project, invite the team, and configure operating workflows.",
          status: "Planning",
          priority: "High",
          startDate: new Date().toISOString().slice(0, 10),
          endDate: isoDaysFromNow(21).slice(0, 10),
          teamIds: [userId],
          progress: 0,
          createdAt: new Date().toISOString(),
        };
        const session: ClientSession = {
          id: sessionId,
          userId,
          refreshToken: newId("rft"),
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          expiresAt: isoDaysFromNow(7),
        };
        set({
          users: [...state.users, user],
          organizations: [...state.organizations, organization],
          memberships: [
            ...state.memberships,
            { id: newId("mem"), organizationId, userId, role: "Owner", joinedAt: new Date().toISOString() },
          ],
          projects: [...state.projects, project],
          notes: [
            ...state.notes,
            {
              id: newId("note"),
              organizationId,
              projectId,
              title: "Workspace Notes",
              content: "# Workspace rollout\n\nUse this page for launch decisions, project context, and team rituals.",
              updatedAt: new Date().toISOString(),
            },
          ],
          credentials: { ...state.credentials, [normalizedEmail]: password },
          sessions: [...state.sessions, session],
          currentUserId: userId,
          currentSessionId: sessionId,
          currentOrgId: organizationId,
          activeProjectId: projectId,
          view: "dashboard",
          onlineUserIds: [...state.onlineUserIds, userId],
        });
        get().addActivity("created organization", "Organization", organizationId);
        return { ok: true };
      },
      signOut: () => {
        const state = get();
        set({
          sessions: state.sessions.filter((session) => session.id !== state.currentSessionId),
          currentUserId: null,
          currentSessionId: null,
        });
      },
      requestPasswordReset: (email) => {
        const normalizedEmail = email.trim().toLowerCase();
        const state = get();
        if (!state.users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
          return { ok: false, message: "No account was found for that email." };
        }
        const token = newId("reset");
        set({ resetTokens: [...state.resetTokens, { token, email: normalizedEmail, expiresAt: isoDaysFromNow(1), used: false }] });
        return { ok: true, token, message: "Recovery instructions were generated." };
      },
      resetPassword: (token, password) => {
        const state = get();
        const reset = state.resetTokens.find((candidate) => candidate.token === token && !candidate.used);
        if (!reset || new Date(reset.expiresAt).getTime() < Date.now()) {
          return { ok: false, message: "Reset token is invalid or expired." };
        }
        set({
          credentials: { ...state.credentials, [reset.email]: password },
          resetTokens: state.resetTokens.map((candidate) => (candidate.token === token ? { ...candidate, used: true } : candidate)),
        });
        return { ok: true };
      },
      refreshSession: () => {
        const state = get();
        set({
          sessions: state.sessions.map((session) =>
            session.id === state.currentSessionId
              ? { ...session, lastActiveAt: new Date().toISOString(), expiresAt: isoDaysFromNow(7) }
              : session,
          ),
        });
      },
      setCurrentOrg: (organizationId) => {
        const state = get();
        const membership = state.memberships.find(
          (candidate) => candidate.organizationId === organizationId && candidate.userId === state.currentUserId,
        );
        if (!membership) return;
        set({ currentOrgId: organizationId, activeProjectId: defaultProjectForOrg(state.projects, organizationId), view: "dashboard" });
      },
      createOrganization: (name) => {
        const state = get();
        if (!state.currentUserId) return null;
        const organizationId = newId("org");
        const projectId = newId("prj");
        const organization: Organization = {
          id: organizationId,
          name,
          slug: slugify(name),
          plan: "Starter",
          domain: `${slugify(name)}.test`,
          createdAt: new Date().toISOString(),
        };
        const project: Project = {
          id: projectId,
          organizationId,
          name: "First project",
          description: "Invite your team and start tracking the work that matters.",
          status: "Planning",
          priority: "Medium",
          startDate: new Date().toISOString().slice(0, 10),
          endDate: isoDaysFromNow(30).slice(0, 10),
          teamIds: [state.currentUserId],
          progress: 0,
          createdAt: new Date().toISOString(),
        };
        set({
          organizations: [...state.organizations, organization],
          memberships: [
            ...state.memberships,
            { id: newId("mem"), organizationId, userId: state.currentUserId, role: "Owner", joinedAt: new Date().toISOString() },
          ],
          projects: [...state.projects, project],
          notes: [
            ...state.notes,
            { id: newId("note"), organizationId, projectId, title: "First project notes", content: "# First project", updatedAt: new Date().toISOString() },
          ],
          currentOrgId: organizationId,
          activeProjectId: projectId,
        });
        get().addActivity(`created ${name}`, "Organization", organizationId);
        return organizationId;
      },
      renameOrganization: (name) => {
        const state = get();
        if (!state.currentOrgId) return;
        set({
          organizations: state.organizations.map((organization) =>
            organization.id === state.currentOrgId ? { ...organization, name, slug: slugify(name) } : organization,
          ),
        });
        get().addActivity(`renamed organization to ${name}`, "Organization", state.currentOrgId);
      },
      deleteOrganization: () => {
        const state = get();
        const membership = currentMembership(state);
        if (!membership || membership.role !== "Owner" || !state.currentOrgId) return;
        const organizationId = state.currentOrgId;
        const remainingMembership = state.memberships.find(
          (candidate) => candidate.userId === state.currentUserId && candidate.organizationId !== organizationId,
        );
        set({
          organizations: state.organizations.filter((organization) => organization.id !== organizationId),
          memberships: state.memberships.filter((candidate) => candidate.organizationId !== organizationId),
          invitations: state.invitations.filter((candidate) => candidate.organizationId !== organizationId),
          projects: state.projects.filter((candidate) => candidate.organizationId !== organizationId),
          labels: state.labels.filter((candidate) => candidate.organizationId !== organizationId),
          tasks: state.tasks.filter((candidate) => candidate.organizationId !== organizationId),
          comments: state.comments.filter((candidate) => candidate.organizationId !== organizationId),
          files: state.files.filter((candidate) => candidate.organizationId !== organizationId),
          activities: state.activities.filter((candidate) => candidate.organizationId !== organizationId),
          notifications: state.notifications.filter((candidate) => candidate.organizationId !== organizationId),
          insights: state.insights.filter((candidate) => candidate.organizationId !== organizationId),
          notes: state.notes.filter((candidate) => candidate.organizationId !== organizationId),
          currentOrgId: remainingMembership?.organizationId ?? null,
          activeProjectId: remainingMembership ? defaultProjectForOrg(state.projects, remainingMembership.organizationId) : null,
        });
      },
      inviteMember: (email, role) => {
        const state = get();
        if (!state.currentOrgId || !state.currentUserId) return null;
        const invitationId = newId("inv");
        const invitation: Invitation = {
          id: invitationId,
          organizationId: state.currentOrgId,
          email: email.trim().toLowerCase(),
          role,
          status: "Pending",
          invitedById: state.currentUserId,
          expiresAt: isoDaysFromNow(7),
          createdAt: new Date().toISOString(),
        };
        set({ invitations: [invitation, ...state.invitations] });
        get().addActivity(`invited ${invitation.email} as ${role}`, "Invitation", invitationId);
        return invitationId;
      },
      changeMemberRole: (membershipId, role) => {
        const state = get();
        set({ memberships: state.memberships.map((membership) => (membership.id === membershipId ? { ...membership, role } : membership)) });
        get().addActivity(`changed a member role to ${role}`, "Organization", state.currentOrgId ?? membershipId);
      },
      removeMember: (membershipId) => {
        const state = get();
        set({ memberships: state.memberships.filter((membership) => membership.id !== membershipId) });
        get().addActivity("removed a team member", "Organization", state.currentOrgId ?? membershipId);
      },
      createProject: (input) => {
        const state = get();
        if (!state.currentOrgId || !state.currentUserId) return null;
        const projectId = newId("prj");
        const project: Project = {
          id: projectId,
          organizationId: state.currentOrgId,
          name: input.name,
          description: input.description,
          status: input.status,
          priority: input.priority,
          startDate: input.startDate,
          endDate: input.endDate,
          teamIds: [state.currentUserId],
          progress: 0,
          createdAt: new Date().toISOString(),
        };
        set({
          projects: [...state.projects, project],
          notes: [
            ...state.notes,
            { id: newId("note"), organizationId: state.currentOrgId, projectId, title: `${input.name} notes`, content: `# ${input.name}`, updatedAt: new Date().toISOString() },
          ],
          activeProjectId: projectId,
        });
        get().addActivity(`created project ${input.name}`, "Project", projectId);
        return projectId;
      },
      updateProject: (projectId, patch) => {
        const state = get();
        set({ projects: state.projects.map((project) => (project.id === projectId ? { ...project, ...patch } : project)) });
        get().addActivity("updated project details", "Project", projectId);
      },
      deleteProject: (projectId) => {
        const state = get();
        const project = state.projects.find((candidate) => candidate.id === projectId);
        if (!project) return;
        const remainingProjectId = state.projects.find(
          (candidate) => candidate.organizationId === project.organizationId && candidate.id !== projectId,
        )?.id;
        set({
          projects: state.projects.filter((candidate) => candidate.id !== projectId),
          tasks: state.tasks.filter((candidate) => candidate.projectId !== projectId),
          comments: state.comments.filter((candidate) => state.tasks.find((task) => task.id === candidate.taskId)?.projectId !== projectId),
          files: state.files.filter((candidate) => candidate.projectId !== projectId),
          notes: state.notes.filter((candidate) => candidate.projectId !== projectId),
          activeProjectId: state.activeProjectId === projectId ? remainingProjectId ?? null : state.activeProjectId,
        });
        get().addActivity(`deleted project ${project.name}`, "Project", projectId);
      },
      setActiveProject: (projectId) => set({ activeProjectId: projectId, view: "board" }),
      createTask: (input) => {
        const state = get();
        if (!state.currentOrgId || !state.currentUserId) return null;
        const projectId = input.projectId ?? state.activeProjectId;
        if (!projectId) return null;
        const status = input.status ?? "todo";
        const order = state.tasks.filter((task) => task.projectId === projectId && task.status === status).length;
        const taskId = newId("tsk");
        const task: Task = {
          id: taskId,
          organizationId: state.currentOrgId,
          projectId,
          title: input.title,
          description: input.description,
          richText: input.description,
          status,
          priority: input.priority,
          dueDate: input.dueDate,
          assigneeId: input.assigneeId,
          reporterId: state.currentUserId,
          labelIds: [],
          checklist: [],
          fileIds: [],
          order,
          estimateHours: 6,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        const taskNotification = notify(state, input.assigneeId, "TaskAssigned", "Task assigned", `${input.title} was assigned to you.`, taskId);
        const tasks = [...state.tasks, task];
        set({
          tasks,
          projects: recalculateProjects(state.projects, tasks),
          notifications: taskNotification ? [taskNotification, ...state.notifications] : state.notifications,
        });
        get().addActivity(`created task ${input.title}`, "Task", taskId);
        return taskId;
      },
      updateTask: (taskId, patch) => {
        const state = get();
        const tasks = state.tasks.map((task) => {
          if (task.id !== taskId) return task;
          const completedAt = patch.status === "done" && task.status !== "done" ? new Date().toISOString() : task.completedAt;
          return { ...task, ...patch, completedAt, updatedAt: new Date().toISOString() };
        });
        const task = tasks.find((candidate) => candidate.id === taskId);
        const completionNotification = task?.status === "done"
          ? notify(state, task.reporterId, "TaskCompleted", "Task completed", `${task.title} was marked done.`, task.id)
          : null;
        set({
          tasks,
          projects: recalculateProjects(state.projects, tasks),
          notifications: completionNotification ? [completionNotification, ...state.notifications] : state.notifications,
        });
        get().addActivity("updated task", "Task", taskId);
      },
      moveTask: (taskId, status, index) => {
        const state = get();
        const task = state.tasks.find((candidate) => candidate.id === taskId);
        if (!task) return;
        const tasksWithMove = state.tasks.map((candidate) =>
          candidate.id === taskId ? { ...candidate, status, updatedAt: new Date().toISOString() } : candidate,
        );
        const laneTasks = tasksWithMove
          .filter((candidate) => candidate.projectId === task.projectId && candidate.status === status && candidate.id !== taskId)
          .sort((a, b) => a.order - b.order);
        const movedTask = tasksWithMove.find((candidate) => candidate.id === taskId);
        if (!movedTask) return;
        const safeIndex = Math.max(0, Math.min(index, laneTasks.length));
        const reordered = [...laneTasks.slice(0, safeIndex), movedTask, ...laneTasks.slice(safeIndex)].map((candidate, order) => ({
          ...candidate,
          order,
        }));
        const orderById = new Map(reordered.map((candidate) => [candidate.id, candidate]));
        const finalTasks = tasksWithMove.map((candidate) => orderById.get(candidate.id) ?? candidate);
        const completionNotification = status === "done" && task.status !== "done"
          ? notify(state, task.reporterId, "TaskCompleted", "Task completed", `${task.title} moved to Done.`, task.id)
          : null;
        set({
          tasks: finalTasks,
          projects: recalculateProjects(state.projects, finalTasks),
          notifications: completionNotification ? [completionNotification, ...state.notifications] : state.notifications,
        });
        get().addActivity(`moved ${task.title} to ${status.replace("-", " ")}`, "Task", taskId);
      },
      addChecklistItem: (taskId, text) => {
        const state = get();
        set({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { ...task, checklist: [...task.checklist, { id: newId("chk"), text, completed: false }], updatedAt: new Date().toISOString() }
              : task,
          ),
        });
      },
      toggleChecklistItem: (taskId, checklistItemId) => {
        const state = get();
        set({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  checklist: task.checklist.map((item) => (item.id === checklistItemId ? { ...item, completed: !item.completed } : item)),
                  updatedAt: new Date().toISOString(),
                }
              : task,
          ),
        });
      },
      addComment: (taskId, body, parentId) => {
        const state = get();
        if (!state.currentOrgId || !state.currentUserId) return null;
        const commentId = newId("cmt");
        const comment: Comment = {
          id: commentId,
          organizationId: state.currentOrgId,
          taskId,
          authorId: state.currentUserId,
          parentId,
          body,
          reactions: {},
          createdAt: new Date().toISOString(),
        };
        const mentionedNotifications = state.users
          .filter((user) => body.toLowerCase().includes(`@${user.name.toLowerCase()}`))
          .map((user) => notify(state, user.id, "Mentioned", "You were mentioned", body.slice(0, 120), taskId))
          .filter((notification): notification is Notification => Boolean(notification));
        set({ comments: [comment, ...state.comments], notifications: [...mentionedNotifications, ...state.notifications] });
        get().addActivity("added a comment", "Comment", commentId);
        return commentId;
      },
      updateComment: (commentId, body) => {
        const state = get();
        set({
          comments: state.comments.map((comment) =>
            comment.id === commentId ? { ...comment, body, editedAt: new Date().toISOString() } : comment,
          ),
        });
      },
      deleteComment: (commentId) => {
        const state = get();
        set({ comments: state.comments.filter((comment) => comment.id !== commentId && comment.parentId !== commentId) });
      },
      reactToComment: (commentId, reaction) => {
        const state = get();
        if (!state.currentUserId) return;
        const userId = state.currentUserId;
        set({
          comments: state.comments.map((comment) => {
            if (comment.id !== commentId) return comment;
            const existing = comment.reactions[reaction] ?? [];
            const next = existing.includes(userId) ? existing.filter((candidate) => candidate !== userId) : [...existing, userId];
            return { ...comment, reactions: { ...comment.reactions, [reaction]: next } };
          }),
        });
      },
      uploadFile: (input) => {
        const state = get();
        if (!state.currentOrgId || !state.currentUserId) return null;
        const fileId = newId("file");
        const file: StoredFile = {
          id: fileId,
          organizationId: state.currentOrgId,
          projectId: input.projectId ?? state.activeProjectId ?? undefined,
          taskId: input.taskId,
          name: input.name,
          type: input.type || "application/octet-stream",
          size: input.size,
          url: input.url,
          uploadedById: state.currentUserId,
          createdAt: new Date().toISOString(),
        };
        set({
          files: [file, ...state.files],
          tasks: input.taskId
            ? state.tasks.map((task) => (task.id === input.taskId ? { ...task, fileIds: [...task.fileIds, fileId] } : task))
            : state.tasks,
        });
        get().addActivity(`uploaded ${input.name}`, "File", fileId);
        return fileId;
      },
      deleteFile: (fileId) => {
        const state = get();
        set({
          files: state.files.filter((file) => file.id !== fileId),
          tasks: state.tasks.map((task) => ({ ...task, fileIds: task.fileIds.filter((candidate) => candidate !== fileId) })),
        });
        get().addActivity("deleted a file", "File", fileId);
      },
      markNotificationRead: (notificationId) => {
        const state = get();
        set({ notifications: state.notifications.map((notification) => (notification.id === notificationId ? { ...notification, read: true } : notification)) });
      },
      markAllNotificationsRead: () => {
        const state = get();
        set({
          notifications: state.notifications.map((notification) =>
            notification.organizationId === state.currentOrgId && notification.userId === state.currentUserId ? { ...notification, read: true } : notification,
          ),
        });
      },
      updateNote: (projectId, content) => {
        const state = get();
        const existing = state.notes.find((note) => note.projectId === projectId);
        if (!state.currentOrgId) return;
        if (!existing) {
          set({
            notes: [
              ...state.notes,
              { id: newId("note"), organizationId: state.currentOrgId, projectId, title: "Project notes", content, updatedAt: new Date().toISOString() },
            ],
          });
          return;
        }
        set({ notes: state.notes.map((note) => (note.id === existing.id ? { ...note, content, updatedAt: new Date().toISOString() } : note)) });
      },
      createSmartTask: (prompt) => {
        const state = get();
        const assigneeId = state.currentUserId;
        if (!assigneeId) return null;
        const parsed = parseSmartTask(prompt);
        const taskId = get().createTask({
          title: parsed.title,
          description: `AI extracted from: "${prompt}"`,
          priority: parsed.priority,
          dueDate: parsed.dueDate,
          assigneeId,
          status: "todo",
        });
        if (taskId) get().addActivity("created a task with AI assistant", "Task", taskId);
        return taskId;
      },
      generateInsight: (projectId) => {
        const state = get();
        const project = state.projects.find((candidate) => candidate.id === projectId);
        if (!project || !state.currentOrgId) return null;
        const projectTasks = state.tasks.filter((task) => task.projectId === projectId);
        const overdue = projectTasks.filter((task) => task.status !== "done" && new Date(task.dueDate).getTime() < Date.now()).length;
        const inProgress = projectTasks.filter((task) => task.status === "in-progress").length;
        const blockedSignal = projectTasks.filter((task) => task.priority === "Urgent" && task.status !== "done").length;
        const severity: AIInsight["severity"] = overdue + blockedSignal > 2 ? "high" : inProgress > 3 ? "medium" : "low";
        const insight: AIInsight = {
          id: newId("ins"),
          organizationId: state.currentOrgId,
          projectId,
          title: `${project.name} health analysis`,
          summary: `${project.progress}% complete with ${overdue} overdue task${overdue === 1 ? "" : "s"} and ${inProgress} task${inProgress === 1 ? "" : "s"} in progress.`,
          severity,
          recommendations: [
            blockedSignal > 0 ? "Review urgent tasks in standup and assign explicit owners." : "Keep active work-in-progress limits visible.",
            overdue > 0 ? "Renegotiate dates or split overdue work into smaller deliverables." : "Protect review capacity to keep throughput steady.",
          ],
          createdAt: new Date().toISOString(),
        };
        set({ insights: [insight, ...state.insights] });
        get().addActivity("generated AI project health analysis", "AIInsight", insight.id);
        return insight.id;
      },
      setTypingTask: (taskId) => set({ typingTaskId: taskId }),
      addActivity: (action, entity, entityId) => {
        const state = get();
        const entry = activityEntry(state, action, entity, entityId);
        if (!entry) return;
        set({ activities: [entry, ...state.activities] });
      },
    }),
    {
      name: "orbitdesk-workspace-v1",
      partialize: (state) => ({ ...state, typingTaskId: null }),
    },
  ),
);