# Crystal Care frontend

React, Vite, TypeScript, and Tailwind CSS v4. Synthetic data only.
Demo workflow — pending agency confirmation.

Run commands from `frontend/`. See the root README for backend setup.

```powershell
npm.cmd run dev
npm.cmd run format
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run test:e2e
```

## Tailwind styles

`src/index.css` defines the CSS-first `@theme`, base styles, and shared component
classes. Follow [Tailwind theme variables](https://tailwindcss.com/docs/theme).

- Use semantic colors such as `bg-background`, `text-foreground`, `bg-card`,
  `text-muted-foreground`, and `border-border` rather than repeating hex values.
- Use `text-display`, `text-title`, and `text-section` for heading sizes. Pair them
  with `font-serif`; use `text-caption` for small supporting text.
- Use `page-section` for consistent page gutters and vertical padding.
- Use `button button-primary` or `button button-outline` on native buttons or
  navigation links. These include reduced-motion and disabled styles. Native
  buttons retain native disabled behavior; links are for navigation.
- Use `form-control` on text inputs and selects. Checkboxes keep their native
  appearance and use `accent-primary`.
- Shared keyboard focus styles live in the base layer. Keep the skip link target
  `main#main` focusable with `tabIndex={-1}`.
- Keep utility classes literal so Tailwind can detect them. Use utilities for
  local layout adjustments; add shared patterns only when reused.

`e2e/styles.spec.ts` checks gutters and overflow from 320px to 1440px, long
synthetic records, keyboard focus, disabled controls, and reduced motion with
mocked API responses. Existing foundation tests exercise the local demo backend.
