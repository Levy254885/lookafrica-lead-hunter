# Design system

A compact, quiet interface: white, black, neutral grey and one maroon accent. Fits one screen where possible.

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
| `accent` (fills) | #7a1f2b | #9b2c40 |
| `accent-fg` (maroon text and icons) | #7a1f2b | #e39aa8 |

Use `accent` for filled buttons and bars, `accent-fg` for maroon text. Warning and info states are neutral greys; errors use the maroon family.

## Typography
System UI stack, the same one ChatGPT's interface uses: `ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif`. ChatGPT's own face (Sohne) is licensed and is not bundled, so the text renders in each platform's native UI font. Base size 14px; headings top out at 28px (home hero) and 20px (page titles).

## Theme
`ThemeToggle` (`src/components/theme-toggle.tsx`) sets `data-theme` on `<html>` and stores `la_theme` in localStorage. An inline script in `src/app/layout.tsx` applies the saved choice before first paint, falling back to the system setting. The toggle is in the marketing header, the app sidebar and mobile bar, the admin header, and the auth pages.

## Layout rules
- Home page: left hero, right tabbed panel (Overview, Capabilities, Data, Pricing, Trust, FAQ); on desktop it fits the viewport and the tab body scrolls inside the panel. Tabs support arrow keys and `/#tab` links.
- App: 224px sidebar, 16px page padding, 36px-ish rows, overview stats in one strip.
- Icons: Lucide only, 14 to 16px. No emoji.
