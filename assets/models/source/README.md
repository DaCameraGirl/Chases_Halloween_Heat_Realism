# Blender Source Slot

Use this folder for working files that produce `assets/models/chase.glb`.

Suggested names:

- `chase.blend`
- `chase-hair-tests.blend`
- `chase-hoodie-variants.blend`

The runtime only loads `../chase.glb`. Everything here is source material for export.

## Current Generator

This folder now contains two build paths:

```text
build_chase_blender.py
build_chase_glb.py
```

## Preferred Path

Use Blender first:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' --background --python assets/models/source/build_chase_blender.py
```

That writes:

```text
assets/models/chase.glb
assets/models/source/chase_prototype.blend
```

`build_chase_blender.py` is the real source path now.

## Legacy Bridge

`build_chase_glb.py` is the older non-Blender bridge generator. Keep it only as fallback.
