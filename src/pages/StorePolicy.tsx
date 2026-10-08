import { Link } from "react-router-dom";
import { PageIntro } from "../components/Shared";
import { business } from "../data/business";
import policy from "../../commerce/store-policy.json";

export const shippingEstimate = `Estimated delivery: ${policy.handlingMinDays + policy.transitMinDays}–${policy.handlingMaxDays + policy.transitMaxDays} business days after ordering. Remote addresses may take longer.`;

export default function StorePolicy() {
  return <>
    <PageIntro eyebrow="SHOP WITH CONFIDENCE" title="Shipping & returns" description="Delivery, pickup and returns for finished shop products." />
    <section className="section"><div className="container narrow prose">
      <h2>Free tracked shipping in {policy.shippingCountry}</h2>
      <p>Standard tracked shipping is free, with no minimum purchase. Preparation normally takes {policy.handlingMinDays}–{policy.handlingMaxDays} business days, followed by an estimated {policy.transitMinDays}–{policy.transitMaxDays} business days in transit. {shippingEstimate} Business days are Monday–Friday, excluding public holidays. Delivery dates are estimates, not guarantees.</p>
      <h2>Edmonton pickup</h2>
      <p>Select pickup before checkout to see pickup pricing. Pickup is by appointment in Southeast Edmonton. We email the private address and arrange a pickup time after ordering.</p>
      <h2>Standard product returns</h2>
      <p>You can request a return within {policy.returnWindowDays} days of delivery. Items must be unused and in their original condition. You pay return postage; there is no restocking fee.</p>
      <p>Email <a href={`mailto:${business.email}`}>{business.email}</a> with your order number and the item you want to return. We will provide return instructions and the return address. Please contact us before sending an item back.</p>
      <h2>Personalized and custom-size orders</h2>
      <p>Personalized products and products made to your custom size are excluded from change-of-mind returns. This does not prevent you from reporting a damaged, faulty or incorrect order.</p>
      <h2>Damaged, faulty or incorrect items</h2>
      <p>Contact us with your order number, a description of the problem and photos where possible. We will review the issue and arrange an appropriate resolution. If the issue is ours, we cover any agreed return shipping.</p>
      <h2>Refunds</h2>
      <p>After receiving and inspecting an eligible return, we will confirm your refund by email and issue it to your original payment method. Your bank or payment provider controls when it appears in your account.</p>
      <p>These shop policies do not replace any rights you have under applicable consumer law. Custom fabrication service projects follow their separately agreed quotes.</p>
      <Link className="text-link" to="/shop">Back to the shop ↗</Link>
    </div></section>
  </>;
}
