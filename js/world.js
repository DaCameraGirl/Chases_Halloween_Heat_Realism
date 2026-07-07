import * as THREE from "three";

// Helper to create procedural canvas textures
function createCanvasTexture(width, height, painter) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const ctx = element.getContext("2d");
  painter(ctx, width, height);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createLabelTexture(text, options = {}) {
  const {
    width = 512,
    height = 168,
    background = "#0b0f1b",
    accent = "#ff8f3d",
    foreground = "#f6ede6",
    secondary = "#aeb6d0"
  } = options;
  return createCanvasTexture(width, height, (ctx, w, h) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = accent;
    ctx.fillRect(18, 18, w - 36, 28);
    ctx.fillStyle = background;
    ctx.font = "700 26px sans-serif";
    ctx.fillText("LOS PUMPKINTOS", 32, 40);
    ctx.fillStyle = foreground;
    ctx.font = "700 52px sans-serif";
    ctx.fillText(text, 30, 102);
    ctx.fillStyle = secondary;
    ctx.font = "500 24px sans-serif";
    ctx.fillText("Open late. Haunted always.", 30, 138);
  });
}

function createBadgeTexture(text, options = {}) {
  const {
    width = 160,
    height = 160,
    background = "#1a1f2e",
    accent = "#ffcf5a",
    foreground = "#f7f2e8"
  } = options;
  return createCanvasTexture(width, height, (ctx, w, h) => {
    ctx.fillStyle = background;
    ctx.beginPath();
    ctx.roundRect(10, 10, w - 20, h - 20, 24);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.fillStyle = foreground;
    ctx.font = "700 72px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + 4);
  });
}

// Procedural textures for 4 different carved Jack-o'-lantern face designs
function createJackOLanternTexture(designIndex) {
  return createCanvasTexture(256, 128, (ctx, w, h) => {
    // Orange skin background
    ctx.fillStyle = "#d76618";
    ctx.fillRect(0, 0, w, h);
    
    // Glowing paint
    ctx.fillStyle = "#ffe045";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#ff7700";
    
    if (designIndex === 0) {
      // 1. Classic Spooky Face
      // Left eye
      ctx.beginPath();
      ctx.moveTo(w * 0.28, h * 0.36);
      ctx.lineTo(w * 0.40, h * 0.36);
      ctx.lineTo(w * 0.34, h * 0.22);
      ctx.closePath();
      ctx.fill();
      
      // Right eye
      ctx.beginPath();
      ctx.moveTo(w * 0.60, h * 0.36);
      ctx.lineTo(w * 0.72, h * 0.36);
      ctx.lineTo(w * 0.66, h * 0.22);
      ctx.closePath();
      ctx.fill();
      
      // Nose
      ctx.beginPath();
      ctx.moveTo(w * 0.46, h * 0.52);
      ctx.lineTo(w * 0.54, h * 0.52);
      ctx.lineTo(w * 0.50, h * 0.44);
      ctx.closePath();
      ctx.fill();
      
      // Jagged mouth
      ctx.beginPath();
      ctx.moveTo(w * 0.22, h * 0.65);
      ctx.lineTo(w * 0.32, h * 0.78);
      ctx.lineTo(w * 0.40, h * 0.70);
      ctx.lineTo(w * 0.50, h * 0.82);
      ctx.lineTo(w * 0.60, h * 0.70);
      ctx.lineTo(w * 0.68, h * 0.78);
      ctx.lineTo(w * 0.78, h * 0.65);
      ctx.lineTo(w * 0.70, h * 0.69);
      ctx.lineTo(w * 0.60, h * 0.60);
      ctx.lineTo(w * 0.50, h * 0.71);
      ctx.lineTo(w * 0.40, h * 0.60);
      ctx.lineTo(w * 0.30, h * 0.69);
      ctx.closePath();
      ctx.fill();
    } else if (designIndex === 1) {
      // 2. Cute / Happy Smile
      // Left eye (circle)
      ctx.beginPath();
      ctx.arc(w * 0.35, h * 0.30, 9, 0, Math.PI * 2);
      ctx.fill();
      
      // Right eye (circle)
      ctx.beginPath();
      ctx.arc(w * 0.65, h * 0.30, 9, 0, Math.PI * 2);
      ctx.fill();
      
      // Nose (tiny circle)
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.48, 5, 0, Math.PI * 2);
      ctx.fill();
      
      // Smile with teeth
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.58, 20, 0, Math.PI);
      ctx.fill();
    } else if (designIndex === 2) {
      // 3. Angry / Scary Face
      // Left eye (slant)
      ctx.beginPath();
      ctx.moveTo(w * 0.24, h * 0.22);
      ctx.lineTo(w * 0.40, h * 0.34);
      ctx.lineTo(w * 0.28, h * 0.37);
      ctx.closePath();
      ctx.fill();
      
      // Right eye (slant)
      ctx.beginPath();
      ctx.moveTo(w * 0.76, h * 0.22);
      ctx.lineTo(w * 0.60, h * 0.34);
      ctx.lineTo(w * 0.72, h * 0.37);
      ctx.closePath();
      ctx.fill();
      
      // Nose
      ctx.beginPath();
      ctx.moveTo(w * 0.46, h * 0.46);
      ctx.lineTo(w * 0.54, h * 0.46);
      ctx.lineTo(w * 0.50, h * 0.56);
      ctx.closePath();
      ctx.fill();
      
      // Scary mouth with fangs
      ctx.beginPath();
      ctx.moveTo(w * 0.20, h * 0.64);
      ctx.lineTo(w * 0.32, h * 0.70);
      ctx.lineTo(w * 0.35, h * 0.77); // fang L
      ctx.lineTo(w * 0.38, h * 0.70);
      ctx.lineTo(w * 0.50, h * 0.74);
      ctx.lineTo(w * 0.62, h * 0.70);
      ctx.lineTo(w * 0.65, h * 0.77); // fang R
      ctx.lineTo(w * 0.68, h * 0.70);
      ctx.lineTo(w * 0.80, h * 0.64);
      ctx.lineTo(w * 0.68, h * 0.83);
      ctx.lineTo(w * 0.50, h * 0.86);
      ctx.lineTo(w * 0.32, h * 0.83);
      ctx.closePath();
      ctx.fill();
    } else {
      // 4. Shocked / Ghost Face
      // Left eye (oval)
      ctx.beginPath();
      ctx.ellipse(w * 0.33, h * 0.30, 8, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Right eye (oval)
      ctx.beginPath();
      ctx.ellipse(w * 0.67, h * 0.30, 8, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Shocked mouth (big oval)
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.69, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function createWorld(scene) {
  const world = {
    roads: [],
    lamps: [],
    houses: [],
    solids: [],
    trees: [],
    pumpkins: [],
    cars: [],
    graves: [],
    kids: [],
    ghosts: [],
    candies: [],
    zones: [],
    signs: [],
    leaves: []
  };

  const worldBounds = 48;

  // Generate 4 distinct textures for variety
  const jackOLanternTextures = [
    createJackOLanternTexture(0),
    createJackOLanternTexture(1),
    createJackOLanternTexture(2),
    createJackOLanternTexture(3)
  ];

  // Ground Textures
  const asphaltTexture = createCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#11151f";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1700; i++) {
      const alpha = 0.05 + Math.random() * 0.08;
      const size = 1 + Math.random() * 3;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, size, size);
    }
    ctx.fillStyle = "rgba(18, 20, 27, 0.65)";
    for (let i = 0; i < 18; i++) {
      const y = (i / 18) * h;
      ctx.fillRect(0, y, w, 8);
    }
  });
  asphaltTexture.wrapS = THREE.RepeatWrapping;
  asphaltTexture.wrapT = THREE.RepeatWrapping;
  asphaltTexture.repeat.set(6, 6);

  const grassTexture = createCanvasTexture(512, 512, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#112214");
    gradient.addColorStop(1, "#0a120c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const alpha = 0.05 + Math.random() * 0.08;
      const size = 1 + Math.random() * 2;
      ctx.fillStyle = `rgba(101, 164, 103, ${alpha})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, size, size);
    }
  });
  grassTexture.wrapS = THREE.RepeatWrapping;
  grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(20, 20);

  // Spooky Moon & glow sky
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(3.4, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xc6e6ff })
  );
  moon.position.set(-60, 40, -80);
  scene.add(moon);

  const skyGlow = new THREE.Mesh(
    new THREE.SphereGeometry(18, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0x7e93ff, transparent: true, opacity: 0.06 })
  );
  skyGlow.position.copy(moon.position);
  scene.add(skyGlow);

  // Ground plane
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({ map: grassTexture, color: 0xd1ffd1, roughness: 1, metalness: 0 })
  );
  grass.rotation.x = -Math.PI / 2;
  scene.add(grass);

  const asphaltMaterial = new THREE.MeshStandardMaterial({
    map: asphaltTexture,
    color: 0xdfe5ff,
    roughness: 0.86,
    metalness: 0.1
  });

  // ROADS
  function addRoad(x, z, width, depth, rotation = 0) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), asphaltMaterial);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = rotation;
    road.position.set(x, 0.02, z);
    scene.add(road);
    world.roads.push(road);

    const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xffc773 });
    const stripeCount = Math.max(3, Math.floor(depth / 8));
    for (let i = 0; i < stripeCount; i++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 3), stripeMaterial);
      stripe.rotation.x = -Math.PI / 2;
      stripe.rotation.z = rotation;
      const offset = -depth / 2 + 4 + i * ((depth - 8) / Math.max(1, stripeCount - 1));
      const local = new THREE.Vector3(0, 0.03, offset);
      local.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
      stripe.position.set(x + local.x, local.y, z + local.z);
      scene.add(stripe);
    }
  }

  addRoad(0, 0, 16, 90, 0);
  addRoad(0, 0, 90, 16, 0);
  addRoad(-26, 14, 38, 12, Math.PI * 0.14);
  addRoad(26, -14, 42, 12, -Math.PI * 0.12);

  // LAMPS
  function createLamp(x, z) {
    const group = new THREE.Group();

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.18, 5, 8),
      new THREE.MeshStandardMaterial({ color: 0x2d3443, roughness: 0.95 })
    );
    pole.position.y = 2.5;
    group.add(pole);

    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x2d3443, roughness: 0.95 })
    );
    arm.position.set(0.45, 4.65, 0);
    group.add(arm);

    const lantern = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.54, 0.44),
      new THREE.MeshStandardMaterial({ color: 0xffbc7d, emissive: 0xff8c39, emissiveIntensity: 1.5, roughness: 0.35 })
    );
    lantern.position.set(0.9, 4.35, 0);
    group.add(lantern);

    const light = new THREE.PointLight(0xff9e57, 1.5, 14, 2);
    light.position.set(0.9, 4.3, 0);
    group.add(light);

    group.position.set(x, 0, z);
    scene.add(group);
    world.lamps.push({ group, light, x, z, phase: Math.random() * Math.PI * 2 });

    // Collisions for lamp bases
    world.solids.push({
      minX: x - 0.3,
      maxX: x + 0.3,
      minZ: z - 0.3,
      maxZ: z + 0.3
    });
  }

  [
    [-16, -10], [-12, 15], [0, -22], [16, 11], [22, -12], [-25, 26], [28, 25], [-31, -24]
  ].forEach(([x, z]) => createLamp(x, z));

  // GLOWING PUMPKIN HOUSE (COSTUME BLENDER HOUSE)
  function createPumpkinHouse(x, z, config) {
    const group = new THREE.Group();
    const segmentCount = 10;
    const orangeMat = new THREE.MeshStandardMaterial({
      color: 0xd76618,
      roughness: 0.72,
      metalness: 0.05,
      emissive: 0x3d1100,
      emissiveIntensity: 0.3
    });

    // Ribbed structural sphereSegments
    for (let i = 0; i < segmentCount; i++) {
      const seg = new THREE.Mesh(
        new THREE.SphereGeometry(3.6, 16, 16),
        orangeMat
      );
      seg.scale.set(1.08, 0.85, 0.78);
      seg.rotation.y = (i / segmentCount) * Math.PI;
      group.add(seg);
    }

    // Stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.7, 1.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x224411, roughness: 1 })
    );
    stem.position.y = 2.9;
    stem.rotation.z = -0.15;
    group.add(stem);

    // Carved Glowing Eye windows
    const faceColor = 0xffdf58;
    const glowMat = new THREE.MeshBasicMaterial({ color: faceColor });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.8, 3), glowMat);
      eye.rotation.x = Math.PI / 2;
      eye.position.set(side * 1.3, 1.8, 2.85);
      group.add(eye);
    }

    // Entrance door vault
    const doorway = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 2.1, 1.2),
      new THREE.MeshBasicMaterial({ color: 0x11071c })
    );
    doorway.position.set(0, 0.9, 3.1);
    group.add(doorway);

    // Dynamic Shop light
    const shopLight = new THREE.PointLight(0xff7700, 3.0, 16, 1.5);
    shopLight.position.set(0, 1.5, 1.5);
    group.add(shopLight);

    if (config.sign) {
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(5.4, 1.5),
        new THREE.MeshBasicMaterial({
          map: createLabelTexture(config.sign, {
            background: "#120913",
            accent: config.signAccent,
            foreground: "#f6ede6",
            secondary: "#aeb6d0"
          }),
          transparent: true
        })
      );
      sign.position.set(0, 4.4, 1.8);
      group.add(sign);
      world.signs.push(sign);
    }

    group.position.set(x, 0, z);
    scene.add(group);

    world.houses.push({
      group,
      x,
      z,
      w: 7.2,
      d: 7.2,
      enterable: true
    });

    world.solids.push({
      minX: x - 3.6,
      maxX: x + 3.6,
      minZ: z - 3.6,
      maxZ: z + 3.6
    });
  }

  // STANDARD HOUSES & SHOPS
  function createHouse(config) {
    const group = new THREE.Group();
    const wallMaterial = new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.94 });
    const wallDepth = 0.32;

    if (config.enterable) {
      const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(config.w, config.h, wallDepth),
        wallMaterial
      );
      backWall.position.set(0, config.h / 2, -config.d / 2 + wallDepth / 2);
      group.add(backWall);

      const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallDepth, config.h, config.d),
        wallMaterial
      );
      leftWall.position.set(-config.w / 2 + wallDepth / 2, config.h / 2, 0);
      group.add(leftWall);

      const rightWall = leftWall.clone();
      rightWall.position.x = config.w / 2 - wallDepth / 2;
      group.add(rightWall);

      const fascia = new THREE.Mesh(
        new THREE.BoxGeometry(config.w, config.h * 0.26, wallDepth),
        wallMaterial
      );
      fascia.position.set(0, config.h * 0.88, config.d / 2 - wallDepth / 2);
      group.add(fascia);

      const interiorFloor = new THREE.Mesh(
        new THREE.BoxGeometry(config.w * 0.88, 0.14, config.d * 0.78),
        new THREE.MeshStandardMaterial({ color: 0x2c2334, emissive: 0x130d18, emissiveIntensity: 0.45, roughness: 0.95 })
      );
      interiorFloor.position.set(0, 0.07, -0.1);
      group.add(interiorFloor);

      const rackBase = new THREE.Mesh(
        new THREE.BoxGeometry(config.w * 0.42, 0.24, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x352432, roughness: 0.9 })
      );
      rackBase.position.set(0, 0.12, -config.d * 0.1);
      group.add(rackBase);

      for (const side of [-1, 1]) {
        const hanger = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8),
          new THREE.MeshStandardMaterial({ color: 0xd9cad8, metalness: 0.4, roughness: 0.35 })
        );
        hanger.position.set(side * 0.8, 1.08, -config.d * 0.1);
        group.add(hanger);

        const costume = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.24, 0.58, 5, 10),
          new THREE.MeshStandardMaterial({
            color: side < 0 ? 0xff6b54 : 0x8b6cff,
            emissive: side < 0 ? 0x5a1e14 : 0x281254,
            emissiveIntensity: 0.2,
            roughness: 0.7
          })
        );
        costume.position.set(side * 0.8, 1.18, -config.d * 0.1);
        group.add(costume);
      }

      const ceilingGlow = new THREE.PointLight(0xffddb0, 1.85, 16, 2);
      ceilingGlow.position.set(0, 3.15, -0.25);
      group.add(ceilingGlow);

      const fittingGlow = new THREE.PointLight(0xff74c7, 1.8, 14, 2);
      fittingGlow.position.set(0, 2.55, -0.55);
      group.add(fittingGlow);

      const doorwayGlow = new THREE.PointLight(0xffb45d, 1.35, 12, 2);
      doorwayGlow.position.set(0, 2.1, config.d * 0.34);
      group.add(doorwayGlow);

      const ceilingOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffe0b8 })
      );
      ceilingOrb.position.set(0, 3.05, -0.2);
      group.add(ceilingOrb);
    } else {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(config.w, config.h, config.d),
        wallMaterial
      );
      body.position.y = config.h / 2;
      group.add(body);
    }

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(config.w, config.d) * 0.64, config.h * 0.82, 4),
      new THREE.MeshStandardMaterial({ color: config.roof, roughness: 0.9 })
    );
    roof.rotation.y = Math.PI * 0.25;
    roof.position.y = config.h + config.h * 0.33;
    group.add(roof);

    const porch = new THREE.Mesh(
      new THREE.BoxGeometry(config.w * 0.32, 0.18, config.d * 0.18),
      new THREE.MeshStandardMaterial({ color: 0x44362f, roughness: 1 })
    );
    porch.position.set(0, 0.09, config.d * 0.36);
    group.add(porch);

    if (!config.enterable) {
      const door = new THREE.Mesh(
        new THREE.PlaneGeometry(config.w * 0.16, config.h * 0.46),
        new THREE.MeshBasicMaterial({ color: 0x261818 })
      );
      door.position.set(0, config.h * 0.26, config.d / 2 + 0.01);
      group.add(door);
    } else {
      const welcomeMat = new THREE.Mesh(
        new THREE.PlaneGeometry(config.w * 0.3, 0.7),
        new THREE.MeshBasicMaterial({ color: 0x1a1017 })
      );
      welcomeMat.rotation.x = -Math.PI / 2;
      welcomeMat.position.set(0, 0.02, config.d * 0.38);
      group.add(welcomeMat);
    }

    for (const side of [-1, 1]) {
      const windowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(config.w * 0.16, config.h * 0.18),
        new THREE.MeshBasicMaterial({ color: config.window, transparent: true, opacity: 0.95 })
      );
      windowMesh.position.set(side * config.w * 0.22, config.h * 0.55, config.d / 2 + 0.02);
      group.add(windowMesh);
    }

    if (config.sign) {
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(config.w * 0.7, config.h * 0.2),
        new THREE.MeshBasicMaterial({
          map: createLabelTexture(config.sign, {
            background: "#120913",
            accent: config.signAccent,
            foreground: "#f6ede6",
            secondary: "#aeb6d0"
          }),
          transparent: true
        })
      );
      sign.position.set(0, config.h + 1.8, config.enterable ? config.d * 0.18 : 0);
      group.add(sign);
      world.signs.push(sign);
    }

    group.position.set(config.x, 0, config.z);
    group.rotation.y = config.rotation || 0;
    scene.add(group);
    world.houses.push({
      group,
      x: config.x,
      z: config.z,
      w: config.w,
      d: config.d,
      enterable: !!config.enterable
    });

    if (config.enterable) {
      const halfW = config.w / 2;
      const halfD = config.d / 2;
      world.solids.push(
        { minX: config.x - halfW, maxX: config.x - halfW + wallDepth, minZ: config.z - halfD, maxZ: config.z + halfD },
        { minX: config.x + halfW - wallDepth, maxX: config.x + halfW, minZ: config.z - halfD, maxZ: config.z + halfD },
        { minX: config.x - halfW, maxX: config.x + halfW, minZ: config.z - halfD, maxZ: config.z - halfD + wallDepth }
      );
    } else {
      world.solids.push({
        minX: config.x - config.w / 2,
        maxX: config.x + config.w / 2,
        minZ: config.z - config.d / 2,
        maxZ: config.z + config.d / 2
      });
    }
  }

  // Create primary buildings
  createHouse({ x: -18, z: 33, w: 8, h: 4.2, d: 7, color: 0x3b4359, roof: 0x2a0f12, window: 0xffcf7b, sign: "Safehouse", signAccent: "#7cf4da" });
  createHouse({ x: 22, z: 31, w: 8, h: 4.4, d: 7, color: 0x5b2f35, roof: 0x250d13, window: 0xffd69d, sign: "Candy Forge", signAccent: "#ff8f3d" });
  
  // Costume Crypt replaced with Glowing Pumpkin House!
  createPumpkinHouse(-33, -17, { sign: "Costume Crypt", signAccent: "#ff4f8a" });
  
  createHouse({ x: 33, z: -18, w: 8.4, h: 4.2, d: 6.4, color: 0x26344f, roof: 0x11161f, window: 0x8be8ff, sign: "Hearse Garage", signAccent: "#8be8ff" });
  createHouse({ x: -2, z: -34, w: 7.6, h: 4.3, d: 6.8, color: 0x40352b, roof: 0x1e1010, window: 0xb8ffcf, sign: "Hex Market", signAccent: "#87ffb4" });
  
  // Extra decorative houses
  createHouse({ x: 11, z: -32, w: 7.2, h: 4, d: 6.1, color: 0x403240, roof: 0x16090b, window: 0xffcf7b });
  createHouse({ x: -32, z: 11, w: 6.8, h: 3.8, d: 6, color: 0x253344, roof: 0x14070a, window: 0xffdf8a });
  createHouse({ x: 31, z: 12, w: 6.8, h: 3.8, d: 6, color: 0x50332e, roof: 0x16080b, window: 0xffd697 });

  // TREES
  function createTree(x, z, scale = 1) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 2.2 * scale, 7),
      new THREE.MeshStandardMaterial({ color: 0x3e2718, roughness: 1 })
    );
    trunk.position.y = 1.1 * scale;
    group.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(1.4 * scale, 3.3 * scale, 8),
      new THREE.MeshStandardMaterial({ color: 0x0f2010, roughness: 1 })
    );
    leaves.position.y = 3.3 * scale;
    group.add(leaves);

    group.position.set(x, 0, z);
    scene.add(group);
    world.trees.push(group);

    // Collision for trees
    const tr = 0.3 * scale;
    world.solids.push({
      minX: x - tr,
      maxX: x + tr,
      minZ: z - tr,
      maxZ: z + tr
    });
  }

  [
    [-22, 24, 1.2], [-12, 27, 1], [14, 23, 1.15], [24, 26, 1.05], [-36, -9, 1.05],
    [-29, -25, 1.2], [31, -26, 1.1], [18, -28, 0.95], [-8, -37, 1.2], [2, 38, 1.1]
  ].forEach(([x, z, scale]) => createTree(x, z, scale));

  // JACK-O'-LANTERNS (Carved Glowing Street Pumpkins with 4 Face Variations!)
  function createJackOLantern(x, z, index, scale = 1) {
    const group = new THREE.Group();
    const designIndex = index % 4; // Cycles through 4 different designs
    const targetTex = jackOLanternTextures[designIndex];

    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.56 * scale, 16, 16),
      new THREE.MeshStandardMaterial({
        map: targetTex,
        roughness: 0.82,
        emissive: 0xff8b07,
        emissiveMap: targetTex,
        emissiveIntensity: 1.3
      })
    );
    body.scale.y = 0.82;
    body.position.y = 0.46 * scale;
    // Orient the carved face towards the street center
    body.rotation.y = Math.atan2(-x, -z) + (Math.random() - 0.5) * 0.5;
    group.add(body);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 0.22 * scale, 6),
      new THREE.MeshStandardMaterial({ color: 0x315117, roughness: 1 })
    );
    stem.position.y = 0.88 * scale;
    group.add(stem);

    group.position.set(x, 0, z);
    scene.add(group);
    world.pumpkins.push(group);

    const radius = 0.52 * scale;
    world.solids.push({
      minX: x - radius,
      maxX: x + radius,
      minZ: z - radius,
      maxZ: z + radius
    });
  }

  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2;
    const radius = 12 + (i % 7) * 4.6;
    createJackOLantern(Math.cos(angle) * radius, Math.sin(angle * 1.7) * 18, i, 0.85 + (i % 3) * 0.15);
  }

  // CARS WITH GLOWING HEADLIGHT BEAMS
  function createCar(x, z, rotation, color) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.9, 1.6),
      new THREE.MeshStandardMaterial({ color, roughness: 0.52, metalness: 0.2 })
    );
    base.position.y = 0.65;
    group.add(base);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.7, 1.35),
      new THREE.MeshStandardMaterial({ color: 0x10151f, roughness: 0.35, metalness: 0.25 })
    );
    roof.position.set(0.1, 1.1, 0);
    group.add(roof);

    for (const side of [-1, 1]) {
      for (const front of [-1, 1]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.34, 0.34, 0.28, 12),
          new THREE.MeshStandardMaterial({ color: 0x0c0e10, roughness: 1 })
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 1.02, 0.35, front * 0.72);
        group.add(wheel);
      }
    }

    // Glowing headlights
    const lightColor = 0xffebb3;
    for (const side of [-1, 1]) {
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: lightColor })
      );
      bulb.position.set(1.41, 0.6, side * 0.5);
      group.add(bulb);
      
      const headLight = new THREE.SpotLight(lightColor, 2.5, 9, Math.PI / 6, 0.5, 1);
      headLight.position.set(1.42, 0.6, side * 0.5);
      headLight.target.position.set(6, 0, side * 0.5);
      group.add(headLight);
      group.add(headLight.target);
    }

    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    scene.add(group);
    world.cars.push(group);

    // Collisions for cars
    world.solids.push({
      minX: x - 1.45,
      maxX: x + 1.45,
      minZ: z - 0.85,
      maxZ: z + 0.85
    });
  }

  createCar(-8, 11, 0, 0x7c1e31);
  createCar(14, -5, Math.PI, 0x2a5c7c);
  createCar(21, 5, Math.PI / 2, 0x5d5d5d);
  createCar(-24, -2, -Math.PI / 2, 0x463f7b);

  // GRAVES (Cemetery section)
  function createGrave(x, z, height = 1.2) {
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, height, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x6f7587, roughness: 1 })
    );
    head.position.set(x, height / 2, z);
    scene.add(head);
    world.graves.push(head);

    world.solids.push({
      minX: x - 0.38,
      maxX: x + 0.38,
      minZ: z - 0.12,
      maxZ: z + 0.12
    });
  }

  for (let i = 0; i < 9; i++) {
    createGrave(-37 + (i % 3) * 1.6, -33 + Math.floor(i / 3) * 2, 1 + (i % 2) * 0.2);
  }

  // GHOSTS WITH GLOWING RED EYE MESHES
  function createGhost(x, z, phase) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xcff7ff,
        emissive: 0x8ef2ff,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.58,
        roughness: 0.2
      })
    );
    body.scale.y = 1.22;
    group.add(body);

    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.56, 1.1, 12),
      new THREE.MeshStandardMaterial({
        color: 0xbef7ff,
        emissive: 0x8ef2ff,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.48
      })
    );
    tail.position.y = -0.92;
    group.add(tail);

    // Glowing red eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1e1e });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
      eye.position.set(side * 0.22, 0.24, 0.56);
      group.add(eye);
    }

    group.position.set(x, 2.5, z);
    scene.add(group);
    world.ghosts.push({ group, baseX: x, baseZ: z, phase });
  }

  createGhost(-35, 6, 0);
  createGhost(-24, -28, 1.1);
  createGhost(18, 29, 2.5);
  createGhost(34, -16, 3.6);

  // KIDS
  function createKid(x, z, hue, phase) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.8, 6, 10),
      new THREE.MeshStandardMaterial({ color: hue, roughness: 0.86 })
    );
    body.position.y = 1;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf1d0b6, roughness: 0.85 })
    );
    head.position.y = 1.75;
    group.add(head);

    const bucket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.28, 10),
      new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.92 })
    );
    bucket.position.set(0.34, 0.66, 0);
    group.add(bucket);

    group.position.set(x, 0, z);
    scene.add(group);
    world.kids.push({ group, baseX: x, baseZ: z, phase });
  }

  createKid(-11, 18, 0xd9684d, 0.3);
  createKid(10, 20, 0x6d60f2, 1.5);
  createKid(30, 8, 0x50c77d, 2.1);
  createKid(-28, -8, 0xd24db4, 2.9);

  // BLACK CAT ENTITIES
  function createBlackCat(x, y, z, rotationY) {
    const cat = new THREE.Group();
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.85 });
    
    // Body (sitting capsule)
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.38, 4, 8), blackMat);
    body.position.y = 0.28;
    cat.add(body);
    
    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), blackMat);
    head.position.set(0, 0.52, 0.08);
    cat.add(head);
    
    // Ears
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 3), blackMat);
      ear.position.set(side * 0.08, 0.66, 0.08);
      ear.rotation.z = side * -0.2;
      cat.add(ear);
    }
    
    // Tail (curved tube/capsule)
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.42, 4, 8), blackMat);
    tail.position.set(0, 0.2, -0.22);
    tail.rotation.x = -0.55;
    cat.add(tail);
    
    // Glowing green eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x9eff42 });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), eyeMat);
      eye.position.set(side * 0.06, 0.54, 0.22);
      cat.add(eye);
    }
    
    cat.position.set(x, y, z);
    cat.rotation.y = rotationY;
    scene.add(cat);
  }

  // Scattered sitting black cats
  createBlackCat(-8, 1.1, 11, 0.5); // On top of the red car
  createBlackCat(-14, 0.02, 32, -1.2); // Near Safehouse
  createBlackCat(-5, 0.02, -30, 2.5); // Near Hex Market porch
  createBlackCat(-33, 0.02, -32, 0.8); // Inside Cemetery
  createBlackCat(23, 0.02, 2, -0.4); // Near Ritual Beacon center

  // ZONES (toruses and light beams)
  function createZone(config) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(config.radius, 0.12, 12, 48),
      new THREE.MeshBasicMaterial({ color: config.color, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(config.x, 0.08, config.z);
    scene.add(ring);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.7, 8, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: config.color, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
    );
    beam.position.set(config.x, 4, config.z);
    scene.add(beam);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(5.4, 1.5),
      new THREE.MeshBasicMaterial({
        map: createLabelTexture(config.label, {
          background: "#0c1222",
          accent: config.cssColor,
          foreground: "#f6ede6",
          secondary: "#aeb6d0"
        }),
        transparent: true
      })
    );
    sign.position.set(config.x, 6.3, config.z);
    scene.add(sign);

    const zone = { ...config, ring, beam, sign };
    world.zones.push(zone);
    return zone;
  }

  function storefrontZ(houseZ, depth, padding = 1.3) {
    return houseZ + depth / 2 + padding;
  }

  const safehouseZone = createZone({ type: "safehouse", label: "Safehouse", x: -18, z: storefrontZ(33, 7, 1.8), radius: 2.4, color: 0x7cf4da, cssColor: "#7cf4da" });
  const candyForgeZone = createZone({ type: "candyForge", label: "Candy Forge", x: 22, z: storefrontZ(31, 7), radius: 2.2, color: 0xff8f3d, cssColor: "#ff8f3d" });
  const costumeZone = createZone({ type: "costume", label: "Costume Crypt", x: -33, z: -16.5, radius: 1.75, color: 0xff4f8a, cssColor: "#ff4f8a" });
  const garageZone = createZone({ type: "garage", label: "Hearse Garage", x: 33, z: storefrontZ(-18, 6.4), radius: 2.2, color: 0x8be8ff, cssColor: "#8be8ff" });
  const wardZone = createZone({ type: "ward", label: "Hex Market", x: -2, z: storefrontZ(-34, 6.8), radius: 2.2, color: 0x87ffb4, cssColor: "#87ffb4" });
  const beaconZone = createZone({ type: "beacon", label: "Ritual Beacon", x: 26, z: 0, radius: 2.6, color: 0xffc25f, cssColor: "#ffbf5f" });

  // PUMPKIN LOOT BUCKETS (REPLACES BOXES FOR CANDIES)
  function createPumpkinBucket(group) {
    const orangeMat = new THREE.MeshStandardMaterial({
      color: 0xff6200,
      roughness: 0.8,
      emissive: 0x3d0b00,
      emissiveIntensity: 0.3
    });
    
    // Pumpkin outer shell
    const bucketShell = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), orangeMat);
    bucketShell.position.y = 0.34;
    bucketShell.scale.y = 0.95;
    group.add(bucketShell);
    
    // Rim top cover simulating bucket depth
    const rim = new THREE.Mesh(
      new THREE.CircleGeometry(0.24, 12),
      new THREE.MeshBasicMaterial({ color: 0x180d0d })
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.71;
    group.add(rim);
    
    // Black bucket handle
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.03, 6, 18, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 })
    );
    handle.position.set(0, 0.65, 0);
    handle.rotation.z = Math.PI;
    group.add(handle);
    
    // Tiny carved face meshes (two triangles for eyes, mouth)
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x180d0d });
    const eyeL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 3), faceMat);
    eyeL.rotation.x = Math.PI / 2;
    eyeL.position.set(-0.11, 0.44, 0.33);
    group.add(eyeL);
    
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.11;
    group.add(eyeR);
    
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.05), faceMat);
    mouth.position.set(0, 0.34, 0.36);
    group.add(mouth);
  }

  function createCandy(x, z) {
    const group = new THREE.Group();
    const glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.56, 0.06, 10, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd86f, transparent: true, opacity: 0.72 })
    );
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.y = 0.06;
    group.add(glowRing);

    // Replaced box shapes with Pumpkin Bucket model!
    createPumpkinBucket(group);

    const sparkle = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.08, 0),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0 })
    );
    sparkle.position.set(0.04, 0.74, 0);
    group.add(sparkle);

    group.position.set(x, 0, z);
    scene.add(group);
    world.candies.push({ group, x, z, phase: Math.random() * Math.PI * 2, collected: false, sparkle });
  }

  [
    [-7, 3], [-12, 8], [8, 8], [16, 17], [24, -6], [-26, -10], [-17, -26], [3, -18], [18, -24], [-29, 22]
  ].forEach(([x, z]) => createCandy(x, z));

  // ATMOSPHERIC WIND LEAVES
  const leafGeom = new THREE.BoxGeometry(0.18, 0.02, 0.12);
  const leafMat1 = new THREE.MeshStandardMaterial({ color: 0xaa5511, roughness: 1 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0xcc7722, roughness: 1 });
  
  for (let i = 0; i < 24; i++) {
    const leaf = new THREE.Mesh(leafGeom, Math.random() > 0.5 ? leafMat1 : leafMat2);
    leaf.position.set((Math.random() - 0.5) * 90, 0.05 + Math.random() * 4, (Math.random() - 0.5) * 90);
    leaf.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(leaf);
    world.leaves.push({
      mesh: leaf,
      speedX: -2.5 - Math.random() * 2,
      speedY: -0.5 - Math.random() * 0.5,
      spinSpeed: 2 + Math.random() * 3
    });
  }

  return world;
}
