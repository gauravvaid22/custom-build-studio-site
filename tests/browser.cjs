const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const fs = require("fs");
const assert = require("node:assert/strict");
const origin = process.env.BASE_URL || "http://127.0.0.1:4173";
fs.mkdirSync("test-results", { recursive: true });
const routes = [
  "/",
  "/services",
  "/services/3d-printing",
  "/services/fdm-3d-printing",
  "/services/resin-3d-printing",
  "/services/cad-design",
  "/services/3d-scanning",
  "/services/cnc-woodworking",
  "/work",
  "/work/gear-mount",
  "/work/venturi-tube",
  "/about",
  "/pricing",
  "/products",
  "/shop",
  "/shop/night-owl-wall-light",
  "/shop/octopus-wine-bottle-holder",
  "/shop/mood-ghost",
  "/shop/ghost-arch-wreath",
  "/reviews",
  "/contact",
  "/privacy",
  "/thank-you",
  "/not-a-page",
];
const results = { pages: [], interactions: [], errors: [] };
async function scroll(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 45));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForFunction(() =>
    [...document.images].every((i) => i.complete),
  );
}
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_CHANNEL === "chromium"
      ? {}
      : { channel: process.env.BROWSER_CHANNEL || "msedge" }),
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", (e) => results.errors.push(e.message));
  page.on("console", (e) => {
    if (
      e.type() === "error" &&
      !e.text().includes("404") &&
      !e.text().includes("503")
    )
      results.errors.push(e.text());
  });
  for (const width of process.env.QA_INTERACTIONS
    ? []
    : [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      const response = await page.goto(origin + route);
      await page.waitForTimeout(120);
      await scroll(page);
      const info = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        h1: document.querySelectorAll("h1").length,
        brokenImages: [...document.images]
          .filter((i) => !i.naturalWidth)
          .map((i) => i.src),
        emptyLinks: [...document.querySelectorAll("a")].filter(
          (a) => a.getAttribute("href") === "#",
        ).length,
        title: document.title,
      }));
      assert.equal(info.overflow, false, `${width} ${route} overflow`);
      assert.equal(info.h1, 1, `${route} h1`);
      assert.equal(
        info.brokenImages.length,
        0,
        `${route} images ${JSON.stringify(info.brokenImages)}`,
      );
      assert.equal(info.emptyLinks, 0);
      assert.equal(response.status(), route === "/not-a-page" ? 404 : 200);
      if (width === 1440 || width === 390) {
        const a11y = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        info.violations = a11y.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        }));
      }
      results.pages.push({ width, route, ...info });
      if (
        ["/", "/contact", "/work", "/services/cnc-woodworking"].includes(
          route,
        ) &&
        [1440, 390].includes(width)
      )
        await page.screenshot({
          path: `test-results/qa-${width}-${route === "/" ? "home" : route.replaceAll("/", "-")}.png`,
          fullPage: true,
        });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin);
  await page.getByRole("button", { name: "Menu" }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Close" })
      .getAttribute("aria-expanded"),
    "true",
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .getByRole("button", { name: "Menu" })
      .getAttribute("aria-expanded"),
    "false",
  );
  await page.getByRole("button", { name: "Menu" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Our Work" })
    .click();
  assert.equal(new URL(page.url()).pathname, "/work");
  assert.equal(
    await page
      .getByRole("button", { name: "Menu" })
      .getAttribute("aria-expanded"),
    "false",
  );
  results.interactions.push("Mobile menu, Escape, route close");
  await page.getByRole("button", { name: "3D Scanning", exact: true }).click();
  assert.equal(await page.locator(".project-card").count(), 1);
  await page
    .getByRole("button", { name: "CNC Woodworking", exact: true })
    .click();
  assert.equal(await page.locator(".project-card").count(), 0);
  assert(
    await page
      .getByRole("heading", { name: "Have a CNC project in mind?" })
      .isVisible(),
  );
  await page.getByRole("button", { name: /All projects/ }).click();
  assert.equal(await page.locator(".project-card").count(), 15);
  results.interactions.push(
    "Portfolio category filters and honest empty state",
  );
  await page.goto(origin + "/work/gear-mount");
  await page.locator(".gallery-main").click();
  assert(await page.locator("dialog").isVisible());
  await page.keyboard.press("ArrowRight");
  assert(
    (await page.locator(".lightbox-controls p").textContent()).startsWith(
      "2 /",
    ),
  );
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    assert(
      await page.evaluate(() => !!document.activeElement.closest("dialog")),
    );
  }
  await page.keyboard.press("Escape");
  assert(!(await page.locator("dialog").isVisible()));
  assert(
    await page
      .locator(".gallery-main")
      .evaluate((el) => el === document.activeElement),
  );
  results.interactions.push(
    "Gallery, arrow keys, focus trap, Escape and focus restoration",
  );
  await page.goto(origin + "/");
  const faq = page
    .locator("summary")
    .filter({ hasText: "Can I request just one part?" });
  await faq.click();
  assert(
    await page.getByText("Yes. One-off parts, personal projects").isVisible(),
  );
  results.interactions.push("FAQ disclosure");
  await page.goto(origin + "/services/3d-printing");
  await page.locator('#resin-printing').getByRole('link', {name: 'Request a Quote'}).click();
  await page.waitForFunction(() => document.querySelector('#service').value === 'resin-printing');
  assert.equal(await page.locator('#service').inputValue(), 'resin-printing');
  results.interactions.push('Resin service CTA preselects high-detail resin quote');
  await page.goto(origin + "/contact?service=cnc-woodworking");
  await page.waitForFunction(
    () => document.querySelector("#service").value === "cnc-woodworking",
  );
  assert.equal(await page.locator("#service").inputValue(), "cnc-woodworking");
  await page.getByRole("button", { name: "Send Quote Request" }).click();
  assert.equal(
    await page.locator("#name").evaluate((el) => el.validity.valueMissing),
    true,
  );
  await page.locator("#name").fill("QA Example");
  await page.locator("#email").fill("qa@example.com");
  await page
    .locator("#message")
    .fill("TEST ONLY: custom sign design, 300 by 200 mm.");
  await page.locator("#file_1").setInputFiles({
    name: "oversize.stl",
    mimeType: "application/octet-stream",
    buffer: Buffer.alloc(7_000_001),
  });
  await page.getByRole("button", { name: "Send Quote Request" }).click();
  assert(await page.getByRole("alert").isVisible());
  assert((await page.getByRole("alert").textContent()).includes("over 7 MB"));
  await page.locator("#file_1").setInputFiles({
    name: "part.stl",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("solid test\nendsolid test"),
  });
  let singlePayload = "";
  await page.route("**/contact", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    singlePayload = route.request().postData() || "";
    await route.fulfill({status: 503, body: "Test failure"});
  });
  await page.getByRole("button", { name: "Send Quote Request" }).click();
  await page.waitForFunction(() => document.querySelector('.submit-button').disabled === false);
  assert(singlePayload.includes('name="file_1"; filename="part.stl"'));
  assert(!singlePayload.includes('name="file_2"'));
  await page.unroute("**/contact");
  const filenames = ["part.stl", "model.STEP", "drawing.pdf", "model.stp", "second.STL"];
  for (let i = 2; i <= 5; i++) {
    await page.getByRole("button", {name: "Add another file"}).click();
    await page.locator(`#file_${i}`).setInputFiles({name: filenames[i-1], mimeType: "application/octet-stream", buffer: Buffer.from(`fixture-${i}`)});
  }
  assert.equal(await page.getByRole("button", {name: "Add another file"}).count(), 0);
  await page.getByRole("button", {name: "Remove attachment 3", exact: true}).click();
  await page.getByRole("button", {name: "Add another file"}).click();
  assert.equal(await page.locator('#file_3').evaluate(el=>el.files.length), 0);
  await page.locator('#file_3').setInputFiles({name: "drawing.pdf", mimeType:"application/pdf", buffer:Buffer.from("%PDF-test")});
  const names = await page
    .locator("input[type=file]")
    .evaluateAll((els) => els.map((e) => e.name));
  assert.deepEqual(names, ["file_1", "file_2", "file_3", "file_4", "file_5"]);
  assert.equal(await page.locator('input[type=file][multiple], input[type=file][accept]').count(), 0);
  await page.route("**/contact", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 503,
          contentType: "text/plain",
          body: "Test failure",
        })
      : route.continue(),
  );
  await page.getByRole("button", { name: "Send Quote Request" }).click();
  await page.getByRole("alert").waitFor();
  assert.equal(await page.locator("#name").inputValue(), "QA Example");
  await page.unroute("**/contact");
  let payload = "";
  await page.route("**/contact", async (route) => {
    if (route.request().method() === "POST") {
      payload = route.request().postData() || "";
      await new Promise((r) => setTimeout(r, 300));
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "accepted",
      });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Send Quote Request" }).click();
  await page.waitForURL("**/thank-you");
  assert(
    await page
      .getByRole("heading", { name: "Thank you. Let’s take the next step." })
      .isVisible(),
  );
  assert(payload.includes('name="form-name"'));
  filenames.forEach((filename, i) => assert(payload.includes(`name="file_${i+1}"; filename="${filename}"`)));
  assert(payload.includes("drawing.pdf"));
  results.interactions.push(
    "One and five independent upload fields, STEP/STL acceptance, remove/re-add, five-file cap, 7 MB limit, failure preservation and mocked multipart success",
  );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(origin + "/shop/octopus-wine-bottle-holder");
    const bottleSize = page.getByRole("combobox", {
      name: "Bottle diameter for Octopus Wine Bottle Holder",
    });
    await bottleSize.selectOption("octopus-wine-bottle-holder-320");
    assert.match(await page.locator(".shop-price").innerText(), /\$98\.99/);
    assert(
      await page
        .getByText("Finished size: 176 \u00d7 230 \u00d7 227 mm.", { exact: true })
        .isVisible(),
    );
    await bottleSize.selectOption("octopus-wine-bottle-holder-345");
    assert.match(await page.locator(".shop-price").innerText(), /\$109\.99/);
    assert(
      await page
        .getByText("Finished size: 187 \u00d7 244 \u00d7 240 mm.", { exact: true })
        .isVisible(),
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      false,
    );
  }
  results.interactions.push("Octopus bottle-size selector price and dimension updates on desktop and mobile");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(origin + "/shop/mood-ghost");
    const design = page.getByRole("combobox", { name: "Design for Mood Ghost" });
    assert.match(await page.locator(".shop-price").innerText(), /\$16\.00/);
    await design.selectOption("mood-ghost-design-b");
    assert.match(await page.locator(".shop-price").innerText(), /\$16\.00/);
    assert(
      await page
        .getByText("Finished size: 85 × 85 × 88 mm.", { exact: true })
        .isVisible(),
    );
    assert.equal(
      await page.getByText(/Choose by the widest diameter of your bottle/).count(),
      0,
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      false,
    );
  }
  results.interactions.push("Mood Ghost design selector keeps both designs at $16.00 on desktop and mobile");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(origin + "/shop/night-owl-wall-light");
    await page.evaluate(() => localStorage.removeItem("cbs-cart-v1"));
    await page.reload();
    const nightQuantity = page.getByRole("spinbutton", {
      name: "Quantity for Night Owl Wall Light",
    });
    await nightQuantity.fill("21");
    await page.getByRole("button", { name: "Add to Cart" }).click();
    assert.equal(await page.locator(".shop-added-confirmation").count(), 0);
    assert.equal(await page.locator(".shop-cart-count").innerText(), "0");
    await nightQuantity.fill("1");
    await page.getByRole("button", { name: "Add to Cart" }).click();
    assert.match(await page.getByRole("status").innerText(), /Added to cart/);
    assert(await page.getByRole("link", { name: "View cart →", exact: true }).isVisible());
    assert.equal(await page.locator(".shop-cart-count").innerText(), "1");
    await page.goto(origin + "/shop/mood-ghost");
    await page
      .getByRole("combobox", { name: "Design for Mood Ghost" })
      .selectOption("mood-ghost-design-b");
    await page
      .getByRole("spinbutton", { name: "Quantity for Mood Ghost" })
      .fill("2");
    await page.getByRole("button", { name: "Add to Cart" }).click();
    assert.match(
      await page.locator(".shop-added-confirmation").innerText(),
      /2 × Mood Ghost — design B/,
    );
    assert.equal(await page.locator(".shop-cart-count").innerText(), "3");
    const savedCart = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cbs-cart-v1") || "[]"),
    );
    assert.deepEqual(savedCart, [
      { id: "night-owl-wall-light", quantity: 1 },
      { id: "mood-ghost-design-b", quantity: 2 },
    ]);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      false,
    );
  }
  results.interactions.push("Add-to-cart success, invalid submission, option selection, cart count and persisted contents on desktop and mobile");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(origin + "/shop/night-owl-wall-light");
  await page.getByRole("button", { name: "Add to Cart" }).click();
  assert.equal(
    await page
      .locator(".shop-added-confirmation")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await page.goto(origin);
  assert.equal(
    await page
      .locator("html")
      .evaluate((el) => getComputedStyle(el).scrollBehavior),
    "auto",
  );
  await page.locator("html").evaluate((el) => (el.style.fontSize = "200%"));
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
  );
  results.interactions.push("Reduced motion and 200% text enlargement");
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await nojs.newPage();
  await staticPage.goto(origin + "/services/cnc-woodworking");
  assert(
    await staticPage
      .getByRole("heading", { name: "CNC Woodworking & Router Services in Edmonton", exact: true })
      .isVisible(),
  );
  await staticPage.goto(origin + "/contact");
  const fields = await staticPage
    .locator("form[name=contact] input[type=file]")
    .evaluateAll((els) => els.map((e) => e.name));
  assert.deepEqual(fields, ["file_1", "file_2", "file_3", "file_4", "file_5"]);
  results.interactions.push(
    "No-JavaScript service content and Netlify upload schema",
  );
  fs.writeFileSync(
    "test-results/qa-results.json",
    JSON.stringify(results, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        pages: results.pages.length,
        violations: results.pages.filter((p) => p.violations?.length),
        interactions: results.interactions,
        errors: results.errors,
      },
      null,
      2,
    ),
  );
  await browser.close();
  assert.equal(results.errors.length, 0, "Browser console/runtime errors");
  assert.equal(
    results.pages.filter((p) => p.violations?.length).length,
    0,
    "Accessibility violations",
  );
})().catch((e) => {
  fs.writeFileSync(
    "test-results/qa-results.json",
    JSON.stringify({ ...results, failure: e.stack }, null, 2),
  );
  console.error(e);
  process.exit(1);
});
