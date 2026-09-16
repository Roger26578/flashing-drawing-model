# Flashing Studio

A small, dependency-free flashing editor prepared for your own Cloudflare account. This is independent application code, not Variobend source code or a machine program exporter.

## Start locally

Install Node.js if it is not already available, open a terminal in this folder and run:

```sh
node server.mjs
```

Open http://127.0.0.1:4173. Keep the terminal running. The editor requires no AI or cloud account to work. Profile data stays in the tab until you download a JSON profile; reopening the page resets it to the example. Fonts may load from Google Fonts, with local fallbacks.

## Use the editor

1. Start from the custom-soffit example or select New drawing.
2. Use Draw with clicks: click a start point and each corner, then Finish drawing. Drawing snaps to 5 mm lengths and 15-degree directions. Edit the dimensions for precise values. Undo restores earlier geometry.
3. Each leg after the first starts at a numbered bend. Positive turns are anticlockwise, negative turns clockwise, measured from flat. Opening angle is 180 minus the absolute turn. Convert a joint to Open hem and enter the required gap separately.
4. Reorder the individual bend and hem operations. Record physical spin/flip transitions for each step. A highlighted step selects a bend on the completed cross-section; it is not an animated machine simulation.
5. Save profile downloads reusable JSON. Open profile reads it back. Print / PDF opens the browser print dialog. Drawing SVG downloads the dimensioned cross-section. Draft email opens the user's mail application with a textual job summary; attach the PDF or SVG manually.

Reordering clears handling confirmations because the sheet's preceding state changed. Geometry changes reset the sequence to drawing order. That order is a drafting convenience, not an automatically optimised or validated bending order.

## Cloudflare deployment

The project uses a Worker with static assets. From this directory, with Node.js/npm installed and your Cloudflare account available:

```sh
npx wrangler login
npx wrangler deploy
```

Wrangler prints the deployed URL. `wrangler.jsonc` serves only `dist/` as public assets, with `/api/*` routed through `worker.mjs`. No account ID or secret is included. Authentication and deployment have not been performed in this workspace. The local preview does not validate Cloudflare deployment.

Cloudflare documentation: [static assets](https://developers.cloudflare.com/workers/static-assets/), [routing configuration](https://developers.cloudflare.com/workers/static-assets/binding/).

## Optional Workers AI extension

The editor works without AI. `worker.mjs` includes a disabled-by-default POST `/api/review` adapter for a future trusted server caller. It validates the profile, adds deterministic checks and asks for review suggestions. It does not change the drawing or approve a sequence.

To enable it later:

1. Add `"ai": { "binding": "AI" }` to `wrangler.jsonc`.
2. Add an `AI_MODEL` variable containing a model currently supported by Workers AI.
3. Set a secret with `npx wrangler secret put AI_REVIEW_TOKEN`.
4. Redeploy. A trusted caller supplies `Authorization: Bearer <secret>` and the profile JSON. Never put that secret into `dist/` or any public browser script. Before exposing AI directly to website visitors, add per-user authentication and usage controls; the present adapter deliberately has no browser caller.

AI output is unverified prose. It cannot replace physical machine geometry, material tables, or deterministic collision checks. [Workers AI bindings documentation](https://developers.cloudflare.com/workers-ai/configuration/bindings/).

## Known scope and evidence

- Machine: operator-described single-action Variobend, nominal working length 6,400 mm. Only the stated length limit is implemented. No thickness capacity is assumed.
- Custom soffit example: nominal legs 15, 80, 40, 25, 80, 10 mm; quantity 1; length 2,700 mm; 0.55 mm steel. The last 10 mm return is inferred from the displayed 250 mm girth minus the other visible lengths and should be checked against the source. Observed order: first hem prebend/close, last hem prebend/close, B4, B3, B2.
- Operator explicitly confirmed that operation 6 (B3) physically requires both spin and flip for this sequence. Other transitions remain unconfirmed. This does not prove all possible orders require that movement.
- The custom soffit's 2 mm hem gaps are editable draft defaults, not confirmed measurements. The separate earlier profile 35786 does have an operator-approved 2 mm open-crush setting.
- Drawing is nominal centreline geometry. Terminal hems are visually offset for readability, not drawn at physical gap scale. Flat-pattern bend deductions/allowances and material stretch are not calculated.
- No collision analysis, machine motion, grip/clearance checks, automatic sequence optimiser, direct email delivery or SLINET export is implemented.

## Extending this foundation

`dist/model.js` owns the portable profile format, geometry, sequence integrity and deterministic checks. `dist/app.js` owns the UI. `worker.mjs` owns optional AI review. Keep measured machine limitations as structured data with units and evidence. Add tooling geometry and material capacity tables before building a search over candidate sequences. Rank only feasible candidates by physical handling cost.

The page optionally exposes a read-only `read_flashing_profile` WebMCP tool when the browser supports it. WebMCP runtime validation was unavailable; it is not required by the editor.

## Verification

```sh
node --test --test-isolation=none tests/model.test.mjs
node --check dist/app.js
node --check dist/model.js
node --check worker.mjs
```

The tests cover signed geometry, hem return direction, file validation, nominal capacity, sequence completeness, email summaries and the AI adapter's disabled/authenticated/error states. Real Workers AI and Cloudflare deployment require your account and have not been exercised. Browser interaction testing has not been performed.
