import { expect, test } from "@playwright/test";

const ATTENTION = "00000000-0000-4000-8000-000000001706";

// The API sleeps on its free plan and takes about 50 seconds to wake. Until then the website's
// forward to it fails with a gateway error; pages keep trying and say so, instead of breaking.

test("when the API answers after waking, the library loads by itself, with no error to dismiss", async ({ page }) => {
  let failures = 2;
  await page.route("**/api/papers", (route) => (failures-- > 0 ? route.fulfill({ status: 503, body: "" }) : route.continue()));
  await page.goto("/library");
  await expect(page.getByRole("link", { name: /Attention Is All You Need/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
});

test("a server that stays asleep gets a calm waking-up note, not a broken page", async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ status: 504, body: "" }));
  await page.goto(`/papers/${ATTENTION}`);
  await expect(page.getByRole("status").filter({ hasText: "Waking the server up" })).toBeVisible({ timeout: 10_000 });
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Library", level: 1 })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Waking the server up" })).toBeVisible({ timeout: 10_000 });
});

test("an address that can't be a paper is a real 404 in the brand", async ({ page }) => {
  const response = await page.goto("/papers/not-a-paper");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("Paper not found · Paper2Lab");
  await expect(page.getByRole("link", { name: "Back to the library" })).toBeVisible();

  expect((await page.goto("/no-such-page"))?.status()).toBe(404);
  await expect(page).toHaveTitle("Page not found · Paper2Lab");
});

test("every page is ready to share: title, canonical address, preview image, icons and manifest", async ({ page, request }) => {
  const pages: [string, string][] = [
    ["/library", "Library · Paper2Lab"],
    ["/accuracy", "How accurate is Paper2Lab? · Paper2Lab"],
    [`/papers/${ATTENTION}`, "Attention Is All You Need · Paper2Lab"],
  ];
  for (const [path, title] of pages) {
    await page.goto(path);
    // The server sends the sample's title, before any script runs.
    await expect(page).toHaveTitle(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path.replace("?", "\\?")}$`));
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
  }
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);

  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.start_url).toBe("/library");
  expect((await request.get("/apple-icon")).headers()["content-type"]).toBe("image/png");
  expect(await (await request.get("/sitemap.xml")).text()).toContain("/library</loc>");
});
