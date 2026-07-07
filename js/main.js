import * as THREE from "three";
import { createWorld, missionRoute } from "./world.js";
import { createChaseCharacter, applyChaseCostume, createNoFaceCharacter, costumeStyles } from "./character.js";

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.32;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);

const world = createWorld(scene);
const chase = await createChaseCharacter(scene);
const noFace = createNoFaceCharacter(scene);

const hud = {
  objectiveTitle: document.getElementById("objectiveTitle"),
  objectiveHint: document.getElementById("objectiveHint"),
  modelState: document.getElementById("modelState"),
  markerState: document.getElementById("markerState"),
  viewState: document.getElementById("viewState"),
  timerState: document.getElementById("timerState"),
  progressState: document.getElementById("progressState"),
  missionState: document.getElementById("missionState"),
  healthBar: document.getElementById("healthBar"),
  fearBar: document.getElementById("fearBar"),
  staminaBar: document.getElementById("staminaBar"),
  cashValue: document.getElementById("cashValue"),
  candyValue: document.getElementById("candyValue"),
  eggValue: document.getElementById("eggValue"),
  promptCard: document.getElementById("promptCard"),
  promptText: document.getElementById("promptText"),
  overlay: document.getElementById("screenOverlay") || document.getElementById("missionOverlay"),
  overlayEyebrow: document.getElementById("overlayEyebrow"),
  overlayTitle: document.getElementById("overlayTitle"),
  overlayDesc: document.getElementById("overlayDesc") || document.getElementById("overlayText"),
  restartBtn: document.getElementById("restartBtn") || document.getElementById("restartWin"),
  vignette: document.getElementById("vignette"),
  flash: document.getElementById("flash")
};

if (hud.modelState) {
  hud.modelState.textContent = chase.modelLabel ?? (chase.isFallback ? "Starter Rig" : "Custom Model");
}

const state = {
  health: 100,
  fear: 8,
  stamina: 100,
  reviewMode: false,
  missionDuration: 90,
  timeLeft: 90,
  missionComplete: false,
  missionFailed: false,
  cash: 0,
  candy: 0,
  eggs: 12,
  costumeIndex: 0,
  story: {
    disguise: false,
    keys: false,
    ward: false,
    beacon: false
  },
  objectiveIndex: 0,
  noFaceStunTimer: 0,
  lightningTimer: 6,
  hitSoundCooldown: 0
};

const input = {
  forward: 0,
  strafe: 0,
  turn: 0,
  sprint: false,
  dragging: false,
  yaw: Math.PI,
  pitch: 0.14,
  lastX: 0,
  lastY: 0
};

const clock = new THREE.Clock();
const move = new THREE.Vector3();
const spawn = new THREE.Vector3(0, 0, 24);
const lookTarget = new THREE.Vector3();

// Active gameplay object arrays
const activeBombs = [];
const activeParticles = [];

// PROCEDURAL AUDIO SYSTEM
const audio = {
  ctx: null,
  gain: null
};

function ensureAudio() {
  if (audio.ctx) {
    if (audio.ctx.state === "suspended") {
      audio.ctx.resume();
    }
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  audio.ctx = new AudioContextClass();
  audio.gain = audio.ctx.createGain();
  audio.gain.gain.value = 0.28;
  audio.gain.connect(audio.ctx.destination);
}

function playTone(freq, freqEnd, duration, type = "sine", vol = 0.3) {
  ensureAudio();
  if (!audio.ctx) return;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  const now = audio.ctx.currentTime;
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd !== freq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + duration);
  }
  
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  
  osc.connect(gain);
  gain.connect(audio.gain);
  
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function soundPickup() { playTone(520, 1040, 0.15, "triangle", 0.2); }
function soundHit() { playTone(180, 80, 0.25, "sawtooth", 0.35); }
function soundUpgrade() {
  playTone(330, 660, 0.2, "sine", 0.25);
  setTimeout(() => playTone(495, 990, 0.25, "sine", 0.2), 80);
}
function soundFail() { playTone(220, 70, 0.45, "square", 0.3); }
function soundThunder() { playTone(80, 30, 0.9, "sawtooth", 0.45); }

// WEATHER: RAIN PARTICLES
const rainCount = 1200;
const rainGeometry = new THREE.BufferGeometry();
const rainPositions = new Float32Array(rainCount * 3);
const rainVelocities = [];

for (let i = 0; i < rainCount; i++) {
  rainPositions[i * 3] = (Math.random() - 0.5) * 80;
  rainPositions[i * 3 + 1] = Math.random() * 25 + 2;
  rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
  rainVelocities.push(12 + Math.random() * 8);
}
rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));

const rainMaterial = new THREE.PointsMaterial({
  color: 0x8be8db,
  size: 0.06,
  transparent: true,
  opacity: 0.45,
  sizeAttenuation: true
});
const rain = new THREE.Points(rainGeometry, rainMaterial);
scene.add(rain);

function updateRain(dt) {
  const positions = rainGeometry.attributes.position.array;
  for (let i = 0; i < rainCount; i++) {
    positions[i * 3 + 1] -= rainVelocities[i] * dt;
    if (positions[i * 3 + 1] <= 0) {
      positions[i * 3] = (Math.random() - 0.5) * 80 + chase.group.position.x;
      positions[i * 3 + 1] = 25;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80 + chase.group.position.z;
    }
  }
  rainGeometry.attributes.position.needsUpdate = true;
}

// HUD & GAMEPLAY OVERLAY UTILS
function setReviewOrbitDefaults() {
  input.yaw = Math.PI;
  input.pitch = 0.14;
}

function currentObjective() {
  return missionRoute[state.objectiveIndex];
}

function missionProgress() {
  return Math.min(state.objectiveIndex, missionRoute.length);
}

function setOverlay(eyebrow, title, desc) {
  if (hud.overlayEyebrow) hud.overlayEyebrow.textContent = eyebrow;
  if (hud.overlayTitle) hud.overlayTitle.textContent = title;
  if (hud.overlayDesc) hud.overlayDesc.textContent = desc;
  if (hud.overlay) hud.overlay.classList.remove("hidden");
}

function hideOverlay() {
  if (hud.overlay) hud.overlay.classList.add("hidden");
}

function completeMission() {
  if (state.missionComplete) return;
  state.missionComplete = true;
  state.ended = true;
  soundUpgrade();
  setOverlay(
    "Mission Complete",
    "Safehouse Secured!",
    `Chase made it home alive with $${state.cash} cash, all ${state.candy} loot stashes, and survived No-Face's chase.`
  );
}

function failMission(reason = "The timer ran out.") {
  if (state.missionFailed) return;
  state.missionFailed = true;
  state.ended = true;
  soundFail();
  setOverlay(
    "Game Over",
    "Chase Was Caught",
    `${reason} Press R to reset Chase and try again.`
  );
}

function refreshHUD() {
  const objective = currentObjective();
  if (hud.objectiveTitle) {
    if (state.missionComplete) {
      hud.objectiveTitle.textContent = "Mission Complete";
    } else if (state.missionFailed) {
      hud.objectiveTitle.textContent = "Retry The Route";
    } else if (objective) {
      hud.objectiveTitle.textContent = `Reach ${objective.name}`;
    }
  }
  
  if (hud.objectiveHint) {
    if (state.missionComplete) {
      hud.objectiveHint.textContent = "Chase made all five stops. Press R to run it again.";
    } else if (state.missionFailed) {
      hud.objectiveHint.textContent = "You failed the block errand. Press R to reset Chase and retake the block.";
    } else if (objective) {
      if (state.objectiveIndex === 0) {
        hud.objectiveHint.textContent = "Sneak to Costume Crypt and put on your Halloween fit to start the route.";
      } else if (state.objectiveIndex === 1) {
        hud.objectiveHint.textContent = "Break into Hearse Garage and hotwire the hearse keys.";
      } else if (state.objectiveIndex === 2) {
        hud.objectiveHint.textContent = "Head to Hex Market and extract the ancient ward protection sigil.";
      } else if (state.objectiveIndex === 3) {
        hud.objectiveHint.textContent = "Go to the street center and light the Ritual Beacon before No-Face blocks you.";
      } else {
        hud.objectiveHint.textContent = "Escape back to the Safehouse! No-Face is fully raged and hunting.";
      }
    }
  }

  if (hud.markerState) hud.markerState.textContent = objective?.name ?? "Route Cleared";
  if (hud.viewState) hud.viewState.textContent = state.reviewMode ? "Character Review" : "Third Person";
  if (hud.timerState) hud.timerState.textContent = `${Math.max(0, Math.ceil(state.timeLeft))}s`;
  if (hud.progressState) hud.progressState.textContent = `${missionProgress()} / ${missionRoute.length}`;
  if (hud.missionState) hud.missionState.textContent = state.missionComplete ? "Won" : state.missionFailed ? "Failed" : "Live";
  
  if (hud.healthBar) hud.healthBar.style.width = `${state.health}%`;
  if (hud.fearBar) hud.fearBar.style.width = `${state.fear}%`;
  if (hud.staminaBar) hud.staminaBar.style.width = `${state.stamina}%`;

  if (hud.cashValue) hud.cashValue.textContent = `$${state.cash}`;
  if (hud.candyValue) hud.candyValue.textContent = `${state.candy} / 6`;
  if (hud.eggValue) hud.eggValue.textContent = `${state.eggs}`;

  // Fear & health vignette check
  const distToEnemy = noFace ? chase.group.position.distanceTo(noFace.group.position) : 999;
  if (hud.vignette) {
    if (state.health < 35 || state.fear > 70 || (distToEnemy < 7 && !state.ended)) {
      hud.vignette.className = "danger";
    } else {
      hud.vignette.className = "";
    }
  }
}

function resetGame() {
  state.ended = false;
  state.win = false;
  state.health = 100;
  state.fear = 8;
  state.stamina = 100;
  state.cash = 0;
  state.candy = 0;
  state.eggs = 12;
  state.costumeIndex = 0;
  state.story.disguise = false;
  state.story.keys = false;
  state.story.ward = false;
  state.story.beacon = false;
  state.objectiveIndex = 0;
  state.timeLeft = state.missionDuration;
  state.missionComplete = false;
  state.missionFailed = false;
  state.noFaceStunTimer = 0;

  chase.group.position.copy(spawn);
  chase.group.rotation.y = Math.PI;
  applyChaseCostume(chase, 0);

  if (noFace) {
    noFace.group.position.set(30, 0, -25);
  }

  // Reset stashes
  world.candies.forEach(candy => {
    candy.collected = false;
    candy.group.visible = true;
  });

  // Clear bombs
  activeBombs.forEach(b => scene.remove(b.mesh));
  activeBombs.length = 0;

  hideOverlay();
  refreshHUD();
}

// BOMB THROWING MECHANIC
function throwCandyBomb() {
  if (state.ended || state.eggs <= 0 || state.reviewMode) return;

  state.eggs--;
  refreshHUD();

  const geom = new THREE.SphereGeometry(0.18, 12, 12);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xff8b2b,
    emissive: 0xff3b00,
    emissiveIntensity: 3,
    roughness: 0.2
  });
  const mesh = new THREE.Mesh(geom, mat);

  const spawnPos = chase.group.position.clone().add(new THREE.Vector3(0, 1.8, 0));
  mesh.position.copy(spawnPos);
  scene.add(mesh);

  const forwardDir = new THREE.Vector3(0, 0.45, 1);
  forwardDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), chase.group.rotation.y);
  forwardDir.normalize();

  const velocity = forwardDir.multiplyScalar(13.8);

  activeBombs.push({
    mesh,
    velocity,
    position: mesh.position
  });

  playTone(660, 240, 0.18, "triangle", 0.2);
}

function spawnExplosion(pos) {
  const count = 15;
  const geom = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffb743, transparent: true, opacity: 0.9 });

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geom, mat.clone());
    mesh.position.copy(pos);
    scene.add(mesh);

    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      Math.random() * 4 + 1,
      (Math.random() - 0.5) * 5
    );

    activeParticles.push({
      mesh,
      velocity: vel,
      life: 0.45
    });
  }
}

function updatePhysics(dt) {
  // Update bombs
  for (let i = activeBombs.length - 1; i >= 0; i--) {
    const bomb = activeBombs[i];
    bomb.velocity.y -= 9.8 * dt;
    bomb.position.addScaledVector(bomb.velocity, dt);

    const distToNoFace = noFace ? bomb.position.distanceTo(noFace.group.position) : 999;
    if (bomb.position.y <= 0.05 || distToNoFace < 1.8) {
      spawnExplosion(bomb.position);
      scene.remove(bomb.mesh);
      activeBombs.splice(i, 1);

      if (distToNoFace < 2.5) {
        state.noFaceStunTimer = 4.0;
        playTone(180, 50, 0.35, "sawtooth", 0.4);
      } else {
        playTone(320, 100, 0.2, "sine", 0.2);
      }
      continue;
    }
  }

  // Update particles
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const p = activeParticles[i];
    p.life -= dt;
    p.velocity.y -= 9.8 * dt;
    p.mesh.position.addScaledVector(p.velocity, dt);
    p.mesh.material.opacity = p.life / 0.45;

    if (p.life <= 0) {
      scene.remove(p.mesh);
      activeParticles.splice(i, 1);
    }
  }
}

// MOVEMENT WITH SLIDING COLLISION
function applyMovement(dt) {
  if (state.ended) return;

  const basisForward = new THREE.Vector3(Math.sin(input.yaw), 0, Math.cos(input.yaw)).normalize();
  const basisRight = new THREE.Vector3(basisForward.z, 0, -basisForward.x).normalize();
  move.set(0, 0, 0);
  move.addScaledVector(basisForward, input.forward);
  move.addScaledVector(basisRight, input.strafe);

  const moving = move.lengthSq() > 0.0001;
  if (moving) {
    move.normalize();
    const sprinting = input.sprint && state.stamina > 0;
    const speed = sprinting ? 8.5 : 4.8;

    const moveStep = speed * dt;
    const targetX = chase.group.position.x + move.x * moveStep;
    const targetZ = chase.group.position.z + move.z * moveStep;

    let collideX = false;
    let collideZ = false;

    for (const solid of world.solids) {
      if (solid.minX === undefined || solid.minZ === undefined) continue;
      if (targetX >= solid.minX && targetX <= solid.maxX &&
          chase.group.position.z >= solid.minZ && chase.group.position.z <= solid.maxZ) {
        collideX = true;
      }
      if (chase.group.position.x >= solid.minX && chase.group.position.x <= solid.maxX &&
          targetZ >= solid.minZ && targetZ <= solid.maxZ) {
        collideZ = true;
      }
    }

    if (!collideX) {
      chase.group.position.x = THREE.MathUtils.clamp(targetX, -40, 40);
    }
    if (!collideZ) {
      chase.group.position.z = THREE.MathUtils.clamp(targetZ, -40, 40);
    }

    chase.group.rotation.y = Math.atan2(move.x, move.z);

    // Apply movement bounce
    chase.group.position.y = Math.abs(Math.sin(clock.elapsedTime * (sprinting ? 12 : 8.5))) * 0.12;

    if (sprinting) {
      state.stamina = Math.max(0, state.stamina - dt * 18);
    } else {
      state.stamina = Math.min(100, state.stamina + dt * 10);
    }
  } else {
    chase.group.position.y = 0;
    if (input.turn !== 0) {
      chase.group.rotation.y += input.turn * dt * 1.9;
    }
    state.stamina = Math.min(100, state.stamina + dt * 14);
  }
}

// DESTRUCTIVE JUNKS (BLOCKERS) & TIME LOOPS
function updateMissionTimer(dt) {
  if (state.reviewMode || state.ended) return;
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft <= 0) failMission("The timer expired.");
}

function updateBlockers(dt) {
  if (state.reviewMode || state.ended) return;

  for (const blocker of world.blockers) {
    const delta = chase.group.position.clone().sub(blocker.group.position);
    const planarDistance = Math.hypot(delta.x, delta.z);
    const collisionRadius = blocker.radius + 0.95;

    if (planarDistance > 0.001 && planarDistance < collisionRadius) {
      const pushStrength = (collisionRadius - planarDistance) * 2.4;
      delta.y = 0;
      delta.normalize();
      chase.group.position.addScaledVector(delta, pushStrength * dt);
      state.health = Math.max(0, state.health - dt * 12);
      state.stamina = Math.max(0, state.stamina - dt * 22);
      state.fear = Math.min(100, state.fear + dt * 18);
      
      state.hitSoundCooldown -= dt;
      if (state.hitSoundCooldown <= 0) {
        soundHit();
        state.hitSoundCooldown = 0.55;
      }

      if (state.health <= 0) {
        failMission("Chase collided too heavily with street blockades.");
      }
    }
  }
}

// ENVIRONMENT LIGHTS & FEAR UPDATES
function updateEnvironmentAndFear(dt) {
  if (state.ended || state.reviewMode) return;

  // 1. Check proximity to sodium lamp posts
  let inLight = false;
  for (const lampPos of world.lamps) {
    const d = chase.group.position.distanceTo(lampPos);
    if (d < 3.8) {
      inLight = true;
      break;
    }
  }

  // 2. Adjust fear
  const distToEnemy = noFace ? chase.group.position.distanceTo(noFace.group.position) : 999;
  if (distToEnemy < 7.5) {
    state.fear = Math.min(100, state.fear + dt * 15);
  } else if (inLight) {
    state.fear = Math.max(0, state.fear - dt * 25);
  } else {
    state.fear = Math.min(100, state.fear + dt * 2.8);
  }

  // 3. Loot stashes check
  for (const candy of world.candies) {
    if (candy.collected) continue;

    candy.group.rotation.y += dt * 1.5;
    candy.group.position.y = 0.4 + Math.sin(clock.elapsedTime * 2.5 + candy.phase) * 0.08;

    const d = chase.group.position.distanceTo(candy.group.position);
    if (d < 1.4) {
      candy.collected = true;
      candy.group.visible = false;
      state.candy = Math.min(6, state.candy + 1);
      state.cash += 50;
      state.eggs = Math.min(24, state.eggs + 3);
      state.fear = Math.max(0, state.fear - 25);
      soundPickup();
      refreshHUD();
    }
  }
}

// PROMPT OVERLAYS & STATE CHECKPOINT ACTIONS
function updateInteractionPrompt() {
  if (state.ended || state.reviewMode) {
    if (hud.promptCard) hud.promptCard.classList.remove("show");
    return;
  }

  const objective = getObjective();
  if (!objective) {
    if (hud.promptCard) hud.promptCard.classList.remove("show");
    return;
  }

  const dist = chase.group.position.distanceTo(objective.position);
  if (dist < 2.8) {
    let msg = "";
    if (state.objectiveIndex === 0) msg = "[E] Disguise Chase";
    else if (state.objectiveIndex === 1) msg = "[E] Hotwire Keys";
    else if (state.objectiveIndex === 2) msg = "[E] Loot Ward Sigil";
    else if (state.objectiveIndex === 3) msg = "[E] Light Beacon";
    else msg = "[E] Enter Safehouse";

    if (hud.promptText) hud.promptText.textContent = msg;
    if (hud.promptCard) hud.promptCard.classList.add("show");
  } else {
    if (hud.promptCard) hud.promptCard.classList.remove("show");
  }
}

function triggerInteraction() {
  if (state.ended || state.reviewMode) return;

  const objective = getObjective();
  if (!objective) return;

  const dist = chase.group.position.distanceTo(objective.position);
  if (dist > 2.8) return;

  if (state.objectiveIndex === 0) {
    state.story.disguise = true;
    state.costumeIndex = 1;
    applyChaseCostume(chase, 1);
    soundUpgrade();
  } else if (state.objectiveIndex === 1) {
    state.story.keys = true;
    state.stamina = 100;
    soundUpgrade();
  } else if (state.objectiveIndex === 2) {
    state.story.ward = true;
    soundUpgrade();
  } else if (state.objectiveIndex === 3) {
    state.story.beacon = true;
    soundUpgrade();
  } else if (state.objectiveIndex === 4) {
    completeMission();
    return;
  }

  // Advance route
  state.objectiveIndex += 1;
  if (state.objectiveIndex >= missionRoute.length) {
    completeMission();
  } else {
    state.timeLeft = Math.min(120, state.timeLeft + 30);
  }

  refreshHUD();
}

function getObjective() {
  return missionRoute[state.objectiveIndex];
}

// NO-FACE AI LOOP
function updateNoFaceAI(dt) {
  if (state.ended || state.reviewMode || !noFace) return;

  if (state.noFaceStunTimer > 0) {
    state.noFaceStunTimer -= dt;
    noFace.group.position.x += (Math.random() - 0.5) * 0.05;
    noFace.group.position.z += (Math.random() - 0.5) * 0.05;
    return;
  }

  const targetDir = new THREE.Vector3().subVectors(chase.group.position, noFace.group.position);
  targetDir.y = 0;
  const dist = targetDir.length();

  if (dist > 0.01) {
    targetDir.normalize();
    const stalkSpeed = (state.objectiveIndex >= 4) ? 4.8 : 3.1;
    noFace.group.position.addScaledVector(targetDir, stalkSpeed * dt);
    noFace.group.rotation.y = Math.atan2(targetDir.x, targetDir.z);
    noFace.group.position.y = Math.abs(Math.sin(clock.elapsedTime * 6.5)) * 0.08;
  }

  if (dist < 1.4) {
    state.health = Math.max(0, state.health - dt * 38);
    state.fear = 100;

    state.hitSoundCooldown -= dt;
    if (state.hitSoundCooldown <= 0) {
      soundHit();
      state.hitSoundCooldown = 0.45;
    }

    if (state.health <= 0) {
      failMission("No-Face caught up to Chase.");
    }
  }
}

// RENDER & ENVIRONMENT LOOP
function triggerLightning() {
  if (hud.flash) hud.flash.style.background = "rgba(198, 227, 255, 0.45)";
  scene.background.set(0x354b6b);
  scene.fog.color.set(0x283b54);
  soundThunder();

  setTimeout(() => {
    if (hud.flash) hud.flash.style.background = "rgba(198, 227, 255, 0)";
    scene.background.set(0x070b13);
    scene.fog.color.set(0x0b1220);
  }, 120);
}

function updateCamera(dt) {
  const focus = chase.group.position.clone().add(
    state.reviewMode ? new THREE.Vector3(0, 1.98, 0) : new THREE.Vector3(0, 1.8, 0)
  );
  
  const radius = state.reviewMode ? 4.7 : 11.5;
  const verticalSwing = state.reviewMode ? 1.8 : 1.6;

  const shake = (!state.ended && state.fear > 65) ? (state.fear / 100) * 0.15 : 0;
  const shakeVec = new THREE.Vector3(
    (Math.random() - 0.5) * shake,
    (Math.random() - 0.5) * shake,
    (Math.random() - 0.5) * shake
  );

  const offset = new THREE.Vector3(
    Math.sin(input.yaw) * radius,
    Math.sin(input.pitch) * verticalSwing,
    Math.cos(input.yaw) * radius
  );

  const ideal = focus.clone().add(offset).add(shakeVec);
  camera.position.lerp(ideal, 1 - Math.exp(-5.5 * dt));
  lookTarget.copy(focus);
  camera.lookAt(lookTarget);
}

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.033);

  updateMissionTimer(dt);
  applyMovement(dt);
  updateNoFaceAI(dt);
  updateBlockers(dt);
  updateEnvironmentAndFear(dt);
  updatePhysics(dt);
  updateRain(dt);
  updateInteractionPrompt();

  const currentObj = getObjective();
  const reviewHidden = state.reviewMode;
  world.markers.forEach((marker, index) => {
    const active = marker === currentObj;
    marker.group.visible = !reviewHidden && index >= state.objectiveIndex && !state.ended;
    if (reviewHidden) {
      marker.group.position.y = 0;
      return;
    }
    marker.beam.material.opacity = active ? 0.28 : 0.1;
    marker.disc.rotation.z += dt * (active ? 1.6 : 0.5);
    marker.group.position.y = active ? Math.sin(clock.elapsedTime * 2.4) * 0.15 : 0;
  });

  state.lightningTimer -= dt;
  if (state.lightningTimer <= 0) {
    triggerLightning();
    state.lightningTimer = 9.0 + Math.random() * 10;
  }

  updateCamera(dt);
  refreshHUD();
  renderer.render(scene, camera);
}

// EVENT LISTENERS
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (event) => {
  ensureAudio();
  
  const key = event.key ? event.key.toLowerCase() : "";
  if (event.code === "KeyW" || key === "w") input.forward = 1;
  if (event.code === "KeyS" || key === "s") input.forward = -1;
  if (event.code === "KeyA" || key === "a") input.strafe = -1;
  if (event.code === "KeyD" || key === "d") input.strafe = 1;
  if (event.code === "KeyQ" || key === "q") input.turn = 1;
  if (event.code === "KeyE" || key === "e") input.turn = -1;
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") input.sprint = true;
  if (event.code === "KeyR" || key === "r") resetGame();
  
  if ((event.code === "KeyE" || key === "e") && input.forward === 0 && input.strafe === 0) {
    triggerInteraction();
  }

  if (event.code === "Space" || key === " ") {
    event.preventDefault();
    throwCandyBomb();
  }

  if (event.code === "KeyF" || key === "f") {
    state.reviewMode = !state.reviewMode;
    if (state.reviewMode) {
      setReviewOrbitDefaults();
      hideOverlay();
    } else if (state.missionComplete) {
      setOverlay(
        "Mission Complete",
        "Safehouse Secured!",
        `Chase made it home alive with $${state.cash} cash, all ${state.candy} loot stashes, and survived No-Face's chase.`
      );
    } else if (state.missionFailed) {
      setOverlay(
        "Game Over",
        "Chase Was Caught",
        "No-Face cornered Chase in the shadows of Covington block."
      );
    }
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key ? event.key.toLowerCase() : "";
  if ((event.code === "KeyW" || key === "w") && input.forward > 0) input.forward = 0;
  if ((event.code === "KeyS" || key === "s") && input.forward < 0) input.forward = 0;
  if ((event.code === "KeyA" || key === "a") && input.strafe < 0) input.strafe = 0;
  if ((event.code === "KeyD" || key === "d") && input.strafe > 0) input.strafe = 0;
  if ((event.code === "KeyQ" || key === "q") && input.turn > 0) input.turn = 0;
  if ((event.code === "KeyE" || key === "e") && input.turn < 0) input.turn = 0;
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") input.sprint = false;
});

canvas.addEventListener("pointerdown", (event) => {
  ensureAudio();
  if (event.button === 0) {
    throwCandyBomb();
  } else if (event.button === 2) {
    input.dragging = true;
    input.lastX = event.clientX;
    input.lastY = event.clientY;
  }
});

window.addEventListener("pointermove", (event) => {
  if (!input.dragging) return;
  const dx = event.clientX - input.lastX;
  const dy = event.clientY - input.lastY;
  input.lastX = event.clientX;
  input.lastY = event.clientY;
  input.yaw -= dx * 0.006;
  input.pitch = THREE.MathUtils.clamp(
    input.pitch - dy * 0.004,
    state.reviewMode ? -0.3 : -0.65,
    state.reviewMode ? 0.4 : 0.45
  );
});

window.addEventListener("pointerup", () => {
  input.dragging = false;
});

canvas.addEventListener("contextmenu", (event) => event.preventDefault());

if (hud.restartBtn) {
  hud.restartBtn.addEventListener("click", () => {
    resetGame();
  });
}

// INITIAL RUN
resetGame();
updateCamera(0.016);
tick();
