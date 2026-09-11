# Validation report

Tested locally against the generated production output on September 10, 2026.

| Check | Result |
|---|---|
| TypeScript + production build | Pass; no build warnings/errors |
| Static documents | 30 prerendered pages |
| Internal links, image references, unique titles, metadata | Pass |
| Browser layouts | 17 routes × 1440, 768, 390 and 320 px = 68 checks |
| Axe accessibility checks | No detected WCAG A/AA violations on the desktop and mobile route passes |
| Console/runtime errors | None in the tested routes |
| Menu, Escape, navigation and filters | Pass |
| Gallery keyboard navigation, focus containment/restoration | Pass |
| Required fields, service preselection, upload limit | Pass |
| Five attachments, removal and re-addition | Pass; stable field names |
| Failed submission | Input preserved; recoverable error displayed |
| Successful submission | Multipart payload verified with a mocked accepted response |
| Reduced motion and 200% text enlargement | Pass |
| Content without JavaScript | Service content and full Netlify form schema present |
| Dependency audit | 0 reported vulnerabilities |

## Mobile Lighthouse

Default Lighthouse mobile laboratory settings against the local static preview. The local server does not compress responses; Netlify supplies its own edge delivery and compression. Production-only Google tags are not loaded on localhost.

| Page | Performance | Accessibility | Best practices | SEO |
|---|---:|---:|---:|---:|
| Homepage | 93 | 100 | 100 | 100 |
| Quote form | 96 | 100 | 100 | 100 |
| CNC woodworking | 97 | 100 | 100 | 100 |

All three measured 0 ms total blocking time and 0 cumulative layout shift. These are local measurements, not field Core Web Vitals or a guarantee of production scores.

The 960-pixel image variants total approximately 1.57 MB compared with 35.46 MB for the corresponding original images: a 95.6% reduction for that variant set. This is not a claim that every page downloads the entire set. The new 960-pixel hero project photo is about 15 KB; the previous hero was about 2.6 MB.

## Hosting checks remaining

No production deployment or real enquiry was submitted during local testing. After deploying, confirm Netlify form detection, the `contact` notification destination, receipt of a small test upload and the public domain/redirect behavior. The form’s success and failure cases were tested using intercepted local responses.

The Windows execution sandbox required the version-matched esbuild WASM runner for local compilation. This was confined to ignored local dependencies. The committed dependency manifest and lockfile retain normal esbuild for Netlify; no sandbox workaround is part of the deployed application.

## Reproduce

See the root README for build, verification and browser-test commands. The repository includes the static verifier and browser suite. Browser screenshots and detailed JSON are generated in ignored `test-results/`.
