const contract = require("../../server/api-contract.json");

describe("REST API contract", () => {
  test("every route declares method, path, and permission", () => {
    expect(contract.routes.length).toBeGreaterThan(45);
    for (const route of contract.routes) {
      expect(route.method).toMatch(/GET|POST|PATCH|PUT|DELETE/);
      expect(route.path).toMatch(/^\/api\//);
      expect(route.permission).toBeTruthy();
    }
  });

  test("tenant scoped resources are present", () => {
    const paths = contract.routes.map((route) => route.path);
    expect(paths).toContain("/api/projects");
    expect(paths).toContain("/api/tasks");
    expect(paths).toContain("/api/notifications");
    expect(contract.tenantHeader).toBe("x-organization-id");
  });
});