import { expect, test } from "@playwright/test";

test("commercial workspace loads with dashboard, search, and kanban", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("OrbitDesk").first()).toBeVisible();
  await expect(page.getByText("Workspace pulse")).toBeVisible();
  await page.getByRole("button", { name: "Kanban" }).click();
  await expect(page.getByText("Harden OAuth onboarding flow")).toBeVisible();
  await page.keyboard.press("/");
  await page.getByPlaceholder("Search anything...").fill("OAuth");
  await expect(page.getByText("Task").first()).toBeVisible();
});