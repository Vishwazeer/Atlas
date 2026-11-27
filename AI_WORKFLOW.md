# AI workflow

## What AI drafted
- Chart components and the shared `ChartShell`, hooks and navigation helpers.
- Seeded mock data generators in `src/data`.
- Vitest/RTL tests, Playwright specs, CI workflow, README and this file.
- The OG image script and the gallery copy.

## What a human should review
- **Colour**: palettes in `src/styles/tokens.css` were run through a palette validator (ordinal ramps: monotone lightness, light end >= 2:1; categorical: CVD separation). Re-run after any change.
- **Accessibility claims**: verify with a real screen reader (NVDA/VoiceOver); tests only check roles, labels, focus order and live-region text.
- **Topology interaction**: drag/zoom on touch devices was only checked in emulation.
- **Brush pointer handling**: pointer capture across the window, edges and surface.
- Copy in the doc pages for accuracy against the component behaviour.

## How it is tested
- `src/charts/transforms.test.ts`: pure maths (stacking, brush clamp/move/resize, calendar grid, thresholds, treemap paths and shares, SLA states, keyboard maps, topology fit).
- `src/charts/charts.test.tsx`: table-view toggles and keyboard roving for all six components.
- `src/app.test.tsx`: routing, theme toggle, lazy page loading, highlighter.
- `src/data/data.test.ts`: determinism and integrity of seeded data.
- `e2e/`: every chart page renders and switches to a table, deep-link reload, theme recolours marks, no horizontal scroll, keyboard flows in a real browser (desktop + mobile projects).
- CI runs lint, typecheck, unit tests, build, then Playwright.
