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
FACE_TEXTURE_PATH = ROOT / "source" / "face_texture.png"

# Authored in Y-up "game space": x = left/right, y = height (0 = feet), z = depth (+ = front/face).
JOINTS = {
    "pelvis": (0.0, 0.95, 0.0),
    "spine_mid": (0.0, 1.16, 0.0),
    "chest": (0.0, 1.40, 0.0),
    "neck_base": (0.0, 1.57, 0.0),
    "shoulder_l": (-0.185, 1.53, 0.0),
    "shoulder_r": (0.185, 1.53, 0.0),
    "elbow_l": (-0.225, 1.27, 0.02),
    "elbow_r": (0.225, 1.27, 0.02),
    "wrist_l": (-0.235, 1.00, 0.03),
    "wrist_r": (0.235, 1.00, 0.03),
    "hip_l": (-0.095, 0.91, 0.0),
    "hip_r": (0.095, 0.91, 0.0),
    "knee_l": (-0.105, 0.50, 0.015),
    "knee_r": (0.105, 0.50, 0.015),
    "ankle_l": (-0.105, 0.10, 0.01),
    "ankle_r": (0.105, 0.10, 0.01),
    "toe_l": (-0.105, 0.035, 0.135),
    "toe_r": (0.105, 0.035, 0.135),
}

RADII = {
    "pelvis": (0.135, 0.095),
    "spine_mid": (0.145, 0.085),
    "chest": (0.165, 0.105),
    "neck_base": (0.058, 0.058),
    "shoulder_l": (0.075, 0.075),
    "shoulder_r": (0.075, 0.075),
    "elbow_l": (0.05, 0.05),
    "elbow_r": (0.05, 0.05),
    "wrist_l": (0.032, 0.032),
    "wrist_r": (0.032, 0.032),
    "hip_l": (0.088, 0.088),
    "hip_r": (0.088, 0.088),
    "knee_l": (0.068, 0.068),
    "knee_r": (0.068, 0.068),
    "ankle_l": (0.042, 0.042),
    "ankle_r": (0.042, 0.042),
    "toe_l": (0.028, 0.048),
    "toe_r": (0.028, 0.048),
}

EDGES = [
    ("pelvis", "spine_mid"), ("spine_mid", "chest"), ("chest", "neck_base"),
    ("chest", "shoulder_l"), ("shoulder_l", "elbow_l"), ("elbow_l", "wrist_l"),
    ("chest", "shoulder_r"), ("shoulder_r", "elbow_r"), ("elbow_r", "wrist_r"),
    ("pelvis", "hip_l"), ("hip_l", "knee_l"), ("knee_l", "ankle_l"), ("ankle_l", "toe_l"),
    ("pelvis", "hip_r"), ("hip_r", "knee_r"), ("knee_r", "ankle_r"), ("ankle_r", "toe_r"),
]

NECK_TOP_Y = JOINTS["neck_base"][1] + RADII["neck_base"][0] * 0.8
HEAD_CENTER = (0.0, NECK_TOP_Y + 0.16, 0.04)
HEAD_SCALE = (0.096, 0.122, 0.104)


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


def add_cube(name, location, scale, material, rotation=(0.0, 0.0, 0.0), subsurf=1, bevel=0.015):
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


def add_uv_sphere(name, location, scale, material, segments=32, rings=20, subsurf=1):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
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


def build_body_mesh(materials):
    """Skeleton + Skin modifier: a self-connecting, always-proportioned body.
    Avoids hand-placed box parts drifting out of alignment."""
    mesh = bpy.data.meshes.new("BodyMesh")
    obj = bpy.data.objects.new("Body", mesh)
    bpy.context.scene.collection.objects.link(obj)

    bm = bmesh.new()
    verts = {}
    vert_index = {}
    for i, (name, pos) in enumerate(JOINTS.items()):
        verts[name] = bm.verts.new(pos)
        vert_index[name] = i
    for a, b in EDGES:
        bm.edges.new((verts[a], verts[b]))
    bm.to_mesh(mesh)
    bm.free()

    obj.modifiers.new(name="Skin", type="SKIN")
    skin_layer = mesh.skin_vertices[0].data
    for name, index in vert_index.items():
        skin_layer[index].radius = RADII[name]
    skin_layer[vert_index["pelvis"]].use_root = True

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier="Skin")
    smooth_with_subsurf(obj, levels=2, render_levels=2)
    bpy.ops.object.modifier_apply(modifier="Subdivision")

    # Assign materials per body region by position (computed from joints, not guessed).
    mat_names = ["skin", "hoodie", "denim", "shoe"]
    for key in mat_names:
        obj.data.materials.append(materials[key])
    idx = {name: i for i, name in enumerate(mat_names)}

    hip_y = JOINTS["hip_l"][1]
    ankle_y = JOINTS["ankle_l"][1]
    neck_y = JOINTS["neck_base"][1]

    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    for face in bm.faces:
        center = face.calc_center_median()
        y = center.y
        if y < ankle_y + 0.05:
            face.material_index = idx["shoe"]
        elif y < hip_y:
            face.material_index = idx["denim"]
        elif y > neck_y - 0.02:
            face.material_index = idx["skin"]
        elif abs(center.x) > 0.22 and y < JOINTS["elbow_l"][1] + 0.05:
            # forearm-to-wrist taper reads as a hand/cuff — keep it skin toned
            face.material_index = idx["skin"]
        else:
            face.material_index = idx["hoodie"]
    bmesh.update_edit_mesh(obj.data)
    bpy.ops.object.mode_set(mode="OBJECT")

    return obj


def sculpt_head(obj):
    def transform(bm):
        for vert in bm.verts:
            x, y, z = vert.co.x, vert.co.y, vert.co.z
            # Narrower, tapered jaw toward the chin (lower half of head).
            if y < -0.25:
                falloff = min(1.0, (-0.25 - y) / 0.55)
                vert.co.x *= 1.0 - 0.32 * falloff
                vert.co.z -= 0.05 * falloff
            # Cheek taper just above the jawline.
            if -0.25 <= y < 0.0:
                falloff = (0.0 - y) / 0.25
                vert.co.x *= 1.0 - 0.14 * falloff
            # Brow ridge / forehead volume.
            if 0.28 < y < 0.55 and z > 0.05:
                strength = 1.0 - min(1.0, abs(y - 0.4) / 0.16)
                vert.co.z += 0.05 * strength
            # Give the face a gentler front plane so the projected photo does
            # not read like it is wrapped deep around a round skull.
            if -0.18 < y < 0.22 and abs(x) < 0.075 and z > 0.0:
                cheek_falloff = 1.0 - min(1.0, abs(x) / 0.075)
                vertical_falloff = 1.0 - min(1.0, abs(y + 0.01) / 0.23)
                vert.co.z += 0.018 * cheek_falloff * vertical_falloff
            # Pull the upper forehead slightly back so the curls sit above the
            # face instead of blending into it from the front.
            if 0.18 < y < 0.45 and z > 0.02:
                vert.co.z -= 0.018 * (1.0 - min(1.0, abs(y - 0.31) / 0.14))
            # Slight back-of-head rounding.
            if z < -0.3:
                vert.co.z *= 0.94
    edit_mesh(obj, transform)


def build_hair(materials, hair_center):
    hair_parts = []
    core = add_uv_sphere(
        "HairCore",
        (hair_center[0], hair_center[1] + 0.05, hair_center[2] - 0.05),
        (HEAD_SCALE[0] * 0.98, HEAD_SCALE[1] * 0.58, HEAD_SCALE[2] * 0.78),
        materials["hair"], segments=28, rings=18, subsurf=1,
    )
    hair_parts.append(core)

    # Generate curl clusters procedurally over the upper hemisphere of the head
    # (spiral distribution) instead of hand-typed coordinates, so volume always
    # tracks HEAD_SCALE/HEAD_CENTER if those constants change.
    curl_count = 22
    golden_angle = math.pi * (3.0 - math.sqrt(5.0))
    for i in range(curl_count):
        t = i / max(1, curl_count - 1)
        polar = t * (math.pi * 0.62)  # limit to upper hemisphere + a bit past the equator
        azimuth = i * golden_angle
        rx = math.sin(polar) * math.cos(azimuth)
        ry = math.cos(polar)
        rz = math.sin(polar) * math.sin(azimuth) * 0.85 - 0.05
        radius_scale = 1.12 + 0.05 * math.sin(i * 1.7)
        curl_radius = 0.052 + 0.02 * (1.0 - t)
        pos = (
            hair_center[0] + rx * HEAD_SCALE[0] * radius_scale,
            hair_center[1] + ry * HEAD_SCALE[1] * radius_scale + 0.02,
            hair_center[2] + rz * HEAD_SCALE[2] * radius_scale,
        )
        face_clear_z = HEAD_CENTER[2] + HEAD_SCALE[2] * 0.02
        brow_line_y = HEAD_CENTER[1] + HEAD_SCALE[1] * 0.52
        if pos[2] > face_clear_z and pos[1] < brow_line_y:
            overlap = pos[2] - face_clear_z
            pos = (
                pos[0] * 0.9,
                brow_line_y + 0.02 + overlap * 0.95,
                face_clear_z - 0.045 - overlap * 0.55,
            )
            curl_radius *= 0.8
        elif pos[2] > HEAD_CENTER[2] and abs(pos[0]) < HEAD_SCALE[0] * 0.45:
            pos = (
                pos[0] * 0.9,
                pos[1] + 0.06,
                pos[2] - 0.05,
            )
            curl_radius *= 0.84
        curl = add_uv_sphere(
            f"Curl{i:02d}", pos, (curl_radius, curl_radius, curl_radius),
            materials["hair"], segments=16, rings=12, subsurf=1,
        )
        hair_parts.append(curl)
    return hair_parts


def build_face(materials, head_center):
    """Flat-colored fallback facial features (nose/brows/eyes/mouth/ears) for
    builds with no projected photo texture. Not used once add_face_projection
    has painted the face — those flat bumps would double up on top of the
    photo's own nose/eyes/mouth."""
    parts = []
    front = head_center[2] + HEAD_SCALE[2]

    nose = add_uv_sphere(
        "Nose", (head_center[0], head_center[1] - 0.01, front - 0.01),
        (0.028, 0.034, 0.03), materials["skin_warm"], segments=16, rings=12, subsurf=1,
    )
    parts.append(nose)

    brow_l = add_cube(
        "BrowLeft", (head_center[0] - 0.038, head_center[1] + 0.075, front - 0.045),
        (0.032, 0.008, 0.01), materials["brow"], rotation=(0.0, 0.0, math.radians(-6)), bevel=0.003, subsurf=0,
    )
    brow_r = add_cube(
        "BrowRight", (head_center[0] + 0.038, head_center[1] + 0.075, front - 0.045),
        (0.032, 0.008, 0.01), materials["brow"], rotation=(0.0, 0.0, math.radians(6)), bevel=0.003, subsurf=0,
    )
    parts.extend([brow_l, brow_r])

    eye_l = add_uv_sphere(
        "EyeLeft", (head_center[0] - 0.04, head_center[1] + 0.045, front - 0.018),
        (0.018, 0.013, 0.013), materials["pupil"], segments=14, rings=10, subsurf=0,
    )
    eye_r = add_uv_sphere(
        "EyeRight", (head_center[0] + 0.04, head_center[1] + 0.045, front - 0.018),
        (0.018, 0.013, 0.013), materials["pupil"], segments=14, rings=10, subsurf=0,
    )
    parts.extend([eye_l, eye_r])

    mouth = add_cube(
        "Mouth", (head_center[0], head_center[1] - 0.095, front - 0.04),
        (0.032, 0.008, 0.01), materials["lip"], bevel=0.004, subsurf=1,
    )
    parts.append(mouth)

    parts.extend(build_ears(materials, head_center))
    return parts


def build_ears(materials, head_center):
    ear_l = add_uv_sphere(
        "EarLeft", (head_center[0] - HEAD_SCALE[0] * 0.97, head_center[1], head_center[2]),
        (0.016, 0.03, 0.022), materials["skin"], segments=14, rings=10, subsurf=1,
    )
    ear_r = add_uv_sphere(
        "EarRight", (head_center[0] + HEAD_SCALE[0] * 0.97, head_center[1], head_center[2]),
        (0.016, 0.03, 0.022), materials["skin"], segments=14, rings=10, subsurf=1,
    )
    return [ear_l, ear_r]


def build_hood(materials):
    """Hood sits behind/above the shoulders and nape of the neck.
    Kept clearly BEHIND the face (negative z) so it can never cover it."""
    neck = JOINTS["neck_base"]
    hood = add_cube(
        "Hood", (0.0, neck[1] + 0.12, -0.10),
        (0.11, 0.13, 0.075), materials["hoodie"], rotation=(math.radians(12), 0.0, 0.0), bevel=0.02, subsurf=1,
    )
    collar_l = add_cube(
        "CollarLeft", (-0.078, neck[1] + 0.0, -0.02),
        (0.04, 0.052, 0.018), materials["hoodie_rib"], rotation=(0.0, 0.0, math.radians(-10)), bevel=0.008, subsurf=1,
    )
    collar_r = add_cube(
        "CollarRight", (0.078, neck[1] + 0.0, -0.02),
        (0.04, 0.052, 0.018), materials["hoodie_rib"], rotation=(0.0, 0.0, math.radians(10)), bevel=0.008, subsurf=1,
    )
    zipper = add_cube(
        "Zipper", (0.0, (JOINTS["chest"][1] + JOINTS["hip_l"][1]) / 2, 0.15),
        (0.007, 0.22, 0.006), materials["zipper"], bevel=0.001, subsurf=0,
    )
    return [hood, collar_l, collar_r, zipper]


def build_shoes(materials):
    parts = []
    for side, x in (("Left", JOINTS["toe_l"][0]), ("Right", JOINTS["toe_r"][0])):
        sole = add_cube(
            f"Shoe{side}", (x, 0.045, 0.09),
            (0.06, 0.032, 0.11), materials["shoe"], bevel=0.008, subsurf=1,
        )
        parts.append(sole)
    return parts


def add_face_projection(head_obj, image_path):
    """Project a cropped reference photo onto the head via an orthographic
    camera + UV Project modifier, then bake the UVs so they survive glTF
    export. Replaces the head's flat skin material with the photo."""
    if not image_path.exists():
        print(f"WARNING: face texture not found at {image_path}, skipping projection")
        return

    img = bpy.data.images.load(str(image_path))
    w, h = img.size

    # Match render resolution to the crop's aspect ratio so the projection
    # isn't stretched (the UV Project modifier maps through the camera's
    # frustum at the scene's render aspect ratio).
    scene = bpy.context.scene
    scene.render.resolution_x = w
    scene.render.resolution_y = h

    cam_data = bpy.data.cameras.new("FaceProjectCam")
    cam_data.type = "ORTHO"
    # Frame roughly the eye-to-chin span of the sculpted head, with margin
    # for forehead/hair/ears at the crop's edges.
    cam_data.ortho_scale = HEAD_SCALE[1] * 1.9
    cam_obj = bpy.data.objects.new("FaceProjectCam", cam_data)
    # front = +z; camera sits further out on +z looking back toward -z.
    cam_obj.location = (HEAD_CENTER[0], HEAD_CENTER[1], HEAD_CENTER[2] + HEAD_SCALE[2] * 4.0)
    cam_obj.rotation_euler = (0.0, 0.0, 0.0)
    bpy.context.scene.collection.objects.link(cam_obj)

    uv_layer = head_obj.data.uv_layers.new(name="FaceUV")
    head_obj.data.uv_layers.active = uv_layer

    mod = head_obj.modifiers.new(name="FaceProject", type="UV_PROJECT")
    mod.uv_layer = "FaceUV"
    mod.projector_count = 1
    mod.projectors[0].object = cam_obj

    bpy.context.view_layer.objects.active = head_obj
    head_obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier="FaceProject")
    head_obj.select_set(False)
    bpy.data.objects.remove(cam_obj, do_unlink=True)

    face_mat = bpy.data.materials.new(name="FacePhoto")
    face_mat.use_nodes = True
    nodes = face_mat.node_tree.nodes
    links = face_mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    tex_node = nodes.new("ShaderNodeTexImage")
    tex_node.image = img
    uv_node = nodes.new("ShaderNodeUVMap")
    uv_node.uv_map = "FaceUV"
    links.new(uv_node.outputs["UV"], tex_node.inputs["Vector"])
    links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.85

    # Only the front-facing "face patch" gets the photo — everywhere else
    # (sides, back, top under the hair) keeps the flat skin material at
    # index 0. Outside the camera's ortho frustum the projected UVs wrap
    # and repeat the image edge, which looks like a hard sticker seam with
    # color bleed if applied to the whole head.
    face_mat_index = len(head_obj.data.materials)
    head_obj.data.materials.append(face_mat)

    # Face centers here are in the Head object's LOCAL space (roughly
    # -HEAD_SCALE..+HEAD_SCALE per axis, centered on the object origin) —
    # NOT world space, so this must NOT include the HEAD_CENTER world offset.
    front_z_local = HEAD_SCALE[2] * 0.4
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(head_obj.data)
    bm.faces.ensure_lookup_table()
    for face in bm.faces:
        center = face.calc_center_median()
        if center.z > front_z_local:
            face.material_index = face_mat_index
    bmesh.update_edit_mesh(head_obj.data)
    bpy.ops.object.mode_set(mode="OBJECT")


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
        "hair": make_material("Hair", (0.13, 0.09, 0.07), roughness=0.97),
        "brow": make_material("Brow", (0.1, 0.07, 0.06), roughness=0.95),
        "pupil": make_material("Pupil", (0.08, 0.06, 0.05), roughness=1.0),
        "lip": make_material("Lip", (0.54, 0.34, 0.31), roughness=0.88),
        "denim": make_material("Denim", (0.06, 0.07, 0.1), roughness=0.95),
        "shoe": make_material("Shoe", (0.93, 0.94, 0.95), roughness=0.78),
    }

    body = [build_body_mesh(materials)]

    head = add_uv_sphere("Head", HEAD_CENTER, HEAD_SCALE, materials["skin"], segments=40, rings=26, subsurf=2)
    sculpt_head(head)
    add_face_projection(head, FACE_TEXTURE_PATH)
    body.append(head)

    body.extend(build_ears(materials, HEAD_CENTER))
    hair_center = (HEAD_CENTER[0], HEAD_CENTER[1] + HEAD_SCALE[1] * 0.55, HEAD_CENTER[2])
    body.extend(build_hair(materials, hair_center))
    body.extend(build_hood(materials))
    body.extend(build_shoes(materials))

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
