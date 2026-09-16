# Flashing website: working specification and experiment record

## Objective
Build a hostable website for drawing dimensioned sheet-metal flashing profiles, saving jobs, and sending drawings by email. Develop machine-aware bending sequences using explicit constraints and operator validation. Record discoveries as reusable code, examples, and tests.

## Reference profile
PDF 20260825103158406.pdf, flashing form 35786.
Segments in order: 30 mm left open crush return, 230 mm left face, 230 mm right face, 30 mm right return.
Ridge included angle: 110 degrees (70-degree bend from flat).
Right return opening: 40 degrees (140-degree bend from flat).
Nominal girth: 520 mm. Quantity: 3. Sheet length: 4400 mm.
Material: 0.55 mm steel, colour Lignite. Roof pitch stated: 35 degrees.
Open crush gap is unspecified in the PDF; do not silently treat a software default as a confirmed requirement.

## Machine and transfer facts supplied by operator
Single-action Variobend folder, nominal 6.4 m working length. Exact model/tooling not yet identified.
SLINET upload transfers for operator review; it does not start the machine.
Copy and paste the exact folder name for the SLINET transfer.

## Observed application workflow
Installed application: Variobend Office / Variobend Software.
Profiles open by DOUBLE-CLICK. A single click selects/highlights.
Folder created by user: AI experiment (displayed AI EXPERIMENT).
Draw canvas uses successive point clicks; initial drag only placed a starting point.
Edit mode: click segment/length label to open numeric keypad. Overlapping short-return labels can select the angle instead; verify keypad title.
Numeric keypad clicks work. Earlier injected text did not work reliably; do not infer successful input without checking visible value.
Zoom Off fits the profile to the canvas.
Angle labels use bend-from-flat for ordinary bends; special hem encoding was observed as 1, with a separate Hemming field of 2 mm. Meaning and physical gap require confirmation.

## Last verified desktop state (must re-observe before acting)
Unsaved/new profile named 35786 in AI experiment.
Four lengths: 30, 230, 230, 30 mm; width shown 520 mm.
Ridge bend set to 70 degrees; right return observed 140 degrees.
Quantity set to 3; steel and thickness 0.55 mm shown.
Colour still None. Sheet length not committed: keypad last showed 4, intended 4400.
Profile drawn with slight rotation; exact 35-degree orientation/painted side not verified.
Bending sequence not created or simulated. No SLINET upload completed.

## Proposed website structure
1. Profile editor: explicit lengths, signed bend angles, open/closed hems and gap; consistent internal units and angle convention.
2. Job data: name, quantity, material, thickness, colour, length, notes.
3. Export: dimensioned PDF and structured profile JSON; email preview with explicit recipient and Send action. Email service credentials must stay on server.
4. Machine constraints: tooling geometry, clamping clearance, minimum flange/grip, backgauge range, material/length capacity, hem gap and opening, one-direction bends, flip/rotation handling, collision checks through the full motion.
5. Sequence planner: enumerate candidate sequences including intermediate bends and repositioning; reject proven conflicts; explain unverified constraints. Validate against operator-approved examples before production use.
6. Deterministic geometry and validation should run without an AI call for each drawing action.

## Evidence discipline
Distinguish operator-confirmed facts, observed software behaviour, inferred geometry, and unknown constraints. Do not claim access to Variobend source code: UI automation is not source-code extraction. Keep a regression example for each confirmed rule.

## Next steps
Re-observe app; finish length and colour; verify hem gap/paint side; save profile; inspect configured machine and sequence simulation; transfer reviewed job to SLINET. Build first website version around the same reference profile, then add validated machine rules iteratively.

## Update — 11 September 2026 (supersedes historical status above)

The earlier status describes an old checkpoint. The operator subsequently approved the 2 mm open-crush setting for profile 35786. No completed SLINET upload is recorded. Do not treat this as a current live-app state.

Reviewed the prepared profile list and inspected saved bend orders for P1 2 Garage Door A and P3 4 Custom Soffit A. Advanced the custom-soffit simulation to its final step. The observed operation order is upper-end hem prebend/close (1/2), lower-end hem prebend/close (3/4), lower step bend (5), middle step bend (6), upper bend (7). At step 6 both TURN and FLIP were highlighted. The operator explicitly confirmed that this requires a physical spin and flip. This is specific to this profile and sequence; it is not proof that no alternative sequence exists.

Website implementation now exists in dist/, with portable geometry/checks in dist/model.js and optional Cloudflare AI adapter in worker.mjs. README.md describes use, assumptions, deployment and remaining limitations. Initial tests cover geometry, profile validation, sequence integrity and Worker access/error paths. The local prototype has no machine simulation, collision solver, automatic optimiser, direct email service or SLINET export. It opens an email draft with dimensions and supports JSON, SVG and print-to-PDF.

Preserve the distinction between observed values and assumptions: custom-soffit hem gaps are draft defaults; its final 10 mm return was inferred from the displayed 250 mm girth. The 6,400 mm length limit is operator supplied. Further machine constraints need measurements before they can become deterministic rules.

## Update — 16 September 2026

Reviewed all four pages of Bending Sequence on a Ridge explanation.pdf and the one-page blank flashing form 20260916152141426 (1).pdf. The user supplied usual ridge dimensions: 200 mm each side, 40 mm return, 30 mm downstand, 10 mm crush. Finished angles/gaps and the precise width associated with the 200–300 mm interference warning are still unconfirmed.

The ridge reference has an overview followed by eleven actual operations. The method starts with inside support, makes the adjacent fold without spinning, uses outside support for the opposite-end work, and performs its only physical spin at actual operation 8 (document section 9). Both 140-degree folds are flattened last after structural rigidity has been gained. Software-suggested rotations are not automatically counted as physical spins. These facts are contextual to this example; there is no general collision clearance threshold or universal one-spin guarantee.

Implemented on-drawing length/angle/gap editing, one master editor at the side, rubber-band drawing preview, optional snapping, centred geometry with unchanged heading when appending, manual +/-15-degree rotation, and explicit A/B colour face. Added full SVG flashing-form export and print layout, order metadata, illustrated cumulative operation cards, editable targets/support/notes, repeated stages and a ridge-specific flatten-last check. The operator guide and its eleven source illustrations are embedded as a separate reference, not generated simulation output. Old JSON files are accepted with new fields defaulted to unconfirmed.

Validation: 22 unit/regression tests pass; browser verified inline edits, colour side, rotation, add-leg heading preservation, and two-segment live drawing. Form and procedure SVGs were rendered and inspected. Exact printer/PDF output and actual machine motion remain unverified. Updated Cloudflare-ready source is packaged in outputs/flashing-studio-v2.zip.
