import * as THREE from "three";
import { createWorld, missionRoute } from "./world.js";
import { createChaseCharacter } from "./character.js";

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

const hud = {
  objectiveTitle: document.getElementById("objectiveTitle"),
  objectiveHint: document.getElementById("objectiveHint"),
  modelState: document.getElementById("modelState"),
  markerState: document.getElementById("markerState"),
  viewState: document.getElementById("viewState"),
  healthBar: document.getElementById("healthBar"),
  fearBar: document.getElementById("fearBar"),
  staminaBar: document.getElementById("staminaBar")
};

hud.modelState.textContent = chase.modelLabel ?? (chase.isFallback ? "Starter Rig" : "Custom Model");

const state = {
  objectiveIndex: 0,
  health: 100,
  fear: 8,
  stamina: 100,
  reviewMode: true
};

const input = {
  forward: 0,
  strafe: 0,
  turn: 0,
  sprint: false,
  dragging: false,
  yaw: Math.PI * 0.08,
  pitch: -0.34,
  lastX: 0,
  lastY: 0
};

const clock = new THREE.Clock();
const move = new THREE.Vector3();
const spawn = new THREE.Vector3(0, 0, 24);
const lookTarget = new THREE.Vector3();

function currentObjective() {
  return missionRoute[state.objectiveIndex];
}

function refreshHUD() {
  const objective = currentObjective();
  hud.objectiveTitle.textContent = `Reach ${objective.name}`;
  hud.objectiveHint.textContent = "Use this build to lock in Chase's face, curls, hoodie silhouette, and proportions first. The gameplay shell can be tuned after the character reads right.";
  hud.markerState.textContent = objective.name;
  hud.viewState.textContent = state.reviewMode ? "Character Review" : "Third Person";
  hud.healthBar.style.width = `${state.health}%`;
  hud.fearBar.style.width = `${state.fear}%`;
  hud.staminaBar.style.width = `${state.stamina}%`;
}

function resetChase() {
  chase.group.position.copy(spawn);
  chase.group.rotation.y = Math.PI;
  state.objectiveIndex = 0;
  state.health = 100;
  state.fear = 8;
  state.stamina = 100;
  refreshHUD();
}

function applyMovement(dt) {
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
    chase.group.position.addScaledVector(move, speed * dt);
    chase.group.rotation.y = Math.atan2(move.x, move.z);
    if (sprinting) {
      state.stamina = Math.max(0, state.stamina - dt * 16);
      state.fear = Math.min(100, state.fear + dt * 2.8);
    } else {
      state.stamina = Math.min(100, state.stamina + dt * 10);
      state.fear = Math.max(0, state.fear - dt * 1.25);
    }
  } else {
    if (input.turn !== 0) {
      chase.group.rotation.y += input.turn * dt * 1.9;
    }
    state.stamina = Math.min(100, state.stamina + dt * 14);
    state.fear = Math.max(0, state.fear - dt * 1.6);
  }

  chase.group.position.x = THREE.MathUtils.clamp(chase.group.position.x, -40, 40);
  chase.group.position.z = THREE.MathUtils.clamp(chase.group.position.z, -40, 40);

  const objective = currentObjective();
  if (objective && chase.group.position.distanceTo(objective.position) < 2.8) {
    state.objectiveIndex = Math.min(missionRoute.length - 1, state.objectiveIndex + 1);
  }
}

function updateMarkers(dt) {
  const objective = currentObjective();
  world.markers.forEach((marker, index) => {
    const active = marker === objective;
    marker.group.visible = index >= state.objectiveIndex;
    marker.beam.material.opacity = active ? 0.28 : 0.1;
    marker.disc.rotation.z += dt * (active ? 1.6 : 0.5);
    marker.group.position.y = active ? Math.sin(clock.elapsedTime * 2.4) * 0.15 : 0;
  });
}

function updateCamera(dt) {
  const radius = state.reviewMode ? 11.2 : 11.5;
  const verticalBase = state.reviewMode ? 0.7 : 5.2;
  const verticalSwing = state.reviewMode ? 0.65 : 1.6;
  const vertical = verticalBase + Math.sin(input.pitch) * verticalSwing;
  const offset = new THREE.Vector3(
    Math.sin(input.yaw) * radius,
    vertical,
    Math.cos(input.yaw) * radius
  );
  const ideal = chase.group.position.clone().add(offset);
  camera.position.lerp(ideal, 1 - Math.exp(-5.5 * dt));
  lookTarget.copy(chase.group.position).add(new THREE.Vector3(0, state.reviewMode ? 0.05 : 1.8, 0));
  camera.lookAt(lookTarget);
}

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.033);
  applyMovement(dt);
  updateMarkers(dt);
  updateCamera(dt);
  refreshHUD();
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyW") input.forward = 1;
  if (event.code === "KeyS") input.forward = -1;
  if (event.code === "KeyA") input.strafe = -1;
  if (event.code === "KeyD") input.strafe = 1;
  if (event.code === "KeyQ") input.turn = 1;
  if (event.code === "KeyE") input.turn = -1;
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") input.sprint = true;
  if (event.code === "KeyR") resetChase();
  if (event.code === "KeyF") state.reviewMode = !state.reviewMode;
});

window.addEventListener("keyup", (event) => {
  if (event.code === "KeyW" && input.forward > 0) input.forward = 0;
  if (event.code === "KeyS" && input.forward < 0) input.forward = 0;
  if (event.code === "KeyA" && input.strafe < 0) input.strafe = 0;
  if (event.code === "KeyD" && input.strafe > 0) input.strafe = 0;
  if (event.code === "KeyQ" && input.turn > 0) input.turn = 0;
  if (event.code === "KeyE" && input.turn < 0) input.turn = 0;
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") input.sprint = false;
});

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 && event.button !== 2) return;
  input.dragging = true;
  input.lastX = event.clientX;
  input.lastY = event.clientY;
});

window.addEventListener("pointermove", (event) => {
  if (!input.dragging) return;
  const dx = event.clientX - input.lastX;
  const dy = event.clientY - input.lastY;
  input.lastX = event.clientX;
  input.lastY = event.clientY;
  input.yaw -= dx * 0.006;
  input.pitch = THREE.MathUtils.clamp(input.pitch - dy * 0.004, -0.65, 0.45);
});

window.addEventListener("pointerup", () => {
  input.dragging = false;
});

canvas.addEventListener("contextmenu", (event) => event.preventDefault());

resetChase();
updateCamera(0.016);
tick();
