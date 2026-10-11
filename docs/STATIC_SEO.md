# Public SEO pages and Netlify

`npm run build` performs type checking, the client build, public-page rendering,
and SEO verification. Netlify continues using this command and publishing `dist`.
Pushes to the connected production branch should trigger the existing Netlify
build; do not bypass it with a manual upload of locally generated files.

The renderer uses the same public React components as the browser, including
the homepage's pricing, about, schedule, information and contact sections.
It waits for lazy sections to finish. Swedish is used for initial HTML; the
existing browser language selector still works after startup. Framer Motion
content remains visible before JavaScript runs. Hashed production image URLs
are resolved through Vite's manifest. Changed compressed HTML/XML sidecars are
regenerated to prevent serving a stale template.

The Node rendering context stubs the booking database import. It must not load
auth credentials, read customer records, submit applications, or fetch reviews.
Review widgets fetch their real data only in the browser, as before.

Public pages: `/`, `/hunddagis`, `/hundpensionat`, `/priser`, `/vanliga-fragor`.
Page copy and metadata live in `src/seo/pages.ts`; the price-list route uses the
existing pricing component. Keep service copy consistent when business terms
or prices change. The sitemap is generated from this same route list. The
renderer deliberately does not manufacture a new lastmod date on every deploy.

Known app routes rewrite to a separate noindex `app-shell.html`, not public
marketing HTML. The existing React authentication logic is unchanged. Unknown
paths still return 404. Public trailing-slash aliases redirect to their canonical routes. The .html
rewrite targets retain canonical tags instead of forced redirects, which would
loop when Netlify reprocesses the rewrite target.

Verification: `npm run test:seo` checks all generated public pages, unique
titles/descriptions, H1s, canonicals, links, assets, JSON-LD, compressed copies,
private-shell separation and sitemap coverage. Any failure stops the build.

Production deployment proof: `/.well-known/seo-build.json` includes Netlify's
`COMMIT_REF` plus the generated public route list. Verify this matches the pushed
Git commit, then check the live pages, sitemap, redirects and a missing path.

This change does not modify Google Business Profile, generate customer reviews,
or guarantee indexing/ranking. Search Console URL Inspection remains necessary
to confirm what Google indexed and to measure impressions and clicks.
