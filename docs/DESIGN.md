# Design system

A compact, quiet interface: white, black, neutral grey and one vivid purple accent. Fits one screen where possible.

## Tokens
All colours are CSS variables in `src/app/globals.css`, mapped to Tailwind names in `tailwind.config.ts`.

| Token | Light | Dark |
| --- | --- | --- |
| `bg` | #ffffff | #171717 |
| `surface` | #ffffff | #212121 |
| `subtle` | #f7f7f8 | #2a2a2a |
| `line` | #e5e5e5 | #363636 |
| `ink` | #0d0d0d | #ececec |
| `muted` | #5d5d5d | #b4b4b4 |
| `accent` (fills) | #5b2bd9 | #6d3df0 |
| `accent-fg` (purple text and icons) | #5b2bd9 | #b9a2ff |

Use `accent` for filled buttons and bars, `accent-fg` for purple text. Warning and info states are neutral greys; errors use the purple family.

## Typography
Inter, loaded with `next/font/google` in `src/app/layout.tsx` (exposed as `--font-inter`), falling back to the system UI stack if the font cannot load. Base size 14px; headings top out at 28px (home hero) and 20px (page titles).

## Theme
`ThemeToggle` (`src/components/theme-toggle.tsx`) sets `data-theme` on `<html>` and stores `la_theme` in localStorage. An inline script in `src/app/layout.tsx` applies the saved choice before first paint, falling back to the system setting. The toggle is in the marketing header, the app sidebar and mobile bar, the admin header, and the auth pages.

## Layout rules
- Home page: header (centred nav, theme toggle, Sign in, Get Started); hero with a three-line headline whose last line is purple, a four-item checklist and a dashboard illustration; a four-column feature strip; four plan cards built from the live plan data (Starter marked Recommended, unbuilt features marked planned); dark purple call-to-action; one-line footer. FAQ and billing rules live on `/pricing`.
- The dashboard illustration (`marketing/product-preview.tsx`) uses invented sample businesses and figures and says so in its caption.
- App: 256px sidebar with a plan card, top bar with search over saved leads (Ctrl+K), theme toggle and account menu; Find Leads uses one row of icon inputs and a results table with numbered pagination.
- Icons: Lucide only. No emoji.
