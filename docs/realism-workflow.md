# Matching the real home more closely

Research checked 11 October 2026. The recommended next authoring workflow is **Blender + fSpy**, retaining this Three.js website for the public walkthrough.

| Tool | Role in this project | Practical limit |
| --- | --- | --- |
| Blender with Cycles | Build detailed, editable room geometry; tune physically based materials and lighting; render reference views; prepare textures and GLB assets for the website. | A Cycles still render does not transfer unchanged into a real-time web viewer. Geometry/material export and baked lighting need deliberate integration. |
| fSpy and its Blender importer | Estimate a photograph's camera, then import that camera and reference image into Blender. Compare a modeled room against the same viewpoint. | Camera matching does not automatically reconstruct the room or establish dimensions without a known scale. |
| Meshroom / AliceVision | Reconstruct geometry and camera positions from overlapping photographs; useful as an additional survey reference when fuller captures are available. | Requires suitable overlapping captures. Bare white walls, glass and polished tiles make reconstruction harder; the existing few room snapshots do not establish complete coverage. |

## Recommended sequence

1. Calibrate one living-room photo using the wall/window edges and the confirmed 1 m floor grid. Preserve the owner-corrected divider and doorway layout.
2. Rebuild and compare the room from that camera before adding more furnishings. Confirm ceiling height, wall lengths and window/door sizes with measurements.
3. Use clear, evenly lit tile close-ups or the actual manufacturer's tile maps to reproduce the floor and both bathroom finishes. Match tile scale, grout, colour and surface roughness separately; the current textures remain approximations.
4. Match daylight direction, exposure, frames, wall thickness and edge details against the reference. Produce a Cycles reference render for comparison.
5. Export optimized geometry and PBR textures through Blender's glTF/GLB exporter. Bake indirect lighting for the website's lightmap pipeline, retain collision and room navigation, then test on a phone.
6. Repeat room by room. Keep original private photos out of the public build.

No tool can guarantee an exact reconstruction of unseen surfaces or exact material colour/lighting from these photos alone. Camera calibration, measurements and material references address different sources of error.

## Verified here

- Blender **4.3.2** is installed and callable directly. A small background CPU Cycles render and GLB export both succeeded.
- This Blender build has no OpenImageDenoise support. The capability check rendered with denoising disabled; a production render would need enough samples or a supported denoiser/build.
- fSpy's official importer supports camera and background-image import. It has been researched, but no fSpy calibration or importer installation has been performed in this update.
- Meshroom has been researched, not installed or tested here.
- Product websites were blocked by this environment's network policy, so the research used the projects' official GitHub documentation and a local Blender capability check.

## Sources

- [fSpy: still-image camera matching](https://github.com/stuffmatic/fSpy)
- [Official fSpy Blender importer](https://github.com/stuffmatic/fSpy-Blender)
- [Official Khronos Blender glTF importer/exporter](https://github.com/KhronosGroup/glTF-Blender-IO)
- [Meshroom / AliceVision: multi-view 3D reconstruction](https://github.com/alicevision/Meshroom)
