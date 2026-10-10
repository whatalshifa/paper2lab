import { expect, test } from "@playwright/test";

test("the library lists the samples, and the command bar explains that the demo can't read new ones", async ({ page }) => {
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Library", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Attention Is All You Need/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Adam: A Method for Stochastic Optimization/ })).toBeVisible();

  // Adding a paper lives in the command bar at the top; "/" opens it from anywhere.
  await page.keyboard.press("/");
  await expect(page.getByRole("textbox", { name: /arXiv link/ })).toBeFocused();
  await expect(page.getByText("Explaining new papers is paused on this demo")).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose a PDF" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Choose a PDF" })).toBeHidden();
});

test("on a wide screen the library shows the selected paper's first page and its margin notes", async ({ page, isMobile }) => {
  test.skip(isMobile, "Phones show the library list alone; a tap opens the reader");
  await page.goto("/library");
  await page.getByRole("link", { name: /Adam: A Method for Stochastic Optimization/ }).click();
  await expect(page).toHaveURL(/\/library\?paper=00000000-0000-4000-8000-000000001412/);
  await expect(page.getByRole("heading", { name: "Adam: A Method for Stochastic Optimization", level: 2 })).toBeVisible();
  const notes = page.getByRole("complementary", { name: "Margin notes" });
  await notes.getByRole("tab", { name: /Ask/ }).click();
  await notes.getByRole("button", { name: "What default settings does Adam recommend?" }).click();
  await expect(notes.getByRole("link", { name: /Page 2/ })).toHaveAttribute("href", "https://arxiv.org/pdf/1412.6980v9#page=2");
  await page.getByRole("link", { name: "Open in reader" }).click();
  await expect(page).toHaveURL(/\/papers\/00000000-0000-4000-8000-000000001412$/);
});

test("on a phone, tapping a paper in the library opens the reader", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Wide screens show the paper beside the list instead");
  await page.goto("/library");
  await page.getByRole("link", { name: /Adam: A Method for Stochastic Optimization/ }).click();
  await expect(page).toHaveURL(/\/papers\/00000000-0000-4000-8000-000000001412$/);
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Notes" })).toContainText("Key terms in this paper");
});

test("the reading-level slider rewrites the explanations", async ({ page }) => {
  await page.goto("/library");
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

test("asking a sample paper shows a prepared answer with its source page", async ({ page }) => {
  await page.goto("/papers/00000000-0000-4000-8000-000000001706");
  await page.getByRole("button", { name: "Ask the paper" }).first().click();
  const panel = page.getByRole("dialog", { name: "Ask the paper" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("textbox", { name: "Your question" })).toBeDisabled();
  await expect(panel).toContainText("only the suggested questions above have answers");

  await panel.getByRole("button", { name: "Why do they divide by the square root of d_k?" }).click();
  await expect(panel.getByRole("link", { name: "Source 1" })).toBeVisible();
  await expect(panel.getByRole("link", { name: /Page 4/ })).toHaveAttribute(
    "href",
    "https://arxiv.org/pdf/1706.03762v7#page=4",
  );
  // A suggestion that was asked is no longer offered.
  await expect(panel.getByRole("button", { name: "Why do they divide by the square root of d_k?" })).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("the prerequisite map opens a primer for each idea", async ({ page }) => {
  await page.goto("/papers/00000000-0000-4000-8000-000000001706");
  const map = page.locator("#before-you-read");
  await expect(map.getByRole("heading", { name: "Before you read" })).toBeVisible();
  await expect(map.getByRole("list", { name: "Step 1" })).toContainText("Vectors and matrices");
  await map.getByRole("button", { name: "Dot product: a quick primer" }).click();
  const primer = page.getByRole("dialog", { name: "Dot product: a quick primer" });
  await expect(primer).toContainText("In this paper: Attention scores how well a query matches each key");
  await expect(primer).toContainText("Builds on Vectors and matrices.");
});

test("a figure is explained at the chosen level", async ({ page }) => {
  await page.goto("/papers/00000000-0000-4000-8000-000000001706");
  const figure = page.locator("#fig-f1");
  await figure.scrollIntoViewIfNeeded();
  await expect(figure).toContainText("The Transformer - model architecture.");
  await expect(figure).toContainText("How to read it");
  await expect(figure).toContainText("The whole model is built from attention");
  await expect(figure).toContainText("stack of N = 6 identical layers");

  const slider = page.getByRole("slider", { name: "Reading level" });
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(figure).toContainText("A map of the whole model.");
});

test("listen reads the explanation aloud, section by section", async ({ page }) => {
  // A stand-in voice: it records what it is asked to say and finishes each sentence quickly.
  await page.addInitScript(() => {
    const spoken: string[] = [];
    (window as unknown as { spoken: string[] }).spoken = spoken;
    let timer: number | undefined;
    const synth = {
      speak(utterance: SpeechSynthesisUtterance) {
        spoken.push(utterance.text);
        timer = window.setTimeout(() => utterance.onend?.(new Event("end") as SpeechSynthesisEvent), 30);
      },
      cancel() {
        window.clearTimeout(timer);
      },
    };
    Object.defineProperty(window, "speechSynthesis", { value: synth });
  });
  await page.goto("/papers/00000000-0000-4000-8000-000000001706");
  await page.getByRole("button", { name: "Listen", exact: true }).click();
  const player = page.getByRole("region", { name: "Listening" });
  await expect(player).toContainText("student level");

  const said = () => page.evaluate(() => (window as unknown as { spoken: string[] }).spoken.join(" "));
  // Wait until it has read past the sentence checked below (each sentence takes a moment).
  await expect.poll(said).toContain("Section 3: Scaled dot-product attention.");
  await expect.poll(said).toContain("The dot products are divided by the square root of d k.");
  const spoken = await said();
  expect(spoken).toContain("Attention Is All You Need.");
  // Maths is said in words, and equation marks are named.
  expect(spoken).toContain("The dot products are divided by the square root of d k.");
  expect(spoken).toContain("(equation 1)");
  expect(spoken).not.toContain("$");

  await page.getByRole("button", { name: "Stop listening" }).click();
  await expect(player).toBeHidden();
});

test("pages carry a content security policy, and the API only answers the website", async ({ page, request }) => {
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain("object-src 'none'");
  // Through the website, the API answers; straight to the API, it refuses.
  expect((await request.get("/api/papers")).status()).toBe(200);
  expect((await request.get(`${process.env.E2E_API_URL ?? "http://localhost:8000"}/api/papers`)).status()).toBe(403);
});
