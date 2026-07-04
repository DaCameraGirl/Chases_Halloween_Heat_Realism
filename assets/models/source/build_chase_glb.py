import json
import math
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_GLB = ROOT / "chase.glb"
CONFIG_JSON = ROOT / "chase.config.json"


def vec_add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def vec_sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def vec_scale(v, scale):
    return (v[0] * scale[0], v[1] * scale[1], v[2] * scale[2])


def vec_length(v):
    return math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])


def vec_normalize(v):
    length = vec_length(v)
    if length < 1e-8:
      return (0.0, 1.0, 0.0)
    return (v[0] / length, v[1] / length, v[2] / length)


def rotate_xyz(v, rotation):
    x, y, z = v
    rx, ry, rz = rotation

    if rx:
        cx, sx = math.cos(rx), math.sin(rx)
        y, z = y * cx - z * sx, y * sx + z * cx
    if ry:
        cy, sy = math.cos(ry), math.sin(ry)
        x, z = x * cy + z * sy, -x * sy + z * cy
    if rz:
        cz, sz = math.cos(rz), math.sin(rz)
        x, y = x * cz - y * sz, x * sz + y * cz
    return (x, y, z)


def transform_point(point, scale=(1.0, 1.0, 1.0), rotation=(0.0, 0.0, 0.0), translation=(0.0, 0.0, 0.0)):
    return vec_add(rotate_xyz(vec_scale(point, scale), rotation), translation)


def transform_normal(normal, scale=(1.0, 1.0, 1.0), rotation=(0.0, 0.0, 0.0)):
    nx = normal[0] / scale[0] if abs(scale[0]) > 1e-8 else 0.0
    ny = normal[1] / scale[1] if abs(scale[1]) > 1e-8 else 0.0
    nz = normal[2] / scale[2] if abs(scale[2]) > 1e-8 else 0.0
    return vec_normalize(rotate_xyz((nx, ny, nz), rotation))


def add_triangle(mesh, a, b, c, na, nb, nc):
    mesh["positions"].extend([a, b, c])
    mesh["normals"].extend([na, nb, nc])


def add_quad(mesh, a, b, c, d, normal):
    add_triangle(mesh, a, b, c, normal, normal, normal)
    add_triangle(mesh, a, c, d, normal, normal, normal)


def make_mesh(material):
    return {"material": material, "positions": [], "normals": []}


def box_mesh(material, center, size, scale=(1.0, 1.0, 1.0), rotation=(0.0, 0.0, 0.0)):
    mesh = make_mesh(material)
    hx, hy, hz = size[0] * 0.5, size[1] * 0.5, size[2] * 0.5
    faces = [
        ((0.0, 0.0, 1.0), [(-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]),
        ((0.0, 0.0, -1.0), [(hx, -hy, -hz), (-hx, -hy, -hz), (-hx, hy, -hz), (hx, hy, -hz)]),
        ((1.0, 0.0, 0.0), [(hx, -hy, hz), (hx, -hy, -hz), (hx, hy, -hz), (hx, hy, hz)]),
        ((-1.0, 0.0, 0.0), [(-hx, -hy, -hz), (-hx, -hy, hz), (-hx, hy, hz), (-hx, hy, -hz)]),
        ((0.0, 1.0, 0.0), [(-hx, hy, hz), (hx, hy, hz), (hx, hy, -hz), (-hx, hy, -hz)]),
        ((0.0, -1.0, 0.0), [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, -hy, hz), (-hx, -hy, hz)]),
    ]
    for normal, corners in faces:
        points = [transform_point(corner, scale, rotation, center) for corner in corners]
        n = transform_normal(normal, scale, rotation)
        add_quad(mesh, points[0], points[1], points[2], points[3], n)
    return mesh


def sphere_mesh(material, center, radius, segments_u=18, segments_v=12, scale=(1.0, 1.0, 1.0), rotation=(0.0, 0.0, 0.0)):
    mesh = make_mesh(material)
    for iy in range(segments_v):
        v0 = iy / segments_v
        v1 = (iy + 1) / segments_v
        theta0 = v0 * math.pi
        theta1 = v1 * math.pi
        for ix in range(segments_u):
            u0 = ix / segments_u
            u1 = (ix + 1) / segments_u
            phi0 = u0 * math.tau
            phi1 = u1 * math.tau

            def point(theta, phi):
                sin_theta = math.sin(theta)
                local = (
                    radius * sin_theta * math.cos(phi),
                    radius * math.cos(theta),
                    radius * sin_theta * math.sin(phi),
                )
                normal = (
                    sin_theta * math.cos(phi),
                    math.cos(theta),
                    sin_theta * math.sin(phi),
                )
                return (
                    transform_point(local, scale, rotation, center),
                    transform_normal(normal, scale, rotation),
                )

            p00, n00 = point(theta0, phi0)
            p10, n10 = point(theta0, phi1)
            p11, n11 = point(theta1, phi1)
            p01, n01 = point(theta1, phi0)

            if iy != 0:
                add_triangle(mesh, p00, p10, p11, n00, n10, n11)
            if iy != segments_v - 1:
                add_triangle(mesh, p00, p11, p01, n00, n11, n01)
    return mesh


def cylinder_mesh(material, center, radius, height, segments=16, scale=(1.0, 1.0, 1.0), rotation=(0.0, 0.0, 0.0)):
    mesh = make_mesh(material)
    half_h = height * 0.5

    for i in range(segments):
        a0 = math.tau * i / segments
        a1 = math.tau * (i + 1) / segments

        x0, z0 = radius * math.cos(a0), radius * math.sin(a0)
        x1, z1 = radius * math.cos(a1), radius * math.sin(a1)

        p0 = transform_point((x0, -half_h, z0), scale, rotation, center)
        p1 = transform_point((x1, -half_h, z1), scale, rotation, center)
        p2 = transform_point((x1, half_h, z1), scale, rotation, center)
        p3 = transform_point((x0, half_h, z0), scale, rotation, center)

        n0 = transform_normal((math.cos(a0), 0.0, math.sin(a0)), scale, rotation)
        n1 = transform_normal((math.cos(a1), 0.0, math.sin(a1)), scale, rotation)

        add_triangle(mesh, p0, p1, p2, n0, n1, n1)
        add_triangle(mesh, p0, p2, p3, n0, n1, n0)

        top_center = transform_point((0.0, half_h, 0.0), scale, rotation, center)
        top_normal = transform_normal((0.0, 1.0, 0.0), scale, rotation)
        add_triangle(mesh, top_center, p2, p3, top_normal, top_normal, top_normal)

        bottom_center = transform_point((0.0, -half_h, 0.0), scale, rotation, center)
        bottom_normal = transform_normal((0.0, -1.0, 0.0), scale, rotation)
        add_triangle(mesh, bottom_center, p0, p1, bottom_normal, bottom_normal, bottom_normal)

    return mesh


def merge_meshes(meshes):
    merged = {}
    for mesh in meshes:
        merged.setdefault(mesh["material"], make_mesh(mesh["material"]))
        merged[mesh["material"]]["positions"].extend(mesh["positions"])
        merged[mesh["material"]]["normals"].extend(mesh["normals"])
    return list(merged.values())


def pack_floats(values):
    flat = []
    for value in values:
        flat.extend(value)
    return struct.pack("<" + "f" * len(flat), *flat)


def pad4(data, pad=b"\x00"):
    while len(data) % 4:
        data += pad
    return data


def build_glb(meshes):
    materials = [
        {"name": "hoodie", "pbrMetallicRoughness": {"baseColorFactor": [0.125, 0.141, 0.173, 1.0], "metallicFactor": 0.05, "roughnessFactor": 0.92}},
        {"name": "hoodie_rib", "pbrMetallicRoughness": {"baseColorFactor": [0.098, 0.11, 0.141, 1.0], "metallicFactor": 0.04, "roughnessFactor": 0.96}},
        {"name": "zipper", "pbrMetallicRoughness": {"baseColorFactor": [0.84, 0.85, 0.88, 1.0], "metallicFactor": 0.25, "roughnessFactor": 0.45}},
        {"name": "skin", "pbrMetallicRoughness": {"baseColorFactor": [0.78, 0.59, 0.46, 1.0], "metallicFactor": 0.0, "roughnessFactor": 0.94}},
        {"name": "warm_skin", "pbrMetallicRoughness": {"baseColorFactor": [0.82, 0.64, 0.50, 1.0], "metallicFactor": 0.0, "roughnessFactor": 0.92}},
        {"name": "hair", "pbrMetallicRoughness": {"baseColorFactor": [0.28, 0.2, 0.16, 1.0], "metallicFactor": 0.0, "roughnessFactor": 0.98}},
        {"name": "brow", "pbrMetallicRoughness": {"baseColorFactor": [0.18, 0.11, 0.08, 1.0], "metallicFactor": 0.0, "roughnessFactor": 0.95}},
        {"name": "eye_white", "pbrMetallicRoughness": {"baseColorFactor": [0.91, 0.87, 0.82, 1.0], "metallicFactor": 0.0, "roughnessFactor": 0.72}},
        {"name": "pupil", "pbrMetallicRoughness": {"baseColorFactor": [0.09, 0.07, 0.06, 1.0], "metallicFactor": 0.0, "roughnessFactor": 1.0}},
        {"name": "lip", "pbrMetallicRoughness": {"baseColorFactor": [0.58, 0.4, 0.34, 1.0], "metallicFactor": 0.0, "roughnessFactor": 0.88}},
        {"name": "denim", "pbrMetallicRoughness": {"baseColorFactor": [0.09, 0.1, 0.13, 1.0], "metallicFactor": 0.0, "roughnessFactor": 0.96}},
        {"name": "shoe", "pbrMetallicRoughness": {"baseColorFactor": [0.92, 0.93, 0.94, 1.0], "metallicFactor": 0.0, "roughnessFactor": 0.8}},
    ]
    material_index = {material["name"]: index for index, material in enumerate(materials)}

    buffer = bytearray()
    buffer_views = []
    accessors = []
    primitives = []

    for mesh in meshes:
        position_offset = len(buffer)
        position_bytes = pack_floats(mesh["positions"])
        buffer.extend(position_bytes)
        position_length = len(position_bytes)
        buffer.extend(b"\x00" * ((4 - len(buffer) % 4) % 4))
        position_view = len(buffer_views)
        buffer_views.append({"buffer": 0, "byteOffset": position_offset, "byteLength": position_length})

        xs = [p[0] for p in mesh["positions"]]
        ys = [p[1] for p in mesh["positions"]]
        zs = [p[2] for p in mesh["positions"]]
        position_accessor = len(accessors)
        accessors.append({
            "bufferView": position_view,
            "componentType": 5126,
            "count": len(mesh["positions"]),
            "type": "VEC3",
            "min": [min(xs), min(ys), min(zs)],
            "max": [max(xs), max(ys), max(zs)],
        })

        normal_offset = len(buffer)
        normal_bytes = pack_floats(mesh["normals"])
        buffer.extend(normal_bytes)
        normal_length = len(normal_bytes)
        buffer.extend(b"\x00" * ((4 - len(buffer) % 4) % 4))
        normal_view = len(buffer_views)
        buffer_views.append({"buffer": 0, "byteOffset": normal_offset, "byteLength": normal_length})
        normal_accessor = len(accessors)
        accessors.append({
            "bufferView": normal_view,
            "componentType": 5126,
            "count": len(mesh["normals"]),
            "type": "VEC3",
        })

        primitives.append({
            "attributes": {"POSITION": position_accessor, "NORMAL": normal_accessor},
            "mode": 4,
            "material": material_index[mesh["material"]],
        })

    gltf = {
        "asset": {"version": "2.0", "generator": "build_chase_glb.py"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "ChasePrototype"}],
        "meshes": [{"name": "ChasePrototypeMesh", "primitives": primitives}],
        "materials": materials,
        "buffers": [{"byteLength": len(buffer)}],
        "bufferViews": buffer_views,
        "accessors": accessors,
    }

    json_chunk = pad4(json.dumps(gltf, separators=(",", ":")).encode("utf-8"), b" ")
    bin_chunk = pad4(bytes(buffer))

    total_length = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    header = struct.pack("<4sII", b"glTF", 2, total_length)
    json_header = struct.pack("<I4s", len(json_chunk), b"JSON")
    bin_header = struct.pack("<I4s", len(bin_chunk), b"BIN\x00")
    return header + json_header + json_chunk + bin_header + bin_chunk


def create_chase_meshes():
    meshes = []
    hoodie_rot = (0.0, 0.0, 0.0)

    meshes.append(box_mesh("hoodie", (0.0, 1.62, 0.0), (0.78, 1.2, 0.46)))
    meshes.append(box_mesh("hoodie_rib", (0.0, 0.93, 0.0), (0.66, 0.42, 0.38)))
    meshes.append(sphere_mesh("hoodie", (0.0, 2.22, -0.18), 0.34, scale=(1.08, 1.0, 0.74)))
    meshes.append(box_mesh("hoodie_rib", (0.0, 2.11, 0.06), (0.4, 0.11, 0.1), scale=(1.0, 1.0, 0.8)))
    meshes.append(box_mesh("hoodie", (-0.43, 1.66, 0.01), (0.16, 1.08, 0.16), rotation=(0.0, 0.0, 0.14)))
    meshes.append(box_mesh("hoodie", (0.43, 1.66, 0.01), (0.16, 1.08, 0.16), rotation=(0.0, 0.0, -0.14)))
    meshes.append(box_mesh("zipper", (0.0, 1.54, 0.235), (0.03, 1.05, 0.028)))
    meshes.append(cylinder_mesh("zipper", (-0.075, 1.84, 0.24), 0.011, 0.56, rotation=(0.0, 0.0, 0.07)))
    meshes.append(cylinder_mesh("zipper", (0.075, 1.84, 0.24), 0.011, 0.56, rotation=(0.0, 0.0, -0.07)))

    meshes.append(cylinder_mesh("skin", (0.0, 2.25, 0.0), 0.085, 0.18))
    meshes.append(sphere_mesh("skin", (0.0, 2.62, 0.005), 0.35, scale=(0.83, 1.1, 0.9)))
    meshes.append(box_mesh("warm_skin", (0.0, 2.56, 0.18), (0.27, 0.34, 0.11)))
    meshes.append(box_mesh("skin", (0.0, 2.37, 0.095), (0.22, 0.14, 0.17), rotation=(-0.2, 0.0, 0.0)))
    meshes.append(box_mesh("skin", (0.0, 2.305, 0.115), (0.115, 0.07, 0.1), rotation=(-0.25, 0.0, 0.0)))
    meshes.append(sphere_mesh("skin", (-0.145, 2.5, 0.15), 0.09, scale=(1.12, 0.76, 0.7)))
    meshes.append(sphere_mesh("skin", (0.145, 2.5, 0.15), 0.09, scale=(1.12, 0.76, 0.7)))
    meshes.append(sphere_mesh("warm_skin", (-0.145, 2.57, 0.19), 0.055, scale=(1.2, 0.68, 0.8)))
    meshes.append(sphere_mesh("warm_skin", (0.145, 2.57, 0.19), 0.055, scale=(1.2, 0.68, 0.8)))
    meshes.append(sphere_mesh("skin", (-0.28, 2.58, -0.01), 0.05, scale=(0.7, 1.0, 0.48)))
    meshes.append(sphere_mesh("skin", (0.28, 2.58, -0.01), 0.05, scale=(0.7, 1.0, 0.48)))

    meshes.append(sphere_mesh("hair", (0.0, 2.88, -0.015), 0.28, scale=(1.08, 1.02, 0.94)))
    curl_specs = [
        (0.0, 3.13, 0.03, 0.105, (1.1, 1.0, 1.0)),
        (-0.13, 3.1, 0.08, 0.102, (1.0, 1.08, 1.0)),
        (0.13, 3.08, 0.08, 0.102, (1.0, 1.08, 1.0)),
        (-0.26, 3.02, 0.03, 0.1, (1.0, 1.0, 0.96)),
        (0.26, 3.02, 0.03, 0.1, (1.0, 1.0, 0.96)),
        (-0.31, 2.9, -0.02, 0.095, (0.95, 0.95, 0.9)),
        (0.31, 2.9, -0.02, 0.095, (0.95, 0.95, 0.9)),
        (-0.19, 2.87, 0.14, 0.09, (0.98, 1.0, 0.92)),
        (0.19, 2.87, 0.14, 0.09, (0.98, 1.0, 0.92)),
        (-0.08, 2.95, 0.17, 0.088, (1.0, 1.0, 0.94)),
        (0.08, 2.94, 0.17, 0.088, (1.0, 1.0, 0.94)),
        (-0.23, 2.75, 0.16, 0.086, (0.92, 1.0, 0.9)),
        (0.23, 2.75, 0.16, 0.086, (0.92, 1.0, 0.9)),
        (0.0, 2.76, 0.18, 0.082, (0.96, 1.0, 0.92)),
    ]
    for x, y, z, radius, scale in curl_specs:
        meshes.append(sphere_mesh("hair", (x, y, z), radius, scale=scale))

    meshes.append(box_mesh("brow", (-0.088, 2.67, 0.222), (0.1, 0.018, 0.028), rotation=(0.0, 0.0, -0.13)))
    meshes.append(box_mesh("brow", (0.088, 2.67, 0.222), (0.1, 0.018, 0.028), rotation=(0.0, 0.0, 0.13)))
    meshes.append(box_mesh("skin", (0.0, 2.655, 0.202), (0.13, 0.028, 0.05)))
    meshes.append(sphere_mesh("warm_skin", (-0.09, 2.575, 0.205), 0.05, scale=(1.12, 0.75, 0.5)))
    meshes.append(sphere_mesh("warm_skin", (0.09, 2.575, 0.205), 0.05, scale=(1.12, 0.75, 0.5)))
    meshes.append(sphere_mesh("eye_white", (-0.09, 2.582, 0.235), 0.032, scale=(1.22, 0.82, 0.84)))
    meshes.append(sphere_mesh("eye_white", (0.09, 2.582, 0.235), 0.032, scale=(1.22, 0.82, 0.84)))
    meshes.append(sphere_mesh("pupil", (-0.09, 2.58, 0.259), 0.015, scale=(0.9, 1.1, 0.55)))
    meshes.append(sphere_mesh("pupil", (0.09, 2.58, 0.259), 0.015, scale=(0.9, 1.1, 0.55)))
    meshes.append(box_mesh("warm_skin", (-0.09, 2.603, 0.241), (0.066, 0.02, 0.03), rotation=(0.0, 0.0, -0.05)))
    meshes.append(box_mesh("warm_skin", (0.09, 2.603, 0.241), (0.066, 0.02, 0.03), rotation=(0.0, 0.0, 0.05)))
    meshes.append(box_mesh("skin", (-0.09, 2.552, 0.236), (0.062, 0.012, 0.02)))
    meshes.append(box_mesh("skin", (0.09, 2.552, 0.236), (0.062, 0.012, 0.02)))

    meshes.append(box_mesh("skin", (0.0, 2.54, 0.222), (0.05, 0.13, 0.05)))
    meshes.append(box_mesh("warm_skin", (0.0, 2.47, 0.253), (0.078, 0.052, 0.07), rotation=(-0.08, 0.0, 0.0)))
    meshes.append(sphere_mesh("warm_skin", (-0.038, 2.47, 0.242), 0.03, scale=(0.9, 0.72, 0.9)))
    meshes.append(sphere_mesh("warm_skin", (0.038, 2.47, 0.242), 0.03, scale=(0.9, 0.72, 0.9)))
    meshes.append(sphere_mesh("pupil", (-0.022, 2.447, 0.266), 0.01, scale=(1.1, 0.7, 1.2)))
    meshes.append(sphere_mesh("pupil", (0.022, 2.447, 0.266), 0.01, scale=(1.1, 0.7, 1.2)))
    meshes.append(box_mesh("skin", (0.0, 2.42, 0.236), (0.036, 0.04, 0.022)))

    meshes.append(box_mesh("lip", (-0.03, 2.392, 0.245), (0.055, 0.016, 0.028), rotation=(0.0, 0.0, -0.1)))
    meshes.append(box_mesh("lip", (0.03, 2.392, 0.245), (0.055, 0.016, 0.028), rotation=(0.0, 0.0, 0.1)))
    meshes.append(box_mesh("lip", (0.0, 2.398, 0.246), (0.024, 0.013, 0.026)))
    meshes.append(box_mesh("lip", (0.0, 2.364, 0.24), (0.092, 0.024, 0.034)))
    meshes.append(box_mesh("pupil", (0.0, 2.383, 0.255), (0.09, 0.008, 0.014)))
    meshes.append(sphere_mesh("lip", (-0.048, 2.382, 0.247), 0.01))
    meshes.append(sphere_mesh("lip", (0.048, 2.382, 0.247), 0.01))
    meshes.append(box_mesh("brow", (0.0, 2.413, 0.252), (0.08, 0.012, 0.016)))
    meshes.append(box_mesh("brow", (0.0, 2.332, 0.188), (0.034, 0.028, 0.018)))

    meshes.append(box_mesh("denim", (-0.13, 0.58, 0.0), (0.17, 1.33, 0.17)))
    meshes.append(box_mesh("denim", (0.13, 0.58, 0.0), (0.17, 1.33, 0.17)))
    meshes.append(box_mesh("shoe", (-0.13, 0.06, 0.08), (0.18, 0.08, 0.3)))
    meshes.append(box_mesh("shoe", (0.13, 0.06, 0.08), (0.18, 0.08, 0.3)))
    meshes.append(sphere_mesh("skin", (-0.5, 1.03, 0.04), 0.07, scale=(0.72, 0.82, 0.65)))
    meshes.append(sphere_mesh("skin", (0.5, 1.03, 0.04), 0.07, scale=(0.72, 0.82, 0.65)))

    return merge_meshes(meshes)


def main():
    meshes = create_chase_meshes()
    glb_bytes = build_glb(meshes)
    OUTPUT_GLB.write_bytes(glb_bytes)

    if CONFIG_JSON.exists():
        config = json.loads(CONFIG_JSON.read_text(encoding="utf-8"))
    else:
        config = {}
    config["displayName"] = "Prototype Chase GLB"
    config.setdefault("position", [0, 0, 20])
    config.setdefault("rotationDegrees", [0, 180, 0])
    config.setdefault("scale", 1)
    config.setdefault("targetHeight", 3.1)
    config.setdefault("alignFeetToGround", True)
    config.setdefault("boundsNode", "")
    config.setdefault("material", {})
    CONFIG_JSON.write_text(json.dumps(config, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT_GLB}")


if __name__ == "__main__":
    main()
