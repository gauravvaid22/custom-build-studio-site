import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createShop, totals, settings } from "../commerce/core.mjs";
import { sqliteStore } from "../commerce/sqlite-store.mjs";
import { handler } from "../commerce/http.mjs";
import { ownerEmail, resendMailer } from "../commerce/notifications.mjs";
const adminKey = "test-admin-key-is-not-a-real-credential";
const body = () => ({
  items: [
    { id: "skeleton-chameleon", quantity: 2 },
    { id: "basilisk-dice-tower", quantity: 1 },
  ],
  fulfillment: "pickup",
  name: "Test Customer",
  email: "test@example.invalid",
  phone: "7805550100",
  accepted: true,
  expectedTotalCents: 6500,
  notes: "",
});
function fixture() {
  const path = join(
    mkdtempSync(join(tmpdir(), "cbs-shop-test-")),
    "orders.sqlite",
  );
  const store = sqliteStore(path);
  const shop = createShop({ store, testMode: true, adminKey });
  return { path, store, shop };
}
test("integer CAD calculations, pickup, delivery and configurable tax", () => {
  assert.equal(totals(body().items, "pickup").totalCents, 6500);
  assert.equal(totals(body().items, "delivery").totalCents, 7000);
  assert.equal(
    totals(body().items, "delivery", { ...settings, taxBasisPoints: 500 })
      .taxCents,
    350,
  );
  for (const quantity of [0, -1, 1.5, 21, "2", NaN])
    assert.throws(() =>
      totals([{ id: "skeleton-chameleon", quantity }], "pickup"),
    );
  assert.throws(() => totals([{ id: "fake", quantity: 1 }], "pickup"));
  assert.throws(() => totals([...body().items, body().items[0]], "pickup"));
  assert.throws(() => totals(body().items, "shipping"));
  assert.equal(
    totals([{ id: "octopus-wine-bottle-holder-320", quantity: 1 }], "pickup")
      .totalCents,
    9899,
  );
  assert.equal(
    totals([{ id: "octopus-wine-bottle-holder-345", quantity: 2 }], "pickup")
      .totalCents,
    21998,
  );
});
test("order persistence survives reopening database; idempotent retry and immutable prices", async () => {
  const { path, store, shop } = fixture(),
    key = randomUUID();
  const input = body();
  input.items[0].priceCents = 1;
  input.paymentStatus = "Paid";
  input.fulfillmentStatus = "Completed";
  const first = await shop.create(input, key),
    second = await shop.create(input, key);
  assert.equal(first.order.number, second.order.number);
  assert.equal(first.order.totalCents, 6500);
  assert.equal(first.order.paymentStatus, "Awaiting payment");
  assert.equal(first.order.canPay, false);
  assert.equal(first.order.fulfillmentStatus, "Not started");
  assert.equal(first.order.history, undefined);
  assert.equal((await shop.list()).length, 1);
  await assert.rejects(
    shop.create({ ...body(), name: "Different" }, key),
    /different order/,
  );
  store.close();
  const reopened = sqliteStore(path);
  const again = createShop({ store: reopened, testMode: true, adminKey });
  assert.equal((await again.lookup(key)).number, first.order.number);
  await assert.rejects(again.lookup(randomUUID()), /not found/);
  reopened.close();
});
test("manual payment verification, address review, state transitions and concurrency protection", async () => {
  const { store, shop } = fixture();
  const order = await shop.create(
    {
      ...body(),
      fulfillment: "delivery",
      deliveryReview: true,
      street: "Test address",
      city: "Edmonton",
      postal: "T6A1A1",
      expectedTotalCents: 7000,
    },
    randomUUID(),
  );
  let current = (await shop.list())[0];
  assert.equal(current.deliveryStatus, "Needs review");
  await assert.rejects(
    shop.update(
      current.id,
      current.revision,
      "confirm-payment",
      "Customer says sent",
    ),
    /Confirm product details/,
  );
  await assert.rejects(
    shop.update(current.id, current.revision, "start-production", "Test"),
    /Invalid fulfillment/,
  );
  const oldRevision = current.revision;
  current = await shop.update(
    current.id,
    current.revision,
    "confirm-details",
    "Confirmed test colour and dimensions",
  );
  await assert.rejects(
    shop.update(current.id, oldRevision, "approve-delivery", "50 km check"),
    /Order changed/,
  );
  current = await shop.update(
    current.id,
    current.revision,
    "approve-delivery",
    "Test address distance checked",
  );
  current = await shop.update(
    current.id,
    current.revision,
    "confirm-payment",
    "TEST ONLY: bank receipt fixture",
  );
  assert.equal(current.paymentStatus, "Paid");
  assert.ok(
    current.history.some((entry) => entry.note?.includes("bank receipt")),
  );
  for (const action of ["start-production", "ready", "complete"])
    current = await shop.update(
      current.id,
      current.revision,
      action,
      "Test fulfillment",
    );
  assert.equal(current.fulfillmentStatus, "Completed");
  assert.equal(order.order.paymentStatus, "Awaiting payment");
  store.close();
});
test("validation and production gate prevent unsafe orders", async () => {
  const { store, shop } = fixture();
  for (const change of [
    { email: "bad" },
    { phone: "1" },
    { name: "" },
    { accepted: false },
    { website: "bot" },
    { expectedTotalCents: 1 },
    { paymentStatus: "Paid", expectedTotalCents: 0 },
    { fulfillment: "delivery", expectedTotalCents: 7000 },
  ])
    await assert.rejects(shop.create({ ...body(), ...change }, randomUUID()));
  const production = createShop({ store, enabled: true, adminKey });
  assert.equal(production.ready, false);
  await assert.rejects(production.create(body(), randomUUID()), /not live/);
  assert.throws(() => shop.authorize("wrong"));
  shop.authorize(adminKey);
  store.close();
});
test("HTTP enforces origin, admin authentication, method and content limits", async () => {
  const { store, shop } = fixture(),
    handle = handler(shop),
    url = "https://example.test/.netlify/functions/shop";
  const request = (action, body, extra = {}) =>
    new Request(url + "?action=" + action, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://example.test",
        ...extra,
      },
      body: JSON.stringify(body),
    });
  assert.equal((await handle(request("list", {}))).status, 401);
  assert.equal(
    (await handle(request("create", body(), { Origin: "https://evil.test" })))
      .status,
    403,
  );
  assert.equal(
    (await handle(request("list", {}, { Authorization: "Bearer " + adminKey })))
      .status,
    200,
  );
  assert.equal((await handle(new Request(url + "?action=list"))).status, 405);
  assert.equal(
    (await handle(request("create", { ...body(), notes: "x".repeat(18000) })))
      .status,
    413,
  );
  assert.equal(
    (
      await handle(
        request("create", body(), { "Idempotency-Key": randomUUID() }),
      )
    ).status,
    201,
  );
  store.close();
});
test("concurrent identical checkout creates exactly one order", async () => {
  const { store, shop } = fixture(),
    key = randomUUID();
  const orders = await Promise.all(
    Array.from({ length: 8 }, () => shop.create(body(), key)),
  );
  assert.equal(new Set(orders.map((o) => o.order.id)).size, 1);
  assert.equal((await shop.list()).length, 1);
  store.close();
});

test("standard orders skip approval; any special request is held until admin approval", async () => {
  const {store, shop} = fixture();
  const standard = await shop.create({...body(), requestMode:"standard"}, randomUUID());
  assert.equal(standard.order.detailsStatus, "Confirmed");
  assert.equal(standard.order.paymentEligible, true);
  assert.equal(standard.order.canPay, false); // preview never authorizes actual transfers
  for (const changes of [{requestMode:"custom",customRequest:"Dragon in blue"}, {requestMode:"standard",customRequest:"Blue",detailsStatus:"Confirmed",requiresApproval:false}, {notes:"Please change size"}]) {
    const result = await shop.create({...body(),...changes}, randomUUID());
    assert.equal(result.order.paymentEligible,false);
    let current = (await shop.list()).find(o=>o.id===result.order.id);
    await assert.rejects(shop.update(current.id,current.revision,"confirm-payment","Pretend receipt"), /Confirm product details/);
    current = await shop.update(current.id,current.revision,"confirm-details","Colour available at listed price");
    assert.equal(current.paymentEligible,true);
    current = await shop.update(current.id,current.revision,"confirm-payment","TEST bank receipt");
    assert.equal(current.paymentEligible,false);
  }
  await assert.rejects(shop.create({...body(),requestMode:"custom",customRequest:" "},randomUUID()),/Tell us/);
  store.close();
});

test("owner email contains reference and requests; preview sends no email; failed notification can retry once", async () => {
  const {store,shop} = fixture();
  const result = await shop.create({...body(),customRequest:"Blue dragon"},randomUUID());
  const message = ownerEmail(result.order);
  assert.equal(message.to[0],settings.paymentEmail);
  assert.ok(message.text.includes(result.order.number));
  assert.ok(message.text.includes("Blue dragon"));
  let sends=0;
  const service=createShop({store,mailer:async()=>{sends++;if(sends===1)throw Error("offline");return "email-test-id";}});
  await service.notifyOwner(result.order.id);
  assert.equal(sends,0);
  const stored=await store.get("order/"+result.order.id);
  await store.put("order/"+result.order.id,{...stored.data,testMode:false,ownerNotification:{status:"Pending"}},{onlyIfMatch:stored.etag});
  await service.notifyOwner(result.order.id);
  assert.equal((await service.list())[0].ownerNotification.status,"Needs retry");
  await Promise.all([service.notifyOwner(result.order.id),service.notifyOwner(result.order.id)]);
  assert.equal(sends,2);
  assert.equal((await service.list())[0].ownerNotification.status,"Accepted");
  await service.notifyOwner(result.order.id);
  assert.equal(sends,2);
  assert.equal((await service.lookup(result.lookupKey)).ownerNotification,undefined);
  const mailer=resendMailer({apiKey:"fake",from:"orders@example.invalid",fetcher:async(url,request)=>{
    assert.equal(request.headers["Idempotency-Key"],`shop-order-${result.order.id}`);
    assert.equal(JSON.parse(request.body).reply_to,"test@example.invalid");
    return new Response(JSON.stringify({id:"mock-email"}));
  }});
  assert.equal(await mailer(result.order),"mock-email");
  store.close();
});
