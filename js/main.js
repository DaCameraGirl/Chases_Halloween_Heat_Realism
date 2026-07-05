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
  timerState: document.getElementById("timerState"),
  progressState: document.getElementById("progressState"),
  missionState: document.getElementById("missionState"),
  healthBar: document.getElementById("healthBar"),
  fearBar: document.getElementById("fearBar"),
  staminaBar: document.getElementById("staminaBar"),
  overlay: document.getElementById("missionOverlay"),
  overlayTitle: document.getElementById("overlayTitle"),
  overlayText: document.getElementById("overlayText")
};

hud.modelState.textContent = chase.modelLabel ?? (chase.isFallback ? "Starter Rig" : "Custom Model");

const state = {
  objectiveIndex: 0,
  health: 100,
  fear: 8,
  stamina: 100,
  reviewMode: false,
  missionDuration: 90,
  timeLeft: 90,
  missionComplete: false,
  missionFailed: false
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

function setOverlay(title, text) {
  hud.overlayTitle.textContent = title;
  hud.overlayText.textContent = text;
  hud.overlay.classList.remove("hidden");
}

function hideOverlay() {
  hud.overlay.classList.add("hidden");
}

function completeMission() {
  if (state.missionComplete) return;
  state.missionComplete = true;
  setOverlay(
    "Halloween Run Complete",
    "Chase hit all three checkpoints. Press R to restart the mission and tighten the route."
  );
}

function failMission() {
  if (state.missionFailed) return;
  state.missionFailed = true;
  setOverlay(
    "Night's Over",
    "The block got away from Chase this round. Press R to reset and beat the timer."
  );
}

function refreshHUD() {
  const objective = currentObjective();
  if (state.missionComplete) {
    hud.objectiveTitle.textContent = "Mission Complete";
    hud.objectiveHint.textContent = "Chase made all three Halloween stops. Press R to run it again and tighten the route.";
  } else if (state.missionFailed) {
    hud.objectiveTitle.textContent = "Retry The Route";
    hud.objectiveHint.textContent = "The timer ran out. Press R to reset Chase and take the block again.";
  } else if (objective) {
    hud.objectiveTitle.textContent = `Reach ${objective.name}`;
    hud.objectiveHint.textContent = "Sprint through three Halloween checkpoints before the timer expires, and avoid clipping the street junk on the way.";
  }

  hud.markerState.textContent = objective?.name ?? "Route Cleared";
  hud.viewState.textContent = state.reviewMode ? "Character Review" : "Third Person";
  hud.timerState.textContent = `${Math.max(0, Math.ceil(state.timeLeft))}s`;
  hud.progressState.textContent = `${missionProgress()} / ${missionRoute.length}`;
  hud.missionState.textContent = state.missionComplete ? "Won" : state.missionFailed ? "Failed" : "Live";
  hud.healthBar.style.width = `${state.health}%`;
  hud.fearBar.style.width = `${state.fear}%`;
  hud.staminaBar.style.width = `${state.stamina}%`;
}

function resetChase() {
  chase.group.position.copy(spawn);
  chase.group.rotation.y = Math.PI;
  state.reviewMode = false;
  state.objectiveIndex = 0;
  state.health = 100;
  state.fear = 8;
  state.stamina = 100;
  state.timeLeft = state.missionDuration;
  state.missionComplete = false;
  state.missionFailed = false;
  hideOverlay();
  refreshHUD();
}

function applyMovement(dt) {
  if (state.missionComplete || state.missionFailed) return;

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
    state.objectiveIndex += 1;
    if (state.objectiveIndex >= missionRoute.length) {
      completeMission();
    }
  }
}

function updateMissionTimer(dt) {
  if (state.reviewMode || state.missionComplete || state.missionFailed) return;
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft <= 0) failMission();
}

function updateBlockers(dt) {
  if (state.reviewMode || state.missionComplete || state.missionFailed) return;

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
    }
  }
}

function updateMarkers(dt) {
  const objective = currentObjective();
  const reviewHidden = state.reviewMode;
  world.markers.forEach((marker, index) => {
    const active = marker === objective;
    marker.group.visible = !reviewHidden && index >= state.objectiveIndex;
    if (reviewHidden) {
      marker.group.position.y = 0;
      return;
    }
    marker.beam.material.opacity = active ? 0.28 : 0.1;
    marker.disc.rotation.z += dt * (active ? 1.6 : 0.5);
    marker.group.position.y = active ? Math.sin(clock.elapsedTime * 2.4) * 0.15 : 0;
  });
}

function updateCamera(dt) {
  const focus = chase.group.position.clone().add(
    state.reviewMode ? new THREE.Vector3(0, 1.98, 0) : new THREE.Vector3(0, 1.8, 0)
  );
  const radius = state.reviewMode ? 4.7 : 11.5;
  const verticalSwing = state.reviewMode ? 1.8 : 1.6;
  const offset = new THREE.Vector3(
    Math.sin(input.yaw) * radius,
    Math.sin(input.pitch) * verticalSwing,
    Math.cos(input.yaw) * radius
  );
  const ideal = focus.clone().add(offset);
  camera.position.lerp(ideal, 1 - Math.exp(-5.5 * dt));
  lookTarget.copy(focus);
  camera.lookAt(lookTarget);
}

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.033);
  updateMissionTimer(dt);
  applyMovement(dt);
  updateBlockers(dt);
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
  if (event.code === "KeyF") {
    state.reviewMode = !state.reviewMode;
    if (state.reviewMode) {
      setReviewOrbitDefaults();
      hideOverlay();
    } else if (state.missionComplete) {
      setOverlay(
        "Halloween Run Complete",
        "Chase hit all three checkpoints. Press R to restart the mission and tighten the route."
      );
    } else if (state.missionFailed) {
      setOverlay(
        "Night's Over",
        "The block got away from Chase this round. Press R to reset and beat the timer."
      );
    }
  }
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

resetChase();
updateCamera(0.016);
tick();
