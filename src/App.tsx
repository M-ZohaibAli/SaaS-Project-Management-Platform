import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent as ReactDragEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Columns3,
  Download,
  FileText,
  Filter,
  FolderKanban,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  UploadCloud,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useForm } from "react-hook-form";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { jsPDF } from "jspdf";
import type { z } from "zod";
import { cn } from "@/utils/cn";
import {
  bytesToSize,
  can,
  dateInputValue,
  formatRelativeDate,
  formatShortDate,
  inviteSchema,
  permissionMatrix,
  projectPriorities,
  projectSchema,
  projectStatuses,
  roles,
  signInSchema,
  signUpSchema,
  taskColumns,
  taskPriorities,
  taskSchema,
  type ActivityLog,
  type Comment,
  type ID,
  type Membership,
  type Notification,
  type Project,
  type Role,
  type StoredFile,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type User,
} from "@/lib/platform";
import { useWorkspaceStore, type View } from "@/stores/workspace";

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;
type ProjectValues = z.infer<typeof projectSchema>;
type TaskValues = z.infer<typeof taskSchema>;
type InviteValues = z.infer<typeof inviteSchema>;

const navItems: { view: View; label: string; icon: LucideIcon }[] = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "projects", label: "Projects", icon: FolderKanban },
  { view: "board", label: "Kanban", icon: Columns3 },
  { view: "notes", label: "Notes", icon: FileText },
  { view: "calendar", label: "Calendar", icon: CalendarDays },
  { view: "team", label: "Team", icon: Users },
  { view: "analytics", label: "Analytics", icon: BarChart3 },
  { view: "files", label: "Files", icon: Paperclip },
  { view: "activity", label: "Activity", icon: Activity },
  { view: "settings", label: "Settings", icon: Settings },
];

const priorityTone: Record<TaskPriority | "Critical" | "High" | "Medium" | "Low", string> = {
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  Medium: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
  High: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  Urgent: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
  Critical: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
};

const statusTone: Record<string, string> = {
  Planning: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "On Hold": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  Completed: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  Archived: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

function fuzzyMatch(query: string, value: string) {
  const needle = query.trim().toLowerCase();
  const haystack = value.toLowerCase();
  if (!needle) return true;
  if (haystack.includes(needle)) return true;
  let index = 0;
  for (const char of haystack) {
    if (char === needle[index]) index += 1;
    if (index === needle.length) return true;
  }
  return false;
}

function downloadBlob(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Avatar({ user, size = "md" }: { user?: User; size?: "sm" | "md" | "lg" }) {
  const dimension = size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-12 w-12 text-sm" : "h-9 w-9 text-xs";
  if (!user) {
    return <div className={cn("grid place-items-center rounded-full bg-slate-200 font-semibold text-slate-500", dimension)}>?</div>;
  }
  return (
    <img
      src={user.avatar}
      alt={`${user.name} avatar`}
      className={cn("rounded-full object-cover ring-2 ring-white dark:ring-slate-950", dimension)}
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-5 shadow-sm shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55 dark:shadow-black/20", className)}>
      {children}
    </section>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", className)}>{children}</span>;
}

function Button({ children, className, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const variants = {
    primary: "bg-slate-950 text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200",
    secondary: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
  };
  return (
    <button
      type="button"
      className={cn("inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50", variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-300">{message}</p>;
}

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10", className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 22 }}
        className="h-full rounded-full bg-slate-950 dark:bg-white"
      />
    </div>
  );
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority | "Critical" | "High" | "Medium" | "Low" }) {
  return <Pill className={priorityTone[priority]}>{priority}</Pill>;
}

function ProjectStatusBadge({ status }: { status: string }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusTone[status] ?? statusTone.Planning)}>{status}</span>;
}

function AuthScreen() {
  const signIn = useWorkspaceStore((state) => state.signIn);
  const signUp = useWorkspaceStore((state) => state.signUp);
  const requestPasswordReset = useWorkspaceStore((state) => state.requestPasswordReset);
  const resetPassword = useWorkspaceStore((state) => state.resetPassword);
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">("login");
  const [authMessage, setAuthMessage] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetEmail, setResetEmail] = useState("ava@acme.test");
  const [newPassword, setNewPassword] = useState("Password123!");

  const loginForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "ava@acme.test", password: "Password123!" },
  });
  const signupForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", organization: "" },
  });

  const submitLogin = loginForm.handleSubmit((values) => {
    const result = signIn(values.email, values.password);
    setAuthMessage(result.ok ? "" : result.message);
  });

  const submitSignup = signupForm.handleSubmit((values) => {
    const result = signUp(values.name, values.email, values.password, values.organization);
    setAuthMessage(result.ok ? "" : result.message);
  });

  const handleForgot = () => {
    const result = requestPasswordReset(resetEmail);
    setAuthMessage(result.message);
    if (result.token) {
      setResetToken(result.token);
      setMode("reset");
    }
  };

  const handleReset = () => {
    const result = resetPassword(resetToken, newPassword);
    setAuthMessage(result.ok ? "Password reset. Sign in with the new password." : result.message);
    if (result.ok) setMode("login");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.45),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.2),_transparent_34%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950 to-transparent" />
      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-slate-200 backdrop-blur">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            Tenant-isolated project operations for modern teams
          </div>
          <h1 className="mt-8 text-5xl font-semibold tracking-tight md:text-7xl">OrbitDesk</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            A commercial-grade project workspace combining Kanban execution, structured notes, analytics, permissions, files, notifications, and AI planning.
          </p>
          <div className="mt-10 grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
            <div className="border-l border-white/20 pl-4">
              <p className="text-2xl font-semibold text-white">RBAC</p>
              <p>Owner to Viewer controls</p>
            </div>
            <div className="border-l border-white/20 pl-4">
              <p className="text-2xl font-semibold text-white">Realtime</p>
              <p>Presence, activity, updates</p>
            </div>
            <div className="border-l border-white/20 pl-4">
              <p className="text-2xl font-semibold text-white">AI</p>
              <p>Task extraction and risk signals</p>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.55, delay: 0.1 }} className="rounded-[2rem] border border-white/15 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Secure workspace access</p>
              <h2 className="text-2xl font-semibold">{mode === "signup" ? "Create account" : mode === "forgot" ? "Recover password" : mode === "reset" ? "Reset password" : "Welcome back"}</h2>
            </div>
            <LockKeyhole className="h-6 w-6 text-emerald-300" />
          </div>

          {mode === "login" && (
            <form className="space-y-4" onSubmit={submitLogin}>
              <label className="block text-sm font-medium text-slate-200">
                Email
                <input className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-emerald-300/40 transition focus:ring-4" {...loginForm.register("email")} />
                <FieldError message={loginForm.formState.errors.email?.message} />
              </label>
              <label className="block text-sm font-medium text-slate-200">
                Password
                <input type="password" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-emerald-300/40 transition focus:ring-4" {...loginForm.register("password")} />
                <FieldError message={loginForm.formState.errors.password?.message} />
              </label>
              <button className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-200" type="submit">Sign in</button>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
                <button type="button" className="hover:text-white" onClick={() => setMode("forgot")}>Forgot password?</button>
                <button type="button" className="hover:text-white" onClick={() => setMode("signup")}>Create organization</button>
              </div>
            </form>
          )}

          {mode === "signup" && (
            <form className="space-y-4" onSubmit={submitSignup}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-200">
                  Name
                  <input className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-emerald-300/40 transition focus:ring-4" {...signupForm.register("name")} />
                  <FieldError message={signupForm.formState.errors.name?.message} />
                </label>
                <label className="block text-sm font-medium text-slate-200">
                  Organization
                  <input className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-emerald-300/40 transition focus:ring-4" {...signupForm.register("organization")} />
                  <FieldError message={signupForm.formState.errors.organization?.message} />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-200">
                Email
                <input className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-emerald-300/40 transition focus:ring-4" {...signupForm.register("email")} />
                <FieldError message={signupForm.formState.errors.email?.message} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-200">
                  Password
                  <input type="password" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-emerald-300/40 transition focus:ring-4" {...signupForm.register("password")} />
                  <FieldError message={signupForm.formState.errors.password?.message} />
                </label>
                <label className="block text-sm font-medium text-slate-200">
                  Confirm password
                  <input type="password" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-emerald-300/40 transition focus:ring-4" {...signupForm.register("confirmPassword")} />
                  <FieldError message={signupForm.formState.errors.confirmPassword?.message} />
                </label>
              </div>
              <button className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-200" type="submit">Start workspace</button>
              <button type="button" className="text-sm text-slate-300 hover:text-white" onClick={() => setMode("login")}>Already have an account?</button>
            </form>
          )}

          {mode === "forgot" && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-200">
                Recovery email
                <input value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-emerald-300/40 transition focus:ring-4" />
              </label>
              <button className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-200" type="button" onClick={handleForgot}>Send recovery link</button>
              <button type="button" className="text-sm text-slate-300 hover:text-white" onClick={() => setMode("login")}>Back to login</button>
            </div>
          )}

          {mode === "reset" && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-200">
                Reset token
                <input value={resetToken} onChange={(event) => setResetToken(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-emerald-300/40 transition focus:ring-4" />
              </label>
              <label className="block text-sm font-medium text-slate-200">
                New password
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-emerald-300/40 transition focus:ring-4" />
              </label>
              <button className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-200" type="button" onClick={handleReset}>Reset password</button>
            </div>
          )}

          {authMessage && <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">{authMessage}</p>}
          <p className="mt-6 text-xs leading-5 text-slate-400">Demo account: ava@acme.test / Password123!. Auth flows include signup, password recovery, reset tokens, session refresh, and tenant-scoped access.</p>
        </motion.section>
      </div>
    </main>
  );
}

function Sidebar({
  currentOrgName,
  currentRole,
  organizationOptions,
  currentOrgId,
  view,
  onView,
  onOrg,
  onCreateOrg,
  collapsed,
}: {
  currentOrgName: string;
  currentRole?: Role;
  organizationOptions: { id: ID; name: string; role: Role }[];
  currentOrgId: ID | null;
  view: View;
  onView: (view: View) => void;
  onOrg: (id: ID) => void;
  onCreateOrg: () => void;
  collapsed: boolean;
}) {
  return (
    <aside className={cn("fixed inset-y-0 left-0 z-30 w-72 border-r border-slate-200/80 bg-white/90 p-4 shadow-xl shadow-slate-200/40 backdrop-blur-2xl transition-transform dark:border-white/10 dark:bg-slate-950/90 dark:shadow-black/20 lg:sticky lg:translate-x-0", collapsed ? "-translate-x-full" : "translate-x-0")}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">OrbitDesk</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">SaaS command center</p>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Organization</label>
          <div className="mt-2 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500" />
            <select
              aria-label="Switch organization"
              value={currentOrgId ?? ""}
              onChange={(event) => onOrg(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-white"
            >
              {organizationOptions.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name}</option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate">{currentOrgName}</span>
            <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">{currentRole}</span>
          </div>
        </div>

        <nav className="mt-5 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.view;
            return (
              <button
                key={item.view}
                onClick={() => onView(item.view)}
                className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition", active ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white")}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Tenant boundary</p>
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Every view is filtered by organization membership and role.</p>
            </div>
          </div>
          <Button variant="secondary" className="w-full" onClick={onCreateOrg}><Plus className="h-4 w-4" /> New organization</Button>
        </div>
      </div>
    </aside>
  );
}

function Topbar({
  user,
  role,
  unreadCount,
  onSearch,
  onNotifications,
  onTheme,
  darkMode,
  onAi,
  onSignOut,
  onMenu,
}: {
  user: User;
  role?: Role;
  unreadCount: number;
  onSearch: () => void;
  onNotifications: () => void;
  onTheme: () => void;
  darkMode: boolean;
  onAi: () => void;
  onSignOut: () => void;
  onMenu: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-slate-50/80 px-4 py-3 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/80 lg:px-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" className="px-3 lg:hidden" onClick={onMenu} aria-label="Open navigation"><Menu className="h-5 w-5" /></Button>
        <button onClick={onSearch} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-slate-500 shadow-sm transition hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-white/20">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search projects, tasks, members, files, notes...</span>
          <span className="sm:hidden">Search...</span>
          <kbd className="ml-auto hidden rounded-lg border border-slate-200 px-2 py-0.5 text-xs dark:border-white/10 md:inline">/</kbd>
        </button>
        <Button variant="secondary" className="hidden sm:inline-flex" onClick={onAi}><Sparkles className="h-4 w-4" /> AI</Button>
        <Button variant="ghost" className="px-3" onClick={onTheme} aria-label="Toggle theme">{darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</Button>
        <button onClick={onNotifications} className="relative rounded-2xl p-2.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10" aria-label="Open notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950" />}
        </button>
        <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5 md:flex">
          <Avatar user={user} />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{role}</p>
          </div>
        </div>
        <Button variant="ghost" className="px-3" onClick={onSignOut} aria-label="Sign out"><LogOut className="h-5 w-5" /></Button>
      </div>
    </header>
  );
}

function DashboardView({
  projects,
  tasks,
  members,
  activities,
  notifications,
  usersById,
  setActiveProject,
  setSelectedTask,
}: {
  projects: Project[];
  tasks: Task[];
  members: { membership: Membership; user: User }[];
  activities: ActivityLog[];
  notifications: Notification[];
  usersById: Map<ID, User>;
  setActiveProject: (id: ID) => void;
  setSelectedTask: (id: ID) => void;
}) {
  const activeProjects = projects.filter((project) => project.status === "Active").length;
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const productivity = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const upcomingTasks = [...tasks]
    .filter((task) => task.status !== "done")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);
  const assignedTasks = tasks.filter((task) => task.assigneeId === "usr_ava" && task.status !== "done").slice(0, 4);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <PageHeader
        eyebrow="Workspace pulse"
        title="Plan, ship, and learn in one operating system."
        description="A tenant-aware command center for projects, live work, deadlines, notifications, and team execution signals."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Total projects", projects.length, FolderKanban],
          ["Active projects", activeProjects, Clock3],
          ["Completed tasks", completedTasks, CheckCircle2],
          ["Team members", members.length, Users],
          ["Productivity", `${productivity}%`, BarChart3],
        ].map(([label, value, Icon]) => {
          const MetricIcon = Icon as LucideIcon;
          return (
            <Panel key={String(label)} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">{label as string}</span>
                <MetricIcon className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{value as React.ReactNode}</p>
            </Panel>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Recent projects</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Progress and priority across active initiatives.</p>
            </div>
            <MoreHorizontal className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            {projects.map((project) => (
              <button key={project.id} onClick={() => setActiveProject(project.id)} className="w-full rounded-3xl border border-transparent p-4 text-left transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-white/10 dark:hover:bg-white/5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-950 dark:text-white">{project.name}</h3>
                      <ProjectStatusBadge status={project.status} />
                      <PriorityBadge priority={project.priority} />
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{project.description}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">{project.progress}%</span>
                </div>
                <ProgressBar value={project.progress} className="mt-4" />
              </button>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Upcoming deadlines</h2>
            <div className="mt-4 space-y-3">
              {upcomingTasks.map((task) => (
                <button key={task.id} onClick={() => setSelectedTask(task.id)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-slate-50 dark:hover:bg-white/5">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">{formatShortDate(task.dueDate)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{task.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Due {formatRelativeDate(task.dueDate)}</p>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Activity feed</h2>
            <div className="mt-4 space-y-4">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <Avatar user={usersById.get(activity.userId)} size="sm" />
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-200"><span className="font-semibold">{usersById.get(activity.userId)?.name}</span> {activity.action}</p>
                    <p className="text-xs text-slate-400">{formatRelativeDate(activity.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Assigned tasks</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {assignedTasks.map((task) => (
              <button key={task.id} onClick={() => setSelectedTask(task.id)} className="rounded-3xl border border-slate-200 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:hover:bg-white/5">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">{task.title}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{task.status.replace("-", " ")} - due {formatRelativeDate(task.dueDate)}</p>
              </button>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Notifications</h2>
          <div className="mt-4 space-y-3">
            {notifications.slice(0, 4).map((notification) => (
              <div key={notification.id} className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{notification.title}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{notification.body}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </motion.div>
  );
}

function ProjectsView({ projects, canManage, createProject, updateProject, deleteProject, setActiveProject }: { projects: Project[]; canManage: boolean; createProject: (input: ProjectValues) => ID | null; updateProject: (id: ID, patch: Partial<ProjectValues>) => void; deleteProject: (id: ID) => void; setActiveProject: (id: ID) => void }) {
  const [creating, setCreating] = useState(false);
  const form = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "Planning",
      priority: "Medium",
      startDate: dateInputValue(new Date().toISOString()),
      endDate: dateInputValue(new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()),
    },
  });
  const submit = form.handleSubmit((values) => {
    createProject(values);
    form.reset();
    setCreating(false);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Project portfolio"
        title="Keep every initiative accountable."
        description="Create projects with status, dates, priority, assigned team, progress, and tenant-aware controls."
        action={<Button disabled={!canManage} onClick={() => setCreating((value) => !value)}><Plus className="h-4 w-4" /> New project</Button>}
      />

      <AnimatePresence>
        {creating && (
          <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 overflow-hidden" onSubmit={submit}>
            <Panel className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Name
                <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:focus:ring-white/10" {...form.register("name")} />
                <FieldError message={form.formState.errors.name?.message} />
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Description
                <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:focus:ring-white/10" {...form.register("description")} />
                <FieldError message={form.formState.errors.description?.message} />
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Status
                <select className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-white/10 dark:bg-slate-900" {...form.register("status")}>
                  {projectStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Priority
                <select className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-white/10 dark:bg-slate-900" {...form.register("priority")}>
                  {projectPriorities.map((priority) => <option key={priority}>{priority}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Start date
                <input type="date" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-white/10 dark:bg-slate-900" {...form.register("startDate")} />
              </label>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                End date
                <input type="date" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-white/10 dark:bg-slate-900" {...form.register("endDate")} />
              </label>
              <div className="md:col-span-2 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
                <Button type="submit">Create project</Button>
              </div>
            </Panel>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid gap-4 xl:grid-cols-2">
        {projects.map((project) => (
          <Panel key={project.id} className="transition hover:-translate-y-1 hover:shadow-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <button onClick={() => setActiveProject(project.id)} className="text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{project.name}</h2>
                  <ProjectStatusBadge status={project.status} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{project.description}</p>
              </button>
              <PriorityBadge priority={project.priority} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Start</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{project.startDate}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">End</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{project.endDate}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Team</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{project.teamIds.length} members</p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <ProgressBar value={project.progress} className="flex-1" />
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">{project.progress}%</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {projectStatuses.map((status) => (
                <Button key={status} variant="secondary" className="px-3 py-1.5 text-xs" disabled={!canManage || project.status === status} onClick={() => updateProject(project.id, { status })}>{status}</Button>
              ))}
              <Button variant="danger" className="ml-auto px-3 py-1.5 text-xs" disabled={!canManage} onClick={() => deleteProject(project.id)}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
            </div>
          </Panel>
        ))}
      </div>
    </motion.div>
  );
}

function SortableTaskCard({ task, usersById, labels, onOpen, disabled }: { task: Task; usersById: Map<ID, User>; labels: { id: ID; name: string; color: string }[]; onOpen: (id: ID) => void; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const completed = task.checklist.filter((item) => item.completed).length;
  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-white/10 dark:bg-slate-950", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task.id)}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-5 text-slate-950 dark:text-white">{task.title}</h3>
        <PriorityBadge priority={task.priority} />
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{task.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {task.labelIds.map((labelId) => {
          const label = labels.find((candidate) => candidate.id === labelId);
          if (!label) return null;
          return <span key={label.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300"><span className={cn("h-2 w-2 rounded-full", label.color)} />{label.name}</span>;
        })}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Avatar user={usersById.get(task.assigneeId)} size="sm" />
          <span>{formatShortDate(task.dueDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          {task.fileIds.length > 0 && <span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" />{task.fileIds.length}</span>}
          {task.checklist.length > 0 && <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{completed}/{task.checklist.length}</span>}
        </div>
      </div>
    </motion.div>
  );
}

function KanbanColumn({ status, tasks, usersById, labels, onOpen, disabled }: { status: TaskStatus; tasks: Task[]; usersById: Map<ID, User>; labels: { id: ID; name: string; color: string }[]; onOpen: (id: ID) => void; disabled: boolean }) {
  const column = taskColumns.find((item) => item.id === status)!;
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={cn("min-h-[28rem] rounded-[1.75rem] border border-slate-200 bg-slate-100/70 p-3 transition dark:border-white/10 dark:bg-white/5", isOver && "ring-4 ring-slate-300/40 dark:ring-white/10")}>
      <div className="mb-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", column.accent)} />
          <h2 className="font-semibold text-slate-900 dark:text-white">{column.title}</h2>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-950 dark:text-slate-300">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {tasks.map((task) => <SortableTaskCard key={task.id} task={task} usersById={usersById} labels={labels} onOpen={onOpen} disabled={disabled} />)}
        </div>
      </SortableContext>
    </div>
  );
}

function BoardView({
  projects,
  tasks,
  labels,
  users,
  usersById,
  activeProjectId,
  setActiveProject,
  createTask,
  moveTask,
  canCreate,
  canManageBoard,
  onOpenTask,
}: {
  projects: Project[];
  tasks: Task[];
  labels: { id: ID; name: string; color: string }[];
  users: User[];
  usersById: Map<ID, User>;
  activeProjectId: ID | null;
  setActiveProject: (id: ID) => void;
  createTask: (input: TaskValues & { status?: TaskStatus }) => ID | null;
  moveTask: (taskId: ID, status: TaskStatus, index: number) => void;
  canCreate: boolean;
  canManageBoard: boolean;
  onOpenTask: (id: ID) => void;
}) {
  const [activeId, setActiveId] = useState<ID | null>(null);
  const [filters, setFilters] = useState<{ assignee: string; priority: string; status: string }>({ assignee: "all", priority: "all", status: "all" });
  const form = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", description: "", priority: "Medium", dueDate: dateInputValue(new Date(Date.now() + 86400000 * 7).toISOString()), assigneeId: users[0]?.id ?? "" },
  });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const activeProject = projects.find((project) => project.id === activeProjectId);
  const filteredTasks = tasks.filter((task) => {
    const assigneeOk = filters.assignee === "all" || task.assigneeId === filters.assignee;
    const priorityOk = filters.priority === "all" || task.priority === filters.priority;
    const statusOk = filters.status === "all" || task.status === filters.status;
    return assigneeOk && priorityOk && statusOk;
  });
  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  const submit = form.handleSubmit((values) => {
    createTask({ ...values, status: "todo" });
    form.reset({ ...values, title: "", description: "" });
  });

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));
  const handleDragEnd = (event: DragEndEvent) => {
    const taskId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    setActiveId(null);
    if (!overId || !canManageBoard) return;
    const overTask = tasksById.get(overId);
    const targetStatus = overTask?.status ?? (taskColumns.some((column) => column.id === overId) ? (overId as TaskStatus) : undefined);
    if (!targetStatus) return;
    const lane = tasks.filter((task) => task.status === targetStatus && task.id !== taskId).sort((a, b) => a.order - b.order);
    const index = overTask ? Math.max(0, lane.findIndex((task) => task.id === overTask.id)) : lane.length;
    moveTask(taskId, targetStatus, index);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Kanban board"
        title={activeProject?.name ?? "Select a project"}
        description="Drag tasks across columns with optimistic updates, activity logging, notifications, permissions, and live collaboration cues."
        action={
          <select value={activeProjectId ?? ""} onChange={(event) => setActiveProject(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white">
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        }
      />

      <Panel className="mb-5">
        <form className="grid gap-3 lg:grid-cols-[1fr_1fr_150px_160px_auto]" onSubmit={submit}>
          <input disabled={!canCreate} placeholder="Task title" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-200 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:ring-white/10" {...form.register("title")} />
          <input disabled={!canCreate} placeholder="Description" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-200 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:ring-white/10" {...form.register("description")} />
          <select disabled={!canCreate} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white" {...form.register("priority")}>
            {taskPriorities.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
          <select disabled={!canCreate} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white" {...form.register("assigneeId")}>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <Button type="submit" disabled={!canCreate}><Plus className="h-4 w-4" /> Add</Button>
          <div className="lg:col-span-5 grid gap-3 md:grid-cols-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400"><Filter className="mr-1 inline h-3.5 w-3.5" /> Assignee</label>
            <select value={filters.assignee} onChange={(event) => setFilters((value) => ({ ...value, assignee: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900 dark:text-white">
              <option value="all">All assignees</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            <select value={filters.priority} onChange={(event) => setFilters((value) => ({ ...value, priority: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900 dark:text-white">
              <option value="all">All priorities</option>
              {taskPriorities.map((priority) => <option key={priority}>{priority}</option>)}
            </select>
            <select value={filters.status} onChange={(event) => setFilters((value) => ({ ...value, status: event.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900 dark:text-white">
              <option value="all">All statuses</option>
              {taskColumns.map((column) => <option key={column.id} value={column.id}>{column.title}</option>)}
            </select>
          </div>
        </form>
      </Panel>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 xl:grid-cols-5">
          {taskColumns.map((column) => (
            <KanbanColumn key={column.id} status={column.id} tasks={filteredTasks.filter((task) => task.status === column.id).sort((a, b) => a.order - b.order)} usersById={usersById} labels={labels} onOpen={onOpenTask} disabled={!canManageBoard} />
          ))}
        </div>
        <DragOverlay>{activeId ? <div className="rounded-3xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-2xl">{tasksById.get(activeId)?.title}</div> : null}</DragOverlay>
      </DndContext>
    </motion.div>
  );
}

function NotesView({ projects, activeProjectId, setActiveProject, notesByProject, updateNote }: { projects: Project[]; activeProjectId: ID | null; setActiveProject: (id: ID) => void; notesByProject: Map<ID, string>; updateNote: (projectId: ID, content: string) => void }) {
  const [savedAt, setSavedAt] = useState(new Date());
  const content = activeProjectId ? notesByProject.get(activeProjectId) ?? "" : "";
  const saveTimer = useRef<number | null>(null);

  const handleChange = (value: string) => {
    if (!activeProjectId) return;
    updateNote(activeProjectId, value);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSavedAt(new Date()), 500);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Notion-inspired notes"
        title="Project knowledge that saves itself."
        description="Use headings, lists, code fences, quotes, links, tables, and markdown shortcuts. Changes autosave into the current project workspace."
        action={
          <select value={activeProjectId ?? ""} onChange={(event) => setActiveProject(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white">
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        }
      />
      <Panel className="p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Autosaved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          <div className="hidden gap-2 text-xs text-slate-400 sm:flex"><span># Heading</span><span>- List</span><span>``` Code</span><span>&gt; Quote</span></div>
        </div>
        <textarea
          value={content}
          onChange={(event) => handleChange(event.target.value)}
          className="min-h-[34rem] w-full resize-none bg-transparent p-8 font-mono text-sm leading-7 text-slate-800 outline-none dark:text-slate-100"
          aria-label="Rich project notes editor"
        />
      </Panel>
    </motion.div>
  );
}

function CalendarView({ tasks, updateTask, onOpenTask }: { tasks: Task[]; updateTask: (taskId: ID, patch: Partial<Task>) => void; onOpenTask: (id: ID) => void }) {
  const [view, setView] = useState<"Monthly" | "Weekly" | "Daily">("Monthly");
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: startOffset + daysInMonth }, (_, index) => (index < startOffset ? null : index - startOffset + 1));

  const onDrop = (event: ReactDragEvent<HTMLDivElement>, day: number) => {
    const taskId = event.dataTransfer.getData("taskId");
    const date = new Date(today.getFullYear(), today.getMonth(), day, 12).toISOString();
    if (taskId) updateTask(taskId, { dueDate: date });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Delivery calendar"
        title="Drag tasks between dates."
        description="Daily, weekly, and monthly planning surfaces keep due dates visible without leaving the project context."
        action={<div className="flex rounded-2xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5">{(["Daily", "Weekly", "Monthly"] as const).map((item) => <button key={item} className={cn("rounded-xl px-3 py-1.5 text-sm font-semibold", view === item ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-500 dark:text-slate-300")} onClick={() => setView(item)}>{item}</button>)}</div>}
      />
      <Panel>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{today.toLocaleString("default", { month: "long", year: "numeric" })}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{view} view</p>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day}>{day}</div>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {cells.map((day, index) => (
            <div key={`${day ?? "blank"}-${index}`} onDragOver={(event) => event.preventDefault()} onDrop={day ? (event) => onDrop(event, day) : undefined} className="min-h-32 rounded-3xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/5">
              {day && <p className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-300">{day}</p>}
              {day && tasks.filter((task) => new Date(task.dueDate).getDate() === day && new Date(task.dueDate).getMonth() === today.getMonth()).map((task) => (
                <button key={task.id} draggable onDragStart={(event) => event.dataTransfer.setData("taskId", task.id)} onClick={() => onOpenTask(task.id)} className="mb-1 w-full rounded-2xl bg-white p-2 text-left text-xs font-semibold text-slate-800 shadow-sm dark:bg-slate-950 dark:text-slate-100">
                  {task.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      </Panel>
    </motion.div>
  );
}

function TeamView({ members, invitations, canManageTeam, inviteMember, changeMemberRole, removeMember }: { members: { membership: Membership; user: User }[]; invitations: { id: ID; email: string; role: Role; status: string; expiresAt: string }[]; canManageTeam: boolean; inviteMember: (email: string, role: Role) => ID | null; changeMemberRole: (id: ID, role: Role) => void; removeMember: (id: ID) => void }) {
  const form = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { email: "", role: "Member" } });
  const submit = form.handleSubmit((values) => {
    inviteMember(values.email, values.role);
    form.reset({ email: "", role: "Member" });
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Team management" title="Invite, govern, and support members." description="Profiles include department, email, role, and secure RBAC operations for each organization." />
      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <Panel>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Invite by email</h2>
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <input disabled={!canManageTeam} placeholder="teammate@company.com" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white" {...form.register("email")} />
            <FieldError message={form.formState.errors.email?.message} />
            <select disabled={!canManageTeam} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white" {...form.register("role")}>
              {roles.map((role) => <option key={role}>{role}</option>)}
            </select>
            <Button type="submit" disabled={!canManageTeam} className="w-full"><Send className="h-4 w-4" /> Send invitation</Button>
          </form>
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Invitations</h3>
            {invitations.map((invitation) => (
              <div key={invitation.id} className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{invitation.email}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{invitation.role} - {invitation.status} - expires {formatShortDate(invitation.expiresAt)}</p>
              </div>
            ))}
          </div>
        </Panel>
        <div className="grid gap-4 md:grid-cols-2">
          {members.map(({ membership, user }) => (
            <Panel key={membership.id}>
              <div className="flex items-start gap-4">
                <Avatar user={user} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-slate-950 dark:text-white">{user.name}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{user.title}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">{user.department}</span>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <select disabled={!canManageTeam || membership.role === "Owner"} value={membership.role} onChange={(event) => changeMemberRole(membership.id, event.target.value as Role)} className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900 dark:text-white">
                  {roles.map((role) => <option key={role}>{role}</option>)}
                </select>
                <Button variant="danger" className="px-3" disabled={!canManageTeam || membership.role === "Owner"} onClick={() => removeMember(membership.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function AnalyticsView({ projects, tasks, usersById, generateInsight }: { projects: Project[]; tasks: Task[]; usersById: Map<ID, User>; generateInsight: (projectId: ID) => ID | null }) {
  const completionData = taskColumns.map((column) => ({ name: column.title, tasks: tasks.filter((task) => task.status === column.id).length }));
  const workloadData = Array.from(usersById.values()).map((user) => ({ name: user.name.split(" ")[0], tasks: tasks.filter((task) => task.assigneeId === user.id && task.status !== "done").length }));
  const progressData = projects.map((project) => ({ name: project.name.slice(0, 14), progress: project.progress }));
  const trendData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => ({ day, completed: Math.max(1, tasks.filter((task) => task.status === "done").length + index - 2), created: Math.max(2, tasks.length - index) }));

  const exportCsv = () => {
    const csv = ["Project,Progress,Status,Priority", ...projects.map((project) => `${project.name},${project.progress},${project.status},${project.priority}`)].join("\n");
    downloadBlob("orbitdesk-report.csv", csv, "text/csv;charset=utf-8");
  };

  const exportPdf = () => {
    const document = new jsPDF();
    document.setFontSize(18);
    document.text("OrbitDesk Project Report", 14, 20);
    document.setFontSize(11);
    projects.forEach((project, index) => {
      document.text(`${project.name}: ${project.progress}% - ${project.status} - ${project.priority}`, 14, 34 + index * 8);
    });
    document.save("orbitdesk-report.pdf");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Analytics"
        title="Measure delivery health."
        description="Completion, productivity trends, workload, burn down, and project progress reports with CSV and PDF exports."
        action={<div className="flex gap-2"><Button variant="secondary" onClick={exportCsv}><Download className="h-4 w-4" /> CSV</Button><Button onClick={exportPdf}><Download className="h-4 w-4" /> PDF</Button></div>}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="h-80">
          <h2 className="mb-4 font-semibold text-slate-950 dark:text-white">Task completion</h2>
          <ResponsiveContainer width="100%" height="85%"><BarChart data={completionData}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="tasks" radius={[10, 10, 0, 0]} fill="#0f172a" /></BarChart></ResponsiveContainer>
        </Panel>
        <Panel className="h-80">
          <h2 className="mb-4 font-semibold text-slate-950 dark:text-white">Productivity trends</h2>
          <ResponsiveContainer width="100%" height="85%"><LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={3} /><Line type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={3} /></LineChart></ResponsiveContainer>
        </Panel>
        <Panel className="h-80">
          <h2 className="mb-4 font-semibold text-slate-950 dark:text-white">Team workload</h2>
          <ResponsiveContainer width="100%" height="85%"><PieChart><Pie data={workloadData} dataKey="tasks" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={4}>{workloadData.map((entry, index) => <Cell key={entry.name} fill={["#0f172a", "#6366f1", "#10b981", "#f59e0b", "#ef4444"][index % 5]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
        </Panel>
        <Panel className="h-80">
          <h2 className="mb-4 font-semibold text-slate-950 dark:text-white">Project progress</h2>
          <ResponsiveContainer width="100%" height="85%"><BarChart data={progressData} layout="vertical"><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis type="number" domain={[0, 100]} /><YAxis type="category" dataKey="name" width={110} /><Tooltip /><Bar dataKey="progress" radius={[0, 10, 10, 0]} fill="#10b981" /></BarChart></ResponsiveContainer>
        </Panel>
      </div>
      <Panel className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">AI project health analysis</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Detect delays, bottlenecks, risks, and recommendation opportunities.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {projects.map((project) => <Button key={project.id} variant="secondary" onClick={() => generateInsight(project.id)}><Sparkles className="h-4 w-4" /> Analyze {project.name.split(" ")[0]}</Button>)}
        </div>
      </Panel>
    </motion.div>
  );
}

function FilesView({ files, usersById, uploadFile, deleteFile }: { files: StoredFile[]; usersById: Map<ID, User>; uploadFile: (file: { name: string; type: string; size: number; url: string }) => ID | null; deleteFile: (id: ID) => void }) {
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFiles = (fileList: FileList | File[]) => {
    Array.from(fileList).forEach((file) => {
      setProgress(15);
      const url = URL.createObjectURL(file);
      window.setTimeout(() => setProgress(70), 250);
      window.setTimeout(() => {
        uploadFile({ name: file.name, type: file.type, size: file.size, url });
        setProgress(100);
      }, 650);
      window.setTimeout(() => setProgress(0), 1400);
    });
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) uploadFiles(event.target.files);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Files" title="Upload, preview, download, delete." description="Attach images, PDFs, documents, and videos with metadata, progress feedback, and project audit logging." />
      <div
        onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => { event.preventDefault(); setDragActive(false); uploadFiles(event.dataTransfer.files); }}
        className={cn("mb-6 rounded-[2rem] border-2 border-dashed border-slate-300 bg-white/70 p-10 text-center transition dark:border-white/15 dark:bg-white/5", dragActive && "border-slate-950 bg-slate-100 dark:border-white dark:bg-white/10")}
      >
        <UploadCloud className="mx-auto h-10 w-10 text-slate-400" />
        <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">Drop files here</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Uploads are stored as metadata in the workspace and linked to the active project.</p>
        <label className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
          Choose files
          <input type="file" className="sr-only" multiple onChange={handleInput} />
        </label>
        {progress > 0 && <ProgressBar value={progress} className="mx-auto mt-5 max-w-md" />}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {files.map((file) => (
          <Panel key={file.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"><Paperclip className="h-5 w-5" /></div>
                <h2 className="mt-4 truncate font-semibold text-slate-950 dark:text-white">{file.name}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{bytesToSize(file.size)} - {file.type || "file"}</p>
                <p className="mt-1 text-xs text-slate-400">Uploaded by {usersById.get(file.uploadedById)?.name}</p>
              </div>
              <Button variant="danger" className="px-3" onClick={() => deleteFile(file.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="mt-5 flex gap-2">
              <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"><FileText className="h-4 w-4" /> Preview</a>
              <a href={file.url} download={file.name} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"><Download className="h-4 w-4" /> Download</a>
            </div>
          </Panel>
        ))}
      </div>
    </motion.div>
  );
}

function ActivityView({ activities, usersById }: { activities: ActivityLog[]; usersById: Map<ID, User> }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Audit timeline" title="Every important action is recorded." description="Activity logs capture user, action, entity, and timestamp for auditability and team awareness." />
      <Panel>
        <div className="space-y-0">
          {activities.map((activity, index) => (
            <div key={activity.id} className="grid grid-cols-[auto_1fr] gap-4">
              <div className="flex flex-col items-center">
                <Avatar user={usersById.get(activity.userId)} size="sm" />
                {index < activities.length - 1 && <div className="h-full w-px bg-slate-200 dark:bg-white/10" />}
              </div>
              <div className="pb-6">
                <p className="text-sm text-slate-700 dark:text-slate-200"><span className="font-semibold">{usersById.get(activity.userId)?.name}</span> {activity.action}</p>
                <p className="mt-1 text-xs text-slate-400">{activity.entity} - {formatRelativeDate(activity.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </motion.div>
  );
}

function SettingsView({
  orgName,
  role,
  renameOrganization,
  deleteOrganization,
  canDelete,
}: {
  orgName: string;
  role?: Role;
  renameOrganization: (name: string) => void;
  deleteOrganization: () => void;
  canDelete: boolean;
}) {
  const [name, setName] = useState(orgName);
  useEffect(() => setName(orgName), [orgName]);
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Workspace settings" title="Security, access, and tenant configuration." description="Manage organization identity, RBAC controls, production safeguards, and platform posture." />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Organization</h2>
          <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white" />
          </label>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => renameOrganization(name)}>Save</Button>
            <Button variant="danger" disabled={!canDelete} onClick={deleteOrganization}><Trash2 className="h-4 w-4" /> Delete organization</Button>
          </div>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Current role: <span className="font-semibold text-slate-900 dark:text-white">{role}</span></p>
        </Panel>
        <Panel>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">RBAC matrix</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="py-2">Permission</th>{roles.map((item) => <th key={item} className="py-2">{item}</th>)}</tr>
              </thead>
              <tbody>
                {Object.keys(permissionMatrix).map((permission) => (
                  <tr key={permission} className="border-t border-slate-100 dark:border-white/10">
                    <td className="py-3 font-medium text-slate-800 dark:text-slate-200">{permission}</td>
                    {roles.map((item) => <td key={item} className="py-3">{can(item, permission as keyof typeof permissionMatrix) ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-slate-300" />}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Secure headers", "CSP, XSS, frame, HSTS, and referrer policies are specified in the production guide."],
          ["Rate limiting", "Tenant-aware API middleware includes Redis-backed limits and audit logs."],
          ["CSRF + sessions", "Auth architecture uses signed cookies, JWT sessions, refresh rotation, and CSRF tokens."],
        ].map(([title, body]) => <Panel key={title}><ShieldCheck className="h-5 w-5 text-emerald-500" /><h3 className="mt-3 font-semibold text-slate-950 dark:text-white">{title}</h3><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{body}</p></Panel>)}
      </div>
    </motion.div>
  );
}

function NotificationCenter({ open, notifications, onClose, onRead, onReadAll }: { open: boolean; notifications: Notification[]; onClose: () => void; onRead: (id: ID) => void; onReadAll: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside initial={{ x: 420, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 420, opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 220 }} className="fixed right-4 top-20 z-40 w-[calc(100vw-2rem)] max-w-md rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <div><h2 className="text-lg font-semibold text-slate-950 dark:text-white">Notifications</h2><p className="text-sm text-slate-500 dark:text-slate-400">Realtime in-app updates</p></div>
            <Button variant="ghost" className="px-3" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
          <Button variant="secondary" className="mt-4 w-full" onClick={onReadAll}>Mark all as read</Button>
          <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {notifications.map((notification) => (
              <button key={notification.id} onClick={() => onRead(notification.id)} className={cn("w-full rounded-2xl p-4 text-left transition", notification.read ? "bg-slate-50 dark:bg-white/5" : "bg-slate-950 text-white dark:bg-white dark:text-slate-950")}>
                <p className="text-sm font-semibold">{notification.title}</p>
                <p className={cn("mt-1 text-sm", notification.read ? "text-slate-500 dark:text-slate-400" : "text-slate-200 dark:text-slate-600")}>{notification.body}</p>
                <p className={cn("mt-2 text-xs", notification.read ? "text-slate-400" : "text-slate-300 dark:text-slate-500")}>{formatRelativeDate(notification.createdAt)}</p>
              </button>
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function SearchDialog({ open, query, setQuery, onClose, results }: { open: boolean; query: string; setQuery: (query: string) => void; onClose: () => void; results: { id: ID; type: string; title: string; description: string; action: () => void }[] }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-950/50 p-4 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ y: -24, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: -24, scale: 0.98 }} className="mx-auto mt-20 max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-200 px-2 pb-4 dark:border-white/10">
              <Search className="h-5 w-5 text-slate-400" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search anything..." className="flex-1 bg-transparent text-lg outline-none dark:text-white" />
              <Button variant="ghost" className="px-3" onClick={onClose}><X className="h-5 w-5" /></Button>
            </div>
            <div className="mt-3 max-h-[60vh] overflow-y-auto">
              {results.map((result) => (
                <button key={`${result.type}-${result.id}`} onClick={() => { result.action(); onClose(); }} className="w-full rounded-2xl p-4 text-left transition hover:bg-slate-50 dark:hover:bg-white/5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{result.type}</p>
                  <p className="mt-1 font-semibold text-slate-950 dark:text-white">{result.title}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{result.description}</p>
                </button>
              ))}
              {results.length === 0 && <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No results yet. Try a project, task, member, file, or note.</p>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AIAssistant({ open, onClose, projects, insights, createSmartTask, generateInsight }: { open: boolean; onClose: () => void; projects: Project[]; insights: { id: ID; title: string; summary: string; recommendations: string[]; severity: string }[]; createSmartTask: (prompt: string) => ID | null; generateInsight: (projectId: ID) => ID | null }) {
  const [prompt, setPrompt] = useState("Build login page before Friday");
  const [meetingNotes, setMeetingNotes] = useState("Discussed OAuth hardening, onboarding copy, and launch readiness. Miles owns rate limiting. Noor owns mobile QA.");
  const summary = useMemo(() => {
    const sentences = meetingNotes.split(/[.!?]/).map((item) => item.trim()).filter(Boolean);
    return sentences.slice(0, 3).join(". ") + (sentences.length ? "." : "");
  }, [meetingNotes]);
  return (
    <AnimatePresence>
      {open && (
        <motion.aside initial={{ x: 480, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 480, opacity: 0 }} transition={{ type: "spring", damping: 30, stiffness: 220 }} className="fixed bottom-4 right-4 top-20 z-40 w-[calc(100vw-2rem)] max-w-lg overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/10">
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950"><Sparkles className="h-5 w-5" /></div><div><h2 className="font-semibold text-slate-950 dark:text-white">AI productivity assistant</h2><p className="text-sm text-slate-500 dark:text-slate-400">Task creation, summaries, health insights</p></div></div>
            <Button variant="ghost" className="px-3" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
          <div className="h-[calc(100%-5rem)] space-y-5 overflow-y-auto p-5">
            <section>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Smart task creation</h3>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
              <Button className="mt-2 w-full" onClick={() => createSmartTask(prompt)}><Sparkles className="h-4 w-4" /> Extract and create task</Button>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Meeting notes summary</h3>
              <textarea value={meetingNotes} onChange={(event) => setMeetingNotes(event.target.value)} className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
              <div className="mt-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-white">Summary:</span> {summary}</div>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Project health analysis</h3>
              <div className="mt-2 flex flex-wrap gap-2">{projects.map((project) => <Button key={project.id} variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => generateInsight(project.id)}>Analyze {project.name}</Button>)}</div>
              <div className="mt-3 space-y-3">
                {insights.slice(0, 4).map((insight) => (
                  <div key={insight.id} className="rounded-2xl border border-slate-200 p-3 dark:border-white/10">
                    <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-950 dark:text-white">{insight.title}</p><span className="text-xs uppercase text-slate-400">{insight.severity}</span></div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{insight.summary}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-500 dark:text-slate-400">{insight.recommendations.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function TaskDrawer({
  task,
  users,
  usersById,
  comments,
  files,
  canEdit,
  onClose,
  updateTask,
  addChecklistItem,
  toggleChecklistItem,
  addComment,
  updateComment,
  deleteComment,
  reactToComment,
  uploadFile,
  deleteFile,
  setTypingTask,
  typingTaskId,
}: {
  task?: Task;
  users: User[];
  usersById: Map<ID, User>;
  comments: Comment[];
  files: StoredFile[];
  canEdit: boolean;
  onClose: () => void;
  updateTask: (taskId: ID, patch: Partial<Task>) => void;
  addChecklistItem: (taskId: ID, text: string) => void;
  toggleChecklistItem: (taskId: ID, checklistItemId: ID) => void;
  addComment: (taskId: ID, body: string, parentId?: ID) => ID | null;
  updateComment: (commentId: ID, body: string) => void;
  deleteComment: (commentId: ID) => void;
  reactToComment: (commentId: ID, reaction: string) => void;
  uploadFile: (file: { name: string; type: string; size: number; url: string; taskId?: ID }) => ID | null;
  deleteFile: (id: ID) => void;
  setTypingTask: (taskId: ID | null) => void;
  typingTaskId: ID | null;
}) {
  const [checklistText, setChecklistText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [editingComment, setEditingComment] = useState<ID | null>(null);
  const [editText, setEditText] = useState("");
  if (!task) return null;
  const taskComments = comments.filter((comment) => comment.taskId === task.id && !comment.parentId);
  const taskFiles = files.filter((file) => task.fileIds.includes(file.id));
  const checklistProgress = task.checklist.length ? Math.round((task.checklist.filter((item) => item.completed).length / task.checklist.length) * 100) : 0;
  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    Array.from(event.target.files).forEach((file) => uploadFile({ name: file.name, type: file.type, size: file.size, url: URL.createObjectURL(file), taskId: task.id }));
  };

  return (
    <AnimatePresence>
      <motion.aside initial={{ x: 620, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 620, opacity: 0 }} transition={{ type: "spring", damping: 30, stiffness: 220 }} className="fixed bottom-0 right-0 top-0 z-50 w-full overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-950 md:w-[42rem]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><PriorityBadge priority={task.priority} /><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600 dark:bg-white/10 dark:text-slate-300">{task.status.replace("-", " ")}</span></div>
          <Button variant="ghost" className="px-3" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        <input disabled={!canEdit} value={task.title} onChange={(event) => updateTask(task.id, { title: event.target.value })} className="mt-6 w-full bg-transparent text-3xl font-semibold tracking-tight text-slate-950 outline-none disabled:opacity-100 dark:text-white" />
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Assigned to {usersById.get(task.assigneeId)?.name} - due {formatRelativeDate(task.dueDate)}</p>
        {typingTaskId === task.id && <p className="mt-2 text-xs font-semibold text-emerald-500">Live editing indicator active</p>}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assignee<select disabled={!canEdit} value={task.assigneeId} onChange={(event) => updateTask(task.id, { assigneeId: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-white">{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Priority<select disabled={!canEdit} value={task.priority} onChange={(event) => updateTask(task.id, { priority: event.target.value as TaskPriority })} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-white">{taskPriorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Due date<input disabled={!canEdit} type="date" value={dateInputValue(task.dueDate)} onChange={(event) => updateTask(task.id, { dueDate: new Date(`${event.target.value}T12:00:00`).toISOString() })} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-white" /></label>
        </div>
        <section className="mt-6">
          <h2 className="font-semibold text-slate-950 dark:text-white">Rich text description</h2>
          <textarea
            disabled={!canEdit}
            value={task.richText}
            onFocus={() => setTypingTask(task.id)}
            onBlur={() => setTypingTask(null)}
            onChange={(event) => updateTask(task.id, { richText: event.target.value, description: event.target.value.slice(0, 180) })}
            className="mt-3 min-h-40 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none disabled:opacity-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </section>
        <section className="mt-6">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-slate-950 dark:text-white">Checklist</h2><span className="text-sm text-slate-500">{checklistProgress}%</span></div>
          <ProgressBar value={checklistProgress} className="mt-3" />
          <div className="mt-3 space-y-2">
            {task.checklist.map((item) => <label key={item.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-white/5"><input type="checkbox" checked={item.completed} disabled={!canEdit} onChange={() => toggleChecklistItem(task.id, item.id)} /> <span className={cn(item.completed && "line-through text-slate-400")}>{item.text}</span></label>)}
          </div>
          <div className="mt-3 flex gap-2"><input value={checklistText} onChange={(event) => setChecklistText(event.target.value)} disabled={!canEdit} placeholder="Add checklist item" className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white" /><Button disabled={!canEdit || !checklistText.trim()} onClick={() => { addChecklistItem(task.id, checklistText); setChecklistText(""); }}>Add</Button></div>
        </section>
        <section className="mt-6">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-slate-950 dark:text-white">Attachments</h2><label className="cursor-pointer rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-white/10"><UploadCloud className="mr-1 inline h-3.5 w-3.5" /> Upload<input className="sr-only" type="file" multiple disabled={!canEdit} onChange={handleFileInput} /></label></div>
          <div className="mt-3 space-y-2">{taskFiles.map((file) => <div key={file.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-white/5"><Paperclip className="h-4 w-4 text-slate-400" /><a href={file.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{file.name}</a><span className="text-xs text-slate-400">{bytesToSize(file.size)}</span><Button variant="ghost" className="px-2" disabled={!canEdit} onClick={() => deleteFile(file.id)}><Trash2 className="h-4 w-4" /></Button></div>)}</div>
        </section>
        <section className="mt-6">
          <h2 className="font-semibold text-slate-950 dark:text-white">Comments</h2>
          <div className="mt-3 flex gap-2"><input value={commentText} onChange={(event) => setCommentText(event.target.value)} disabled={!canEdit} placeholder="Comment with @mentions" className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white" /><Button disabled={!canEdit || !commentText.trim()} onClick={() => { addComment(task.id, commentText); setCommentText(""); }}><MessageSquare className="h-4 w-4" /></Button></div>
          <div className="mt-4 space-y-4">
            {taskComments.map((comment) => (
              <div key={comment.id} className="rounded-3xl border border-slate-200 p-4 dark:border-white/10">
                <div className="flex items-center gap-3"><Avatar user={usersById.get(comment.authorId)} size="sm" /><div><p className="text-sm font-semibold text-slate-950 dark:text-white">{usersById.get(comment.authorId)?.name}</p><p className="text-xs text-slate-400">{formatRelativeDate(comment.createdAt)}</p></div></div>
                {editingComment === comment.id ? <input value={editText} onChange={(event) => setEditText(event.target.value)} className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900 dark:text-white" /> : <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{comment.body}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(comment.reactions).map(([reaction, users]) => <Button key={reaction} variant="secondary" className="px-2 py-1 text-xs" onClick={() => reactToComment(comment.id, reaction)}>{reaction} {users.length}</Button>)}
                  <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => reactToComment(comment.id, "thumbs")}>thumbs</Button>
                  {editingComment === comment.id ? <Button className="px-2 py-1 text-xs" onClick={() => { updateComment(comment.id, editText); setEditingComment(null); }}>Save</Button> : <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => { setEditingComment(comment.id); setEditText(comment.body); }}>Edit</Button>}
                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => deleteComment(comment.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </motion.aside>
    </AnimatePresence>
  );
}

export default function App() {
  const store = useWorkspaceStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<ID | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", store.darkMode);
  }, [store.darkMode]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!store.currentUserId) return <AuthScreen />;

  const currentUser = store.users.find((user) => user.id === store.currentUserId) ?? store.users[0];
  const currentOrg = store.organizations.find((organization) => organization.id === store.currentOrgId);
  const membership = store.memberships.find((item) => item.organizationId === store.currentOrgId && item.userId === currentUser.id);
  const userOrgMemberships = store.memberships.filter((item) => item.userId === currentUser.id);
  const organizationOptions = userOrgMemberships.map((item) => ({ id: item.organizationId, name: store.organizations.find((organization) => organization.id === item.organizationId)?.name ?? "Workspace", role: item.role }));
  const currentRole = membership?.role;

  const orgProjects = store.projects.filter((project) => project.organizationId === store.currentOrgId);
  const orgTasks = store.tasks.filter((task) => task.organizationId === store.currentOrgId && orgProjects.some((project) => project.id === task.projectId));
  const activeProjectTasks = orgTasks.filter((task) => task.projectId === store.activeProjectId);
  const orgLabels = store.labels.filter((label) => label.organizationId === store.currentOrgId);
  const orgMembers = store.memberships
    .filter((item) => item.organizationId === store.currentOrgId)
    .map((item) => ({ membership: item, user: store.users.find((user) => user.id === item.userId) }))
    .filter((item): item is { membership: Membership; user: User } => Boolean(item.user));
  const orgUsers = orgMembers.map((item) => item.user);
  const usersById = new Map(store.users.map((user) => [user.id, user]));
  const orgActivities = store.activities.filter((activity) => activity.organizationId === store.currentOrgId);
  const orgNotifications = store.notifications.filter((notification) => notification.organizationId === store.currentOrgId && notification.userId === currentUser.id);
  const orgFiles = store.files.filter((file) => file.organizationId === store.currentOrgId);
  const orgInvitations = store.invitations.filter((invitation) => invitation.organizationId === store.currentOrgId);
  const orgInsights = store.insights.filter((insight) => insight.organizationId === store.currentOrgId);
  const notesByProject = new Map(store.notes.filter((note) => note.organizationId === store.currentOrgId).map((note) => [note.projectId, note.content]));
  const selectedTask = orgTasks.find((task) => task.id === selectedTaskId);
  const unreadCount = orgNotifications.filter((notification) => !notification.read).length;
  const canManageProjects = can(currentRole, "manageProjects");
  const canManageBoard = can(currentRole, "manageBoards");
  const canCreateTasks = can(currentRole, "createTasks");
  const canManageTeam = can(currentRole, "manageTeam");
  const canDeleteOrganization = can(currentRole, "deleteOrganization");
  const canEditTasks = canCreateTasks || canManageBoard;

  const searchResults = [
    ...orgProjects.map((project) => ({ id: project.id, type: "Project", title: project.name, description: project.description, action: () => { store.setActiveProject(project.id); store.setView("board"); } })),
    ...orgTasks.map((task) => ({ id: task.id, type: "Task", title: task.title, description: task.description, action: () => setSelectedTaskId(task.id) })),
    ...orgUsers.map((user) => ({ id: user.id, type: "Member", title: user.name, description: `${user.title} - ${user.email}`, action: () => store.setView("team") })),
    ...orgFiles.map((file) => ({ id: file.id, type: "File", title: file.name, description: `${bytesToSize(file.size)} - ${file.type}`, action: () => store.setView("files") })),
    ...store.notes.filter((note) => note.organizationId === store.currentOrgId).map((note) => ({ id: note.id, type: "Note", title: note.title, description: note.content.slice(0, 120), action: () => { store.setActiveProject(note.projectId); store.setView("notes"); } })),
  ].filter((result) => fuzzyMatch(searchQuery, `${result.type} ${result.title} ${result.description}`)).slice(0, 12);

  const createOrganization = () => {
    const name = window.prompt("Organization name");
    if (name?.trim()) store.createOrganization(name.trim());
  };

  const renderView = () => {
    switch (store.view) {
      case "projects":
        return <ProjectsView projects={orgProjects} canManage={canManageProjects} createProject={store.createProject} updateProject={store.updateProject} deleteProject={store.deleteProject} setActiveProject={store.setActiveProject} />;
      case "board":
        return <BoardView projects={orgProjects} tasks={activeProjectTasks} labels={orgLabels} users={orgUsers} usersById={usersById} activeProjectId={store.activeProjectId} setActiveProject={store.setActiveProject} createTask={store.createTask} moveTask={store.moveTask} canCreate={canCreateTasks} canManageBoard={canManageBoard} onOpenTask={setSelectedTaskId} />;
      case "notes":
        return <NotesView projects={orgProjects} activeProjectId={store.activeProjectId} setActiveProject={store.setActiveProject} notesByProject={notesByProject} updateNote={store.updateNote} />;
      case "calendar":
        return <CalendarView tasks={orgTasks} updateTask={store.updateTask} onOpenTask={setSelectedTaskId} />;
      case "team":
        return <TeamView members={orgMembers} invitations={orgInvitations} canManageTeam={canManageTeam} inviteMember={store.inviteMember} changeMemberRole={store.changeMemberRole} removeMember={store.removeMember} />;
      case "analytics":
        return <AnalyticsView projects={orgProjects} tasks={orgTasks} usersById={new Map(orgUsers.map((user) => [user.id, user]))} generateInsight={store.generateInsight} />;
      case "files":
        return <FilesView files={orgFiles} usersById={usersById} uploadFile={store.uploadFile} deleteFile={store.deleteFile} />;
      case "activity":
        return <ActivityView activities={orgActivities} usersById={usersById} />;
      case "settings":
        return <SettingsView orgName={currentOrg?.name ?? "Workspace"} role={currentRole} renameOrganization={store.renameOrganization} deleteOrganization={store.deleteOrganization} canDelete={canDeleteOrganization} />;
      case "dashboard":
      default:
        return <DashboardView projects={orgProjects} tasks={orgTasks} members={orgMembers} activities={orgActivities} notifications={orgNotifications} usersById={usersById} setActiveProject={(id) => { store.setActiveProject(id); store.setView("board"); }} setSelectedTask={setSelectedTaskId} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 antialiased dark:bg-slate-950 dark:text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.11),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.08),_transparent_30%)]" />
      <div className="relative flex min-h-screen">
        <Sidebar
          currentOrgName={currentOrg?.name ?? "Workspace"}
          currentRole={currentRole}
          organizationOptions={organizationOptions}
          currentOrgId={store.currentOrgId}
          view={store.view}
          onView={(view) => { store.setView(view); setMobileNavOpen(false); }}
          onOrg={store.setCurrentOrg}
          onCreateOrg={createOrganization}
          collapsed={!mobileNavOpen}
        />
        {mobileNavOpen && <button aria-label="Close navigation" className="fixed inset-0 z-20 bg-slate-950/40 lg:hidden" onClick={() => setMobileNavOpen(false)} />}
        <div className="min-w-0 flex-1 lg:ml-0">
          <Topbar
            user={currentUser}
            role={currentRole}
            unreadCount={unreadCount}
            onSearch={() => setSearchOpen(true)}
            onNotifications={() => setNotificationsOpen(true)}
            onTheme={store.toggleDarkMode}
            darkMode={store.darkMode}
            onAi={() => setAiOpen(true)}
            onSignOut={store.signOut}
            onMenu={() => setMobileNavOpen(true)}
          />
          <main className="px-4 py-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-[1500px]">{renderView()}</div>
          </main>
        </div>
      </div>
      <NotificationCenter open={notificationsOpen} notifications={orgNotifications} onClose={() => setNotificationsOpen(false)} onRead={store.markNotificationRead} onReadAll={store.markAllNotificationsRead} />
      <SearchDialog open={searchOpen} query={searchQuery} setQuery={setSearchQuery} onClose={() => setSearchOpen(false)} results={searchResults} />
      <AIAssistant open={aiOpen} onClose={() => setAiOpen(false)} projects={orgProjects} insights={orgInsights} createSmartTask={store.createSmartTask} generateInsight={store.generateInsight} />
      <TaskDrawer
        task={selectedTask}
        users={orgUsers}
        usersById={usersById}
        comments={store.comments.filter((comment) => comment.organizationId === store.currentOrgId)}
        files={orgFiles}
        canEdit={canEditTasks}
        onClose={() => setSelectedTaskId(null)}
        updateTask={store.updateTask}
        addChecklistItem={store.addChecklistItem}
        toggleChecklistItem={store.toggleChecklistItem}
        addComment={store.addComment}
        updateComment={store.updateComment}
        deleteComment={store.deleteComment}
        reactToComment={store.reactToComment}
        uploadFile={store.uploadFile}
        deleteFile={store.deleteFile}
        setTypingTask={store.setTypingTask}
        typingTaskId={store.typingTaskId}
      />
    </div>
  );
}