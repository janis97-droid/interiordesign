# Kitchen layout and dimension check

This L-shaped walnut kitchen uses the original **`koma-b.pdf` already supplied in this session**. The request calls it `koma-b(1).pdf`; a separately revised file with that name was not available, and no revision is assumed. The annotated viewpoint looks into the northeast **Kitchen & dining** area, even though the screenshot's camera-position label says “Living room.”

## Architectural source and approved correction

The PDF explicitly labels the kitchen's main width **5.80 m**. Its approximately **4.40 m depth** is derived from calibrated vector geometry, not the perspective screenshot. The **4.20 m** printed dimension belongs to the western living area.

The owner approved correcting the kitchen's previously simplified eastern wall to show the photographed **recessed sink bay with two narrow windows**. The recess depth, length, opening widths and central pier follow the original PDF. The **1.20 m sill and 2.30 m head are provisional photo estimates authorized by the owner**, not measurements stated in the PDF.

| Boundary or dimension | Original PDF | Implemented model |
| --- | --- | --- |
| Main kitchen width | **5.80 m**, printed dimension | Existing **5.901 m** clear trace retained |
| North reveal to south wall | **Approximately 4.40 m**, calibrated from vectors | Existing **4.318 m** clear trace retained |
| Full southern wall, including bay | Approximately **4.499 m** | Approximately **4.448 m** usable |
| Eastern sink-bay depth | **64.94 cm**, derived | **64.94 cm** |
| Sink-bay clear length | **210.19 cm**, derived | **210.19 cm** |
| Northern narrow opening | **70.89 cm** wide, derived | **70.89 cm** wide |
| Central solid pier | **34.21 cm**, derived | **34.21 cm** |
| Southern narrow opening | **65.68 cm** wide, derived | **65.68 cm** wide |
| Narrow-window elevations | Not given in the floor plan | **120 cm sill / 230 cm head**, provisional |

Furniture uses a conservative **5.80 × 4.318 m main-room envelope**, plus the bay only within its measured return. It does not depend on the main trace's additional 10 cm of width. The local correction changes the kitchen east wall, its two bay returns, the connecting exterior segment and the kitchen floor/roof footprint. All other rooms, walls, doors and openings are preserved, including the adjacent larger low eastern window. The black frames, **100 × 100 cm floor tiles**, floor/ceiling elevations, stairs and corridor ceiling remain as before.

For reproducibility, the PDF's kitchen inside west/east faces are at **x = 487.08 / 767.88 points**. Their 280.80-point separation corresponds to the printed 580 cm dimension, giving **48.413793 points per metre**. The north reveal at **y = 281.16** and south wall at **y = 494.16** give **4.39957 m** depth. The bay's inside back face is **x = 799.32**, and its north/south inside faces are **y = 392.40 / 494.16**. Narrow openings are **y = 403.08–437.40** and **453.96–485.76**, separated by the central pier. These are drawing measurements, not a site survey or window-height schedule.

## Arrangement

The **sink return sits inside the 65 cm recess**, below the two narrow windows. The adjoining southern/right-hand run contains the pantry, drawers and blind corner, with carved walnut fronts, warm beige stone and warm undershelf lighting. The larger adjacent low window remains clear. A **90 cm counter is 30 cm below the provisional 120 cm bay sills**; no tall storage or shelf covers a window. The sink and matte-black mixer are centred beneath the solid pier between the narrow windows.

The island's **2.10 m long axis runs east–west**, parallel to the southern working run. A 2.10 m north–south island would not leave 90 cm at both ends between the north wall and 60 cm-deep southern cabinetry. This orientation keeps the requested island length and a **110 cm working aisle**, with three stools along its northern side.

## Actual furniture dimensions

Dimensions are the nominal geometry in [`src/kitchen-layout.js`](../src/kitchen-layout.js) and [`src/kitchen-furniture.js`](../src/kitchen-furniture.js). Heights are relative to the finished floor; trims, bevels and sink rims are modeled separately.

| Element | Dimensions and placement |
| --- | --- |
| Southern installation, including pantry and corner | **437.37 cm long × 60 cm deep** |
| Tall pantry | **60 × 60 × 230 cm**; 50 cm below the existing assumed 280 cm main ceiling |
| Southern lower run after pantry | **60 cm drawers + 80 cm drawers + 80 cm drawers + 157.37 cm blind corner** |
| Southern lower countertop span | **377.37 cm long × 60 cm deep**, **90 cm** finished working height |
| Eastern return, including shared corner | **200 cm long × 60 cm deep**; **80 cm sink base + 60 cm cupboard** beyond the corner |
| Blind-corner access | **90 cm** accessible frontage with two approximately **44.3 cm** door leaves; remaining frontage is fixed |
| Stone countertop | **2.5 cm thick**, warm beige limestone appearance |
| Integrated sink | **75 × 46 cm**, bowl approximately **18.5 cm deep**, matte-black arched mixer |
| Wall drawer banks | **60, 80 and 80 cm nominal module widths**; three drawers per bank, including deeper lower compartments |
| Island | **210 × 95 × 90 cm**; **28 cm** northern seating overhang |
| Island storage | Three approximately **66.7 cm-wide** banks facing the working aisle; two drawers per bank |
| Stools | Three **42 × 42 cm** stools, **65 cm** seat height; centres **70 cm** apart |
| Open walnut shelves | Two **220 × 26 cm** shelves centred at **146 and 186 cm** height, with warm undershelf LEDs |
| Island lighting | Three lanterns centred **70 cm** apart; lowest points **186 cm** above the floor, or **96 cm** above the island |

Both wall runs have a **1 cm rear gap**. The return starts **9.19 cm** from the bay's northern inside face. The pantry and shelves sit entirely before the solid southern wall. The corridor's lowered ceiling ends west of the installation, so the pantry remains beneath the main ceiling. The shared corner is counted in each leg's length, not twice in the physical footprint.

## Circulation

| Route | Clear distance |
| --- | ---: |
| Island to southern working counter, drawers closed | **110.0 cm** |
| Island's eastern end to recessed sink/cupboard fronts | **164.0 cm** |
| Eastern island end to the main wall, where that wall remains | **160.0 cm minimum** |
| Western island end to conservative 5.80 m envelope boundary | **210.0 cm** |
| Northern island edge to northern wall, without stools | **165.8 cm** |
| Behind stools using a centred **55 cm occupied-depth allowance** | **130.3 cm** |

The occupied-stool allowance is larger than the 42 cm furniture footprint. It is a planning allowance, not a measured occupant or a claim about every pulled-out seating position. With the modeled stools alone, clearance behind their rear edges is approximately **136.8 cm**.

The **110 cm working aisle is the closed, unobstructed dimension**. Wall drawers have **42.5 cm** maximum modeled travel and island drawers **43 cm**. An open drawer therefore leaves at least approximately **67 cm** of the nominated aisle before accounting for recessed fronts; this is not a second unobstructed 90 cm route. The layout also records a conservative **55 cm drawer-extension planning allowance**, leaving **55 cm**. That allowance is not the actual modeled travel.

Two opposing drawers do not leave space for a person between them when both are fully extended: conservatively subtracting their actual travels from the 110 cm aisle leaves approximately **24.5 cm**. Open one opposing bank at a time. Drawer geometry includes storage boxes and opening travel for design checks; public visitors retain view-only walkthrough controls.

## Coordinate check

Coordinates are metres in the model's `x/z` floor plane:

| Footprint | X extent | Z extent |
| --- | --- | --- |
| Southern installation, including corner | **10.800–15.17369** | **4.26884–4.86884** |
| Eastern sink/cupboard return beyond corner | **14.57369–15.17369** | **2.86884–4.26884** |
| Island countertop | **10.834–12.934** | **2.21884–3.16884** |
| Conservative main-room envelope | **8.73429–14.53429** | **0.56080–4.87884** |
| Added bay's clear floor envelope | **14.53429–15.18369** | **2.77696–4.87884** |

The arrangement fits the PDF's dimensioned main width and derived available depth, using the more restrictive existing-model depth. The return fits inside the PDF-derived bay. Its working aisle, end routes and occupied seating allowance meet the requested circulation targets with drawers closed. Exact site sill heights, installation tolerances and service positions still need measurements before construction; provisional photo elevations and the preserved main-room trace are not represented as an exact measured survey.
