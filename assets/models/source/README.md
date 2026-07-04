# Blender Source Slot

Use this folder for working files that produce `assets/models/chase.glb`.

Suggested names:

- `chase.blend`
- `chase-hair-tests.blend`
- `chase-hoodie-variants.blend`

The runtime only loads `../chase.glb`. Everything here is source material for export.

## Current Generator

This folder also contains a script-generated first-pass asset builder:

```text
build_chase_glb.py
```

Run it from the repo root with:

```powershell
python assets/models/source/build_chase_glb.py
```

That writes:

```text
assets/models/chase.glb
```

Use it as a temporary bridge until a true Blender-modeled Chase replaces it.
