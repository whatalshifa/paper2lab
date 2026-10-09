import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

/** Checks the page against WCAG 2.1 AA with axe, and that nothing was blocked or broke. */
async function check(page: Page, errors: string[]) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const problems = results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")})`,
  );
  expect(problems).toEqual([]);
  expect(errors).toEqual([]);
}

function watch(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    // A missing sample figure (arXiv can be unreachable) is expected; anything else is not.
    if (message.type() === "error" && !message.text().includes("503")) errors.push(message.text());
  });
  return errors;
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test("the home page is accessible", async ({ page }) => {
      const errors = watch(page);
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await check(page, errors);
    });

    test("the accuracy page is accessible", async ({ page }) => {
      const errors = watch(page);
      await page.goto("/accuracy");
      await expect(page.getByText("of quotes found word for word")).toBeVisible();
      await check(page, errors);
    });

    test("a paper is accessible with a question answered, a demo and its references", async ({ page }) => {
      const errors = watch(page);
      await page.route("**/api/papers/*/connections", (route) =>
        route.fulfill({
          json: {
            references: {
              items: [
                {
                  title: "Adaptive Subgradient Methods",
                  year: 2011,
                  authors: ["John Duchi"],
                  more_authors: true,
                  url: "https://doi.org/10.5555/1953048.2021068",
                  tldr: "AdaGrad gives rare features bigger steps.",
                  context: "AdaGrad works well with sparse gradients.",
                  influential: true,
                  citations: 10000,
                },
              ],
              total: 30,
            },
            code: [],
            models: [{ id: "org/model", url: "https://huggingface.co/org/model", downloads: 3 }],
            datasets: [],
            complete: true,
          },
        }),
      );
      await page.goto("/papers/00000000-0000-4000-8000-000000001412");
      await expect(page.getByText("What this paper connects to")).toBeVisible();
      const first = page.locator("fieldset").first();
      await first.getByRole("button").nth(1).click();
      await expect(first.getByText(/^(Right|Not quite)\./)).toBeVisible();
      await check(page, errors);
    });

    test("a paper is accessible, with a primer and the ask panel open", async ({ page }) => {
      const errors = watch(page);
      await page.goto("/papers/00000000-0000-4000-8000-000000001706");
      await expect(page.getByText("In a nutshell")).toBeVisible();
      await check(page, errors);

      await page.getByRole("button", { name: "Dot product: a quick primer" }).click();
      await expect(page.getByRole("dialog", { name: "Dot product: a quick primer" })).toBeVisible();
      await check(page, errors);
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: "Ask the paper" }).first().click();
      await page.getByRole("button", { name: "Why do they divide by the square root of d_k?" }).click();
      await expect(page.getByRole("link", { name: "Source 1" })).toBeVisible();
      await check(page, errors);
    });
  });
}
