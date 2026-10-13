# Nova Workforce — marketing design system

Scoped to `[data-marketing="true"]` on the public site. Admin and employee portals retain the original teal `--nova-*` tokens in `globals.css`.

## Colour

| Token | Value | Usage |
|-------|-------|--------|
| `--nova-ink` | `#17233B` | Headlines, brand |
| `--nova-teal` | `#6254D9` | Primary CTA, links (marketing accent) |
| `--nova-teal-soft` | `#F1EFFF` | Soft fills, badges |
| `--mkt-canvas` | `#F8F9FC` | Page background |
| `--mkt-surface` | `#FFFFFF` | Cards |
| `--nova-text-secondary` / `--nova-muted` | `#657187` | Body secondary |
| `--mkt-border` | `#E6E8F0` | Borders |
| `--mkt-accent-hover` | `#5248C4` | Primary button hover |

Machine-readable: `assets/marketing-design-tokens.json`.

## Typography

Plus Jakarta Sans (global). Hero H1 uses `clamp(2.2rem, 5.5vw, 3.75rem)` with `text-balance`. Eyebrows: 12px uppercase, tracking `0.14em`, accent colour.

## Layout

- Max content width: `72rem` (`--mkt-container-max`)
- Horizontal padding: `16px` mobile, `32px` desktop
- Section spacing: `mt-16` / `md:mt-20`
- Card radius: `--mkt-radius` (12px), panels `--mkt-radius-lg` (20px)

## Components

| Component | Location |
|-----------|----------|
| `MarketingLink`, `PageIntro`, `ClosingBand` | `src/components/marketing/blocks.tsx` |
| `MarketingSection`, `SurfaceCard`, `IconBadge` | `src/components/marketing/section.tsx` |
| `HeroDiagram` | `src/components/marketing/home/hero-diagram.tsx` |
| `SiteHeader`, `SiteShell`, `ContactForm` | `src/components/marketing/` |

## Accessibility

- Skip link to `#main`
- Visible focus on links and buttons
- Mobile menu: `aria-expanded`, Escape to close
- FAQ / considerations: native `<details>` with custom markers
- `prefers-reduced-motion`: global disable of transitions in `globals.css`
