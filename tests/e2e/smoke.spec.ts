import { expect, test } from "@playwright/test";

test("homepage smoke check", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Brixcot|Lead|Generation/i);
});

test("pricing page smoke check", async ({ page }) => {
  await page.goto("/pricing");

  const currentUrl = page.url();
  const isPricingPage = /\/pricing$/.test(currentUrl);
  const isAuthRedirect =
    /\/auth\/sign-in\?callbackUrl=/.test(currentUrl) &&
    decodeURIComponent(currentUrl).includes("/pricing");

  expect(isPricingPage || isAuthRedirect).toBe(true);
});

test("sign-in page smoke check", async ({ page }) => {
  await page.goto("/auth/sign-in");
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
});
