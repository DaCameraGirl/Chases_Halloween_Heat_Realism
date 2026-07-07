import * as THREE from "three";
import { createWorld } from "./world.js";
import { createChaseCharacter, applyChaseCostume, createNoFaceCharacter, costumeStyles } from "./character.js";

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.32;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b13);
scene.fog = new THREE.FogExp2(0x0b1220, 0.0072);

// Scene Global Lighting Setup
scene.add(new THREE.AmbientLight(0xa8b9ec, 1.72));
scene.add(new THREE.HemisphereLight(0x9ab8ff, 0x254028, 1.08));

const moonLight = new THREE.DirectionalLight(0xdbe7ff, 2.35);
moonLight.position.set(-20, 34, -18);
scene.add(moonLight);

const warmFill = new THREE.PointLight(0xffb56e, 1.8, 56, 2);
warmFill.position.set(-18, 8, 18);
scene.add(warmFill);

const coolStreetFill = new THREE.PointLight(0xa8d8ff, 1.18, 72, 2);
coolStreetFill.position.set(8, 9, -6);
scene.add(coolStreetFill);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);

const world = createWorld(scene);
const chase = await createChaseCharacter(scene);
const noFace = createNoFaceCharacter(scene);

// Spawn point
const spawn = new THREE.Vector3(-18, 0, 18);
chase.group.position.copy(spawn);

// No-Face mask adjustment for parody gameplay style
const noFaceMask = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 12, 12),
  new THREE.MeshStandardMaterial({ color: 0xe7e7e1, emissive: 0x7a7a7a, emissiveIntensity: 0.18, roughness: 0.55 })
);
noFaceMask.position.set(0, 2.35, 0.29);
noFace.group.add(noFaceMask);

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
  flash: document.getElementById("flash"),
  debugKeys: document.getElementById("debugKeys"),
  btnThrow: document.getElementById("btnThrow"),
  btnInteract: document.getElementById("btnInteract"),
  alertMsg: document.getElementById("alertMsg")
};

if (hud.modelState) {
  hud.modelState.textContent = chase.modelLabel ?? (chase.isFallback ? "Starter Rig" : "Custom Model");
}

const state = {
  health: 100,
  fear: 8,
  stamina: 100,
  reviewMode: false,
  missionDuration: 120,
  timeLeft: 120,
  missionComplete: false,
  missionFailed: false,
  cash: 0,
  candy: 0,
  eggs: 12,
  hits: 0,
  costumeIndex: 0,
  story: {
    disguise: false,
    keys: false,
    ward: false,
    beacon: false
  },
  upgrades: {
    stickyEggs: false,
    costume: false,
    sprintBoost: false,
    ward: false
  },
  mission: "costume", // "costume" -> "garage" -> "ward" -> "beacon" -> "escape"
  noFaceStunTimer: 0,
  lightningTimer: 6,
  hitSoundCooldown: 0,
  lastDamageTime: 0,
  toastTimer: 0,
  radioTimer: 0
};

const input = {
  forward: 0,
  strafe: 0,
  turn: 0,
  sprint: false,
  dragging: false,
  leftMouseDown: false,
  keyboardWPressed: false,
  yaw: Math.PI,
  pitch: 0.14,
  lastX: 0,
  lastY: 0
};

const clock = new THREE.Clock();
const move = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

// Active gameplay object arrays
const activeBombs = [];
const activeParticles = [];
const enemyVelocity = new THREE.Vector3();

// TARGETING ARROW MESH
const targetArrow = new THREE.Group();
const arrowBody = new THREE.Mesh(
  new THREE.ConeGeometry(0.24, 0.9, 12),
  new THREE.MeshStandardMaterial({ color: 0xffd264, emissive: 0xffac39, emissiveIntensity: 0.9, roughness: 0.35 })
);
arrowBody.rotation.x = Math.PI;
arrowBody.position.y = 3.95;
targetArrow.add(arrowBody);

const arrowRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.38, 0.06, 10, 24),
  new THREE.MeshBasicMaterial({ color: 0x7cf4da, transparent: true, opacity: 0.85 })
);
arrowRing.rotation.x = Math.PI / 2;
arrowRing.position.y = 3.34;
targetArrow.add(arrowRing);
scene.add(targetArrow);

// PROCEDURAL TOAST NOTIFICATION CONTAINER
let toastEl = document.getElementById("toast");
if (!toastEl) {
  toastEl = document.createElement("div");
  toastEl.id = "toast";
  toastEl.style.cssText = "position: fixed; left: 50%; bottom: 120px; transform: translate(-50%, 12px); padding: 12px 18px; border-radius: 999px; background: rgba(8, 12, 25, 0.88); border: 1px solid rgba(124, 244, 218, 0.24); color: #fff; font-family: monospace; font-size: 13px; font-weight: bold; pointer-events: none; opacity: 0; transition: opacity 120ms linear, transform 120ms linear; z-index: 10000;";
  document.body.appendChild(toastEl);
}

function showToast(text) {
  toastEl.textContent = text;
  toastEl.style.opacity = "1";
  toastEl.style.transform = "translate(-50%, 0)";
  state.toastTimer = 2.2;
}

function hideToast() {
  toastEl.style.opacity = "0";
  toastEl.style.transform = "translate(-50%, 12px)";
}

function setRadio(text) {
  if (hud.alertMsg) {
    hud.alertMsg.textContent = text;
  }
  state.radioTimer = 6.0;
}

// PROCEDURAL AUDIO SYSTEM
const listener = {
  ctx: null,
  gain: null,
  musicGain: null,
  musicTimer: null,
  musicStep: 0
};

function ensureAudio() {
  if (listener.ctx) {
    if (listener.ctx.state === "suspended") {
      listener.ctx.resume();
    }
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  listener.ctx = new AudioContextClass();
  
  listener.gain = listener.ctx.createGain();
  listener.gain.gain.value = 0.38;
  listener.gain.connect(listener.ctx.destination);

  listener.musicGain = listener.ctx.createGain();
  listener.musicGain.gain.value = 1.45;
  listener.musicGain.connect(listener.gain);
}

function playTone(freq, freqEnd, duration, type = "sine", vol = 0.4) {
  ensureAudio();
  if (!listener.ctx) return;
  const osc = listener.ctx.createOscillator();
  const gain = listener.ctx.createGain();
  const now = listener.ctx.currentTime;
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd !== freq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + duration);
  }
  
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(vol, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  
  osc.connect(gain);
  gain.connect(listener.gain);
  
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playMusicVoice(freq, freqEnd, duration, type = "triangle", vol = 0.06, attack = 0.08) {
  if (!listener.ctx || !listener.musicGain) return;
  const osc = listener.ctx.createOscillator();
  const gain = listener.ctx.createGain();
  const now = listener.ctx.currentTime;
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(10, freqEnd), now + duration);
  
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(vol, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  
  osc.connect(gain);
  gain.connect(listener.musicGain);
  
  osc.start(now);
  osc.stop(now + duration + 0.03);
}

function startSpookyMusic() {
  if (!listener.ctx || listener.musicTimer) return;
  if (listener.ctx.state === "suspended") {
    listener.ctx.resume();
  }
  const bassline = [146.83, 174.61, 130.81, 164.81, 146.83, 196.0, 130.81, 174.61];
  const melody = [293.66, 261.63, 246.94, 220.0, 261.63, 329.63, 246.94, 293.66];
  const accent = [440.0, 392.0, 369.99, 329.63, 392.0, 493.88, 369.99, 440.0];

  const pulse = () => {
    const step = listener.musicStep % bassline.length;
    playMusicVoice(bassline[step], bassline[step] * 0.985, 1.5, "sawtooth", 0.22, 0.08);
    playMusicVoice(melody[step], melody[step] * 1.01, 0.82, "triangle", 0.13, 0.03);
    if (step % 2 === 0) {
      playMusicVoice(accent[step], accent[step] * 1.03, 0.48, "square", 0.08, 0.02);
    }
    if (step === 3 || step === 7) {
      playMusicVoice(accent[step] * 0.5, accent[step] * 0.48, 1.9, "sine", 0.09, 0.12);
    }
    listener.musicStep += 1;
  };

  pulse();
  listener.musicTimer = window.setInterval(pulse, 900);
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

function getLookForwardBasis() {
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  dir.y = 0;
  dir.normalize();
  return dir;
}

function getLookRightBasis() {
  const dir = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  dir.y = 0;
  dir.normalize();
  return dir;
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function currentMissionZone() {
  if (state.mission === "costume") return world.zones.find(z => z.type === "costume");
  if (state.mission === "garage") return world.zones.find(z => z.type === "garage");
  if (state.mission === "ward") return world.zones.find(z => z.type === "ward");
  if (state.mission === "beacon") return world.zones.find(z => z.type === "beacon");
  if (state.mission === "escape") return world.zones.find(z => z.type === "safehouse");
  return null;
}

function currentObjectiveTarget() {
  const zone = currentMissionZone();
  return zone ? zone.ring.position : spawn;
}

function missionProgress() {
  if (state.mission === "costume") return 0;
  if (state.mission === "garage") return 1;
  if (state.mission === "ward") return 2;
  if (state.mission === "beacon") return 3;
  if (state.mission === "escape") return 4;
  return 5;
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
  const zone = currentMissionZone();
  if (hud.objectiveTitle) {
    if (state.missionComplete) {
      hud.objectiveTitle.textContent = "Mission Complete";
    } else if (state.missionFailed) {
      hud.objectiveTitle.textContent = "Retry The Route";
    } else if (zone) {
      hud.objectiveTitle.textContent = `Reach ${zone.label}`;
    }
  }
  
  if (hud.objectiveHint) {
    if (state.missionComplete) {
      hud.objectiveHint.textContent = "Chase made all five stops. Press R to run it again.";
    } else if (state.missionFailed) {
      hud.objectiveHint.textContent = "You failed the block errand. Press R to reset Chase and retake the block.";
    } else if (state.mission === "costume") {
      hud.objectiveHint.textContent = "Sneak to Costume Crypt and put on your Halloween fit to start the route.";
    } else if (state.mission === "garage") {
      hud.objectiveHint.textContent = "Break into Hearse Garage and hotwire the hearse keys.";
    } else if (state.mission === "ward") {
      hud.objectiveHint.textContent = "Head to Hex Market and extract the ancient ward protection sigil.";
    } else if (state.mission === "beacon") {
      hud.objectiveHint.textContent = "Go to the street center and light the Ritual Beacon before No-Face blocks you.";
    } else {
      hud.objectiveHint.textContent = "Escape back to the Safehouse! No-Face is fully raged and hunting.";
    }
  }

  if (hud.markerState) hud.markerState.textContent = zone?.label ?? "Route Cleared";
  if (hud.viewState) hud.viewState.textContent = state.reviewMode ? "Character Review" : "Third Person";
  if (hud.timerState) hud.timerState.textContent = `${Math.max(0, Math.ceil(state.timeLeft))}s`;
  if (hud.progressState) hud.progressState.textContent = `${missionProgress()} / 5`;
  if (hud.missionState) hud.missionState.textContent = state.missionComplete ? "Won" : state.missionFailed ? "Failed" : "Live";
  
  if (hud.healthBar) hud.healthBar.style.width = `${state.health}%`;
  if (hud.fearBar) hud.fearBar.style.width = `${state.fear}%`;
  if (hud.staminaBar) hud.staminaBar.style.width = `${state.stamina}%`;

  if (hud.cashValue) hud.cashValue.textContent = `$${state.cash}`;
  if (hud.candyValue) hud.candyValue.textContent = `${state.candy} / 6`;
  if (hud.eggValue) hud.eggValue.textContent = `${state.eggs}`;
  if (hud.debugKeys) hud.debugKeys.textContent = `F:${input.forward} S:${input.strafe}`;

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
  state.hits = 0;
  state.costumeIndex = 0;
  state.story.disguise = false;
  state.story.keys = false;
  state.story.ward = false;
  state.story.beacon = false;
  state.upgrades = { stickyEggs: false, costume: false, sprintBoost: false, ward: false };
  state.mission = "costume";
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

  const geom = new THREE.SphereGeometry(state.upgrades.stickyEggs ? 0.22 : 0.18, 12, 12);
  const mat = new THREE.MeshStandardMaterial({
    color: state.upgrades.stickyEggs ? 0xff8f3d : 0xff8b2b,
    emissive: state.upgrades.stickyEggs ? 0xff3b00 : 0xff5500,
    emissiveIntensity: 3,
    roughness: 0.2
  });
  const mesh = new THREE.Mesh(geom, mat);

  const spawnPos = chase.group.position.clone().add(new THREE.Vector3(0, 1.8, 0));
  mesh.position.copy(spawnPos);
  scene.add(mesh);

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  direction.y = Math.max(direction.y, -0.12);
  direction.normalize();

  const speed = state.upgrades.stickyEggs ? 20.0 : 13.8;
  const velocity = direction.multiplyScalar(speed);
  velocity.y += 1.4;

  activeBombs.push({
    mesh,
    velocity,
    position: mesh.position
  });

  playTone(720, 280, 0.18, "triangle", 0.24);
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

function spawnFootstepParticle(pos, sprinting) {
  const geom = new THREE.BoxGeometry(0.08, 0.03, 0.08);
  const color = Math.random() > 0.5 ? 0xcc6633 : 0xaa5522; // Autumn leaves colors
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
  const mesh = new THREE.Mesh(geom, mat);
  
  mesh.position.copy(pos);
  mesh.position.x += (Math.random() - 0.5) * 0.45;
  mesh.position.z += (Math.random() - 0.5) * 0.45;
  mesh.position.y = 0.03 + Math.random() * 0.05;
  
  scene.add(mesh);
  
  const vel = new THREE.Vector3(
    (Math.random() - 0.5) * 1.5,
    Math.random() * 2.2 + 0.6,
    (Math.random() - 0.5) * 1.5
  );
  
  activeParticles.push({
    mesh,
    velocity: vel,
    life: 0.35 + Math.random() * 0.2
  });
}

function updatePhysics(dt) {
  // Update bombs
  for (let i = activeBombs.length - 1; i >= 0; i--) {
    const bomb = activeBombs[i];
    bomb.velocity.y -= 12 * dt;
    bomb.position.addScaledVector(bomb.velocity, dt);

    const hitRadius = state.upgrades.stickyEggs ? 2.6 : 1.8;
    const distToNoFace = noFace ? bomb.position.distanceTo(noFace.group.position) : 999;
    
    if (bomb.position.y <= 0.05 || distToNoFace < hitRadius) {
      spawnExplosion(bomb.position);
      scene.remove(bomb.mesh);
      activeBombs.splice(i, 1);

      if (distToNoFace < hitRadius) {
        state.hits += 1;
        state.cash += state.hits % 3 === 0 ? 90 : 20;
        state.noFaceStunTimer = state.upgrades.ward ? 3.6 : 2.2;
        enemyVelocity.copy(new THREE.Vector3(
          noFace.group.position.x - chase.group.position.x,
          0,
          noFace.group.position.z - chase.group.position.z
        ).normalize().multiplyScalar(6.5));
        
        soundHit();
        showToast(state.hits % 3 === 0 ? "Direct hit! Payout Bonus!" : "Stunned No-Face!");
        setRadio("Good hit. No-Face is staggered.");
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

  const basisForward = getLookForwardBasis();
  const basisRight = getLookRightBasis();
  move.set(0, 0, 0);
  move.addScaledVector(basisForward, input.forward);
  move.addScaledVector(basisRight, input.strafe);

  const moving = move.lengthSq() > 0.0001;
  if (moving) {
    move.normalize();
    const sprinting = input.sprint && state.stamina > 5;
    const baseSpeed = state.upgrades.sprintBoost ? 6.2 : 4.8;
    const sprintBonus = state.upgrades.sprintBoost ? 3.2 : 2.0;
    const speed = sprinting ? baseSpeed + sprintBonus : baseSpeed;

    const moveStep = speed * dt;
    const targetX = chase.group.position.x + move.x * moveStep;
    const targetZ = chase.group.position.z + move.z * moveStep;

    let collideX = false;
    let collideZ = false;

    // Radius checks for character boundary
    const r = 0.55;
    for (const solid of world.solids) {
      if (solid.minX === undefined || solid.minZ === undefined) continue;
      
      // X checking
      if (targetX + r >= solid.minX && targetX - r <= solid.maxX &&
          chase.group.position.z + r >= solid.minZ && chase.group.position.z - r <= solid.maxZ) {
        collideX = true;
      }
      // Z checking
      if (chase.group.position.x + r >= solid.minX && chase.group.position.x - r <= solid.maxX &&
          targetZ + r >= solid.minZ && targetZ - r <= solid.maxZ) {
        collideZ = true;
      }
    }

    if (!collideX) {
      chase.group.position.x = THREE.MathUtils.clamp(targetX, -48, 48);
    }
    if (!collideZ) {
      chase.group.position.z = THREE.MathUtils.clamp(targetZ, -48, 48);
    }

    chase.group.rotation.y = Math.atan2(move.x, move.z);

    // Apply movement bounce
    chase.group.position.y = Math.abs(Math.sin(clock.elapsedTime * (sprinting ? 12 : 8.5))) * 0.12;

    // Spawn footstep autumn leaves
    if (Math.random() < (sprinting ? 0.45 : 0.22)) {
      spawnFootstepParticle(chase.group.position, sprinting);
    }

    if (sprinting) {
      state.stamina = Math.max(0, state.stamina - dt * 20);
    } else {
      state.stamina = Math.min(100, state.stamina + dt * (state.upgrades.sprintBoost ? 16 : 12));
    }
  } else {
    chase.group.position.y = 0;
    if (input.turn !== 0) {
      chase.group.rotation.y += input.turn * dt * 1.9;
    }
    state.stamina = Math.min(100, state.stamina + dt * (state.upgrades.sprintBoost ? 18 : 14));
  }
}

// TIMERS & ROUND LIMITS
function updateMissionTimer(dt) {
  if (state.reviewMode || state.ended) return;
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft <= 0) failMission("The timer expired.");
}

// ENVIRONMENT LIGHTS & FEAR UPDATES
function updateEnvironmentAndFear(dt) {
  if (state.ended || state.reviewMode) return;

  // 1. Check proximity to sodium lamp posts
  let lampInfluence = 0;
  for (const lamp of world.lamps) {
    const d = Math.hypot(chase.group.position.x - lamp.group.position.x, chase.group.position.z - lamp.group.position.z);
    lampInfluence = Math.max(lampInfluence, 1 - THREE.MathUtils.clamp(d / (state.upgrades.ward ? 9.2 : 7.4), 0, 1));
  }

  // 2. Adjust fear and health in lamp light
  const distToEnemy = noFace ? chase.group.position.distanceTo(noFace.group.position) : 999;
  if (lampInfluence > 0) {
    state.fear = Math.max(0, state.fear - lampInfluence * 10 * dt);
    if (distToEnemy > 8) {
      state.health = Math.min(100, state.health + lampInfluence * 2.5 * dt);
    }
  } else {
    state.fear = Math.min(100, state.fear + dt * 2.8);
  }

  if (distToEnemy < 7.5) {
    state.fear = Math.min(100, state.fear + dt * 15);
  }

  // 3. Loot stashes check
  for (const candy of world.candies) {
    if (candy.collected) continue;

    candy.group.position.y = 0.12 + Math.sin(clock.elapsedTime * 2.3 + candy.phase) * 0.12;
    candy.group.rotation.y += dt * 1.3;
    if (candy.sparkle) {
      candy.sparkle.rotation.y += dt * 4;
      candy.sparkle.rotation.x += dt * 3;
      candy.sparkle.position.y = 0.72 + Math.sin(clock.elapsedTime * 4 + candy.phase) * 0.08;
    }

    const distance = chase.group.position.distanceTo(candy.group.position);
    if (distance < 1.65) {
      candy.collected = true;
      candy.group.visible = false;
      state.candy = Math.min(6, state.candy + 1);
      state.cash += 50;
      state.fear = Math.max(0, state.fear - 8);
      soundPickup();
      showToast("+1 loot stash   +$50");
      setRadio("Stash scooped: cash, snacks, and one more reason for No-Face to stay mad.");
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

  const { zone, distance } = nearestZone();
  const threshold = zone ? zone.radius + 1.1 : Infinity;
  if (!zone || distance > threshold) {
    if (hud.promptCard) hud.promptCard.classList.remove("show");
    return;
  }

  let text = "Press E to interact.";
  if (zone.type === "safehouse") {
    text = "Press [E] to heal and refill stashes at Safehouse.";
  } else if (zone.type === "candyForge") {
    text = state.upgrades.stickyEggs ? "Press [E] to refill bombs at Candy Forge." : "Press [E] to buy Sticky Candy Bombs for $150.";
  } else if (zone.type === "costume") {
    text = state.mission === "costume" ? "Press [E] to disguise Chase at Costume Crypt." : "Press [E] to change costume fits.";
  } else if (zone.type === "garage") {
    text = state.mission === "garage" ? "Press [E] to steal hearse keys." : (state.upgrades.sprintBoost ? "Sprint Boost active." : "Press [E] to buy Sprint Boost for $250.");
  } else if (zone.type === "ward") {
    text = state.mission === "ward" ? "Press [E] to take ward sigil." : (state.upgrades.ward ? "Ward active. Stuns last longer." : "Press [E] to buy Ward Sigil for $300.");
  } else if (zone.type === "beacon") {
    text = state.mission === "beacon" ? "Press [E] to light Ritual Beacon." : "Beacon locked.";
  } else if (zone.type === "mutation") {
    text = "Press [E] to throw 1 candy in cauldron and brew mutations.";
  }

  if (hud.promptText) hud.promptText.textContent = text;
  if (hud.promptCard) hud.promptCard.classList.add("show");
}

function triggerInteraction() {
  if (state.ended || state.reviewMode) return;

  const { zone, distance } = nearestZone();
  const threshold = zone ? zone.radius + 1.1 : Infinity;
  if (!zone || distance > threshold) return;

  interactWithZone(zone);
}

function interactWithZone(zone) {
  if (!zone || state.ended || state.win) return;

  if (zone.type === "safehouse") {
    if (state.mission === "escape") {
      completeMission();
      return;
    }
    state.health = Math.min(100, state.health + 45);
    state.fear = Math.max(0, state.fear - 35);
    state.stamina = 100;
    state.eggs = Math.max(state.eggs, 12);
    showToast("Safehouse reset: refilled and healed.");
    setRadio("Back in the safehouse. Breathe, reload, and get back out there.");
    soundUpgrade();
    return;
  }

  if (zone.type === "candyForge") {
    if (!state.upgrades.stickyEggs) {
      if (state.cash < 150) {
        showToast("Need $150 for Sticky Candy Bombs.");
        return;
      }
      state.cash -= 150;
      state.upgrades.stickyEggs = true;
      state.eggs += 6;
      showToast("Sticky Candy Bombs unlocked.");
      setRadio("Candy Forge special: harder hits, bigger splat.");
      soundUpgrade();
    } else {
      state.eggs = Math.max(state.eggs, 14);
      showToast("Candy bomb stash refilled.");
      soundPickup();
    }
    return;
  }

  if (zone.type === "costume") {
    state.costumeIndex = (state.costumeIndex + 1) % costumeStyles.length;
    applyChaseCostume(chase, state.costumeIndex);
    state.upgrades.costume = state.costumeIndex !== 0;
    state.fear = Math.max(0, state.fear - (state.upgrades.costume ? 12 : 4));
    if (state.mission === "costume") {
      state.mission = "garage";
      showToast(`Disguise on: ${costumeStyles[state.costumeIndex].name}.`);
      setRadio("Costume Crypt is handled. Hearse Garage next. Get the keys before No-Face catches on.");
    } else {
      showToast(`Changed into ${costumeStyles[state.costumeIndex].name}.`);
    }
    soundUpgrade();
    refreshHUD();
    return;
  }

  if (zone.type === "garage") {
    if (state.mission === "garage" && !state.story.keys) {
      state.story.keys = true;
      state.upgrades.sprintBoost = true;
      state.stamina = 100;
      state.mission = "ward";
      showToast("Hearse keys lifted.");
      setRadio("Garage is cracked. Sprint tune is live. Hit Hex Market for the ward sigil.");
      soundUpgrade();
      refreshHUD();
      return;
    }
    if (state.upgrades.sprintBoost) {
      showToast("Sprint Boost already installed.");
      return;
    }
    if (state.cash < 250) {
      showToast("Need $250 for Sprint Boost.");
      return;
    }
    state.cash -= 250;
    state.upgrades.sprintBoost = true;
    state.stamina = 100;
    showToast("Sprint Boost installed.");
    setRadio("Hearse Garage tune complete. Chase moves quicker now.");
    soundUpgrade();
    return;
  }

  if (zone.type === "ward") {
    if (state.mission === "ward" && !state.story.ward) {
      state.story.ward = true;
      state.upgrades.ward = true;
      state.mission = "beacon";
      showToast("Warm sigil secured.");
      setRadio("Hex Market is done. Now light the beacon and pray Chase can outrun what wakes up.");
      soundUpgrade();
      refreshHUD();
      return;
    }
    if (state.upgrades.ward) {
      showToast("Ward Sigil already active.");
      return;
    }
    if (state.cash < 300) {
      showToast("Need $300 for the Ward Sigil.");
      return;
    }
    state.cash -= 300;
    state.upgrades.ward = true;
    showToast("Ward Sigil bound.");
    setRadio("Hex Market says the next stun should hit a lot meaner.");
    soundUpgrade();
    return;
  }

  if (zone.type === "beacon") {
    if (state.mission !== "beacon") {
      showToast("Get the disguise, hearse keys, and ward sigil first.");
      return;
    }
    state.story.beacon = true;
    state.mission = "escape";
    showToast("Beacon lit. Run home.");
    setRadio("The beacon is hot. Safehouse now. Do not get greedy.");
    soundUpgrade();
    refreshHUD();
    return;
  }

  if (zone.type === "mutation") {
    if (state.candy < 1) {
      showToast("Need 1 candy stash collected to brew a mutation!");
      soundFail();
      return;
    }
    
    state.candy -= 1;
    // Brew sound effects (bubble and splash)
    playTone(220, 780, 0.4, "triangle", 0.4);
    setTimeout(() => playTone(640, 180, 0.22, "sawtooth", 0.25), 100);

    const roll = Math.floor(Math.random() * 5);
    if (roll === 0) {
      applyChaseCostume(chase, 4); // Skeleton Ghost
      showToast("🔮 Brewed: Skeleton Ghost Costume!");
      setRadio("Candy mutated! Chase is dressed as a Skeleton Ghost.");
    } else if (roll === 1) {
      applyChaseCostume(chase, 5); // Black Cat Shadow
      showToast("🔮 Brewed: Black Cat Shadow Costume!");
      setRadio("Candy mutated! Chase is dressed as a glowing Black Cat.");
    } else if (roll === 2) {
      state.eggs += 6;
      state.upgrades.stickyEggs = true;
      showToast("🔮 Brewed: 6 Fire Candy Bombs!");
      setRadio("Candy mutated! Obtained double-strength Fire Candy Bombs.");
    } else if (roll === 3) {
      state.health = Math.min(100, state.health + 30);
      state.stamina = 100;
      state.cash += 100;
      showToast("🔮 Brewed: Warlock Speed Potion (+$100 Cash, +30 HP)!");
      setRadio("Candy mutated! Drank speed potion: stamina refueled, health gained.");
    } else {
      state.cash += 300;
      showToast("🔮 Brewed: Golden Witch Hat (+$300 Cash)!");
      setRadio("Candy mutated! Brewed a pure gold Witch Hat worth $300.");
    }

    refreshHUD();
  }
}

function nearestZone() {
  let best = null;
  let bestDistance = Infinity;
  for (const zone of world.zones) {
    const distance = chase.group.position.distanceTo(zone.ring.position);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = zone;
    }
  }
  return { zone: best, distance: bestDistance };
}

// NO-FACE AI LOOP
function updateNoFaceAI(dt) {
  if (state.ended || state.reviewMode || !noFace) return;

  const target = chase.group.position.clone();
  const toPlayer = target.sub(noFace.group.position);
  const distance = Math.hypot(toPlayer.x, toPlayer.z);

  if (state.noFaceStunTimer > 0) {
    state.noFaceStunTimer -= dt;
    noFace.group.position.addScaledVector(enemyVelocity, dt);
    enemyVelocity.multiplyScalar(Math.exp(-5 * dt));
    
    // Shake stunned model
    noFace.group.position.x += (Math.random() - 0.5) * 0.05;
    noFace.group.position.z += (Math.random() - 0.5) * 0.05;
    return;
  }

  // Calculate speed based on player fear
  const stalkSpeed = 2.5 + smoothstep(10, 80, state.fear) * 1.4 + (state.mission === "escape" ? 0.55 : 0);
  
  // Slow down when player is under lamp light
  let lampInfluence = 0;
  for (const lamp of world.lamps) {
    const d = Math.hypot(chase.group.position.x - lamp.group.position.x, chase.group.position.z - lamp.group.position.z);
    lampInfluence = Math.max(lampInfluence, 1 - THREE.MathUtils.clamp(d / (state.upgrades.ward ? 9.2 : 7.4), 0, 1));
  }
  const slow = 1 - lampInfluence * 0.18;

  if (distance > 1.1) {
    const moveVec = new THREE.Vector3(toPlayer.x, 0, toPlayer.z).normalize();
    noFace.group.position.addScaledVector(moveVec, stalkSpeed * slow * dt);
    noFace.group.rotation.y = Math.atan2(moveVec.x, moveVec.z);
    noFace.group.position.y = Math.abs(Math.sin(clock.elapsedTime * 6.5)) * 0.08;
  }

  // Hit registry
  if (distance < 1.65 && clock.elapsedTime - state.lastDamageTime > 0.9 && !state.ended) {
    state.lastDamageTime = clock.elapsedTime;
    state.health = Math.max(0, state.health - 13);
    const fearGain = state.costumeIndex !== 0 ? 8 : 14;
    state.fear = Math.min(100, state.fear + fearGain);
    showToast("No-Face got a swipe in.");
    soundFail();
    refreshHUD();

    if (state.health <= 0 || state.fear >= 100) {
      failMission("No-Face caught up to Chase.");
    }
  }
}

// RENDER & ENVIRONMENT LOOP
function triggerLightning() {
  if (hud.flash) hud.flash.style.background = "rgba(198, 227, 255, 0.55)";
  scene.background.set(0x3e4f6d);
  scene.fog.color.set(0x313f57);
  soundThunder();
  setRadio("Pumpkin FM weather alert: lightning strike. Street power grid is unstable!");

  // Instantly blackout sodium lights
  for (const lamp of world.lamps) {
    lamp.light.intensity = 0;
  }

  setTimeout(() => {
    if (hud.flash) hud.flash.style.background = "rgba(198, 227, 255, 0)";
    scene.background.set(0x070b13);
    scene.fog.color.set(0x0b1220);
    
    // Flickering reboot lamps
    let count = 0;
    const interval = setInterval(() => {
      for (const lamp of world.lamps) {
        lamp.light.intensity = Math.random() > 0.35 ? 1.85 : 0;
      }
      count++;
      if (count > 6) {
        clearInterval(interval);
        for (const lamp of world.lamps) {
          lamp.light.intensity = 1.85;
        }
      }
    }, 60);
  }, 140);
}

function updateTargetArrow() {
  const zone = currentMissionZone();
  if (!zone) {
    targetArrow.visible = false;
    return;
  }
  targetArrow.visible = true;
  targetArrow.position.copy(chase.group.position);
  const dx = zone.ring.position.x - chase.group.position.x;
  const dz = zone.ring.position.z - chase.group.position.z;
  targetArrow.rotation.y = Math.atan2(dx, dz);
  arrowRing.rotation.z += 0.03;
  targetArrow.position.y = Math.sin(clock.elapsedTime * 3) * 0.08;
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

  // Cauldron smoke particle spawning
  if (world.cauldronPos && Math.random() < 0.28) {
    const geom = new THREE.SphereGeometry(0.08 + Math.random() * 0.12, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.55 ? 0x76ff03 : 0xaa00ff,
      transparent: true,
      opacity: 0.62
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(world.cauldronPos);
    mesh.position.x += (Math.random() - 0.5) * 0.4;
    mesh.position.z += (Math.random() - 0.5) * 0.4;
    scene.add(mesh);

    activeParticles.push({
      mesh,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 0.35, 1.1 + Math.random() * 0.6, (Math.random() - 0.5) * 0.35),
      life: 0.75 + Math.random() * 0.45
    });
  }

  // Core clocks
  if (state.toastTimer > 0) {
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) hideToast();
  }

  if (state.radioTimer > 0) {
    state.radioTimer -= dt;
    if (state.radioTimer <= 0 && !state.ended) {
      setRadio("Keep your eyes on the glow beams. That is where the real route is.");
    }
  }

  updateMissionTimer(dt);
  applyMovement(dt);
  updateNoFaceAI(dt);
  updateEnvironmentAndFear(dt);
  updatePhysics(dt);
  updateRain(dt);
  updateInteractionPrompt();
  updateTargetArrow();

  // Spin active zones
  for (const zone of world.zones) {
    zone.ring.rotation.z += dt * 0.2;
    zone.beam.material.opacity = 0.13 + Math.sin(clock.elapsedTime * 2 + zone.radius) * 0.05;
    zone.sign.lookAt(camera.position);
  }

  for (const sign of world.signs) {
    sign.lookAt(camera.position);
  }

  // Animate wind leaves
  for (const leaf of world.leaves) {
    leaf.mesh.position.x += leaf.speedX * dt;
    leaf.mesh.position.y += leaf.speedY * dt;
    leaf.mesh.rotation.x += leaf.spinSpeed * dt;
    leaf.mesh.rotation.y += leaf.spinSpeed * 0.5 * dt;

    if (leaf.mesh.position.y < 0.02 || leaf.mesh.position.x < -48) {
      leaf.mesh.position.x = 48 + (Math.random() - 0.5) * 10;
      leaf.mesh.position.y = 2.5 + Math.random() * 3;
      leaf.mesh.position.z = (Math.random() - 0.5) * 90;
    }
  }

  // Animate ghosts
  for (const ghost of world.ghosts) {
    ghost.group.position.x = ghost.baseX + Math.sin(clock.elapsedTime * 0.7 + ghost.phase) * 1.6;
    ghost.group.position.y = 2.5 + Math.sin(clock.elapsedTime * 1.3 + ghost.phase) * 0.55;
    ghost.group.position.z = ghost.baseZ + Math.cos(clock.elapsedTime * 0.5 + ghost.phase) * 1.2;
    ghost.group.rotation.y += dt * 0.5;
  }

  // Animate kids
  for (const kid of world.kids) {
    kid.group.position.x = kid.baseX + Math.sin(clock.elapsedTime * 0.9 + kid.phase) * 1.2;
    kid.group.position.z = kid.baseZ + Math.cos(clock.elapsedTime * 0.7 + kid.phase) * 1.2;
    kid.group.rotation.y = Math.sin(clock.elapsedTime * 1.1 + kid.phase) * 0.6;
    kid.group.position.y = Math.abs(Math.sin(clock.elapsedTime * 2.1 + kid.phase)) * 0.08;
  }

  // Flickering street lights
  for (const lamp of world.lamps) {
    // Only flicker randomly if lightning is not actively controlling it
    if (state.lightningTimer > 0.3) {
      lamp.light.intensity = 1.85 + Math.sin(clock.elapsedTime * 6 + lamp.phase) * 0.24 + Math.random() * 0.08;
    }
  }

  // Weather lightning loop
  state.lightningTimer -= dt;
  if (state.lightningTimer <= 0) {
    triggerLightning();
    state.lightningTimer = 9.0 + Math.random() * 10;
  }

  updateCamera(dt);
  refreshHUD();
  renderer.render(scene, camera);
}

// EVENT LISTENERS WITH ROBUST EVENT PREVENT PREVENTIONS
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (event) => {
  ensureAudio();
  startSpookyMusic();
  
  const key = event.key ? event.key.toLowerCase() : "";
  const code = event.code;

  if (code === "ArrowUp" || key === "arrowup" || key === "up" || code === "KeyW" || key === "w") {
    event.preventDefault();
    input.forward = 1;
    input.keyboardWPressed = true;
  }
  if (code === "ArrowDown" || key === "arrowdown" || key === "down" || code === "KeyS" || key === "s") {
    event.preventDefault();
    input.forward = -1;
  }
  if (code === "ArrowLeft" || key === "arrowleft" || key === "left" || code === "KeyA" || key === "a") {
    event.preventDefault();
    input.strafe = -1;
  }
  if (code === "ArrowRight" || key === "arrowright" || key === "right" || code === "KeyD" || key === "d") {
    event.preventDefault();
    input.strafe = 1;
  }
  if (code === "KeyQ" || key === "q") {
    event.preventDefault();
    input.turn = 1;
  }
  if (code === "KeyE" || key === "e") {
    event.preventDefault();
    // Only trigger interact if not moving, otherwise rotate
    if (input.forward === 0 && input.strafe === 0) {
      triggerInteraction();
    } else {
      input.turn = -1;
    }
  }
  if (code === "ShiftLeft" || code === "ShiftRight" || key === "shift") {
    input.sprint = true;
  }
  if (code === "KeyR" || key === "r") {
    resetGame();
  }
  if (code === "Space" || key === " ") {
    event.preventDefault();
    throwCandyBomb();
  }
  if (code === "KeyF" || key === "f") {
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
  const code = event.code;

  if (code === "ArrowUp" || key === "arrowup" || key === "up" || code === "KeyW" || key === "w") {
    input.keyboardWPressed = false;
    if (!input.leftMouseDown) {
      input.forward = 0;
    }
  }
  if ((code === "ArrowDown" || key === "arrowdown" || key === "down" || code === "KeyS" || key === "s") && input.forward < 0) {
    input.forward = 0;
  }
  if ((code === "ArrowLeft" || key === "arrowleft" || key === "left" || code === "KeyA" || key === "a") && input.strafe < 0) {
    input.strafe = 0;
  }
  if ((code === "ArrowRight" || key === "arrowright" || key === "right" || code === "KeyD" || key === "d") && input.strafe > 0) {
    input.strafe = 0;
  }
  if (code === "KeyQ" || key === "q") {
    input.turn = 0;
  }
  if (code === "KeyE" || key === "e") {
    input.turn = 0;
  }
  if (code === "ShiftLeft" || code === "ShiftRight" || key === "shift") {
    input.sprint = false;
  }
});

canvas.addEventListener("pointerdown", (event) => {
  ensureAudio();
  startSpookyMusic();
  
  if (event.button === 0) {
    input.leftMouseDown = true;
    input.forward = 1;
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

window.addEventListener("pointerup", (event) => {
  if (event.button === 0) {
    input.leftMouseDown = false;
    if (!input.keyboardWPressed) {
      input.forward = 0;
    }
  } else if (event.button === 2) {
    input.dragging = false;
  }
});

canvas.addEventListener("contextmenu", (event) => event.preventDefault());

if (hud.restartBtn) {
  hud.restartBtn.addEventListener("click", () => {
    resetGame();
  });
}

// Wire up screen panel buttons for mouse-only actions
if (hud.btnThrow) {
  hud.btnThrow.addEventListener("click", (e) => {
    e.stopPropagation();
    throwCandyBomb();
  });
}

if (hud.btnInteract) {
  hud.btnInteract.addEventListener("click", (e) => {
    e.stopPropagation();
    triggerInteraction();
  });
}

// INITIAL RUN
resetGame();
updateCamera(0.016);
tick();
