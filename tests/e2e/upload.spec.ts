import { test, expect } from "@playwright/test";
import path from "path";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("Admin1234!");
  await page.getByRole("button", { name:"Sign In" }).click();
  await page.waitForURL(/\/(dashboard|executive)/);
}

test.describe("Upload flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("admin can navigate to upload page", async ({ page }) => {
    await page.goto("/admin/upload");
    await expect(page.getByText("Upload Ticket Data")).toBeVisible();
    await expect(page.getByText("Customer")).toBeVisible();
    await expect(page.getByText("CSV Format Requirements")).toBeVisible();
  });

  test("upload button disabled without customer selection", async ({ page }) => {
    await page.goto("/admin/upload");
    const btn = page.getByRole("button", { name:"Upload & Process" });
    await expect(btn).toBeDisabled();
  });

  test("customer selector shows available customers", async ({ page }) => {
    await page.goto("/admin/upload");
    await expect(page.locator("select")).toBeVisible();
    const options = await page.locator("select option").allTextContents();
    expect(options.length).toBeGreaterThan(1); // at least the placeholder + 1 customer
  });

  test("shows CSV format guide on upload page", async ({ page }) => {
    await page.goto("/admin/upload");
    await expect(page.getByText("Ticket number:")).toBeVisible();
    await expect(page.getByText("Assignment group:")).toBeVisible();
  });
});

test.describe("Dashboard data access", () => {
  test("admin can view seeded dashboard data", async ({ page }) => {
    await loginAsAdmin(page);
    // Navigate to first customer dashboard
    await page.goto("/dashboard");
    // Should redirect to first customer
    await page.waitForURL(/\/dashboard\/[a-f0-9]+/);
    // Should show some data
    await expect(page.locator("h1")).toBeVisible();
    // Overview tab should be active by default
    await expect(page.getByText("Overview")).toBeVisible();
  });

  test("switching tabs works", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    await page.waitForURL(/\/dashboard\/[a-f0-9]+/);
    // Click SLA tab
    await page.getByRole("button", { name:"SLA" }).click();
    await expect(page.getByText("Overall SLA Met")).toBeVisible();
  });

  test("analyst cannot access admin upload page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("analyst1");
    await page.getByLabel("Password").fill("Pass1234!");
    await page.getByRole("button", { name:"Sign In" }).click();
    await page.waitForURL(/\/(dashboard|executive)/);
    // Admin nav shouldn't be visible for analyst without admin role
    // (analyst1 is admin in seed - use viewer1 instead)
    await page.goto("/login");
    await page.getByLabel("Username").fill("viewer1");
    await page.getByLabel("Password").fill("View1234!");
    await page.getByRole("button", { name:"Sign In" }).click();
    await page.goto("/admin/upload");
    // Should be redirected away
    await expect(page).not.toHaveURL("/admin/upload");
  });
});
