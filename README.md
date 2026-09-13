# Custom Build Studio

React + TypeScript + Vite website for the Edmonton design and fabrication studio. The production build prerenders all public routes into static HTML, then hydrates them for navigation, filtering, galleries and quote-form feedback. Netlify hosts the static output and processes the contact form. No runtime server or secret environment variables are required.

## Run locally

Use Node 22.12 or newer (Netlify is configured for Node 22).

```sh
npm ci
npm run dev
```

## Production checks

```sh
npm run build
npm run verify
npm run preview
```

The production preview serves `dist` at `http://127.0.0.1:4173`, including the legacy thank-you redirect and real 404 responses. It deliberately rejects POST requests: local previews cannot deliver Netlify form submissions.

In a second terminal, run the browser checks:

```sh
npm run test:browser
```

The suite uses installed Microsoft Edge by default. Alternatively install Playwright Chromium with `npx playwright install chromium`, then set `BROWSER_CHANNEL=chromium`. Set `BASE_URL` to test another local preview address. Screenshots and results are saved to `test-results/`. Form requests are intercepted with test responses; tests never send a real customer enquiry.

## Netlify deployment

1. Connect this repository/branch to the existing Netlify site.
2. Keep the base directory at the repository root. The committed `netlify.toml` uses `npm run build` and publishes `dist`.
3. Ensure **Forms → form detection** is enabled. The prerendered `/contact/index.html` exposes the `contact` form, honeypot and every field, including `file_1` through `file_5`.
4. Confirm the existing `contact` form notification recipient in Netlify. Notification settings are account settings, not code.
5. After deployment, send one clearly labelled test enquiry with a small attachment. Check that it appears in Netlify Forms, the attachment opens, and the notification arrives. Then remove the test submission if desired.
6. Check `/services/cnc-woodworking`, a `/work/...` URL, `/thank-you.html`, an unknown URL, `/sitemap.xml` and `/robots.txt` directly.

Known routes have static files. `_redirects` returns a 404 for unknown routes instead of serving the homepage with a misleading 200. Existing top-level routes are retained. `dist` is generated, not committed.

The canonical origin is `https://custombuildstudio.ca`, matching the existing live domain’s redirect. Change `src/data/business.ts` and the sitemap origin in `scripts/prerender.mjs` if the production domain changes. Netlify non-production build contexts receive `noindex` metadata and a disallow-all robots file.

## Quote form

- Name, email, service and project description are required.
- Phone, quantity, material, desired date, location, notes and files are optional.
- Up to five independent file fields, one file per field as required by Netlify. Do not add the `multiple` attribute. File pickers intentionally omit `accept` so mobile devices can select STEP/STL files; extensions are validated on submission. The client caps combined files at 7,000,000 bytes, leaving room below Netlify’s 8 MB total request limit.
- Larger files use a shared download link; no fragile custom upload service is introduced.
- Files are sent as browser-generated multipart `FormData`, without manually overriding `Content-Type`.
- Native validation, a honeypot, disabled sending controls, HTTP-error handling and timeout feedback are included. Entered details remain after failure.
- A success message and lead/conversion event happen only after an accepted response. Direct visits to the thank-you URL do not log a conversion.

Backend delivery, spam classification, notification settings and storage quotas must be checked on the actual Netlify site. Local mocks validate frontend behavior only. See [Netlify Forms setup](https://docs.netlify.com/manage/forms/setup/) and [spam filters](https://docs.netlify.com/manage/forms/spam-filters/).

## Editing content

- `src/data/business.ts`: verified contact details, origin, social profiles and approved reviews.
- `src/data/services.ts`: the four services, descriptions and materials guidance.
- `src/data/projects.json`: portfolio content. Add a unique `id`, title, description, material, service IDs and real photographs. Service IDs control filtering. A new project automatically gets a detail page and sitemap entry on the next build.
- `src/data/images.json`: responsive image mapping. The original photos remain in `public/images`; pages use the optimized WebP files in `public/media`.
- `src/pages/Studio.tsx`: existing starting rates and the charging-stand product.
- `src/data/seo.ts`: page metadata, generated routes and LocalBusiness data.

There are no fabricated CNC portfolio images, testimonials, star ratings, client logos, certifications, turnaround guarantees or equipment specifications. The old review text was marked as replacement content in the source and is not published until its direct sources are confirmed. Add verified reviews to the data array when ready.

## Images and motion

Existing project photos have 480, 960 and 1600 pixel WebP variants, capped at original resolution. Intrinsic dimensions reserve layout space. The hero is prioritized; other images load lazily. The existing video loads only on its project detail page, with `preload="none"`, a poster and user-controlled playback.

The original logo identity is retained and its symbol is cropped through CSS for a legible header mark. The social image uses an existing gear/motor-mount project photograph. No generated customer work is used. Fonts use the system stack, avoiding third-party font requests. Motion is limited to modest entrance and hover effects; reduced-motion preferences are respected.

## Analytics

The existing GA4, Ads account and quote-conversion identifiers are retained in `src/components/Analytics.tsx`. Tags load once, only on the production domain. No form values or files are added to analytics events. The privacy page describes the implemented data flow; the owner should keep it aligned with actual business handling and account configuration.

## Useful assets to add next

1. **CNC proof:** 4–6 real finished signs, carved pieces or panels, plus material and project dimensions. Add a 10–20 second router-cutting clip if available.
2. **Studio confidence:** 2–3 clean workshop photos, ideally including the owner working and a wide view of the workspace.
3. **Verified feedback:** direct Google Business Profile and individual review links, with permission to display the selected review text.
4. **Scanning case study:** one original-part photo, scan/model screenshot and finished-part photo from the same job, with a short explanation of the problem solved.
5. **Business details:** confirm the retained phone/email, starting rates, pickup arrangements and any specific material/size limits to publish.
