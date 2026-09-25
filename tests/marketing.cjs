const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "custombuildstudio.ca")
      return route.fulfill({ status: 200, body: "" });
    if (route.request().method() === "POST")
      return route.fulfill({ status: 200, body: "accepted" });
    const response = await route.fetch({
      url: "http://127.0.0.1:4173" + url.pathname + url.search,
    });
    return route.fulfill({ response });
  });
  await page.goto(
    "https://custombuildstudio.ca/services/resin-3d-printing?utm_source=google&utm_medium=cpc&utm_campaign=resin_edmonton&gclid=test_click",
  );
  await page.waitForTimeout(2000);
  assert.equal(
    await page.locator("h1").textContent(),
    "Resin 3D Printing in Edmonton",
  );
  const schema = await page.locator("#structured-data").textContent();
  assert(
    schema.includes("BreadcrumbList") &&
      schema.includes("Resin 3D Printing in Edmonton"),
  );
  await page
    .getByRole("link", { name: "Request a Quote", exact: true })
    .nth(1)
    .click();
  await page.waitForFunction(
    () => document.querySelector("#service")?.value === "resin-printing",
  );
  await page.locator("#name").fill("Tracking test");
  await page.locator("#email").fill("private@example.com");
  await page
    .locator("#message")
    .fill("Do not send this private text to analytics");
  await page.waitForTimeout(2000);
  const events = () =>
    page.evaluate(() => window.dataLayer.map((args) => Array.from(args)));
  let data = await events();
  assert.equal(data.filter((x) => x[1] === "quote_start").length, 1);
  assert.equal(data.filter((x) => x[1] === "conversion").length, 0);
  assert(
    data.some(
      (x) =>
        x[1] === "page_view" &&
        x[2].page_location.includes("/contact?utm_source=google"),
    ),
  );
  await page.getByRole("button", { name: "Send Quote Request" }).click();
  await page.waitForURL("**/thank-you");
  data = await events();
  assert.equal(data.filter((x) => x[1] === "generate_lead").length, 1);
  assert.equal(data.filter((x) => x[1] === "conversion").length, 1);
  assert(!JSON.stringify(data).includes("private@example.com"));
  assert(!JSON.stringify(data).includes("Do not send this"));
  await page.locator('a[href^="tel:"]').first().dispatchEvent("click");
  assert.equal(
    (await events()).filter((x) => x[1] === "phone_click").length,
    1,
  );
  await page.goto(
    "https://custombuildstudio.ca/shop/night-owl-wall-light",
  );
  await page.waitForFunction(() =>
    window.dataLayer?.some((args) => Array.from(args)[1] === "view_item"),
  );
  let commerceEvents = await events();
  const viewItem = commerceEvents.find((x) => x[1] === "view_item");
  assert.deepEqual(viewItem[2].items[0], {
    item_id: "night-owl-wall-light",
    item_name: "Night Owl Wall Light",
    item_category: "Home & lighting",
    price: 49.99,
    quantity: 1,
  });
  await page.reload();
  await page.waitForTimeout(2000);
  assert.equal((await events()).filter((x) => x[1] === "conversion").length, 0);
  console.log(
    "Passed: service schema, campaign persistence, quote tracking, phone click, private-field exclusion and dynamic item-view payloads. Google network and form submission were mocked.",
  );
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
