"""Diagnostic render: import chase.glb and render a lit preview PNG.

Run headless:
  blender --background --python render_preview.py -- <output_png_path> [--head]
"""
import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[1]
GLB_PATH = ROOT / "chase.glb"

argv = sys.argv
argv = argv[argv.index("--") + 1:] if "--" in argv else []
OUT_PATH = Path(argv[0]) if argv else ROOT / "source" / "preview.png"
HEAD_ONLY = "--head" in argv


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def main():
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))

    imported = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not imported:
        raise RuntimeError("No mesh imported from GLB")

    # Compute world-space bounding box across all imported meshes
    import mathutils
    min_co = mathutils.Vector((float("inf"),) * 3)
    max_co = mathutils.Vector((float("-inf"),) * 3)
    for obj in imported:
        for corner in obj.bound_box:
            world = obj.matrix_world @ mathutils.Vector(corner)
            min_co.x, min_co.y, min_co.z = min(min_co.x, world.x), min(min_co.y, world.y), min(min_co.z, world.z)
            max_co.x, max_co.y, max_co.z = max(max_co.x, world.x), max(max_co.y, world.y), max(max_co.z, world.z)

    center = (min_co + max_co) / 2
    size = max_co - min_co
    height = size.z if size.z > 0 else 1.0

    if HEAD_ONLY:
        target = mathutils.Vector((center.x, center.y, max_co.z - height * 0.09))
        cam_dist = height * 0.35
    else:
        target = mathutils.Vector((center.x, center.y, center.z))
        cam_dist = height * 1.4

    # Character faces +Y after the build script's authoring-space rotation and
    # glTF Y-up/Z-up round trip, so the camera must sit on the +Y side (in
    # front) looking back toward -Y to see the face, not the back of the head.
    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_obj = bpy.data.objects.new("PreviewCam", cam_data)
    bpy.context.scene.collection.objects.link(cam_obj)
    cam_obj.location = (target.x, target.y + cam_dist, target.z)
    direction = target - cam_obj.location
    cam_obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam_obj

    # Three-point lighting (key/fill on the camera's +Y front side, rim behind).
    # Light positions scale with cam_dist, so light *distance* shrinks for
    # close-up (head-only) framing — without compensation that means much
    # brighter falloff (inverse-square) and a blown-out close-up. Normalize
    # energy against the reference distance-to-height ratio (1.4, tuned for
    # the full-body shot) so both framings read at similar exposure.
    light_scale = (cam_dist / (height * 1.4)) ** 2

    key = bpy.data.lights.new("Key", type="AREA")
    key.energy = 800 * light_scale
    key_obj = bpy.data.objects.new("Key", key)
    key_obj.location = (target.x - cam_dist * 0.6, target.y + cam_dist, target.z + height * 0.4)
    bpy.context.scene.collection.objects.link(key_obj)

    fill = bpy.data.lights.new("Fill", type="AREA")
    fill.energy = 300 * light_scale
    fill_obj = bpy.data.objects.new("Fill", fill)
    fill_obj.location = (target.x + cam_dist * 0.8, target.y + cam_dist * 0.6, target.z + height * 0.2)
    bpy.context.scene.collection.objects.link(fill_obj)

    rim = bpy.data.lights.new("Rim", type="AREA")
    rim.energy = 400 * light_scale
    rim_obj = bpy.data.objects.new("Rim", rim)
    rim_obj.location = (target.x, target.y - cam_dist * 0.8, target.z + height * 0.6)
    bpy.context.scene.collection.objects.link(rim_obj)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(OUT_PATH)
    scene.world = bpy.data.worlds.new("World")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.03, 0.03, 0.04, 1.0)

    bpy.ops.render.render(write_still=True)
    print(f"WROTE {OUT_PATH}")


if __name__ == "__main__":
    main()
