import { test, expect } from "@playwright/test";

test.describe("Authentication flow", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("MSP Portal")).toBeVisible();
    await expect(page.getByText("Sign in")).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("shows error on bad credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("wronguser");
    await page.getByLabel("Password").fill("wrongpass");
    await page.getByRole("button", { name:"Sign In" }).click();
    await expect(page.getByText("Invalid username or password")).toBeVisible();
  });

  test("admin login navigates to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password").fill("Admin1234!");
    await page.getByRole("button", { name:"Sign In" }).click();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("enter key triggers login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password").fill("Admin1234!");
    await page.getByLabel("Password").press("Enter");
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("demo account buttons pre-fill credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("analyst1").click();
    await expect(page.getByLabel("Username")).toHaveValue("analyst1");
  });

  test("sign out returns to login page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password").fill("Admin1234!");
    await page.getByRole("button", { name:"Sign In" }).click();
    await page.waitForURL(/\/(dashboard|executive)/);
    await page.getByText("Sign out").click();
    await expect(page).toHaveURL(/\/login/);
  });
});
