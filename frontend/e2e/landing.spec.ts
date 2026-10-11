import { expect, test } from "@playwright/test";

const ADAM = "00000000-0000-4000-8000-000000001412";

test("the home page leads with the pitch and a way into the app", async ({ page }) => {
  await page.goto("/");
  const hero = page.getByRole("heading", { name: "Read any research paper at your level.", level: 1 });
  await expect(hero).toBeInViewport();
  // The live demo is on the first screen, on phones too.
  await expect(page.getByRole("slider", { name: "Reading level" })).toBeInViewport();

  await page.getByRole("banner").getByRole("link", { name: "Open the library" }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("heading", { name: "Library", level: 1 })).toBeVisible();

  // Inside the app, the logo goes to the library and About goes back to the home page.
  await expect(page.getByRole("link", { name: "Paper2Lab library" })).toHaveAttribute("href", "/library");
  const menu = page.getByRole("button", { name: "Menu" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "About", exact: true }).click();
  await expect(hero).toBeVisible();
});

test("the hero's slider rewrites the sample explanation, and the library remembers the level", async ({ page }) => {
  await page.goto("/");
  const explanation = page.getByTestId("hero-explanation");
  await expect(explanation.getByText(/Each position produces three vectors/)).toBeVisible();

  const slider = page.getByRole("slider", { name: "Reading level" });
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(explanation.getByText(/Attention works a bit like a library search/)).toBeVisible();
  await expect(explanation.getByText(/Each position produces three vectors/)).toBeHidden();
  await page.keyboard.press("End");
  await expect(explanation.getByText(/Attention is a mapping from a query and key-value pairs/)).toBeVisible();

  await page.goto("/papers/00000000-0000-4000-8000-000000001706");
  await expect(page.locator("section", { has: page.getByRole("heading", { name: "In a nutshell" }) })).toContainText(
    "multi-head scaled dot-product self-attention",
  );
});

test("the annotated page explains the equation, cites its answer and checks a question", async ({ page }) => {
  await page.goto("/");
  const figure = page.locator("#the-page");
  await figure.getByRole("button", { name: /Equation \(1\) Scaled dot-product attention/ }).click();
  await expect(page.getByRole("dialog", { name: /Scaled dot-product attention/ })).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(figure.getByRole("link", { name: "Page 4" })).toHaveAttribute("href", "https://arxiv.org/pdf/1706.03762v7#page=4");
  const question = figure.locator("fieldset");
  await question.getByRole("button").first().click();
  await expect(question.getByText(/^(Right|Not quite)\./)).toBeVisible();
});

test("the home page shows the live accuracy numbers and the sample shelf", async ({ page }) => {
  await page.goto("/");
  const accuracy = page.locator("#accuracy");
  await expect(accuracy.getByText("quotes found word for word")).toBeVisible();
  await expect(accuracy.getByText("Attention Is All You Need")).toBeVisible();
  await page.locator("#shelf").getByRole("link", { name: "Read Adam: A Method for Stochastic Optimization" }).click();
  await expect(page).toHaveURL(new RegExp(`/papers/${ADAM}$`));
});

test("old links still work: /?paper= opens the library, /about is the home page", async ({ page }) => {
  await page.goto(`/?paper=${ADAM}`);
  await expect(page).toHaveURL(new RegExp(`/library\\?paper=${ADAM}$`));
  await page.goto("/about");
  await expect(page).toHaveURL(/\/$/);
});

test("the home page never scrolls sideways", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("hero-explanation")).toBeVisible();
  await expect(page.locator("#shelf").getByRole("link", { name: /^Read Adam/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
