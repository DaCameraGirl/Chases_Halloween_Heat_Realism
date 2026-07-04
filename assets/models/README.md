# Character Asset Slot

Put the realism-first Chase model here as:

```text
chase.glb
```

Expected format:

- single `GLB` file
- origin near feet
- forward-facing character
- clean materials
- no giant baked scene around the model

If `chase.glb` is present, `js/character.js` will try to load it automatically.

If it is missing, the site falls back to a placeholder character.
