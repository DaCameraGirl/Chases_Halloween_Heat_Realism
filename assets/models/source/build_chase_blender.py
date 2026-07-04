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
                vert.co.x *= 0.84
                vert.co.z += 0.03

            if y < -0.3:
                vert.co.x *= 0.9
                vert.co.z += 0.038

            if y > 0.18:
                vert.co.x *= 0.95
                vert.co.z -= 0.02

            if -0.05 < y < 0.18 and abs(x) < 0.09 and z > 0.02:
                strength = (0.09 - abs(x)) / 0.09
                vert.co.z += 0.11 * strength

            if 0.02 < y < 0.18 and 0.05 < abs(x) < 0.18 and z > 0.05:
                socket_strength = 1.0 - min(1.0, abs(abs(x) - 0.11) / 0.07)
                vert.co.z -= 0.075 * socket_strength

            if y > 0.22:
                vert.co.z -= 0.03

            if z > 0.16 and abs(x) > 0.14 and -0.08 < y < 0.12:
                vert.co.x *= 0.96

            if -0.04 < y < 0.12 and abs(x) < 0.18 and z > 0.08:
                brow_strength = 1.0 - min(1.0, abs(y - 0.03) / 0.09)
                vert.co.z += 0.03 * brow_strength

            if -0.25 < y < -0.12 and abs(x) < 0.16 and z > 0.12:
                mouth_strength = 1.0 - min(1.0, abs(y + 0.18) / 0.08)
                vert.co.z -= 0.026 * mouth_strength

            if -0.12 < y < 0.05 and abs(x) > 0.16 and z > 0.04:
                vert.co.x *= 0.97

            if z < -0.08 and y > 0.02:
                vert.co.z -= 0.015

    edit_mesh(obj, transform)


def sculpt_torso(obj):
    def transform(bm):
        for vert in bm.verts:
            if vert.co.y > 0.28:
                vert.co.x *= 1.08
                vert.co.z *= 0.96
            if -0.1 < vert.co.y < 0.24 and vert.co.z > 0:
                vert.co.x *= 0.95
            if vert.co.y < -0.18:
                vert.co.x *= 0.9
                vert.co.z *= 0.9
            if vert.co.y < -0.32:
                vert.co.z *= 0.86

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
        "hoodie": make_material("Hoodie", (0.1, 0.12, 0.16), roughness=0.9),
        "hoodie_rib": make_material("HoodieRib", (0.07, 0.08, 0.11), roughness=0.95),
        "zipper": make_material("Zipper", (0.85, 0.86, 0.9), roughness=0.35, metallic=0.2),
        "skin": make_material("Skin", (0.76, 0.63, 0.54), roughness=0.92),
        "skin_warm": make_material("SkinWarm", (0.84, 0.7, 0.61), roughness=0.9),
        "hair": make_material("Hair", (0.2, 0.15, 0.13), roughness=0.97),
        "brow": make_material("Brow", (0.1, 0.07, 0.06), roughness=0.95),
        "eye": make_material("EyeWhite", (0.92, 0.89, 0.85), roughness=0.65),
        "pupil": make_material("Pupil", (0.08, 0.06, 0.05), roughness=1.0),
        "lip": make_material("Lip", (0.54, 0.34, 0.31), roughness=0.88),
        "denim": make_material("Denim", (0.06, 0.07, 0.1), roughness=0.95),
        "shoe": make_material("Shoe", (0.93, 0.94, 0.95), roughness=0.78),
    }

    body = []

    torso = add_cube("Torso", (0.0, 1.62, 0.0), (0.34, 0.56, 0.2), materials["hoodie"], bevel=0.03)
    sculpt_torso(torso)
    body.append(torso)

    shoulder_l = add_cube("ShoulderLeft", (-0.21, 1.98, 0.0), (0.13, 0.11, 0.14), materials["hoodie"], rotation=(0.0, 0.0, math.radians(-14)), bevel=0.02, subsurf=1)
    shoulder_r = add_cube("ShoulderRight", (0.21, 1.98, 0.0), (0.13, 0.11, 0.14), materials["hoodie"], rotation=(0.0, 0.0, math.radians(14)), bevel=0.02, subsurf=1)
    rib = add_cube("HoodieRib", (0.0, 0.97, 0.0), (0.29, 0.16, 0.16), materials["hoodie_rib"], bevel=0.018)
    body.extend([shoulder_l, shoulder_r, rib])

    hood = add_uv_sphere("HoodBack", (0.0, 2.2, -0.19), (0.36, 0.31, 0.23), materials["hoodie"], segments=32, rings=20)
    body.append(hood)

    hood_lip = add_cube("HoodLip", (0.0, 2.11, 0.05), (0.23, 0.045, 0.05), materials["hoodie_rib"], bevel=0.015)
    collar_l = add_cube("CollarLeft", (-0.09, 2.06, 0.1), (0.06, 0.12, 0.03), materials["hoodie_rib"], rotation=(math.radians(8), 0.0, math.radians(-18)), bevel=0.01, subsurf=1)
    collar_r = add_cube("CollarRight", (0.09, 2.06, 0.1), (0.06, 0.12, 0.03), materials["hoodie_rib"], rotation=(math.radians(8), 0.0, math.radians(18)), bevel=0.01, subsurf=1)
    body.extend([hood_lip, collar_l, collar_r])

    left_arm = add_cylinder("LeftArm", (-0.41, 1.58, 0.0), 0.068, 1.08, materials["hoodie"], rotation=(0.0, 0.0, math.radians(6)))
    right_arm = add_cylinder("RightArm", (0.41, 1.58, 0.0), 0.068, 1.08, materials["hoodie"], rotation=(0.0, 0.0, math.radians(-6)))
    body.extend([left_arm, right_arm])

    left_hand = add_uv_sphere("LeftHand", (-0.47, 1.03, 0.03), (0.045, 0.055, 0.04), materials["skin"], segments=24, rings=16, subsurf=1)
    right_hand = add_uv_sphere("RightHand", (0.47, 1.03, 0.03), (0.045, 0.055, 0.04), materials["skin"], segments=24, rings=16, subsurf=1)
    body.extend([left_hand, right_hand])

    left_leg = add_cylinder("LeftLeg", (-0.12, 0.6, 0.0), 0.08, 1.36, materials["denim"])
    right_leg = add_cylinder("RightLeg", (0.12, 0.6, 0.0), 0.08, 1.36, materials["denim"])
    body.extend([left_leg, right_leg])

    left_shoe = add_cube("LeftShoe", (-0.13, 0.07, 0.1), (0.11, 0.04, 0.16), materials["shoe"], bevel=0.01, subsurf=1)
    right_shoe = add_cube("RightShoe", (0.13, 0.07, 0.1), (0.11, 0.04, 0.16), materials["shoe"], bevel=0.01, subsurf=1)
    body.extend([left_shoe, right_shoe])

    zipper = add_cube("Zipper", (0.0, 1.55, 0.24), (0.015, 0.52, 0.015), materials["zipper"], bevel=0.002, subsurf=0)
    draw_l = add_cylinder("DrawLeft", (-0.075, 1.83, 0.235), 0.01, 0.58, materials["zipper"], rotation=(0.0, 0.0, math.radians(5)), vertices=18, subsurf=0)
    draw_r = add_cylinder("DrawRight", (0.075, 1.83, 0.235), 0.01, 0.58, materials["zipper"], rotation=(0.0, 0.0, math.radians(-5)), vertices=18, subsurf=0)
    body.extend([zipper, draw_l, draw_r])

    neck = add_cylinder("Neck", (0.0, 2.22, 0.0), 0.082, 0.18, materials["skin"], vertices=22)
    body.append(neck)

    head = add_uv_sphere("Head", (0.0, 2.61, 0.0), (0.285, 0.375, 0.305), materials["skin"], segments=48, rings=30)
    sculpt_head(head)
    body.append(head)

    forehead = add_cube("Forehead", (0.0, 2.76, 0.105), (0.12, 0.08, 0.035), materials["skin"], bevel=0.015, subsurf=1)
    face_plane = add_cube("FacePlane", (0.0, 2.54, 0.17), (0.11, 0.16, 0.055), materials["skin_warm"], bevel=0.02, subsurf=1)
    jaw = add_cube("Jaw", (0.0, 2.38, 0.095), (0.12, 0.085, 0.075), materials["skin"], rotation=(math.radians(-10), 0.0, 0.0), bevel=0.015, subsurf=1)
    chin = add_cube("Chin", (0.0, 2.305, 0.12), (0.06, 0.04, 0.05), materials["skin"], rotation=(math.radians(-14), 0.0, 0.0), bevel=0.012, subsurf=1)
    cheek_l = add_uv_sphere("CheekLeft", (-0.135, 2.5, 0.135), (0.085, 0.055, 0.05), materials["skin"], segments=24, rings=16, subsurf=1)
    cheek_r = add_uv_sphere("CheekRight", (0.135, 2.5, 0.135), (0.085, 0.055, 0.05), materials["skin"], segments=24, rings=16, subsurf=1)
    cheekbone_l = add_uv_sphere("CheekboneLeft", (-0.145, 2.58, 0.18), (0.07, 0.04, 0.04), materials["skin_warm"], segments=24, rings=16, subsurf=1)
    cheekbone_r = add_uv_sphere("CheekboneRight", (0.145, 2.58, 0.18), (0.07, 0.04, 0.04), materials["skin_warm"], segments=24, rings=16, subsurf=1)
    temple_l = add_uv_sphere("TempleLeft", (-0.19, 2.66, 0.09), (0.045, 0.075, 0.04), materials["skin"], segments=22, rings=14, subsurf=1)
    temple_r = add_uv_sphere("TempleRight", (0.19, 2.66, 0.09), (0.045, 0.075, 0.04), materials["skin"], segments=22, rings=14, subsurf=1)
    body.extend([forehead, face_plane, jaw, chin, cheek_l, cheek_r, cheekbone_l, cheekbone_r, temple_l, temple_r])

    ear_l = add_uv_sphere("EarLeft", (-0.28, 2.59, -0.005), (0.032, 0.05, 0.024), materials["skin"], segments=20, rings=14, subsurf=1)
    ear_r = add_uv_sphere("EarRight", (0.28, 2.59, -0.005), (0.032, 0.05, 0.024), materials["skin"], segments=20, rings=14, subsurf=1)
    body.extend([ear_l, ear_r])

    brow_bridge = add_cube("BrowBridge", (0.0, 2.65, 0.2), (0.065, 0.018, 0.03), materials["skin"], bevel=0.01, subsurf=1)
    brow_l = add_cube("BrowLeft", (-0.09, 2.665, 0.226), (0.07, 0.012, 0.016), materials["brow"], rotation=(0.0, 0.0, math.radians(-8)), bevel=0.005, subsurf=0)
    brow_r = add_cube("BrowRight", (0.09, 2.665, 0.226), (0.07, 0.012, 0.016), materials["brow"], rotation=(0.0, 0.0, math.radians(8)), bevel=0.005, subsurf=0)
    body.extend([brow_bridge, brow_l, brow_r])

    socket_l = add_uv_sphere("SocketLeft", (-0.092, 2.57, 0.196), (0.06, 0.043, 0.03), materials["skin_warm"], segments=24, rings=16, subsurf=1)
    socket_r = add_uv_sphere("SocketRight", (0.092, 2.57, 0.196), (0.06, 0.043, 0.03), materials["skin_warm"], segments=24, rings=16, subsurf=1)
    eye_l = add_uv_sphere("EyeLeft", (-0.092, 2.58, 0.236), (0.042, 0.024, 0.028), materials["eye"], segments=24, rings=16, subsurf=1)
    eye_r = add_uv_sphere("EyeRight", (0.092, 2.58, 0.236), (0.042, 0.024, 0.028), materials["eye"], segments=24, rings=16, subsurf=1)
    pupil_l = add_uv_sphere("PupilLeft", (-0.092, 2.579, 0.264), (0.015, 0.015, 0.009), materials["pupil"], segments=16, rings=12, subsurf=0)
    pupil_r = add_uv_sphere("PupilRight", (0.092, 2.579, 0.264), (0.015, 0.015, 0.009), materials["pupil"], segments=16, rings=12, subsurf=0)
    lid_u_l = add_cube("LidUpperLeft", (-0.092, 2.602, 0.243), (0.046, 0.011, 0.015), materials["skin_warm"], rotation=(0.0, 0.0, math.radians(-4)), bevel=0.005, subsurf=0)
    lid_u_r = add_cube("LidUpperRight", (0.092, 2.602, 0.243), (0.046, 0.011, 0.015), materials["skin_warm"], rotation=(0.0, 0.0, math.radians(4)), bevel=0.005, subsurf=0)
    lid_l_l = add_cube("LidLowerLeft", (-0.092, 2.55, 0.237), (0.04, 0.006, 0.012), materials["skin"], bevel=0.004, subsurf=0)
    lid_l_r = add_cube("LidLowerRight", (0.092, 2.55, 0.237), (0.04, 0.006, 0.012), materials["skin"], bevel=0.004, subsurf=0)
    body.extend([socket_l, socket_r, eye_l, eye_r, pupil_l, pupil_r, lid_u_l, lid_u_r, lid_l_l, lid_l_r])

    nose_bridge = add_cube("NoseBridge", (0.0, 2.54, 0.222), (0.027, 0.085, 0.024), materials["skin"], bevel=0.006, subsurf=1)
    nose_tip = add_uv_sphere("NoseTip", (0.0, 2.465, 0.258), (0.052, 0.035, 0.043), materials["skin_warm"], segments=22, rings=14, subsurf=1)
    wing_l = add_uv_sphere("NoseWingLeft", (-0.042, 2.465, 0.246), (0.024, 0.018, 0.02), materials["skin_warm"], segments=18, rings=12, subsurf=1)
    wing_r = add_uv_sphere("NoseWingRight", (0.042, 2.465, 0.246), (0.024, 0.018, 0.02), materials["skin_warm"], segments=18, rings=12, subsurf=1)
    nostril_l = add_uv_sphere("NostrilLeft", (-0.022, 2.443, 0.273), (0.006, 0.004, 0.006), materials["pupil"], segments=12, rings=8, subsurf=0)
    nostril_r = add_uv_sphere("NostrilRight", (0.022, 2.443, 0.273), (0.006, 0.004, 0.006), materials["pupil"], segments=12, rings=8, subsurf=0)
    philtrum = add_cube("Philtrum", (0.0, 2.418, 0.24), (0.017, 0.024, 0.012), materials["skin"], bevel=0.004, subsurf=0)
    body.extend([nose_bridge, nose_tip, wing_l, wing_r, nostril_l, nostril_r, philtrum])

    lip_u_l = add_cube("UpperLipLeft", (-0.032, 2.39, 0.248), (0.034, 0.01, 0.017), materials["lip"], rotation=(0.0, 0.0, math.radians(-8)), bevel=0.004, subsurf=0)
    lip_u_r = add_cube("UpperLipRight", (0.032, 2.39, 0.248), (0.034, 0.01, 0.017), materials["lip"], rotation=(0.0, 0.0, math.radians(8)), bevel=0.004, subsurf=0)
    cupid = add_cube("CupidBow", (0.0, 2.397, 0.249), (0.013, 0.006, 0.014), materials["lip"], bevel=0.003, subsurf=0)
    lip_lower = add_uv_sphere("LowerLip", (0.0, 2.357, 0.243), (0.06, 0.021, 0.024), materials["lip"], segments=18, rings=12, subsurf=1)
    mouth_line = add_cube("MouthLine", (0.0, 2.38, 0.261), (0.056, 0.003, 0.005), materials["pupil"], bevel=0.001, subsurf=0)
    corner_l = add_uv_sphere("MouthCornerLeft", (-0.05, 2.379, 0.25), (0.006, 0.006, 0.004), materials["lip"], segments=12, rings=8, subsurf=0)
    corner_r = add_uv_sphere("MouthCornerRight", (0.05, 2.379, 0.25), (0.006, 0.006, 0.004), materials["lip"], segments=12, rings=8, subsurf=0)
    stache = add_cube("Mustache", (0.0, 2.412, 0.255), (0.038, 0.005, 0.007), materials["brow"], bevel=0.002, subsurf=0)
    soul = add_cube("SoulPatch", (0.0, 2.335, 0.188), (0.012, 0.012, 0.007), materials["brow"], bevel=0.002, subsurf=0)
    body.extend([lip_u_l, lip_u_r, cupid, lip_lower, mouth_line, corner_l, corner_r, stache, soul])

    hair_parts = []
    hair_core = add_uv_sphere("HairCore", (0.0, 2.89, -0.015), (0.28, 0.24, 0.205), materials["hair"], segments=30, rings=20)
    hair_parts.append(hair_core)
    curls = [
        (0.0, 3.12, 0.03, 0.09),
        (-0.12, 3.08, 0.07, 0.088),
        (0.12, 3.08, 0.07, 0.088),
        (-0.24, 2.99, 0.03, 0.084),
        (0.24, 2.99, 0.03, 0.084),
        (-0.27, 2.88, -0.02, 0.08),
        (0.27, 2.88, -0.02, 0.08),
        (-0.17, 2.86, 0.13, 0.078),
        (0.17, 2.86, 0.13, 0.078),
        (-0.07, 2.95, 0.155, 0.072),
        (0.07, 2.95, 0.155, 0.072),
        (-0.2, 2.76, 0.16, 0.07),
        (0.2, 2.76, 0.16, 0.07),
        (0.0, 2.75, 0.17, 0.068),
        (-0.1, 2.8, 0.185, 0.058),
        (0.1, 2.8, 0.185, 0.058),
        (-0.04, 2.72, 0.175, 0.055),
        (0.04, 2.72, 0.175, 0.055),
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
