# Koma — a home to explore

A view-only Three.js walkthrough reconstructed from `koma-b.pdf`. Visitors can walk, look around, jump between nine rooms, and orbit a cutaway overview. The current model is an empty architectural shell, ready to design from the real home. All design changes are maintained in the repository; there are no visitor editing controls or accounts.

![The home in the 3D overview](docs/overview.png)

![Inside the living room](docs/living-room.png)

Photo-matched details: [large bathroom](docs/large-bathroom.png) · [parents’ bathroom](docs/parents-bathroom.png) · [balcony doorway](docs/balcony-door.png) · [small toilet](docs/small-toilet.png).

Owner-corrected layout: [relocated guest-room entrance](docs/guest-entry.png).

## Run

Requires Node.js 24 and npm. In the repository directory:

```sh
npm ci
npm run dev
```

Build with `npm run build`; serve the result with `npm run preview`. All geometry is generated locally: the published site has no CDN, font, analytics, login, or API dependency.

## Controls

- **Overview:** drag to orbit, scroll/pinch to zoom, right-drag/two-finger drag to pan.
- **Walk:** WASD or arrow keys to move; drag the view to look. Shift walks faster.
- **Phone/tablet:** drag the joystick to move; drag the scene to look. Open **Rooms** for shortcuts.
- **Escape:** return to overview. Reset returns to the current room's starting view.
- Share `#room=living`, `#room=bedroom`, etc. for a particular room.

## Model and assumptions

`src/plan.js` contains the traced footprint, walls, openings, room destinations, and collision geometry. The 1,530 cm overall plan dimension calibrates the reference image to metres. `src/world.js` builds the empty architectural shell with photo-referenced surfaces and daylight. Static geometry is batched for mobile performance. `src/rendering.js` adds daylight environment lighting and contact shadows; each bathroom has a cached reflection capture of its actual 3D walls and windows. Rendering pauses while the view is still, and contact shadows use reduced resolution.

- The ceiling height is assumed to be **2.80 m**, eye height **1.62 m**.
- Window sill/head heights and some openings are inferred. Verify them on site; photo-matched framing is applied to the living room, dining window corner, balcony slider, and small WC.
- The guest-room entrance follows the owner's marked hallway screenshot: the old opening in the east wall is closed, and the doorway moves left around the corner to the south wall. Its existing approximate **0.81 m width × 2.18 m height** is preserved; the exact position and dimensions still need site measurements.
- The owner confirmed the living/kitchen divider's outlined extension was never built. The model retains the solid section shown on the plan (approximately 2.65 m long); its exact length still needs a site measurement.
- All added furniture, cabinetry, appliances, bathroom fittings, wall decor, plants, rugs, and light fixtures have been removed at the owner’s request. The orange-X unit shown beside the kitchen/living divider in the plan is intentionally absent.
- Owner photos confirm white walls, black aluminium frames, shutter covers, and **1 × 1 m** grey concrete-look floor tiles. A four-metre procedural texture atlas preserves the exact one-metre grout spacing; colours and texture are approximate. Floor continuity into unphotographed rooms remains provisional.
- The balcony slider is **approximately 1.60 m frame to frame**, estimated from the tiles/photo proportions. It is shown half open; collision blocks the stacked glass leaves and leaves the other half walkable.
- The separate small WC opposite the stairs is restored from the plan, with white horizontal-wave wall tiles and a charcoal window wall from the supplied photo. Window dimensions and wave-tile panel sizes are estimates. The larger bathroom remains unfitted.
- Both the large bathroom and parents’ bathroom use the same dark marble-look porcelain, confirmed by the owner. The albedo texture in `src/assets/dark-marble.png` is generated from the supplied reference, not an exact scan of the installed tiles. Walls are polished and floors less glossy. The **60 × 60 cm bathroom tile grid is provisional**; the living-area one-metre dimension is not assumed for these tiles.
- The exterior is a neutral sky gradient; the surrounding buildings have not been reconstructed.
- Stairs are a visual placeholder. Walking stays on the supplied floor.
- The “area = 16.0” annotation is not used as an area measurement because its context is unclear.
- This is an approximate visualisation, not a construction drawing or a measured survey.
- The original PDF and personal photos/videos are not bundled into the public build; only the generated material texture is published.

## Check

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

If using an existing system Chromium: `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`.
The browser tests exercise the production build under `/interiordesign/`, all room destinations, continuous walking routes, desktop look/movement, mobile touch navigation, and direct room links. Test screenshots are saved under `test-results/`.

## Publish

The GitHub Actions workflow builds, tests, and deploys pushes to `main` with GitHub Pages. In **Repository Settings → Pages**, set **Source → GitHub Actions** once. This requires Pages to be available for the repository's visibility/account plan.

Expected address after successful deployment: `https://janis97-droid.github.io/interiordesign/`.

If Pages needs to be enabled by an authenticated administrator:

```sh
gh api --method POST repos/janis97-droid/interiordesign/pages -f build_type=workflow
```

This creates a Pages site; for an existing site, inspect it first and update its build type if needed. A pushed commit or saved environment draft alone does not mean the site is live.

## Further design work

Use the existing checkout (cloud tasks are already isolated; no additional worktree is necessary). Change room geometry in `src/plan.js`, then update the shell or add owner-requested furnishings in `src/world.js`. Keep visitor controls view-only. Re-run the navigation tests when moving walls, openings, room destinations, or furniture.

For each room, match the existing shell and finishes from photos first, review the walkthrough together, then add agreed fittings and furniture. Keep photo-confirmed facts separate from estimates in this document.
