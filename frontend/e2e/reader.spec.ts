import { expect, test } from "@playwright/test";

test("the home page offers the sample papers and explains that the demo can't read new ones", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Read any research paper at your level." })).toBeVisible();
  await expect(page.getByText("Explaining new papers is paused on this demo")).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose a PDF" })).toBeDisabled();
  await expect(page.getByRole("link", { name: /Attention Is All You Need/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Adam: A Method for Stochastic Optimization/ })).toBeVisible();
});

test("the reading-level slider rewrites the explanations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Attention Is All You Need/ }).click();
  const nutshell = page.locator("section", { has: page.getByRole("heading", { name: "In a nutshell" }) });
  await expect(nutshell).toContainText("sequence-to-sequence model");

  const slider = page.getByRole("slider", { name: "Reading level" });
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(nutshell).toContainText("one word at a time");
  await page.keyboard.press("End");
  await expect(nutshell).toContainText("multi-head scaled dot-product self-attention");

  // The choice is remembered on this device.
  await page.reload();
  await expect(nutshell).toContainText("multi-head scaled dot-product self-attention");
});

test("an equation explains itself, symbol by symbol", async ({ page }) => {
  await page.goto("/papers/00000000-0000-4000-8000-000000001706");
  const equation = page.getByRole("button", { name: /Eq\. 1, Scaled dot-product attention: what it means/ });
  await equation.scrollIntoViewIfNeeded();
  await equation.click();
  const card = page.getByRole("dialog", { name: /Scaled dot-product attention/ });
  await expect(card).toBeVisible();
  await expect(card).toContainText("values: the content each word passes on");
  await page.keyboard.press("Escape");
  await expect(card).toBeHidden();
});

test("each section shows the quote it is based on, with its page", async ({ page }) => {
  await page.goto("/papers/00000000-0000-4000-8000-000000001412");
  const section = page.locator("#s1");
  await expect(section.getByText(/The name Adam is derived from adaptive moment estimation/)).toBeVisible();
  await expect(section.getByRole("link", { name: /Page 1 of the paper/ }).first()).toHaveAttribute(
    "href",
    "https://arxiv.org/pdf/1412.6980v9#page=1",
  );
});

test("the page never scrolls sideways", async ({ page }) => {
  await page.goto("/papers/00000000-0000-4000-8000-000000001412");
  await expect(page.getByText("In a nutshell")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("a paper that doesn't exist says so", async ({ page }) => {
  await page.goto("/papers/not-a-real-paper");
  await expect(page.getByRole("heading", { name: "Paper not found" })).toBeVisible();
});
