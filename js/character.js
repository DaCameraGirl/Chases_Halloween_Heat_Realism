import * as THREE from "three";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

const MODEL_ASSET_PATH = "./assets/models/chase.glb";
const MODEL_CONFIG_PATH = "./assets/models/chase.config.json";

const defaultModelConfig = {
  displayName: "Chase GLB",
  position: [0, 0, 20],
  rotationDegrees: [0, 180, 0],
  scale: 1,
  targetHeight: 3.1,
  alignFeetToGround: true,
  boundsNode: "",
  material: {
    roughnessMin: 0.15,
    metalnessMax: 0.45,
    castShadow: false,
    receiveShadow: false
  }
};

function setMaterialsPhysical(root, materialConfig = defaultModelConfig.material) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = materialConfig.castShadow;
    obj.receiveShadow = materialConfig.receiveShadow;
    const material = obj.material;
    if (!material) return;
    if (Array.isArray(material)) {
      material.forEach((m) => {
        if ("roughness" in m) m.roughness = Math.min(1, Math.max(materialConfig.roughnessMin, m.roughness ?? 0.7));
        if ("metalness" in m) m.metalness = Math.min(materialConfig.metalnessMax, m.metalness ?? 0.02);
      });
    } else {
      if ("roughness" in material) material.roughness = Math.min(1, Math.max(materialConfig.roughnessMin, material.roughness ?? 0.7));
      if ("metalness" in material) material.metalness = Math.min(materialConfig.metalnessMax, material.metalness ?? 0.02);
    }
  });
}

async function loadModelConfig() {
  try {
    const response = await fetch(MODEL_CONFIG_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error(`Config fetch failed with ${response.status}`);
    const config = await response.json();
    return {
      ...defaultModelConfig,
      ...config,
      material: {
        ...defaultModelConfig.material,
        ...(config.material ?? {})
      }
    };
  } catch {
    return defaultModelConfig;
  }
}

function degreesToRadians([x = 0, y = 0, z = 0] = []) {
  return [x, y, z].map((value) => THREE.MathUtils.degToRad(value));
}

function getBoundsNode(root, config) {
  if (!config.boundsNode) return root;
  return root.getObjectByName(config.boundsNode) ?? root;
}

function normalizeLoadedCharacter(root, config) {
  const [rotationX, rotationY, rotationZ] = degreesToRadians(config.rotationDegrees);
  const [positionX, positionY, positionZ] = config.position ?? defaultModelConfig.position;
  const boundsNode = getBoundsNode(root, config);
  const size = new THREE.Vector3();
  const box = new THREE.Box3();

  root.position.set(0, 0, 0);
  root.rotation.set(rotationX, rotationY, rotationZ);
  root.scale.setScalar(config.scale ?? 1);

  // Normalize arbitrary Blender export scale to the gameplay rig height.
  box.setFromObject(boundsNode);
  box.getSize(size);
  if (config.targetHeight > 0 && size.y > 0.0001) {
    root.scale.multiplyScalar(config.targetHeight / size.y);
  }

  if (config.alignFeetToGround) {
    box.setFromObject(boundsNode);
    root.position.y -= box.min.y;
  }

  root.position.add(new THREE.Vector3(positionX, positionY, positionZ));
}

function createFallbackChase() {
  const group = new THREE.Group();

  const hoodieMat = new THREE.MeshStandardMaterial({
    color: 0x20242c,
    roughness: 0.9
  });
  const hoodieRibMat = new THREE.MeshStandardMaterial({
    color: 0x191d24,
    roughness: 0.94
  });
  const teeMat = new THREE.MeshStandardMaterial({
    color: 0x0f1115,
    roughness: 0.98
  });
  const zipperMat = new THREE.MeshStandardMaterial({
    color: 0xcfd3d8,
    roughness: 0.4,
    metalness: 0.12
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xc79772,
    roughness: 0.95
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x473229,
    roughness: 0.98
  });
  const browMat = new THREE.MeshStandardMaterial({
    color: 0x2a1b15,
    roughness: 0.95
  });
  const facialHairMat = new THREE.MeshStandardMaterial({
    color: 0x36261f,
    roughness: 1
  });
  const denimMat = new THREE.MeshStandardMaterial({
    color: 0x161a20,
    roughness: 0.96
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0xebedf0,
    roughness: 0.78
  });

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.18, 0.44),
    hoodieMat
  );
  torso.position.y = 1.62;
  torso.scale.set(0.96, 1, 1.02);
  group.add(torso);

  const lowerHoodie = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.42, 0.38),
    hoodieRibMat
  );
  lowerHoodie.position.set(0, 0.93, 0);
  lowerHoodie.scale.set(0.96, 1, 0.98);
  group.add(lowerHoodie);

  const leftShoulder = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.14, 0.2, 4, 8),
    hoodieMat
  );
  leftShoulder.position.set(-0.38, 2.06, 0);
  leftShoulder.rotation.z = 0.92;
  group.add(leftShoulder);

  const rightShoulder = leftShoulder.clone();
  rightShoulder.position.x = 0.38;
  rightShoulder.rotation.z = -0.92;
  group.add(rightShoulder);

  const hoodBack = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 18, 18),
    hoodieMat
  );
  hoodBack.scale.set(1.12, 1.05, 0.78);
  hoodBack.position.set(0, 2.24, -0.17);
  group.add(hoodBack);

  const hoodLip = new THREE.Mesh(
    new THREE.TorusGeometry(0.21, 0.045, 10, 18, Math.PI),
    hoodieRibMat
  );
  hoodLip.position.set(0, 2.15, 0.06);
  hoodLip.rotation.z = Math.PI;
  group.add(hoodLip);

  const teePanel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.29, 0.92),
    teeMat
  );
  teePanel.position.set(0, 1.58, 0.226);
  group.add(teePanel);

  const zipper = new THREE.Mesh(
    new THREE.BoxGeometry(0.028, 1.02, 0.022),
    zipperMat
  );
  zipper.position.set(0, 1.54, 0.228);
  group.add(zipper);

  const drawStringLeft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 0.58, 8),
    new THREE.MeshStandardMaterial({ color: 0xf0efe9, roughness: 0.76 })
  );
  drawStringLeft.position.set(-0.075, 1.85, 0.235);
  drawStringLeft.rotation.z = 0.08;
  group.add(drawStringLeft);

  const drawStringRight = drawStringLeft.clone();
  drawStringRight.position.x = 0.075;
  drawStringRight.rotation.z = -0.08;
  group.add(drawStringRight);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.082, 0.095, 0.18, 10),
    skinMat
  );
  neck.position.y = 2.26;
  group.add(neck);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 24, 24),
    skinMat
  );
  head.scale.set(0.84, 1.08, 0.88);
  head.position.set(0, 2.62, 0.01);
  group.add(head);

  const jaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.14, 0.17),
    skinMat
  );
  jaw.position.set(0, 2.37, 0.09);
  jaw.rotation.x = -0.18;
  group.add(jaw);

  const chin = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.065, 0.09),
    skinMat
  );
  chin.position.set(0, 2.305, 0.105);
  chin.rotation.x = -0.25;
  group.add(chin);

  const leftCheek = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 14, 14),
    skinMat
  );
  leftCheek.scale.set(1.2, 0.8, 0.82);
  leftCheek.position.set(-0.16, 2.51, 0.13);
  group.add(leftCheek);

  const rightCheek = leftCheek.clone();
  rightCheek.position.x = 0.16;
  group.add(rightCheek);

  const leftEar = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 12, 12),
    skinMat
  );
  leftEar.scale.set(0.7, 1, 0.48);
  leftEar.position.set(-0.28, 2.58, -0.01);
  group.add(leftEar);

  const rightEar = leftEar.clone();
  rightEar.position.x = 0.28;
  group.add(rightEar);

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 18, 18),
    hairMat
  );
  hairCap.scale.set(1.08, 1.02, 0.94);
  hairCap.position.set(0, 2.88, -0.015);
  group.add(hairCap);

  for (const [x, y, z, rx, ry, rz, r] of [
    [0, 3.13, 0.03, 1.1, 1, 1, 0.105],
    [-0.13, 3.1, 0.08, 1, 1.08, 1, 0.102],
    [0.13, 3.08, 0.08, 1, 1.08, 1, 0.102],
    [-0.26, 3.02, 0.03, 1, 1, 0.96, 0.1],
    [0.26, 3.02, 0.03, 1, 1, 0.96, 0.1],
    [-0.31, 2.9, -0.02, 0.95, 0.95, 0.9, 0.095],
    [0.31, 2.9, -0.02, 0.95, 0.95, 0.9, 0.095],
    [-0.19, 2.87, 0.14, 0.98, 1, 0.92, 0.09],
    [0.19, 2.87, 0.14, 0.98, 1, 0.92, 0.09],
    [-0.08, 2.95, 0.17, 1, 1, 0.94, 0.088],
    [0.08, 2.94, 0.17, 1, 1, 0.94, 0.088],
    [-0.23, 2.75, 0.16, 0.92, 1, 0.9, 0.086],
    [0.23, 2.75, 0.16, 0.92, 1, 0.9, 0.086],
    [0, 2.76, 0.18, 0.96, 1, 0.92, 0.082]
  ]) {
    const curl = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 14), hairMat);
    curl.scale.set(rx, ry, rz);
    curl.position.set(x, y, z);
    group.add(curl);
  }

  const leftBrow = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.018, 0.028),
    browMat
  );
  leftBrow.position.set(-0.088, 2.665, 0.21);
  leftBrow.rotation.z = -0.13;
  group.add(leftBrow);

  const rightBrow = leftBrow.clone();
  rightBrow.position.x = 0.088;
  rightBrow.rotation.z = 0.13;
  group.add(rightBrow);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1412 });
  const leftEye = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 10, 10),
    eyeMat
  );
  leftEye.scale.set(1.25, 0.68, 0.7);
  leftEye.position.set(-0.09, 2.585, 0.246);
  group.add(leftEye);

  const rightEye = leftEye.clone();
  rightEye.position.x = 0.09;
  group.add(rightEye);

  const noseBridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.046, 0.115, 0.048),
    skinMat
  );
  noseBridge.position.set(0, 2.545, 0.214);
  group.add(noseBridge);

  const noseTip = new THREE.Mesh(
    new THREE.BoxGeometry(0.085, 0.05, 0.068),
    skinMat
  );
  noseTip.position.set(0, 2.48, 0.244);
  noseTip.rotation.x = -0.08;
  group.add(noseTip);

  const philtrum = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.04, 0.022),
    skinMat
  );
  philtrum.position.set(0, 2.43, 0.226);
  group.add(philtrum);

  const upperLip = new THREE.Mesh(
    new THREE.BoxGeometry(0.118, 0.016, 0.026),
    new THREE.MeshStandardMaterial({ color: 0x7d5143, roughness: 0.9 })
  );
  upperLip.position.set(0, 2.395, 0.232);
  group.add(upperLip);

  const lowerLip = new THREE.Mesh(
    new THREE.BoxGeometry(0.102, 0.022, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x9d6656, roughness: 0.88 })
  );
  lowerLip.position.set(0, 2.367, 0.226);
  group.add(lowerLip);

  const mustache = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.014, 0.018),
    facialHairMat
  );
  mustache.position.set(0, 2.417, 0.236);
  group.add(mustache);

  const soulPatch = new THREE.Mesh(
    new THREE.BoxGeometry(0.034, 0.028, 0.018),
    facialHairMat
  );
  soulPatch.position.set(0, 2.332, 0.17);
  group.add(soulPatch);

  const leftLeg = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.104, 1.32, 4, 8),
    denimMat
  );
  leftLeg.position.set(-0.13, 0.58, 0);
  group.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.13;
  group.add(rightLeg);

  const leftShoe = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.08, 0.3),
    shoeMat
  );
  leftShoe.position.set(-0.13, 0.06, 0.08);
  group.add(leftShoe);

  const rightShoe = leftShoe.clone();
  rightShoe.position.x = 0.13;
  group.add(rightShoe);

  const leftArm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.082, 1.16, 4, 8),
    hoodieMat
  );
  leftArm.position.set(-0.44, 1.67, 0.01);
  leftArm.rotation.z = 0.12;
  leftArm.rotation.x = 0.04;
  group.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.x = 0.44;
  rightArm.rotation.z = -0.12;
  group.add(rightArm);

  const leftHand = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 12, 12),
    skinMat
  );
  leftHand.scale.set(0.72, 0.82, 0.65);
  leftHand.position.set(-0.5, 1.03, 0.04);
  group.add(leftHand);

  const rightHand = leftHand.clone();
  rightHand.position.x = 0.5;
  group.add(rightHand);

  return { group, isFallback: true };
}

export async function createChaseCharacter(scene) {
  const loader = new GLTFLoader();
  const modelConfig = await loadModelConfig();

  try {
    const gltf = await loader.loadAsync(MODEL_ASSET_PATH);
    const root = gltf.scene;
    normalizeLoadedCharacter(root, modelConfig);
    setMaterialsPhysical(root, modelConfig.material);
    scene.add(root);
    return {
      group: root,
      isFallback: false,
      modelLabel: modelConfig.displayName,
      assetPath: MODEL_ASSET_PATH
    };
  } catch {
    const fallback = createFallbackChase();
    fallback.group.position.set(0, 0, 20);
    scene.add(fallback.group);
    return {
      ...fallback,
      modelLabel: "Starter Rig"
    };
  }
}
