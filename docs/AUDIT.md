# Website audit and implementation notes

## Initial findings

- React/Vite foundation was suitable, but all page markup, galleries, forms, metadata, project data and analytics occupied one approximately 83 KB `App.tsx`.
- The homepage hero emphasized printing and CAD; scanning was bundled into CAD and CNC woodworking had little visual or explanatory weight.
- Calls to action varied across “Get a Quote”, “Start Your Project” and “Request a Quote”. There was no clear complete project workflow.
- Portfolio cards combined oversized titles, dense descriptions and an inconsistent masonry layout. Work lacked service filters and shareable individual pages.
- The original hero image was approximately 2.6 MB; multiple project photos were 2–4 MB and the logo exceeded 1 MB. Project video was embedded in the portfolio grid.
- Repeated gradients, particles, shimmer, parallax and delayed text entrances added motion without helping the quote journey. Offscreen content was hidden until observed.
- Mobile navigation did not expose its expanded state, hidden drawer items remained in the DOM, gallery controls lacked useful labels, and gallery focus was unmanaged.
- Labels were not associated with fields. The form lacked service, quantity and date fields, used an alert for oversize files, and had no useful submission-failure feedback.
- Footer privacy/terms and Google review buttons pointed to `#`. The reviews array included a replacement-content instruction and unverified five-star rendering.
- Metadata was mainly inserted in a client effect. Open Graph was not actually set, preview image and favicon were empty, and no sitemap or robots file existed.
- Unknown routes had no designed fallback. Netlify rewrote every URL to the homepage. Build output was committed and duplicated the source assets.
- Analytics loading overlapped between the HTML, React components and thank-you page. Visiting the old thank-you page could log a conversion without submitting a form.
- The initial npm audit reported 11 dependency vulnerabilities; dependencies were updated and the final audit is recorded in the delivery report.

## Implemented direction

Graphite, white and restrained orange; large typography; real project photography; quieter transitions; direct, practical copy. Four service categories have distinct pages, natural Edmonton-focused copy and project-specific quote links. Existing project evidence takes priority over unsupported trust claims.

## Preserved

React, TypeScript, Vite, React Router, Netlify hosting/forms, existing project photos and video, contact details, social profiles, product enquiry flow, published starting rates and original analytics identifiers. Existing public top-level routes still resolve.

## Technical changes

- Reusable layout, image, CTA, gallery, FAQ and project components; separate page and data modules.
- Fifteen project detail pages, four service pages, a studio page and a useful 404.
- Thirty prerendered HTML documents, route-specific metadata, canonical URLs, Open Graph/X cards, sitemap, robots rules and conservative LocalBusiness data.
- Responsive WebP sources with real width descriptors, lazy loading, reserved dimensions and an optimized real-project social image.
- Focus-safe gallery dialog, keyboard navigation, menu state, skip link, semantic headings, form labels, contrast fixes and text-zoom reflow.
- Complete static Netlify schema, stable upload names, 7 MB upload budget, shared-link alternative and recoverable submission states.
- Production-only analytics initialization with conversion events tied to accepted submissions.
- Explicit Netlify configuration and generated output removed from version control.

## Boundaries of verification

The automated browser suite checks desktop/tablet/mobile pages, console errors, images, overflow, accessibility rules, keyboard behavior, filtering, galleries and form requests. Form success/failure responses are mocked locally. Netlify’s actual receipt, file storage, notifications and spam processing require one deployment smoke test. Lighthouse scores are local laboratory measurements, not field Core Web Vitals or a guarantee about the live host.
