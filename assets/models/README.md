# Character Asset Slot

The playable Chase model lives here as:

```text
chase.glb
```

The loader also reads:

```text
chase.config.json
```

Modeling refs live here too:

```text
reference/
```

That config lets the game correct common Blender export problems without code edits:

- model too small or too large
- feet not sitting on the ground plane
- model facing the wrong direction
- extra scene nodes wrapped around the character
- a different node needing to drive bounds calculations

## Expected Files

```text
assets/models/
  chase.glb
  chase.config.json
```

## Export Rules For `chase.glb`

- single character-focused `GLB`
- no giant environment bundled into the file
- clean materials
- textures embedded or referenced correctly by the export
- forward-facing character in a neutral pose
- feet near world zero if possible

The loader can fix scale and foot alignment, but cleaner exports still make iteration easier.

## `chase.config.json`

The repo ships with a starter config. Edit it after each export instead of hardcoding transforms in `js/character.js`.

Fields:

- `displayName`: HUD label when the real model loads
- `position`: final spawn offset in scene units
- `rotationDegrees`: model orientation after import
- `scale`: base multiplier before height normalization
- `targetHeight`: final gameplay height target
- `alignFeetToGround`: snaps the lowest point of the model to ground level
- `boundsNode`: optional node name used for height/bounds calculations
- `material`: clamps roughness/metalness and mesh shadow flags

## Recommended Working Habit

1. Export a new `chase.glb` from Blender
2. Refresh the site
3. If scale/origin/orientation is off, adjust `chase.config.json`
4. Refresh again
5. Only touch code if the pipeline itself is wrong

## Source Files

If you keep Blender source files in the repo, place them under:

```text
assets/models/source/
```

That keeps the runtime asset separate from the working scene file.

For the first real head pass, use the curated notes in:

```text
../../docs/CHASE_HEAD_MODEL_BRIEF.md
```
