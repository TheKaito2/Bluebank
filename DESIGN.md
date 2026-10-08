# LightBluePrep design system

Tokens live in [`web/src/tokens.css`](web/src/tokens.css). Components read tokens; they do not hard-code hex values. The practice screen keeps its Bluebook look (styles in `web/src/styles.css`, top of file) so test day feels familiar. This system covers everything around it.

## Colour

| Role | Token | Use |
|---|---|---|
| Brand | `--brand-50 … --brand-700` (light blue) | Logo, focus rings, score chart, links in the support popup |
| Reading and Writing | `--rw-*` (rose pink) | Anything that belongs to R&W: topic cards, section tab, score bar |
| Math | `--math-*` (light blue, cooler than brand) | Anything that belongs to Math |
| Streak | `--streak-*` (amber orange) | Streak icon and day dots only |
| Neutrals | `--n-0 … --n-900` (one cool grey ramp) | Text, borders, surfaces. Never mix in warm greys |
| Status | `--green`, `--amber-ink`, `--red` (+ `-soft`) | Correct / partly / wrong, accuracy badges, difficulty |
| Primary action | `--accent` (College Board royal blue) | Start, Submit, primary buttons. The same blue as the practice screen |

**Shade rules (measured WCAG contrast):**
- `*-700`: text on white or on its own `*-50` tint (6.5:1 or better).
- `*-600`: filled buttons and pills with white text (4.7:1 or better).
- `*-500` and lighter: bars, icons, borders. Never text.

**Section scope:** add `.sec-RW` or `.sec-MATH` to a container and use `var(--sec-500)` and friends inside it. The same component then colours itself correctly for either section, with no props or conditionals.

## Type
Noto Sans, self-hosted (no font CDN, for privacy and the CSP). The scale runs `--fs-2xs` (11) to `--fs-3xl` (32). Weights are `--fw-medium` 550, `--fw-semi` 650 and `--fw-bold` 750. Numbers use `font-variant-numeric: tabular-nums` so they don't jitter. Hierarchy comes from weight and colour before size.

## Space, radius, elevation, motion
- **Space:** 4px grid, `--sp-1` (4) to `--sp-10` (40).
- **Radius:** `--rad-sm` 8 for chips and icons, `--rad-md` 12 for inputs and rows, `--rad-lg` 16 for cards, `--rad-pill` for buttons and segmented controls.
- **Elevation:** shadows are tinted toward the page blue and never pure black. `--sh-1` is resting cards, `--sh-2` hover, `--sh-3` dialogs.
- **Motion:** `--ease-out`, with `--dur-fast` (140ms) for state and `--dur-base` (260ms) for layout. Animate only `transform` and `opacity`. Everything respects `prefers-reduced-motion`.

## Icons
- **Source:** hand-drawn 24×24 stroke icons in [`web/src/components/Icon.tsx`](web/src/components/Icon.tsx). There is no icon dependency.
- **Stroke:** 2 in the UI, 2.2 to 3 for tiny glyphs like the checkbox tick.
- **No emoji** anywhere in the interface.
- **Section icons:** `book` for Reading and Writing, `sigma` for Math. Use them wherever a section is named.

## Patterns
- **Cards** only where they group something you act on (topic cards, progress). Otherwise use spacing and hairlines.
- **States:**
  - **Loading:** skeletons shaped like the content, not spinners.
  - **Empty:** say how to fill the space ("Unlocks after 10 questions in each section").
  - **Pressed:** `scale(.99)` or `translateY(1px)`.
- **Dialogs** share one shell (`.fb-dialog`): centred on desktop, a bottom sheet on phones, Escape to close, focus returns to the opener.
- **Phone:** tabs move to a bottom bar. The progress strip shrinks to one row of numbers so the topics stay on the first screen.
