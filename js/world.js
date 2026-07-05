import * as THREE from "three";

export const missionRoute = [
  { name: "Costume Crypt", position: new THREE.Vector3(-16, 0, -10), color: 0xff88db },
  { name: "Hearse Garage", position: new THREE.Vector3(16, 0, -16), color: 0x73b8ff },
  { name: "Hex Market", position: new THREE.Vector3(22, 0, 12), color: 0x78ffc0 }
];

function makeWindow(color = 0xfff4d9) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.35),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.2,
      roughness: 0.2
    })
  );
}

export function createWorld(scene) {
  scene.background = new THREE.Color(0x070b13);
  scene.fog = new THREE.FogExp2(0x0b1220, 0.012);

  const world = {
    blockers: [],
    markers: []
  };

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220),
    new THREE.MeshStandardMaterial({
      color: 0x162127,
      roughness: 0.98,
      metalness: 0.02
    })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 90),
    new THREE.MeshStandardMaterial({
      color: 0x191d28,
      roughness: 0.55,
      metalness: 0.22
    })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  scene.add(road);

  for (let i = -7; i <= 7; i++) {
    if (i === 0) continue;
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 3.4),
      new THREE.MeshStandardMaterial({ color: 0xfff3d5, roughness: 1 })
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.03, i * 6);
    scene.add(stripe);
  }

  const laneLine = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 82),
    new THREE.MeshStandardMaterial({ color: 0xe9b14c, roughness: 1, emissive: 0x57320d, emissiveIntensity: 0.35 })
  );
  laneLine.rotation.x = -Math.PI / 2;
  laneLine.position.set(0, 0.025, 0);
  scene.add(laneLine);

  const skyGlow = new THREE.Mesh(
    new THREE.SphereGeometry(80, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0x14203b,
      side: THREE.BackSide
    })
  );
  scene.add(skyGlow);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xf7f2e5 })
  );
  moon.position.set(-28, 30, -44);
  scene.add(moon);

  const ambient = new THREE.AmbientLight(0xa6b7de, 1.45);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x93baff, 0x21311c, 1.18);
  scene.add(hemi);

  const moonLight = new THREE.DirectionalLight(0xdbe8ff, 2.4);
  moonLight.position.set(-24, 28, -14);
  scene.add(moonLight);

  const sodiumFill = new THREE.PointLight(0xffb772, 2.1, 80, 2);
  sodiumFill.position.set(-12, 7, 20);
  scene.add(sodiumFill);

  const coolFill = new THREE.PointLight(0x7dc7ff, 1.45, 90, 2);
  coolFill.position.set(14, 8, -8);
  scene.add(coolFill);

  for (const x of [-18, -8, 8, 20]) {
    const lampPost = new THREE.Group();

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.18, 8.2, 10),
      new THREE.MeshStandardMaterial({ color: 0x232838, roughness: 0.92 })
    );
    pole.position.y = 4.1;
    lampPost.add(pole);

    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 1.8),
      pole.material
    );
    arm.position.set(0.56, 7.6, 0);
    lampPost.add(arm);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xffd8ad, emissive: 0xffa25e, emissiveIntensity: 1.8 })
    );
    bulb.position.set(0.98, 7.5, 0);
    lampPost.add(bulb);

    const light = new THREE.PointLight(0xffb16d, 2.8, 18, 2);
    light.position.copy(bulb.position);
    lampPost.add(light);

    lampPost.position.set(x, 0, 4);
    scene.add(lampPost);
  }

  const buildingSpecs = [
    { x: -28, z: -18, w: 18, h: 11, d: 14, color: 0x202838 },
    { x: -28, z: 14, w: 20, h: 12, d: 15, color: 0x1b2231 },
    { x: 28, z: -18, w: 18, h: 13, d: 13, color: 0x1e2430 },
    { x: 28, z: 12, w: 19, h: 12, d: 14, color: 0x222938 }
  ];

  for (const spec of buildingSpecs) {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w, spec.h, spec.d),
      new THREE.MeshStandardMaterial({
        color: spec.color,
        roughness: 0.84,
        metalness: 0.06
      })
    );
    body.position.set(spec.x, spec.h / 2, spec.z);
    scene.add(body);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w * 1.02, 0.5, spec.d * 1.02),
      new THREE.MeshStandardMaterial({ color: 0x0c1118, roughness: 0.5 })
    );
    roof.position.set(spec.x, spec.h + 0.25, spec.z);
    scene.add(roof);

    for (let row = 0; row < 3; row++) {
      for (let col = -1; col <= 1; col++) {
        const windowPanel = makeWindow();
        windowPanel.position.set(spec.x + col * 3.6, 3 + row * 2.6, spec.z + spec.d / 2 + 0.03);
        scene.add(windowPanel);
      }
    }
  }

  const blockerSpecs = [
    { x: -8, z: 8, w: 2.6, h: 1.6, d: 1.2, color: 0xa04f2a },
    { x: 8, z: -6, w: 2.2, h: 1.4, d: 1.2, color: 0xc76c39 },
    { x: 9, z: 10, w: 3.4, h: 1.2, d: 1.2, color: 0x6e7487 },
    { x: -15, z: -1, w: 2.8, h: 1.3, d: 1.2, color: 0x7f5838 }
  ];

  for (const spec of blockerSpecs) {
    const group = new THREE.Group();
    group.position.set(spec.x, 0, spec.z);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w, spec.h, spec.d),
      new THREE.MeshStandardMaterial({
        color: spec.color,
        roughness: 0.88,
        metalness: 0.08
      })
    );
    body.position.y = spec.h / 2;
    group.add(body);

    const glow = new THREE.PointLight(0xff8c4f, 0.8, 7, 2);
    glow.position.set(0, spec.h + 0.4, 0);
    group.add(glow);

    scene.add(group);
    world.blockers.push({
      group,
      radius: Math.max(spec.w, spec.d) * 0.55
    });
  }

  const markerGeometry = new THREE.CylinderGeometry(0.18, 0.18, 8, 8);
  const glowGeometry = new THREE.CylinderGeometry(1.4, 2.8, 11, 24, 1, true);

  for (const step of missionRoute) {
    const group = new THREE.Group();
    group.position.copy(step.position);

    const pillar = new THREE.Mesh(
      markerGeometry,
      new THREE.MeshStandardMaterial({
        color: step.color,
        emissive: step.color,
        emissiveIntensity: 0.85,
        transparent: true,
        opacity: 0.65
      })
    );
    pillar.position.y = 4;
    group.add(pillar);

    const beam = new THREE.Mesh(
      glowGeometry,
      new THREE.MeshBasicMaterial({
        color: step.color,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide
      })
    );
    beam.position.y = 5.5;
    group.add(beam);

    const disc = new THREE.Mesh(
      new THREE.RingGeometry(1.3, 1.9, 32),
      new THREE.MeshBasicMaterial({ color: step.color, side: THREE.DoubleSide })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.05;
    group.add(disc);

    scene.add(group);
    world.markers.push({ ...step, group, beam, disc });
  }

  return world;
}
