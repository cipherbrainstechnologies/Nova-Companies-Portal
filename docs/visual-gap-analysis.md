# Visual gap analysis — Nova Workforce homepage

Date: 2026-10-13

Sources compared:

- Current implementation: `src/app/(site)/page.tsx`, `src/components/marketing/site-header.tsx`, `src/components/marketing/home/hero-dashboard-visual.tsx`, marketing tokens in `src/app/globals.css`
- Target composition: Native Teams desktop hero principles specified for this rebuild (full-width navy surface, split headline and supporting copy, layered dashboard, floating benefit cards, rounded lower edge, overlap into the next section)
- Attached files `image.png` and `image(1).png` were not present in the repository or local upload paths, so pixel values below are taken from the current code and the written target. Browser measurements are added after visual QA.

Nova copy, routes, and employment logic stay the source of truth. Native Teams imagery, logos, claims, and code are not reused.

## Comparison matrix

| Attribute | Current Nova | Target | Component / style responsible |
| --- | --- | --- | --- |
| Header height | ~56px (`py-3.5` plus 40px controls) | 76–84px | `SiteHeader` container padding |
| Header content alignment | Logo left, links in a row, CTA right; links are not centred in the content grid | Logo on the grid, links centred, account action and CTA on the right | `SiteHeader` flex row |
| Main container width | `78rem` (1248px) including gutter | 1240–1320px content grid | `--mkt-container-max` |
| Hero background | White page, no dark surface | Full-width navy with a purple radial glow | Homepage hero in `page.tsx` (no hero surface) |
| Hero height | Text stack plus a small preview; no composed stage | Tall art-directed stage with the visual crossing the lower edge | `page.tsx` hero section |
| Hero content positioning | Everything centred | Left headline (~45–50%+), supporting copy and CTAs on the right | `page.tsx` `text-center` stack |
| Headline size | `clamp(2.375rem, 5.5vw, 4.75rem)` but centred and broken by a pink highlight | 64–76px, tight line-height, intentional line breaks, white | `.mkt-h1` plus `titlePrefix` / `titleHighlight` / `titleSuffix` |
| Headline line breaks | One flowing sentence, highlight on “India” | Three deliberate lines | Homepage `h1` markup |
| Supporting text width | Centred `max-w-2xl`, secondary grey `#686868` | Right column, comfortable measure, high contrast on navy | `home.lede` rendering |
| CTA alignment and size | Centred pair, 48px pill, pink fill | Right-aligned with the supporting copy, high-contrast pair | `MarketingLink` in the centred hero |
| Illustration placement | Flat card under the text, max-w-4xl, inside the white flow | Large dashboard in the lower hero, overlapping the next section | `HeroDashboardVisual` |
| Layered composition | Single bordered panel and three text lists | Dashboard, right-side floating cards, lower-left note, shadows | `HeroDashboardVisual` only |
| Section boundaries | Alternating white / `#f7f7f8` bands and repeated card grids | Distinct compositions per section; dark hero curve; soft transition | `page.tsx` sections |
| Border radii | 16px / 24px | Larger hero radius and consistent card radii | `--mkt-radius`, `--mkt-radius-lg` |
| Visual depth | Light shadow `rgb(25 25 25 / 0.06)` | Layered shadows on the dashboard and floating cards | `--mkt-shadow` |
| Colour | Pink accent `#ff245c` on near-black `#191919` | Navy `#0C0C32`, purple `#5857F5` | `[data-marketing="true"]` tokens |
| Body contrast | Secondary text `#686868` at `text-sm` in most sections | 16–18px body, muted `#697084` on white, near-white on navy | Section paragraphs |
| Cost presentation | Category cards on the homepage; illustrative table exists but is a plain spreadsheet on the EOR page | Premium cost card with summary, mobile cards, illustrative label | `page.tsx` cost section and `CostDashboardPreview` |
| Responsive behaviour | Stacked centred hero; preview stays a small grid; no composed mobile order | Copy first, dashboard below, cards reflow, no horizontal page scroll | Hero and cost components |

## Measured after implementation (browser, 13 Oct 2026)

| Check | Result |
| --- | --- |
| Header height at 1440 | 81px |
| Headline at 1440 | 67.68px, three lines, no wrap |
| Headline at 1920 | 72px, three lines, no wrap |
| Headline at 390 | 32.8px, three lines, no wrap |
| Horizontal overflow | None at 390, 768, 1024, 1440, and 1920 |
| Dashboard overlap | Top of the dashboard sits on the navy surface; the lower edge crosses into the soft section |
| Benefit cards | Four purple cards overlap the dashboard’s right edge by about 52px |
| Hero button text | Primary navy on white; secondary and header CTA white. An unlayered `a { color: inherit }` rule was overriding utility colors and was corrected with explicit button color classes |
| Routes checked | `/`, `/contact`, `/pricing`, `/faq`, `/employer-of-record-india`, `/how-it-works` returned 200 |

Screenshots were captured from the running app at 1440×900 (hero and cost section) and 390×844 (mobile hero).

## Mismatches to correct first

1. Hero is a centred text column, owned by `src/app/(site)/page.tsx`.
2. There is no dark hero surface, glow, or bottom radius. Tokens in `globals.css` are pink and neutral black.
3. `HeroDashboardVisual` is a flat three-column list, not a layered product illustration.
4. `SiteHeader` is short and left-packs the navigation instead of centring it in the container.
5. Below-the-fold sections repeat the same bordered card grid (`page.tsx`).
6. `CostDashboardPreview` is an unstyled data table and is not on the homepage.
