import json
import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
GLB_PATH = ROOT / "chase.glb"
BLEND_PATH = ROOT / "source" / "chase_prototype.blend"
CONFIG_PATH = ROOT / "chase.config.json"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.curves):
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)


def make_material(name, color, roughness=0.8, metallic=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def assign_material(obj, material):
    if obj.data.materials:
        obj.data.materials[0] = material
    else:
        obj.data.materials.append(material)


def smooth_with_subsurf(obj, levels=2, render_levels=2):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth()
    modifier = obj.modifiers.new(name="Subdivision", type="SUBSURF")
    modifier.levels = levels
    modifier.render_levels = render_levels
    obj.select_set(False)


def add_cube(name, location, scale, material, rotation=(0.0, 0.0, 0.0), subsurf=2, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        bevel_mod = obj.modifiers.new(name="Bevel", type="BEVEL")
        bevel_mod.width = bevel
        bevel_mod.segments = 3
    assign_material(obj, material)
    smooth_with_subsurf(obj, subsurf, subsurf)
    return obj


def add_uv_sphere(name, location, scale, material, segments=40, rings=24, subsurf=2):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        location=location
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    smooth_with_subsurf(obj, subsurf, subsurf)
    return obj


def add_cylinder(name, location, radius, depth, material, rotation=(0.0, 0.0, 0.0), vertices=28, subsurf=1):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation
    )
    obj = bpy.context.active_object
    obj.name = name
    assign_material(obj, material)
    smooth_with_subsurf(obj, subsurf, subsurf)
    return obj


def edit_mesh(obj, fn):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(obj.data)
    fn(bm)
    bmesh.update_edit_mesh(obj.data)
    bpy.ops.object.mode_set(mode="OBJECT")


def sculpt_head(obj):
    def transform(bm):
        for vert in bm.verts:
            x, y, z = vert.co.x, vert.co.y, vert.co.z

            if y < -0.16:
                vert.co.x *= 0.88
                vert.co.z += 0.02

            if y < -0.3:
                vert.co.x *= 0.92
                vert.co.z += 0.028

            if -0.05 < y < 0.18 and abs(x) < 0.09 and z > 0.02:
                strength = (0.09 - abs(x)) / 0.09
                vert.co.z += 0.08 * strength

            if 0.02 < y < 0.18 and 0.05 < abs(x) < 0.18 and z > 0.05:
                socket_strength = 1.0 - min(1.0, abs(abs(x) - 0.11) / 0.07)
                vert.co.z -= 0.05 * socket_strength

            if y > 0.22:
                vert.co.z -= 0.02

            if z > 0.16 and abs(x) > 0.14 and -0.08 < y < 0.12:
                vert.co.x *= 0.96

            if -0.25 < y < -0.12 and abs(x) < 0.16 and z > 0.12:
                mouth_strength = 1.0 - min(1.0, abs(y + 0.18) / 0.08)
                vert.co.z -= 0.018 * mouth_strength

    edit_mesh(obj, transform)


def sculpt_torso(obj):
    def transform(bm):
        for vert in bm.verts:
            if vert.co.z > 0 and vert.co.y > -0.15:
                vert.co.x *= 0.96
            if vert.co.y > 0.3:
                vert.co.x *= 1.05
            if vert.co.y < -0.3:
                vert.co.x *= 0.92
                vert.co.z *= 0.92

    edit_mesh(obj, transform)


def join_objects(name, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = name
    return joined


def build_model():
    clear_scene()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"

    materials = {
        "hoodie": make_material("Hoodie", (0.16, 0.2, 0.3), roughness=0.9),
        "hoodie_rib": make_material("HoodieRib", (0.12, 0.15, 0.22), roughness=0.95),
        "zipper": make_material("Zipper", (0.85, 0.86, 0.9), roughness=0.35, metallic=0.2),
        "skin": make_material("Skin", (0.8, 0.65, 0.54), roughness=0.92),
        "skin_warm": make_material("SkinWarm", (0.86, 0.72, 0.6), roughness=0.9),
        "hair": make_material("Hair", (0.3, 0.24, 0.2), roughness=0.97),
        "brow": make_material("Brow", (0.17, 0.12, 0.1), roughness=0.95),
        "eye": make_material("EyeWhite", (0.92, 0.89, 0.85), roughness=0.65),
        "pupil": make_material("Pupil", (0.08, 0.06, 0.05), roughness=1.0),
        "lip": make_material("Lip", (0.58, 0.39, 0.35), roughness=0.88),
        "denim": make_material("Denim", (0.08, 0.1, 0.14), roughness=0.95),
        "shoe": make_material("Shoe", (0.93, 0.94, 0.95), roughness=0.78),
    }

    body = []

    torso = add_cube("Torso", (0.0, 1.63, 0.0), (0.38, 0.6, 0.23), materials["hoodie"], bevel=0.035)
    sculpt_torso(torso)
    body.append(torso)

    rib = add_cube("HoodieRib", (0.0, 0.95, 0.0), (0.32, 0.19, 0.18), materials["hoodie_rib"], bevel=0.02)
    body.append(rib)

    hood = add_uv_sphere("HoodBack", (0.0, 2.21, -0.18), (0.38, 0.32, 0.24), materials["hoodie"], segments=32, rings=20)
    body.append(hood)

    hood_lip = add_cube("HoodLip", (0.0, 2.11, 0.05), (0.24, 0.05, 0.05), materials["hoodie_rib"], bevel=0.015)
    body.append(hood_lip)

    left_arm = add_cylinder("LeftArm", (-0.45, 1.62, 0.0), 0.08, 1.12, materials["hoodie"], rotation=(0.0, 0.0, math.radians(7)))
    right_arm = add_cylinder("RightArm", (0.45, 1.62, 0.0), 0.08, 1.12, materials["hoodie"], rotation=(0.0, 0.0, math.radians(-7)))
    body.extend([left_arm, right_arm])

    left_hand = add_uv_sphere("LeftHand", (-0.52, 1.02, 0.04), (0.05, 0.06, 0.045), materials["skin"], segments=24, rings=16, subsurf=1)
    right_hand = add_uv_sphere("RightHand", (0.52, 1.02, 0.04), (0.05, 0.06, 0.045), materials["skin"], segments=24, rings=16, subsurf=1)
    body.extend([left_hand, right_hand])

    left_leg = add_cylinder("LeftLeg", (-0.13, 0.58, 0.0), 0.09, 1.34, materials["denim"])
    right_leg = add_cylinder("RightLeg", (0.13, 0.58, 0.0), 0.09, 1.34, materials["denim"])
    body.extend([left_leg, right_leg])

    left_shoe = add_cube("LeftShoe", (-0.13, 0.07, 0.1), (0.11, 0.04, 0.16), materials["shoe"], bevel=0.01, subsurf=1)
    right_shoe = add_cube("RightShoe", (0.13, 0.07, 0.1), (0.11, 0.04, 0.16), materials["shoe"], bevel=0.01, subsurf=1)
    body.extend([left_shoe, right_shoe])

    zipper = add_cube("Zipper", (0.0, 1.55, 0.24), (0.015, 0.52, 0.015), materials["zipper"], bevel=0.002, subsurf=0)
    draw_l = add_cylinder("DrawLeft", (-0.075, 1.83, 0.235), 0.01, 0.58, materials["zipper"], rotation=(0.0, 0.0, math.radians(5)), vertices=18, subsurf=0)
    draw_r = add_cylinder("DrawRight", (0.075, 1.83, 0.235), 0.01, 0.58, materials["zipper"], rotation=(0.0, 0.0, math.radians(-5)), vertices=18, subsurf=0)
    body.extend([zipper, draw_l, draw_r])

    neck = add_cylinder("Neck", (0.0, 2.25, 0.0), 0.086, 0.18, materials["skin"], vertices=22)
    body.append(neck)

    head = add_uv_sphere("Head", (0.0, 2.63, 0.0), (0.31, 0.41, 0.34), materials["skin"], segments=48, rings=30)
    sculpt_head(head)
    body.append(head)

    face_plane = add_cube("FacePlane", (0.0, 2.55, 0.185), (0.12, 0.18, 0.06), materials["skin_warm"], bevel=0.02, subsurf=1)
    jaw = add_cube("Jaw", (0.0, 2.375, 0.1), (0.11, 0.08, 0.08), materials["skin"], rotation=(math.radians(-10), 0.0, 0.0), bevel=0.015, subsurf=1)
    chin = add_cube("Chin", (0.0, 2.305, 0.12), (0.055, 0.035, 0.05), materials["skin"], rotation=(math.radians(-14), 0.0, 0.0), bevel=0.012, subsurf=1)
    cheek_l = add_uv_sphere("CheekLeft", (-0.145, 2.5, 0.145), (0.09, 0.06, 0.05), materials["skin"], segments=24, rings=16, subsurf=1)
    cheek_r = add_uv_sphere("CheekRight", (0.145, 2.5, 0.145), (0.09, 0.06, 0.05), materials["skin"], segments=24, rings=16, subsurf=1)
    cheekbone_l = add_uv_sphere("CheekboneLeft", (-0.145, 2.57, 0.19), (0.07, 0.04, 0.045), materials["skin_warm"], segments=24, rings=16, subsurf=1)
    cheekbone_r = add_uv_sphere("CheekboneRight", (0.145, 2.57, 0.19), (0.07, 0.04, 0.045), materials["skin_warm"], segments=24, rings=16, subsurf=1)
    body.extend([face_plane, jaw, chin, cheek_l, cheek_r, cheekbone_l, cheekbone_r])

    ear_l = add_uv_sphere("EarLeft", (-0.28, 2.59, -0.005), (0.032, 0.05, 0.024), materials["skin"], segments=20, rings=14, subsurf=1)
    ear_r = add_uv_sphere("EarRight", (0.28, 2.59, -0.005), (0.032, 0.05, 0.024), materials["skin"], segments=20, rings=14, subsurf=1)
    body.extend([ear_l, ear_r])

    brow_bridge = add_cube("BrowBridge", (0.0, 2.655, 0.205), (0.06, 0.015, 0.026), materials["skin"], bevel=0.01, subsurf=1)
    brow_l = add_cube("BrowLeft", (-0.09, 2.67, 0.226), (0.06, 0.01, 0.015), materials["brow"], rotation=(0.0, 0.0, math.radians(-7)), bevel=0.005, subsurf=0)
    brow_r = add_cube("BrowRight", (0.09, 2.67, 0.226), (0.06, 0.01, 0.015), materials["brow"], rotation=(0.0, 0.0, math.radians(7)), bevel=0.005, subsurf=0)
    body.extend([brow_bridge, brow_l, brow_r])

    socket_l = add_uv_sphere("SocketLeft", (-0.09, 2.575, 0.205), (0.055, 0.04, 0.025), materials["skin_warm"], segments=24, rings=16, subsurf=1)
    socket_r = add_uv_sphere("SocketRight", (0.09, 2.575, 0.205), (0.055, 0.04, 0.025), materials["skin_warm"], segments=24, rings=16, subsurf=1)
    eye_l = add_uv_sphere("EyeLeft", (-0.09, 2.582, 0.238), (0.038, 0.022, 0.026), materials["eye"], segments=24, rings=16, subsurf=1)
    eye_r = add_uv_sphere("EyeRight", (0.09, 2.582, 0.238), (0.038, 0.022, 0.026), materials["eye"], segments=24, rings=16, subsurf=1)
    pupil_l = add_uv_sphere("PupilLeft", (-0.09, 2.582, 0.263), (0.014, 0.014, 0.008), materials["pupil"], segments=16, rings=12, subsurf=0)
    pupil_r = add_uv_sphere("PupilRight", (0.09, 2.582, 0.263), (0.014, 0.014, 0.008), materials["pupil"], segments=16, rings=12, subsurf=0)
    lid_u_l = add_cube("LidUpperLeft", (-0.09, 2.603, 0.243), (0.04, 0.01, 0.015), materials["skin_warm"], rotation=(0.0, 0.0, math.radians(-4)), bevel=0.005, subsurf=0)
    lid_u_r = add_cube("LidUpperRight", (0.09, 2.603, 0.243), (0.04, 0.01, 0.015), materials["skin_warm"], rotation=(0.0, 0.0, math.radians(4)), bevel=0.005, subsurf=0)
    lid_l_l = add_cube("LidLowerLeft", (-0.09, 2.553, 0.238), (0.036, 0.006, 0.012), materials["skin"], bevel=0.004, subsurf=0)
    lid_l_r = add_cube("LidLowerRight", (0.09, 2.553, 0.238), (0.036, 0.006, 0.012), materials["skin"], bevel=0.004, subsurf=0)
    body.extend([socket_l, socket_r, eye_l, eye_r, pupil_l, pupil_r, lid_u_l, lid_u_r, lid_l_l, lid_l_r])

    nose_bridge = add_cube("NoseBridge", (0.0, 2.54, 0.225), (0.025, 0.07, 0.022), materials["skin"], bevel=0.006, subsurf=1)
    nose_tip = add_uv_sphere("NoseTip", (0.0, 2.47, 0.255), (0.05, 0.032, 0.04), materials["skin_warm"], segments=22, rings=14, subsurf=1)
    wing_l = add_uv_sphere("NoseWingLeft", (-0.04, 2.47, 0.244), (0.022, 0.016, 0.018), materials["skin_warm"], segments=18, rings=12, subsurf=1)
    wing_r = add_uv_sphere("NoseWingRight", (0.04, 2.47, 0.244), (0.022, 0.016, 0.018), materials["skin_warm"], segments=18, rings=12, subsurf=1)
    nostril_l = add_uv_sphere("NostrilLeft", (-0.022, 2.448, 0.268), (0.006, 0.004, 0.006), materials["pupil"], segments=12, rings=8, subsurf=0)
    nostril_r = add_uv_sphere("NostrilRight", (0.022, 2.448, 0.268), (0.006, 0.004, 0.006), materials["pupil"], segments=12, rings=8, subsurf=0)
    philtrum = add_cube("Philtrum", (0.0, 2.421, 0.238), (0.016, 0.022, 0.012), materials["skin"], bevel=0.004, subsurf=0)
    body.extend([nose_bridge, nose_tip, wing_l, wing_r, nostril_l, nostril_r, philtrum])

    lip_u_l = add_cube("UpperLipLeft", (-0.03, 2.392, 0.247), (0.03, 0.008, 0.016), materials["lip"], rotation=(0.0, 0.0, math.radians(-7)), bevel=0.004, subsurf=0)
    lip_u_r = add_cube("UpperLipRight", (0.03, 2.392, 0.247), (0.03, 0.008, 0.016), materials["lip"], rotation=(0.0, 0.0, math.radians(7)), bevel=0.004, subsurf=0)
    cupid = add_cube("CupidBow", (0.0, 2.398, 0.248), (0.012, 0.006, 0.013), materials["lip"], bevel=0.003, subsurf=0)
    lip_lower = add_uv_sphere("LowerLip", (0.0, 2.364, 0.243), (0.055, 0.018, 0.022), materials["lip"], segments=18, rings=12, subsurf=1)
    mouth_line = add_cube("MouthLine", (0.0, 2.383, 0.259), (0.05, 0.003, 0.005), materials["pupil"], bevel=0.001, subsurf=0)
    corner_l = add_uv_sphere("MouthCornerLeft", (-0.045, 2.382, 0.249), (0.006, 0.006, 0.004), materials["lip"], segments=12, rings=8, subsurf=0)
    corner_r = add_uv_sphere("MouthCornerRight", (0.045, 2.382, 0.249), (0.006, 0.006, 0.004), materials["lip"], segments=12, rings=8, subsurf=0)
    stache = add_cube("Mustache", (0.0, 2.413, 0.254), (0.036, 0.006, 0.008), materials["brow"], bevel=0.002, subsurf=0)
    soul = add_cube("SoulPatch", (0.0, 2.332, 0.19), (0.016, 0.014, 0.008), materials["brow"], bevel=0.002, subsurf=0)
    body.extend([lip_u_l, lip_u_r, cupid, lip_lower, mouth_line, corner_l, corner_r, stache, soul])

    hair_parts = []
    hair_core = add_uv_sphere("HairCore", (0.0, 2.9, -0.01), (0.31, 0.27, 0.22), materials["hair"], segments=30, rings=20)
    hair_parts.append(hair_core)
    curls = [
        (0.0, 3.17, 0.04, 0.1),
        (-0.13, 3.11, 0.08, 0.095),
        (0.13, 3.1, 0.08, 0.095),
        (-0.26, 3.02, 0.04, 0.092),
        (0.26, 3.02, 0.04, 0.092),
        (-0.3, 2.9, -0.01, 0.088),
        (0.3, 2.9, -0.01, 0.088),
        (-0.19, 2.87, 0.14, 0.082),
        (0.19, 2.87, 0.14, 0.082),
        (-0.08, 2.96, 0.18, 0.078),
        (0.08, 2.96, 0.18, 0.078),
        (-0.23, 2.75, 0.17, 0.076),
        (0.23, 2.75, 0.17, 0.076),
        (0.0, 2.77, 0.19, 0.072),
        (-0.13, 2.82, 0.2, 0.062),
        (0.13, 2.82, 0.2, 0.062),
    ]
    for index, (x, y, z, radius) in enumerate(curls):
        curl = add_uv_sphere(f"Curl{index:02d}", (x, y, z), (radius, radius, radius), materials["hair"], segments=20, rings=14, subsurf=1)
        hair_parts.append(curl)
    body.extend(hair_parts)

    joined = join_objects("ChasePrototype", body)

    bpy.ops.object.select_all(action="DESELECT")
    joined.select_set(True)
    bpy.context.view_layer.objects.active = joined

    # The scripted proportions were authored in Y-up game space.
    # Rotate into Blender's Z-up space before saving/exporting.
    joined.rotation_euler = (math.radians(90), 0.0, math.radians(180))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    bpy.context.view_layer.update()
    min_z = min((joined.matrix_world @ Vector(corner)).z for corner in joined.bound_box)
    joined.location.z -= min_z
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)

    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
    )

    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    config["displayName"] = "Blender Chase Prototype"
    config["rotationDegrees"] = [0, 180, 0]
    CONFIG_PATH.write_text(json.dumps(config, indent=2), encoding="utf-8")


if __name__ == "__main__":
    build_model()
