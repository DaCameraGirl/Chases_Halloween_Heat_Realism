import * as THREE from "three";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

function setMaterialsPhysical(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = false;
    const material = obj.material;
    if (!material) return;
    if (Array.isArray(material)) {
      material.forEach((m) => {
        if ("roughness" in m) m.roughness = Math.min(1, Math.max(0.15, m.roughness ?? 0.7));
        if ("metalness" in m) m.metalness = Math.min(0.45, m.metalness ?? 0.02);
      });
    } else {
      if ("roughness" in material) material.roughness = Math.min(1, Math.max(0.15, material.roughness ?? 0.7));
      if ("metalness" in material) material.metalness = Math.min(0.45, material.metalness ?? 0.02);
    }
  });
}

function createFallbackChase() {
  const group = new THREE.Group();

  const hoodie = new THREE.Mesh(
    new THREE.BoxGeometry(0.84, 1.48, 0.42),
    new THREE.MeshStandardMaterial({
      color: 0x171c24,
      roughness: 0.88
    })
  );
  hoodie.position.y = 1.56;
  group.add(hoodie);

  const shirt = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 1.04),
    new THREE.MeshBasicMaterial({ color: 0x0f1014 })
  );
  shirt.position.set(0, 1.5, 0.215);
  group.add(shirt);

  const zipper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.035, 1.04),
    new THREE.MeshBasicMaterial({ color: 0xdfe5ea })
  );
  zipper.position.set(0, 1.48, 0.22);
  group.add(zipper);

  const drawStringLeft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.72, 8),
    new THREE.MeshStandardMaterial({ color: 0xece7e0, roughness: 0.72 })
  );
  drawStringLeft.position.set(-0.08, 1.86, 0.22);
  drawStringLeft.rotation.z = 0.06;
  group.add(drawStringLeft);

  const drawStringRight = drawStringLeft.clone();
  drawStringRight.position.x = 0.08;
  drawStringRight.rotation.z = -0.06;
  group.add(drawStringRight);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.095, 0.16, 10),
    new THREE.MeshStandardMaterial({ color: 0xb28f73, roughness: 0.9 })
  );
  neck.position.y = 2.28;
  group.add(neck);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 20, 20),
    new THREE.MeshStandardMaterial({
      color: 0xb28f73,
      roughness: 0.92
    })
  );
  head.scale.set(0.88, 1.05, 0.84);
  head.position.y = 2.62;
  group.add(head);

  const jaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.16, 0.18),
    head.material
  );
  jaw.position.set(0, 2.39, 0.09);
  jaw.rotation.x = -0.08;
  group.add(jaw);

  const hairMat = new THREE.MeshStandardMaterial({ color: 0x34221b, roughness: 0.95 });
  const hairCore = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), hairMat);
  hairCore.scale.set(1.16, 1.2, 1.03);
  hairCore.position.set(0, 3.04, -0.02);
  group.add(hairCore);

  for (const [x, y, z, r] of [
    [0, 3.28, 0.02, 0.11],
    [-0.15, 3.2, 0.03, 0.1],
    [0.15, 3.18, 0.03, 0.1],
    [-0.26, 3.02, 0.03, 0.1],
    [0.26, 3.02, 0.03, 0.1],
    [-0.18, 2.88, 0.1, 0.09],
    [0.18, 2.88, 0.1, 0.09]
  ]) {
    const curl = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 12), hairMat);
    curl.position.set(x, y, z);
    group.add(curl);
  }

  const browMat = new THREE.MeshStandardMaterial({ color: 0x241712, roughness: 0.92 });
  const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.018, 0.03), browMat);
  leftBrow.position.set(-0.085, 2.66, 0.21);
  leftBrow.rotation.z = -0.08;
  group.add(leftBrow);

  const rightBrow = leftBrow.clone();
  rightBrow.position.x = 0.085;
  rightBrow.rotation.z = 0.08;
  group.add(rightBrow);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x161311 });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), eyeMat);
  leftEye.scale.set(1.05, 0.74, 0.65);
  leftEye.position.set(-0.085, 2.59, 0.245);
  group.add(leftEye);

  const rightEye = leftEye.clone();
  rightEye.position.x = 0.085;
  group.add(rightEye);

  const noseBridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.052, 0.11, 0.052),
    head.material
  );
  noseBridge.position.set(0, 2.55, 0.225);
  group.add(noseBridge);

  const noseTip = new THREE.Mesh(
    new THREE.BoxGeometry(0.098, 0.05, 0.062),
    head.material
  );
  noseTip.position.set(0, 2.49, 0.246);
  noseTip.rotation.x = -0.05;
  group.add(noseTip);

  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.018, 0.026),
    new THREE.MeshBasicMaterial({ color: 0x6e4338 })
  );
  mouth.position.set(0, 2.425, 0.236);
  group.add(mouth);

  const leftLeg = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.11, 1.25, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x11151b, roughness: 0.96 })
  );
  leftLeg.position.set(-0.14, 0.6, 0);
  group.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.14;
  group.add(rightLeg);

  const leftArm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.085, 1.12, 4, 8),
    hoodie.material
  );
  leftArm.position.set(-0.42, 1.74, 0);
  leftArm.rotation.z = 0.08;
  group.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.x = 0.42;
  rightArm.rotation.z = -0.08;
  group.add(rightArm);

  return { group, isFallback: true };
}

export async function createChaseCharacter(scene) {
  const loader = new GLTFLoader();
  const assetPath = "./assets/models/chase.glb";

  try {
    const gltf = await loader.loadAsync(assetPath);
    const root = gltf.scene;
    root.position.set(0, 0, 20);
    root.rotation.y = Math.PI;
    root.scale.setScalar(1.85);
    setMaterialsPhysical(root);
    scene.add(root);
    return { group: root, isFallback: false };
  } catch {
    const fallback = createFallbackChase();
    fallback.group.position.set(0, 0, 20);
    scene.add(fallback.group);
    return fallback;
  }
}
