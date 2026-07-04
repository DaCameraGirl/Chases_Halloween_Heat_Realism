"""Crop a face region from a reference photo for use as a projected head texture.

Run with a regular Python + Pillow environment (NOT Blender's bundled python):
  py -3.11 prepare_face_texture.py

Regenerates face_texture.png, which build_chase_blender.py projects onto the
head mesh via an orthographic camera + UV Project modifier.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PHOTO = ROOT / "reference" / "IMG_1912.jpeg"
OUT_PATH = Path(__file__).resolve().parent / "face_texture.png"

# left, top, right, bottom in source pixel coordinates. Chosen to frame just
# the face/hair, minimizing background bleed. Re-tune if the source photo
# changes.
CROP_BOX = (300, 35, 465, 250)


def main():
    img = Image.open(SOURCE_PHOTO)
    crop = img.crop(CROP_BOX)
    crop.save(OUT_PATH)
    print(f"Saved {OUT_PATH} ({crop.size[0]}x{crop.size[1]})")


if __name__ == "__main__":
    main()
