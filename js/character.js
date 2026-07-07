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

export const costumeStyles = [
  { name: "Default Fit", hoodieColor: 0x20242c, hairColor: 0x473229, maskType: "none" },
  { name: "Pumpkin Phantom", hoodieColor: 0xd76618, hairColor: 0x22120b, maskType: "pumpkin" },
  { name: "Witch Knight", hoodieColor: 0x59328c, hairColor: 0x24152f, maskType: "witch" },
  { name: "Devil Dash", hoodieColor: 0x8f2736, hairColor: 0x281116, maskType: "devil" }
];

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
  const warmSkinMat = new THREE.MeshStandardMaterial({
    color: 0xd0a180,
    roughness: 0.94
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
  head.scale.set(0.83, 1.1, 0.9);
  head.position.set(0, 2.62, 0.005);
  group.add(head);

  const facePlane = new THREE.Mesh(
    new THREE.BoxGeometry(0.27, 0.34, 0.11),
    warmSkinMat
  );
  facePlane.position.set(0, 2.56, 0.18);
  group.add(facePlane);

  const jaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.14, 0.17),
    skinMat
  );
  jaw.position.set(0, 2.37, 0.095);
  jaw.rotation.x = -0.2;
  group.add(jaw);

  const chin = new THREE.Mesh(
    new THREE.BoxGeometry(0.115, 0.07, 0.1),
    skinMat
  );
  chin.position.set(0, 2.305, 0.115);
  chin.rotation.x = -0.25;
  group.add(chin);

  const leftCheek = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 14, 14),
    skinMat
  );
  leftCheek.scale.set(1.12, 0.76, 0.7);
  leftCheek.position.set(-0.145, 2.5, 0.15);
  group.add(leftCheek);

  const rightCheek = leftCheek.clone();
  rightCheek.position.x = 0.16;
  group.add(rightCheek);

  const leftCheekbone = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 12),
    warmSkinMat
  );
  leftCheekbone.scale.set(1.2, 0.68, 0.8);
  leftCheekbone.position.set(-0.145, 2.57, 0.19);
  group.add(leftCheekbone);

  const rightCheekbone = leftCheekbone.clone();
  rightCheekbone.position.x = 0.145;
  group.add(rightCheekbone);

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

  const curlGroup = new THREE.Group();
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
    curlGroup.add(curl);
  }
  group.add(curlGroup);

  const leftBrow = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.018, 0.028),
    browMat
  );
  leftBrow.position.set(-0.088, 2.67, 0.222);
  leftBrow.rotation.z = -0.13;
  group.add(leftBrow);

  const rightBrow = leftBrow.clone();
  rightBrow.position.x = 0.088;
  rightBrow.rotation.z = 0.13;
  group.add(rightBrow);

  const browBridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.028, 0.05),
    skinMat
  );
  browBridge.position.set(0, 2.655, 0.202);
  group.add(browBridge);

  const eyeSocketMat = new THREE.MeshStandardMaterial({ color: 0x845f4f, roughness: 1 });
  const leftEyeSocket = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 12, 12),
    eyeSocketMat
  );
  leftEyeSocket.scale.set(1.12, 0.75, 0.5);
  leftEyeSocket.position.set(-0.09, 2.575, 0.205);
  group.add(leftEyeSocket);

  const rightEyeSocket = leftEyeSocket.clone();
  rightEyeSocket.position.x = 0.09;
  group.add(rightEyeSocket);

  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xe9dfd3, roughness: 0.7 });
  const leftEye = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 12, 12),
    eyeWhiteMat
  );
  leftEye.scale.set(1.22, 0.82, 0.84);
  leftEye.position.set(-0.09, 2.582, 0.235);
  group.add(leftEye);

  const rightEye = leftEye.clone();
  rightEye.position.x = 0.09;
  group.add(rightEye);

  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x181210 });
  const leftPupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 10, 10),
    pupilMat
  );
  leftPupil.scale.set(0.9, 1.1, 0.55);
  leftPupil.position.set(-0.09, 2.58, 0.259);
  group.add(leftPupil);

  const rightPupil = leftPupil.clone();
  rightPupil.position.x = 0.09;
  group.add(rightPupil);

  const leftUpperLid = new THREE.Mesh(
    new THREE.BoxGeometry(0.066, 0.02, 0.03),
    warmSkinMat
  );
  leftUpperLid.position.set(-0.09, 2.603, 0.241);
  leftUpperLid.rotation.z = -0.05;
  group.add(leftUpperLid);

  const rightUpperLid = leftUpperLid.clone();
  rightUpperLid.position.x = 0.09;
  rightUpperLid.rotation.z = 0.05;
  group.add(rightUpperLid);

  const leftLowerLid = new THREE.Mesh(
    new THREE.BoxGeometry(0.062, 0.012, 0.02),
    skinMat
  );
  leftLowerLid.position.set(-0.09, 2.552, 0.236);
  group.add(leftLowerLid);

  const rightLowerLid = leftLowerLid.clone();
  rightLowerLid.position.x = 0.09;
  group.add(rightLowerLid);

  const noseBridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.13, 0.05),
    skinMat
  );
  noseBridge.position.set(0, 2.54, 0.222);
  group.add(noseBridge);

  const noseTip = new THREE.Mesh(
    new THREE.BoxGeometry(0.078, 0.052, 0.07),
    warmSkinMat
  );
  noseTip.position.set(0, 2.47, 0.253);
  noseTip.rotation.x = -0.08;
  group.add(noseTip);

  const leftNoseWing = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 10, 10),
    warmSkinMat
  );
  leftNoseWing.scale.set(0.9, 0.72, 0.9);
  leftNoseWing.position.set(-0.038, 2.47, 0.242);
  group.add(leftNoseWing);

  const rightNoseWing = leftNoseWing.clone();
  rightNoseWing.position.x = 0.038;
  group.add(rightNoseWing);

  const leftNostril = new THREE.Mesh(
    new THREE.SphereGeometry(0.01, 8, 8),
    pupilMat
  );
  leftNostril.scale.set(1.1, 0.7, 1.2);
  leftNostril.position.set(-0.022, 2.447, 0.266);
  group.add(leftNostril);

  const rightNostril = leftNostril.clone();
  rightNostril.position.x = 0.022;
  group.add(rightNostril);

  const philtrum = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.04, 0.022),
    skinMat
  );
  philtrum.position.set(0, 2.42, 0.236);
  group.add(philtrum);

  const upperLipMat = new THREE.MeshStandardMaterial({ color: 0x87594a, roughness: 0.9 });
  const lowerLipMat = new THREE.MeshStandardMaterial({ color: 0xa56f5e, roughness: 0.88 });

  const upperLipLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.016, 0.028),
    upperLipMat
  );
  upperLipLeft.position.set(-0.03, 2.392, 0.245);
  upperLipLeft.rotation.z = -0.1;
  group.add(upperLipLeft);

  const upperLipRight = upperLipLeft.clone();
  upperLipRight.position.x = 0.03;
  upperLipRight.rotation.z = 0.1;
  group.add(upperLipRight);

  const cupidBow = new THREE.Mesh(
    new THREE.BoxGeometry(0.024, 0.013, 0.026),
    upperLipMat
  );
  cupidBow.position.set(0, 2.398, 0.246);
  group.add(cupidBow);

  const lowerLip = new THREE.Mesh(
    new THREE.BoxGeometry(0.092, 0.024, 0.034),
    lowerLipMat
  );
  lowerLip.position.set(0, 2.364, 0.24);
  group.add(lowerLip);

  const mouthLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.008, 0.014),
    pupilMat
  );
  mouthLine.position.set(0, 2.383, 0.255);
  group.add(mouthLine);

  const leftMouthCorner = new THREE.Mesh(
    new THREE.SphereGeometry(0.01, 8, 8),
    upperLipMat
  );
  leftMouthCorner.position.set(-0.048, 2.382, 0.247);
  group.add(leftMouthCorner);

  const rightMouthCorner = leftMouthCorner.clone();
  rightMouthCorner.position.x = 0.048;
  group.add(rightMouthCorner);

  const mustache = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.012, 0.016),
    facialHairMat
  );
  mustache.position.set(0, 2.413, 0.252);
  group.add(mustache);

  const soulPatch = new THREE.Mesh(
    new THREE.BoxGeometry(0.034, 0.028, 0.018),
    facialHairMat
  );
  soulPatch.position.set(0, 2.332, 0.188);
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

  // Costume accessory group (Witch Hat, devil horns, pumpkin face mask)
  const accessoryGroup = new THREE.Group();
  accessoryGroup.position.y = 2.62;
  group.add(accessoryGroup);

  // Witch hat
  const witchHat = new THREE.Group();
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 0.04, 16),
    new THREE.MeshStandardMaterial({ color: 0x1a1220, roughness: 0.8 })
  );
  brim.position.y = 0.38;
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.26, 0.72, 16),
    new THREE.MeshStandardMaterial({ color: 0x2d183d, roughness: 0.8 })
  );
  cone.position.set(0, 0.74, -0.05);
  cone.rotation.x = -0.12;
  witchHat.add(brim, cone);
  witchHat.name = "witch";
  witchHat.visible = false;
  accessoryGroup.add(witchHat);

  // Devil horns
  const devilHorns = new THREE.Group();
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.28, 8),
      new THREE.MeshStandardMaterial({ color: 0xcc2936, roughness: 0.5, emissive: 0x660000 })
    );
    horn.position.set(side * 0.16, 0.38, 0.1);
    horn.rotation.z = -side * 0.32;
    horn.rotation.x = 0.18;
    devilHorns.add(horn);
  }
  devilHorns.name = "devil";
  devilHorns.visible = false;
  accessoryGroup.add(devilHorns);

  // Pumpkin mask
  const pumpkinMask = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xe67319, roughness: 0.7 })
  );
  pumpkinMask.scale.set(1.1, 0.95, 0.85);
  pumpkinMask.position.set(0, -0.1, 0.18);
  pumpkinMask.name = "pumpkin";
  pumpkinMask.visible = false;
  accessoryGroup.add(pumpkinMask);

  return {
    group,
    isFallback: true,
    hoodieMat,
    hairMat,
    witchHat,
    devilHorns,
    pumpkinMask
  };
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

export function applyChaseCostume(chase, index) {
  if (!chase) return;
  const style = costumeStyles[index];
  
  if (chase.isFallback) {
    if (chase.hoodieMat) chase.hoodieMat.color.setHex(style.hoodieColor);
    if (chase.hairMat) chase.hairMat.color.setHex(style.hairColor);

    if (chase.witchHat) chase.witchHat.visible = (style.maskType === "witch");
    if (chase.devilHorns) chase.devilHorns.visible = (style.maskType === "devil");
    if (chase.pumpkinMask) chase.pumpkinMask.visible = (style.maskType === "pumpkin");
  }
}

export function createNoFaceCharacter(scene) {
  const group = new THREE.Group();

  // Outer tall cloak
  const cloak = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.58, 2.0, 10),
    new THREE.MeshStandardMaterial({ color: 0x090c12, roughness: 0.98 })
  );
  cloak.position.y = 1.0;
  group.add(cloak);

  // Mask and hood group
  const headGroup = new THREE.Group();
  headGroup.position.y = 2.15;

  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 14, 14),
    new THREE.MeshStandardMaterial({ color: 0x090c12, roughness: 0.95 })
  );
  hood.scale.set(1.05, 1.1, 1.15);
  headGroup.add(hood);

  // Face mask
  const mask = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 14, 14),
    new THREE.MeshStandardMaterial({
      color: 0xe8e8e2,
      roughness: 0.58,
      emissive: 0x1f2229,
      emissiveIntensity: 0.3
    })
  );
  mask.scale.set(0.88, 1.04, 0.68);
  mask.position.set(0, 0.02, 0.16);
  headGroup.add(mask);

  // Creepy hollow eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x05070a });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyeMat);
  leftEye.position.set(-0.075, 0.08, 0.29);
  leftEye.scale.set(1.2, 0.6, 0.6);
  headGroup.add(leftEye);

  const rightEye = leftEye.clone();
  rightEye.position.x = 0.075;
  headGroup.add(rightEye);

  // Red markings
  const redMat = new THREE.MeshBasicMaterial({ color: 0x9c1a24 });
  const topMark = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.065, 0.02), redMat);
  topMark.position.set(0, 0.16, 0.3);
  headGroup.add(topMark);

  const bottomMark = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.065, 0.02), redMat);
  bottomMark.position.set(0, -0.12, 0.3);
  headGroup.add(bottomMark);

  group.add(headGroup);

  // Shadow disc
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.72, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  group.position.set(20, 0, -20);
  scene.add(group);

  return { group, isFallback: true };
}
