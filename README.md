# Chase's Halloween Heat: Realism Build

This repo is the realism-first companion to the cartoon parody game in `Chases_Parody_GTA_Haunt`.

The goal here is different:

- keep the same Halloween chase premise
- preserve browser playability on GitHub Pages
- move the art pipeline toward a character that can actually resemble Chase
- prepare the project for real 3D assets instead of a single-file low-poly sketch

## What this version is for

This repo is meant to become the higher-end branch:

- more realistic lighting
- more grounded environment materials
- a dedicated `chase.glb` character slot
- cleaner modular code
- easier upgrade path for Blender / Mixamo / custom textures

The current version already includes:

- third-person playable prototype
- realistic-ish browser renderer and lighting
- modular Three.js code
- fallback placeholder character if no real model is present
- mission route markers inspired by the parody build

## Repo layout

- `index.html` boots the realism prototype
- `css/styles.css` handles HUD and overlay styling
- `js/main.js` wires the scene, controls, HUD, and loop
- `js/world.js` creates the environment and mission markers
- `js/character.js` loads `assets/models/chase.glb` if present and falls back to a procedural placeholder
- `assets/models/` is where the realistic Chase model should go
- `docs/PIPELINE.md` explains how to move from photo refs to a real likeness

## Local preview

From this folder:

```powershell
py -3.11 -m http.server 8022
```

Then open:

```text
http://127.0.0.1:8022/
```

## GitHub Pages

This repo is set up for static GitHub Pages hosting via `.github/workflows/static.yml`.

When it is published under a repo named `Chases_Halloween_Heat_Realism`, the expected URL is:

```text
https://dacameragirl.github.io/Chases_Halloween_Heat_Realism/
```

## Current limitation

Without a real model file, the browser build still uses a stylized fallback body. The difference from the parody repo is that this repo is structured to replace that fallback with an actual character asset once you are ready.
