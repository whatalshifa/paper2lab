import { expect, type Page, test } from "@playwright/test";

const ATTENTION = "/papers/00000000-0000-4000-8000-000000001706";
const ADAM = "/papers/00000000-0000-4000-8000-000000001412";

/** How many screens tall the page is. */
const screens = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollHeight / window.innerHeight);

test.describe("on a desktop screen", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the key app pages stay within about two screens", async ({ page, isMobile }) => {
    test.skip(isMobile, "The budget is for wide screens");
    const pages: [string, () => Promise<void>][] = [
      ["/library", () => expect(page.getByRole("heading", { name: "Attention Is All You Need", level: 2 })).toBeVisible()],
      ["/accuracy", () => expect(page.getByRole("rowheader", { name: "Attention Is All You Need" })).toBeVisible()],
      [ATTENTION, () => expect(page.getByText("In a nutshell")).toBeVisible()],
      [ADAM, () => expect(page.getByText("In a nutshell")).toBeVisible()],
      [`${ATTENTION}#s3`, () => expect(page.getByRole("heading", { name: /Scaled dot-product attention/, level: 2 })).toBeVisible()],
      [`${ADAM}#s2`, () => expect(page.getByRole("heading", { name: /The Adam algorithm/, level: 2 })).toBeVisible()],
      [`${ADAM}#glossary`, () => expect(page.getByRole("heading", { name: "Glossary", level: 2 })).toBeVisible()],
    ];
    for (const [url, ready] of pages) {
      await page.goto(url);
      await ready();
      expect(await screens(page), url).toBeLessThanOrEqual(2.25);
    }
    // The library's panes scroll on their own, so the window doesn't scroll at all.
    await page.goto("/library");
    await expect(page.getByRole("complementary", { name: "Margin notes" })).toBeVisible();
    expect(await screens(page)).toBeLessThanOrEqual(1.01);
  });
});

test("the reader turns one section at a time, and links, contents, next and back all land on the right one", async ({ page }) => {
  await page.goto(`${ADAM}#s4`);
  const heading = (name: RegExp) => page.getByRole("heading", { name, level: 2 });
  await expect(heading(/Fixing the slow start: bias correction/)).toBeInViewport();
  // Other sections are on other pages.
  await expect(heading(/The Adam algorithm/)).toBeHidden();

  const pages = page.getByRole("navigation", { name: "Pages" });
  await pages.getByRole("link", { name: /Next.*A guarantee that it works/ }).click();
  await expect(page).toHaveURL(/#s5$/);
  await expect(heading(/A guarantee that it works/)).toBeInViewport();
  await expect(heading(/Fixing the slow start/)).toBeHidden();

  await page.goBack();
  await expect(page).toHaveURL(/#s4$/);
  await expect(heading(/Fixing the slow start: bias correction/)).toBeVisible();

  // The contents open any page; on phones they are in a sheet.
  const contents = page.getByRole("button", { name: "Contents" });
  if (await contents.isVisible()) await contents.click();
  await page.getByRole("link", { name: "Overview" }).click();
  await expect(page.getByText("In a nutshell")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Adam: A Method for Stochastic Optimization", level: 1 })).toBeInViewport();
  await expect(pages.getByRole("link", { name: /Next.*The problem: choosing step sizes/ })).toBeVisible();
  await expect(pages.getByRole("link", { name: /Previous/ })).toHaveCount(0);
});
