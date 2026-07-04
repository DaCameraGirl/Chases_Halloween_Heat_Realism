# Realism Pipeline

This repo exists because the single-file parody build is not the right place to chase a true likeness.

## Why the parody build tops out early

The cartoon repo uses:

- one HTML file
- procedural primitive meshes
- no real facial topology
- no texture pipeline
- no rigged character asset

That means it can become a better cartoon, but it will not become "looks just like Chase" no matter how many small primitive tweaks are added.

## What this realism build is designed for

This branch is where the likeness work should happen.

Target pipeline:

1. Start from photo refs in `C:\Users\enter\OneDrive\Desktop\chase_pictures`
2. Build or commission a base character in Blender
3. Match:
   - head shape
   - nose width
   - brow shape
   - curls / hairline
   - skin tone
   - hoodie silhouette
4. Rig the character
5. Export to `glTF` / `GLB`
6. Save as `assets/models/chase.glb`
7. Reload the site and let `js/character.js` load the real model

## Practical routes

### Route A: Fastest workable route

- Sculpt or edit a base male character in Blender
- Use Chase photos as image planes or side refs
- Keep textures simple at first
- Export one static `chase.glb`

This is the best route if you want a believable stylized-real result soon.

### Route B: Better realism

- Use a higher-quality base mesh
- Create custom hair cards or sculpted curls
- Bake texture maps
- Add face normals, roughness, and subtle skin variation

This is how you move toward "GTA-ish" fidelity, but it takes longer.

## What to keep from the parody build

Reuse:

- mission flow
- story setup
- neighborhoods / marker ideas
- HUD structure

Do not reuse as the final character method:

- primitive spheres/boxes for the face
- procedural hair blobs
- one-file geometry edits for likeness

## Immediate next milestone

Get a first real `chase.glb` into `assets/models/`.

Once that exists, this repo becomes the right place to keep polishing realism.
