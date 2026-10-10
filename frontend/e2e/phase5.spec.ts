import { expect, test } from "@playwright/test";

const ATTENTION = "/papers/00000000-0000-4000-8000-000000001706";
const ADAM = "/papers/00000000-0000-4000-8000-000000001412";

test("the accuracy page shows how many quotes were found, and lists the samples", async ({ page }) => {
  await page.goto("/");
  // On phones the header's links sit behind the menu button.
  const menu = page.getByRole("button", { name: "Menu" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("link", { name: "Accuracy" }).click();
  await expect(page.getByRole("heading", { name: "How accurate is Paper2Lab?" })).toBeVisible();
  await expect(page.getByText("of quotes found word for word")).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Attention Is All You Need" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Adam: A Method for Stochastic Optimization" })).toBeVisible();
});

test("check-yourself questions show the answer with the paper's own words, and are remembered", async ({ page }) => {
  await page.goto(ATTENTION);
  const quiz = page.locator("section", { has: page.getByRole("heading", { name: "Check yourself" }) }).first();
  await quiz.scrollIntoViewIfNeeded();
  const first = quiz.locator("fieldset").first();
  await first.getByRole("button").first().click();
  await expect(first.getByText(/^(Right|Not quite)\./)).toBeVisible();
  await expect(first.getByText("The paper says:")).toBeVisible();
  await expect(first.getByRole("button").first()).toBeDisabled();

  await page.reload();
  const again = page.locator("fieldset").first();
  await expect(again.getByText(/^(Right|Not quite)\./)).toBeVisible();
  await again.getByRole("button", { name: "Try again" }).click();
  await expect(again.getByRole("button").first()).toBeEnabled();
});

test("the attention demo shows why the paper scales by the square root of d_k", async ({ page }) => {
  await page.goto(ATTENTION);
  const demo = page.getByRole("region", { name: /Play with it/ });
  await demo.scrollIntoViewIfNeeded();
  const message = demo.locator("[aria-live=polite]");
  const slider = demo.getByRole("slider", { name: /Key size/ });
  await slider.focus();
  await page.keyboard.press("End"); // d_k = 512
  await demo.getByRole("checkbox", { name: /Divide by/ }).uncheck();
  await expect(message).toContainText("Without scaling");
  await expect(message).toContainText(/saturat/);
  await demo.getByRole("checkbox", { name: /Divide by/ }).check();
  await expect(message).not.toContainText("Without scaling");
});

test("the Adam demo runs both optimisers", async ({ page }) => {
  await page.goto(ADAM);
  const demo = page.getByRole("region", { name: /Play with it/ });
  await demo.scrollIntoViewIfNeeded();
  const message = demo.locator("[aria-live=polite]");
  await demo.getByRole("button", { name: "Reset" }).click();
  await expect(message).toContainText("Both start at the same point");
  await demo.getByRole("button", { name: "Play" }).click();
  await expect(message).not.toContainText("Both start at the same point");
});

test("references and code links appear when the paper has them", async ({ page }) => {
  // The browser tests don't call Semantic Scholar or Hugging Face, so the answer is made up here.
  await page.route("**/api/papers/*/connections", (route) =>
    route.fulfill({
      json: {
        references: {
          items: [
            {
              title: "Neural Machine Translation by Jointly Learning to Align and Translate",
              year: 2014,
              authors: ["Dzmitry Bahdanau", "Kyunghyun Cho", "Yoshua Bengio"],
              more_authors: false,
              url: "https://arxiv.org/abs/1409.0473",
              tldr: "Attention lets a translator look back at the source sentence.",
              context: "Attention mechanisms have become an integral part of sequence models [2].",
              influential: true,
              citations: 30000,
            },
          ],
          total: 40,
        },
        code: [{ url: "https://github.com/tensorflow/tensor2tensor", label: "tensorflow/tensor2tensor" }],
        models: [],
        datasets: [],
        complete: true,
      },
    }),
  );
  await page.goto(ATTENTION);
  await expect(page.getByRole("link", { name: "Code", exact: true })).toHaveAttribute(
    "href",
    "https://github.com/tensorflow/tensor2tensor",
  );
  const section = page.locator("#builds-on");
  await expect(section.getByRole("heading", { name: "What this paper connects to" })).toBeVisible();
  await expect(section.getByText("Key reference")).toBeVisible();
  await expect(section.getByText(/most important of its 40 references/)).toBeVisible();
});

test("the site is ready to share: paper titles, a sitemap and a preview image", async ({ page, request }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Try a sample paper" }).click();
  await expect(page.getByRole("heading", { name: "Try a sample paper" })).toBeInViewport();

  await page.goto(ATTENTION);
  await expect(page).toHaveTitle("Attention Is All You Need · Paper2Lab");

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/accuracy</loc>");
  expect(sitemap).toContain("/papers/00000000-0000-4000-8000-000000001706</loc>");
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /api/");
  const image = await request.get("/opengraph-image");
  expect(image.headers()["content-type"]).toBe("image/png");
});
