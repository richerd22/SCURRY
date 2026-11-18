# Public 3D model candidates — SCURRY + future projects

Researched 18 Nov 2026. This is a sourcing queue, **not an approved/shipped asset list**. A model page showing CC0 makes it eligible for review, not necessarily useful, historically accurate or technically safe. No asset from this table was downloaded into the game during this pass.

| Model and exact source | Item-page licence displayed | Proposed use / honest art-direction verdict | Status |
| --- | --- | --- | --- |
| [Iron Fence — Kay Lousberg, Poly Pizza](https://poly.pizza/m/MDROOJeCSQ) | Public Domain CC0 (item page, 6 Apr 2024) | Low-poly modular iron geometry. **Not automatically a faithful Boston Garden fence**; keep the code-authored terrain-following version until reference comparison. Candidate for repeatable work outside historic hero views. | **Screened, not imported** |
| [Bench — Quaternius, Poly Pizza](https://poly.pizza/m/jLxjFxFRpw) | Public Domain CC0 (item page, 11 Jul 2022) | Candidate precise item-level attribution/possible replacement; do not assume it matches the already committed Bench.glb without comparing file hashes and mesh metadata. | **Screened, not imported** |
| [Tree — Quaternius, Poly Pizza](https://poly.pizza/m/aVOxaHRPWe) | Public Domain CC0 (item page, 2 Aug 2024) | Generic stylized tree. May help **distant** greenery, not credible as a hero Common/Garden elm at 25cm squirrel height without checking bark, crown underside, branch locomotion and root silhouette. | **Screened, hero-use rejected pending visual review** |
| [Trash Bin — CreativeTrio, Poly Pizza](https://poly.pizza/m/AAX1n0Bt0v) | Public Domain CC0 (item page, 17 Jan 2022) | Background park furniture candidate. Must match Boston receptacles, scale and low-draw-call placement; bins must not block paths with inaccurate invisible collision. | **Screened, not imported** |

### Authoritative world references (not downloadable models)

- [City of Boston — Boston Common Master Plan, Chapter 2](https://www.boston.gov/sites/default/files/file/2023/05/BCMP_chapter2.pdf) shows/describes gates, stone piers, ornamental fencing, signage and entrance improvements. Use for **design reference**, not copied art. Current procedural gate geometry is approximate, not a surveyed or officially endorsed 3D reconstruction.
- [National Park Service — Boston Public Garden](https://home.nps.gov/places/boston-public-garden.htm) describes the park's Victorian cast-iron fence, curved garden paths and landmark bridge.
- [BPDA official Boston 3D data downloads](https://www.bostonplans.org/3d-data-maps/3d-smart-model/3d-data-download) publish licensed PDDL city model geometry; verify individual tile and conversion provenance.

### Review gate

For every candidate before import: capture screenshot/reference, original author, exact license proof and license version/date, glTF archive, mesh + texture sizes, normals/UVs, scale/origin in metres, source transformations, mobile draw calls, tree/rail collision surfaces, paired 0.25m/1.7m QA images. Update assets/model-provenance.json with path-to-gitBlob hashes and status=verified only after full rights review; CI rejects unregistered files and unverified new packages. Consider the cheapest code-built geometry before adding another imported model.

Copy these source-review standards to new projects; do not copy SCURRY's legacy exception list.
