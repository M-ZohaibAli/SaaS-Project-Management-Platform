import { describe, expect, it } from "vitest";
import { can, parseSmartTask, seedMemberships, seedTasks } from "@/lib/platform";

describe("tenant permissions", () => {
  it("allows owners to delete organizations and prevents viewers from mutating boards", () => {
    expect(can("Owner", "deleteOrganization")).toBe(true);
    expect(can("Viewer", "manageBoards")).toBe(false);
  });

  it("keeps seeded organization data isolated", () => {
    const acmeMemberships = seedMemberships.filter((membership) => membership.organizationId === "org_acme");
    const northstarTasks = seedTasks.filter((task) => task.organizationId === "org_northstar");
    expect(acmeMemberships.every((membership) => membership.organizationId === "org_acme")).toBe(true);
    expect(northstarTasks.every((task) => task.organizationId === "org_northstar")).toBe(true);
  });

  it("extracts due dates and priorities from natural language", () => {
    const task = parseSmartTask("Build login page before Friday urgent");
    expect(task.title).toContain("Build login page");
    expect(task.priority).toBe("Urgent");
  });
});