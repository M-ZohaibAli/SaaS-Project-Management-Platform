import { PrismaClient, Role, ProjectPriority, ProjectStatus, TaskPriority, TaskStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("Password123!", 12);
  const ava = await prisma.user.upsert({
    where: { email: "ava@acme.test" },
    update: {},
    create: {
      name: "Ava Patel",
      email: "ava@acme.test",
      passwordHash,
      department: "Product",
      title: "VP Product",
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: "acme-cloud" },
    update: {},
    create: { name: "Acme Cloud", slug: "acme-cloud", domain: "acme.test", plan: "Enterprise" },
  });

  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: ava.id } },
    update: { role: Role.OWNER },
    create: { organizationId: org.id, userId: ava.id, role: Role.OWNER },
  });

  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: "Customer Portal Launch",
      description: "Ship onboarding, billing, support, and account controls.",
      status: ProjectStatus.ACTIVE,
      priority: ProjectPriority.CRITICAL,
      startDate: new Date(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  const board = await prisma.board.create({ data: { organizationId: org.id, projectId: project.id, name: "Delivery Board" } });
  const todo = await prisma.column.create({ data: { organizationId: org.id, boardId: board.id, name: "Todo", status: TaskStatus.TODO, order: 1 } });

  await prisma.task.create({
    data: {
      organizationId: org.id,
      projectId: project.id,
      columnId: todo.id,
      reporterId: ava.id,
      assigneeId: ava.id,
      title: "Harden OAuth onboarding flow",
      description: "Add invite-only enforcement, CSRF validation, and audit trails.",
      richText: "## Acceptance criteria\n- Invite-only signup\n- CSRF validation\n- Audit logs",
      status: TaskStatus.TODO,
      priority: TaskPriority.URGENT,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    },
  });
}

main().finally(async () => prisma.$disconnect());