# SCURRY: public-model sourcing, provenance and reusable 3D pipeline

Updated: 18 Nov 2026. Owner goal: a genuinely exceptional Boston Common/Public Garden at squirrel eye height (0.25 m) **and** a human inspection reference (1.7 m). No AI-generated imagery/models. No bundler or runtime dependency. Models are welcome when their authors, rights, geometry and performance can be demonstrated.

## The critical distinction: downloadable is not licensed

The public game already includes third-party GLB, glTF, texture and city-data assets. A separate workspace ATTRIBUTION ledger is mentioned in older project notes, but it does not accompany this GitHub checkout. Earlier README language said the assets were all CC0 despite two clear exceptions.

**TD Garden:** The detailed arena GLB is in public GitHub and the game loads it. The owner explicitly authorized release in an earlier sprint, but the original author's identity and redistribution license are still unknown. That owner release decision is part of project history; **it is not evidence that the owner holds third-party distribution rights**. Track and resolve this as GitHub issue #3. If no permission can be found, replace with a self-authored arena bowl or demonstrably licensed model instead of silently labeling it CC0.

**Fenway:** The original is credited to Garner / King / Thrall and comes from 3D Warehouse. Check the *exact model's* origin and 3D Warehouse General Model License, especially restrictions relevant to downloadable source files, combined works, and geolocated model use, before treating the public GLB as cleared.

**Boston 3D:** The BPDA official download page explicitly identifies its dataset license as Open Data Commons PDDL. That verifies the license **family**; exact source tile IDs and transformation/derivation details still need recording for City Hall, Hatch Shell and Fenway neighborhood.

**Poly Pizza:** Individual models may be CC0 or CC BY. An aggregator homepage or author name alone cannot prove a particular Dog / Man / Lantern model is CC0. Record each model-specific URL and source license evidence, including legally required attribution for CC BY.

Source guidance:
- BPDA official data and license: https://www.bostonplans.org/3d-data-maps/3d-smart-model/3d-data-download
- Poly Pizza: https://poly.pizza/
- SketchUp 3D Warehouse current terms: https://3dwarehouse.sketchup.com/tou
- SketchUp explanation of combined works and source provision: https://help.sketchup.com/en/3d-warehouse/3d-warehouse-terms-use-faq

## Current deliverables

- assets/model-provenance.json contains all 12 existing asset packages and all 24 files, including GLB, external glTF buffers and referenced tree textures.
- tools/audit-assets.mjs works with Node built-ins only. It verifies the manifest covers every local file, checks duplicates and safe paths, reads GLB v2 headers, validates glTF external dependencies, rejects HTTP/remote dependencies, and enforces an 8 MiB **per-file** asset-size ceiling as a starting mobile budget.
- tests/asset-audit-regressions.mjs exercises the real source audit with six independent Node-only fixtures.
- .github/workflows/ci.yml calls the asset audit automatically.
- Existing packages have rightsStatus represented by status=review or status=unknown and are in a **frozen legacy warning list**. This is a grandfathered build compatibility exception, not licensing clearance. A new package ID must have status=verified with a real source URL, author and exact license-evidence link.

## Repeatable intake and acceptance for each newly sourced model

1. **Prioritize the player-facing gap.** Describe what is missing from the park: a convincing forked elm, original cast-iron fence/wrought gate, path edge, Brewer Fountain detail, tree roots, actual Garden bridge rails, shoreline, signage or wildlife. Explain why an imported model beats authored geometry, and include reference photos or measured drawings. Avoid visual filler.
2. **Establish rights first.** Save the exact asset page URL (not the marketplace homepage), original author, download date, licence version, author attribution text, evidence URL and distribution conditions. CC0 and documented CC BY are preferred. NC/ND, ripped games, uncertain usage rights and generic attribution guesses do not pass. A third-party model in a larger game may still expose its standalone GLB via public network paths: evaluate what rights that requires.
3. **Save source and derivation.** Keep the original in the authorized workspace, note conversion software/version, transforms, texture changes and any new geometry. Export valid glTF 2 / GLB and register every dependency in the JSON manifest. The public repo contains only the optimized result and evidence, not a mystery untraceable conversion.
4. **Budget mobile first.** Start around 1–3 MiB for a frequently seen hero prop, fail intake at 8 MiB per file pending explicit reviewed exception; use mesh instancing and shared PBR materials for repeated trees, lamps and benches. Reduce texture dimensions, hidden faces, unnecessary bones/animations and alpha overdraw. A file-size limit is not sufficient: track draw calls, vertex counts, texture GPU memory and shader cost in an actual WebGL capture.
5. **Calibrate real scale.** Use metres, stable coordinate conventions, ground-aligned pivot and test the imported object's silhouette at 0.25 m and 1.7 m eye heights. Reference Boston photos or site drawings. Control roof/parquet/branch walk surfaces, collision boxes/segments, rail heights and slope contact; an imported visible mesh is NOT automatically physical.
6. **Graceful failure.** All sourced-model runtime loads should be best-effort, with meaningful authored fallbacks if a model download fails. Never let a missing optional asset prevent the squirrel from moving; never use unlicensed hotlinks as a fallback.
7. **Playtest and sign off.** Run the local asset validator, pure Node tests and live-browser software-WebGL suite, then review real GPU daylight/night screenshots at both eye heights and a sustained physical iPhone Safari test. Specifically check clipping, fence tops, foot contact, shadows, UV seams, materials, texture pop-in and sustained heat.

## Missing-world work queue (candidate searches, not acquired models)

**Highest player-facing priority:** richly detailed tree roots and forks that are readable at 25cm; authentic cast-iron Common/Garden fences and gate hinges; weathered stone/plaza transitions and route barriers; improved park furniture, trash bins, paths and ground contact shadows; accurate Garden bridge details and lagoon edge; local facade variation over BPDA massing. Then improve Fenway seat geometry, Esplanade Hatch Shell surroundings and the rights-cleared TD Garden interior. Avoid adding 100 generic props that obscure gameplay or create mobile draw-call regressions.

For every candidate asset, keep a plain review record with source URL, author, license evidence, dimensions, polygon and draw-call budget, textures, reuse rights and real-world placement. Rejections are valuable documentation: record why a model failed licensing, quality, scale or performance.

## For future games

Copy tools/audit-assets.mjs, tests/asset-audit-regressions.mjs and assets/model-provenance.json into a new repository. Reset the LEGACY_REVIEW_IDS set to EMPTY—future projects start with **no exceptions**. Adapt the allowed asset folder and mobile limits as needed. Keep item-level provenance, an import/LOD budget and an automated no-build gate from day one; make missing parts a documented backlog instead of pretending everything is finished.

The validator is a technical guardrail, not a legal opinion or retroactive permission grant.
