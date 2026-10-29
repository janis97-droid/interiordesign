# Blender authoring workflow

The west living-room sofa is the first editable Blender asset in the existing
Three.js home. The south sofa's geometry, architecture, tile grid, TV and furniture
layout are unchanged. Both sofas share the new cream linen material for rendering
efficiency. This is an original modeled approximation of the established
cream/walnut style, not an exact manufacturer model or photo reconstruction.

## Installed workstation tool

Blender 5.2.3 LTS was installed from the official Windows x64 portable archive
on 29 October 2026. The archive SHA-256 matched Blender's published checksum:
`723f08a4401502561eb763cdeacf8745b31e5f3f154d287d3830d97cf75dc2fb`.

Executable on this workstation:
`C:/Users/jawad/AppData/Local/Programs/Blender/blender-5.2.3-windows-x64/blender.exe`.
There is a **Blender 5.2 LTS** Start menu shortcut. No administrator installation,
global PATH change or security-setting change is needed. The asset commands also
accept `BLENDER_BIN` for another installation, then fall back to `blender` on PATH.

## Edit and export

1. Open `assets-src/living/west-sofa.blend` in Blender. It contains packed textures,
   individually editable cushions/piping/frame, and a studio preview collection.
2. Keep the floor-centred origin and approved 2.20 m width × 0.94 m depth × 0.90 m
   height. Blender is Z-up with the seat facing -Y; GLB is Y-up facing +Z.
3. Save the file, then run `npm run asset:sofa:export` in the repository.
4. Run `npm run asset:sofa:preview` for the Cycles studio render. It uses OptiX when
   available and CPU otherwise. This workstation successfully rendered on the
   NVIDIA GeForce RTX 5060. Preview lights/floor/camera are excluded from GLB.
5. Run `npm test`, `npm run build`, and `npm run test:e2e`; review the browser in
   daylight and at night. The room's existing lighting differs from studio lighting.

New mesh or curve objects must have the custom property `asset_id` set to
`west-sofa` to be included in the export. Duplicating an existing sofa object
retains that property. Keep preview objects untagged.

`npm run asset:sofa` builds the asset only if there is no saved master; otherwise
it exports the saved master. To intentionally regenerate from the procedural
source, run `npm run asset:sofa -- --rebuild`. This saves the previous master in
`.cache/blender/` first. Rebuilding replaces hand edits; ordinary exports do not.

Outputs:

- `src/assets/models/west-sofa.glb`: self-contained browser model and PBR textures.
- `src/assets/models/west-sofa.json`: export dimensions, layout, triangle and byte counts.
- `docs/west-sofa-blender.png`: optional studio render, not a replacement for 3D.

Textures are original project-generated artwork. Cream linen uses physically
scaled UVs (one repeat per 25 cm), base colour, roughness, normal and sheen.
Pillows retain the rust/ivory floral direction with newly authored artwork.
Source images are packed into the .blend; exported GLB embeds its images.

The browser reuses the room's established walnut, rust/ivory pattern and piping
materials on the imported geometry so these parts share static rendering batches
with the existing furniture. The new linen PBR material is imported and shared
with the existing south sofa; its procedural UVs remain unchanged. The
studio render uses the Blender materials, so its accent patterns and lighting
differ from the walkthrough. Material-name mappings are in `src/living.js`;
changing those finishes in Blender alone does not change their browser overrides.

## Placement and lighting contract

`src/living-layout.js` remains authoritative: west sofa x=3.10, z=1.85,
rotation=PI/2, floor y=0.003. The loader applies these coordinates; the Blender
file does not embed a second copy of the room placement. Collision geometry and
approved navigation clearances remain exactly the same.

Export rejects dimensions outside a 3 mm tolerance, a shifted floor-centre origin,
or more than 90,000 triangles. Unit tests independently inspect the GLB and enforce
an 8 MiB file budget. Browser tests require the imported model (not its emergency
procedural fallback), verify world-space bounds/rotation, and check balcony access.

Imported materials use the existing blended three-direction lightmap mapping and
day/night atlas switching. The scene awaits the GLB before batching, shadow setup
and reflection capture. No global illumination rebake was needed because the
approved sofa envelopes and light sources did not change. Fine cloth shading uses
the normal maps and existing contact shadows; the room bake still approximates
furniture with envelopes and is not a detailed per-triangle bake of this model.

The `.gitattributes` file keeps bake-input JavaScript in LF form on Windows so a
checkout's line endings do not trigger a needless six-to-eight-minute rebake.

## Local preview and publishing

Review images: [browser daylight](living-sofa-day.png),
[browser night](living-sofa-night.png), and [Blender studio](west-sofa-blender.png).

Run `npm run dev -- --host 127.0.0.1 --port 5174` and open
`http://127.0.0.1:5174/#room=living`. The public GitHub Pages site uses the committed
GLB; it does not need Blender installed and exposes no editing controls.

This change is prepared on `codex/blender-living-sofa`. Deployment still uses the
existing Publish walkthrough workflow; no hosting migration is involved.

On this workstation Windows blocked repository writes under Documents/HOME DESIGN.
The active checkout is currently
`C:/Users/jawad/.codex/visualizations/2026/10/20/01a15ad6-7442-7982-8151-3d5f1685bff4/interiordesign`.
No files in the previous MUSICATEA project are used by this workflow.
