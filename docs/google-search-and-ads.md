# Google Search and Ads handoff

## Search campaigns

Use the matching service URL as the ad destination. Start with tightly themed phrase/exact keywords, then use search-term and qualified-lead data to refine targeting. These are suggested account settings, not a claim that campaigns have been created.

| Ad group | Example searches | Landing page | Suggested headline |
| --- | --- | --- | --- |
| FDM | custom 3d printing Edmonton, FDM printing service | /services/fdm-3d-printing | FDM 3D Printing Edmonton |
| Resin | resin 3d printing Edmonton, miniature printing service | /services/resin-3d-printing | Resin 3D Printing Edmonton |
| CAD | CAD design Edmonton, 3d modeling service | /services/cad-design | CAD Design in Edmonton |
| Scanning | 3d scanning Edmonton, reverse engineering parts | /services/3d-scanning | 3D Scanning in Edmonton |
| Woodworking | CNC woodworking Edmonton, custom wood signs, CNC wood carving | /services/cnc-woodworking | CNC Woodworking Edmonton |

Suggested descriptions: “Send a file, sketch or idea. One-off projects and small runs welcome. Request a quote.” Use the relevant published starting price where appropriate. Do not claim same-day completion, certified parts, guaranteed accuracy or capabilities not confirmed with the studio.

Review negatives such as jobs, careers, courses, tutorials, free downloads and printer-for-sale searches. Avoid blanket negatives like STL, DIY, repair or miniature that may exclude real customers. Begin with Edmonton and the actual service area using presence-based location targeting; broaden shipping campaigns only where practical. Budget and bids require business decisions based on lead quality and capacity.

Add relevant sitelinks (work, pricing, contact, related service), a business call asset and a linked Google Business Profile location asset. Calls and site clicks should not be treated as completed projects.

## Measurement

Existing Ads destination: AW-17678917579/L2otCKraw7QbEMu_--1B. Existing GA4: G-8D08Z57Q3S.

- Keep accepted quote requests as the primary lead conversion. A thank-you page view alone does not trigger it.
- `quote_start` and `phone_click` are diagnostic GA4 events; keep them secondary if imported into Ads. A phone click is not a verified completed call.
- Avoid importing GA4 generate_lead as a second primary conversion when the direct Ads conversion already counts the same form.
- Campaign UTM tags and gclid/gbraid/wbraid are retained for the current tab session. Form text, email, phone and uploaded files are not copied to analytics events. Do not put customer personal information in campaign URL parameters.
- Verify account-side conversion diagnostics, auto-tagging, enhanced measurement form settings (to avoid confusing automatic form events), attribution and regional consent requirements before scaling ad spend.
- Browser tests mock Google requests and form acceptance; they verify event generation, not receipt or reporting in the Ads account.

## Search Console

Use the verified domain property for custombuildstudio.ca. Submit https://custombuildstudio.ca/sitemap.xml. Inspect the five landing URLs and request indexing when needed. Review Page Indexing, search queries, impressions and clicks after recrawling. Google controls crawling and indexing timing.

If the property is not verified, use the verification method supplied by Search Console (typically domain DNS). No password is needed in the codebase. A public business-profile link does not grant Search Console or Ads access.

## Reference

- Ad Rank: https://support.google.com/google-ads/answer/1752122?hl=en
- Quality Score: https://support.google.com/google-ads/answer/6167130?hl=en

Search ranking and ad position are different systems. These code changes improve page relevance and measurement; neither organic first place nor the first ad slot can be guaranteed.
