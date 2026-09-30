# JMT Travels CSS V6 Refactor Audit

## Baseline

Captured from `main` before the refactor branch changes.

| Metric | jmt-theme.css | jmt-mobile-fix.css | index.html |
|---|---:|---:|---:|
| Lines | 7,427 | 379 | 359 |
| Size | 172,137 bytes | 13,471 bytes | — |
| `!important` | 1,287 | 164 | — |
| Distinct hex colors | 82 | 6 | — |
| `:root` blocks | 2 | 0 | — |
| Base `body` blocks | 2 detected | 0 | — |
| `#view-container` declarations | 4 detected | 0 | — |
| Distinct z-index values | 15 | 1 | — |
| font-size declarations | 227 | 10 | — |
| Distinct transition values | 51 | 2 | — |
| Inline-style lines | — | — | 23 |

## CSS V6 strategy

1. Establish one authoritative token block.
2. Consolidate global `body`, `html`, and SPA container rules.
3. Replace arbitrary stacking values with semantic z-index tokens.
4. Consolidate motion tokens.
5. Reduce specificity and `!important` usage without deleting overrides blindly.
6. Normalize colors and semantic aliases.
7. Fold patch/emergency layers into their owning components.
8. Consolidate mobile fixes into responsive component rules.
9. Move presentation-only inline styles into CSS classes.
10. Validate desktop, mobile, dark theme, and RTL behavior after each stage.

## CSS-01 completed on refactor branch

Commit: `548cfee1541953a1a31ed6f132e4aa6b8bf71c5f`

Completed:
- Merged duplicate token layer into one top-level `:root`.
- Added semantic motion tokens.
- Added a controlled z-index scale.
- Removed the malformed nested comment.
- Made the primary body and SPA container rules token-based.
- Removed duplicate global body/view-container overrides.
- Replaced the main header's hardcoded z-index with `var(--z-header)`.

Post-change structural checks:
- `:root`: 1
- `#view-container` base declarations: 2 (base + dark-theme variant)
- Remaining `!important`: 1,273

## Next

CSS-02: controlled color-token migration and specificity cleanup.

This phase must preserve application behavior and existing page structure. No backend, API, authentication, payment, hotel/flight, visa, tourism, chatbot, or business logic changes are permitted.


## CSS-02 — Brand palette + visual rhythm

- Established a single light-first palette: white page canvas, faded lapis-blue section surfaces, JMT logo green for primary actions, navy/ink typography, muted secondary text and restrained borders.
- Refined `jmt-v6-visual-system.css` with shared color, control, card, section-radius, focus and dark-surface tokens.
- Normalized common frontend inline colors in `app.js` and the shared shell in `index.html` to V6 CSS variables without changing routing, API calls, authentication, booking, payment or chatbot logic.
- Aligned the mobile compatibility layer and light-mode portion of `jmt-theme.css` with semantic tokens while leaving dark-theme declarations intact.
- Added consistent section rhythm, card depth, control dimensions, heading scale, gaps, focus states and subtle lapis/green textures.
- Validation: CSS brace balance remains zero; changes are limited to presentation/style surfaces and frontend style strings.

### CSS-02 visual contract

| Element | Target |
|---|---|
| Page background | White |
| Section surface | Faded lapis blue |
| Primary action | JMT green `#00A651` |
| Primary hover | Dark JMT green `#007A3B` |
| Main text | Deep blue-black / navy |
| Secondary text | Muted slate blue |
| Cards | White, thin border, soft shadow, 18px radius |
| Controls | 48px minimum height, 12px radius |
| Section rhythm | ~56–88px vertical padding |
| Mobile rhythm | ~40–48px vertical padding |
