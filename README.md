# Jopana Earnings Calculator

A single-page earnings estimator for healthcare professionals considering Jopana.
Pick a profession and shift pattern; the monthly figure updates live as the slider
moves.

**Live:** https://deenightfurie.github.io/jopana-earnings/

## How it is built

One self-contained `index.html` (~25 KB, no framework, no build output to deploy).
GitHub Pages serves it straight from `main`. That keeps it fast on mobile data,
which matters because most visitors arrive by scanning a QR code.

```
index.html          generated - do not edit by hand
src/
├── pricing.ts      the rates (single source of truth)
├── template.html   the page
└── build.mjs       injects the rates into the template
qr/                 QR code artwork pointing at the live URL
```

## Changing a rate

Edit `src/pricing.ts`, then regenerate:

```bash
node --experimental-strip-types src/build.mjs
git commit -am "Update rates" && git push
```

`src/pricing.ts` is the **same file** the React component on jopana.in imports, so
the website and this page can never quote different numbers. Editing `index.html`
directly breaks that guarantee — the next build overwrites it.

> The pure helper functions are duplicated in `template.html` because a browser
> cannot import TypeScript. The **rates** are not duplicated, and a test sweeps all
> 8 specialities × 24 hours to confirm the page and `pricing.ts` agree.

## Pricing models

| Model | Daily rate | Used by |
|---|---|---|
| `fixed` | hourly rate × hours | Nursing visits, all physiotherapy, both doctor consults |
| `slab` | flat amount for the whole shift | Both Continuous Care specialities |

Monthly income = daily rate × working days. Figures are gross — no tax, platform
commission or travel cost is modelled.

## Verification

- **576/576** assertions (daily rate, monthly total, hour snapping) match
  `pricing.ts` across every speciality × hour combination, driven in Chrome.
- No console errors; no horizontal overflow at 390 px or 1280 px.
- Keyboard accessible: the slider is a native range input, and every option is a
  real button with `role="radio"` / `aria-checked`.

## Related

- `jopana-income-calculator/` — the React/shadcn component for the jopana.in site
- `Jopana-Income-Calculation.xlsx` — the same rates as a formula-driven workbook
