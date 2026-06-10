export type Role = "Owner" | "Admin" | "Manager" | "Member" | "Viewer";

export type Permission =
  | "manageBilling"
  | "manageTeam"
  | "deleteOrganization"
  | "manageProjects"
  | "manageBoards"
  | "createTasks"
  | "assignTasks"
  | "comment"
  | "uploadFiles"
  | "readOnly";

const matrix: Record<Permission, Role[]> = {
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
};

export type RequestContext = {
  userId: string;
  organizationId: string;
  role: Role;
};

export function hasPermission(role: Role, permission: Permission) {
  return matrix[permission].includes(role);
}

export function assertPermission(context: RequestContext, permission: Permission) {
  if (!hasPermission(context.role, permission)) {
    const error = new Error(`Missing permission: ${permission}`);
    error.name = "ForbiddenError";
    throw error;
  }
}

export function tenantWhere<T extends Record<string, unknown>>(context: RequestContext, where: T) {
  return { ...where, organizationId: context.organizationId };
}

export function redactTenantFields<T extends { organizationId?: string }>(record: T) {
  const { organizationId, ...safeRecord } = record;
  void organizationId;
  return safeRecord;
}