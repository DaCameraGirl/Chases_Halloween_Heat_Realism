# Chase GLB Pipeline

This repo is now set up so the real Chase model can be iterated without rewriting runtime code every export.

## What The Runtime Handles

`js/character.js` now supports:

- loading `assets/models/chase.glb`
- reading `assets/models/chase.config.json`
- normalizing model height to gameplay scale
- rotating the import into the correct facing direction
- snapping the model's lowest point to ground level
- using an optional named node for bounds calculations
- clamping materials so skin, hoodie, and hair do not render too metallic

That means Blender exports do not need to be perfect on day one.

## Working Loop

1. Build or edit the Chase model in Blender
2. Export `chase.glb`
3. Replace `assets/models/chase.glb`
4. Refresh the site
5. Tune `assets/models/chase.config.json` if the model is:
   - too tall
   - too short
   - facing sideways
   - sinking below the road
   - floating above the road
6. Repeat until the runtime framing feels right

## Blender Setup

Use the photo refs in:

```text
C:\Users\enter\OneDrive\Desktop\chase_pictures
```

Focus first on the high-value likeness traits visible across those photos:

- tall, rounded curls with volume above the crown
- narrow lower face with a defined jaw
- medium-light brown skin tone
- straight nose bridge with a slightly fuller tip
- dark zip hoodie over a dark shirt
- slim build

## Good First Sculpt Target

Start with:

- head likeness
- hair mass and silhouette
- hoodie silhouette
- neck/shoulder proportions

Do not burn time on tiny skin detail before the silhouette reads correctly from gameplay distance.

## GLB Export Rules

From Blender, aim for:

- `glTF 2.0` export
- format: `GLB`
- selected objects only if your scene contains extra helpers
- apply modifiers
- include materials
- include armature if rigged
- avoid cameras/lights unless intentionally needed

## Config Tuning

Example adjustments:

- model too big: lower `targetHeight`
- model too small: raise `targetHeight`
- facing backward: change `rotationDegrees`
- feet under the road: keep `alignFeetToGround: true`
- wrong bounds because of hidden helper mesh: set `boundsNode` to the real body/root node name

## Practical Next Step

The next real milestone is simple:

1. make the first `chase.glb`
2. drop it into `assets/models/`
3. tune `chase.config.json`
4. decide whether the likeness pass should continue in Blender or with a better base mesh
