const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  stage: document.querySelector(".canvas-wrap"),
  shards: document.querySelector("#shards"),
  planetName: document.querySelector("#planetName"),
  planetHp: document.querySelector("#planetHp"),
  hpFill: document.querySelector("#hpFill"),
  damageStage: document.querySelector("#damageStage"),
  planets: document.querySelector("#planets"),
  reform: document.querySelector("#reform"),
  weapons: document.querySelector("#weapons"),
  buy: document.querySelector("#buy"),
  destroyed: document.querySelector("#destroyed"),
  dps: document.querySelector("#dps"),
  activeWeapon: document.querySelector("#activeWeapon"),
  reset: document.querySelector("#reset"),
  combo: document.querySelector("#combo"),
  blastText: document.querySelector("#blastText"),
  focusGlyph: document.querySelector("#focusGlyph"),
  focusStatus: document.querySelector("#focusStatus"),
  focusName: document.querySelector("#focusName"),
  focusNote: document.querySelector("#focusNote"),
};

const weapons = [
  {
    id: "harp",
    name: "Ion Harp",
    glyph: "⌁",
    damage: 10,
    cost: 0,
    color: "#8ef6d8",
    note: "Cuts crust with soundless lightning.",
  },
  {
    id: "loom",
    name: "Gravity Loom",
    glyph: "◎",
    damage: 27,
    cost: 85,
    color: "#ffd56d",
    note: "Braids orbit lines into tidal collapse.",
  },
  {
    id: "choir",
    name: "Solar Choir",
    glyph: "✶",
    damage: 58,
    cost: 260,
    color: "#ffb36d",
    note: "Drops tiny stars into the mantle.",
  },
  {
    id: "needle",
    name: "Null Needle",
    glyph: "⌖",
    damage: 108,
    cost: 680,
    color: "#72d7ff",
    note: "Deletes a pinhole through spacetime.",
  },
  {
    id: "mirror",
    name: "Mirror Monolith",
    glyph: "▰",
    damage: 196,
    cost: 1450,
    color: "#d7c4ff",
    note: "Makes the planet fight its reflection.",
  },
  {
    id: "garden",
    name: "Entropy Garden",
    glyph: "✣",
    damage: 340,
    cost: 3200,
    color: "#ff6b8a",
    note: "Plants beautiful decay in the core.",
  },
];

const solarPlanets = [
  {
    id: "mercury",
    name: "Mercury",
    hp: 115,
    radius: 0.78,
    palette: ["#b9aa96", "#5b5149", "#f3dbc0", "#8f7c68"],
    craters: 18,
    texture: "rock",
  },
  {
    id: "venus",
    name: "Venus",
    hp: 155,
    radius: 0.9,
    palette: ["#f2c66d", "#9f6436", "#fff1b7", "#d48b46"],
    craters: 10,
    texture: "storm",
  },
  {
    id: "earth",
    name: "Earth",
    hp: 180,
    radius: 0.95,
    palette: ["#3ab4ff", "#123c77", "#ecfbff", "#48c68b"],
    craters: 4,
    texture: "continents",
  },
  {
    id: "mars",
    name: "Mars",
    hp: 150,
    radius: 0.86,
    palette: ["#e47042", "#78311f", "#ffd4aa", "#b9472e"],
    craters: 15,
    texture: "polar",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    hp: 390,
    radius: 1.18,
    palette: ["#d6a66b", "#7c5233", "#fff0c8", "#b46d45"],
    craters: 0,
    texture: "gas",
    spot: true,
  },
  {
    id: "saturn",
    name: "Saturn",
    hp: 350,
    radius: 1.08,
    palette: ["#e7c27a", "#8b6a3f", "#fff0bd", "#c29458"],
    craters: 0,
    texture: "gas",
    rings: true,
  },
  {
    id: "uranus",
    name: "Uranus",
    hp: 300,
    radius: 1,
    palette: ["#8bd9e8", "#2f6f80", "#e8feff", "#63bdc8"],
    craters: 0,
    texture: "ice",
    rings: true,
  },
  {
    id: "neptune",
    name: "Neptune",
    hp: 330,
    radius: 1.02,
    palette: ["#416dff", "#1a286f", "#d7e2ff", "#67a3ff"],
    craters: 0,
    texture: "storm",
    spot: true,
  },
];

const defaultState = {
  shards: 0,
  destroyed: 0,
  selected: "harp",
  equipped: "harp",
  selectedPlanet: "earth",
  planetStats: {},
  levels: { harp: 1 },
  bestCombo: 1,
};

let state = load();
let planet = makePlanet();
let impacts = [];
let debris = [];
let damageNumbers = [];
let coinBursts = [];
let beams = [];
let combo = 1;
let comboTimer = 0;
let aimAccumulator = 0;
let lastTime = 0;
let explosionTimeout = null;
let pointer = { x: canvas.width / 2, y: canvas.height / 2, active: false, inside: false };
let stars = makeStars();

function load() {
  const saved = JSON.parse(localStorage.getItem("voidbreak-save") || "null");
  if (!saved) return { ...defaultState, planetStats: {}, levels: { ...defaultState.levels } };
  const selectedPlanet = solarPlanets.some((item) => item.id === saved.selectedPlanet) ? saved.selectedPlanet : "earth";

  return {
    ...defaultState,
    ...saved,
    selected: saved.selected || "harp",
    equipped: saved.equipped || (saved.levels?.[saved.selected] ? saved.selected : "harp"),
    selectedPlanet,
    planetStats: saved.planetStats || {},
    levels: { harp: 1, ...(saved.levels || {}) },
  };
}

function save() {
  localStorage.setItem("voidbreak-save", JSON.stringify(state));
}

function makeStars() {
  return Array.from({ length: 210 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.8 + 0.2,
    a: Math.random() * 0.78 + 0.16,
    drift: Math.random() * 0.16 + 0.04,
  }));
}

function makePlanet(id = state.selectedPlanet) {
  const profile = planetProfile(id);
  const clears = state.planetStats?.[profile.id]?.destroyed || 0;
  const maxHp = Math.round(profile.hp * Math.pow(1.16, clears));
  return {
    id: profile.id,
    name: profile.name,
    profile,
    palette: profile.palette,
    hp: maxHp,
    maxHp,
    spin: Math.random() * Math.PI,
    wounds: [],
    scars: [],
    chunks: [],
    exploding: false,
    explosionTime: 0,
    announced: {},
    veins: Array.from({ length: profile.texture === "gas" ? 26 : 20 }, (_, index) => ({
      offset: -0.9 + index * 0.094 + Math.random() * 0.025,
      width: 0.42 + Math.random() * 0.5,
      alpha: 0.09 + Math.random() * 0.14,
    })),
    craters: Array.from({ length: profile.craters }, () => ({
      angle: Math.random() * Math.PI * 2,
      distance: Math.random() * 0.82,
      size: 0.035 + Math.random() * 0.08,
      shade: 0.12 + Math.random() * 0.18,
    })),
    fractures: Array.from({ length: 34 }, () => ({
      angle: Math.random() * Math.PI * 2,
      distance: Math.random() * 0.78,
      length: 0.16 + Math.random() * 0.36,
      twist: Math.random() * Math.PI * 2,
      threshold: 0.12 + Math.random() * 0.72,
    })),
    bites: Array.from({ length: 13 }, () => ({
      angle: Math.random() * Math.PI * 2,
      size: 0.08 + Math.random() * 0.14,
      threshold: 0.28 + Math.random() * 0.55,
    })),
  };
}

function planetProfile(id) {
  return solarPlanets.find((item) => item.id === id) || solarPlanets.find((item) => item.id === "earth");
}

function planetGeometry() {
  return {
    cx: canvas.width / 2,
    cy: canvas.height / 2 + 34,
    radius: Math.min(canvas.width, canvas.height) * 0.245 * planet.profile.radius,
  };
}

function pointOnPlanet(x, y) {
  const { cx, cy, radius } = planetGeometry();
  return Math.hypot(x - cx, y - cy) <= radius * 1.02;
}

function weaponById(id) {
  return weapons.find((weapon) => weapon.id === id) || weapons[0];
}

function focusedWeapon() {
  return weaponById(state.selected);
}

function armedWeapon() {
  if (levelFor(state.equipped) > 0) return weaponById(state.equipped);
  const firstUnlocked = weapons.find((weapon) => levelFor(weapon.id) > 0) || weapons[0];
  state.equipped = firstUnlocked.id;
  return firstUnlocked;
}

function levelFor(id) {
  return state.levels[id] || 0;
}

function weaponPower(weapon) {
  const level = Math.max(1, levelFor(weapon.id));
  return Math.round(weapon.damage * level * (1 + state.destroyed * 0.032) * combo);
}

function nextCost(weapon) {
  const level = levelFor(weapon.id);
  if (!level) return weapon.cost;
  return Math.round((weapon.cost || 60) * Math.pow(1.66, level));
}

function format(value) {
  return Math.floor(value).toLocaleString();
}

function earn(amount, x = canvas.width * 0.78, y = 92) {
  state.shards += amount;
  coinBursts.push({
    x,
    y,
    value: amount,
    life: 1,
  });
  save();
}

function woundLevel() {
  return Math.min(1, Math.max(0, 1 - planet.hp / planet.maxHp));
}

function damageStage() {
  const level = woundLevel();
  if (planet.exploding) return "Shattering";
  if (level > 0.82) return "Core Open";
  if (level > 0.62) return "Meltdown";
  if (level > 0.38) return "Mantle Torn";
  if (level > 0.16) return "Cracked";
  return "Stable";
}

function shake() {
  ui.stage.classList.remove("shake");
  void ui.stage.offsetWidth;
  ui.stage.classList.add("shake");
}

function showBlast(text) {
  ui.blastText.textContent = text;
  ui.blastText.classList.remove("show");
  void ui.blastText.offsetWidth;
  ui.blastText.classList.add("show");
}

function announceDamageStage() {
  const level = woundLevel();
  const stages = [
    [0.25, "CRUST SPLIT"],
    [0.5, "MANTLE EXPOSED"],
    [0.74, "CORE BREACH"],
    [0.9, "CRITICAL"],
  ];

  stages.forEach(([threshold, label]) => {
    if (level >= threshold && !planet.announced[label]) {
      planet.announced[label] = true;
      showBlast(label);
      shake();
    }
  });
}

function addHitEffects(x, y, weapon, damage, source) {
  const { cx, cy, radius } = planetGeometry();
  const angle = Math.atan2(y - cy, x - cx);
  const distance = Math.min(0.86, Math.hypot(x - cx, y - cy) / radius);
  const woundSize = source === "aim" ? 0.045 : 0.07;

  planet.wounds.push({
    x,
    y,
    angle,
    distance,
    size: woundSize + Math.random() * 0.055 + woundLevel() * 0.035,
    color: weapon.color,
  });
  if (planet.wounds.length > 34) planet.wounds.shift();

  for (let i = 0; i < (source === "aim" ? 2 : 4); i += 1) {
    planet.scars.push({
      x,
      y,
      life: 1,
      angle: angle + (Math.random() - 0.5) * 1.7,
      length: 0.18 + Math.random() * 0.32,
      color: weapon.color,
    });
  }

  impacts.push({ x, y, life: 1, type: weapon.id, color: weapon.color, size: source === "aim" ? 0.72 : 1.08 });
  beams.push({ x, y, life: 0.18, color: weapon.color, type: weapon.id });
  damageNumbers.push({
    x: x + (Math.random() - 0.5) * 28,
    y: y - 14 + (Math.random() - 0.5) * 18,
    value: damage,
    color: weapon.color,
    life: 1,
  });
  makeDebris(x, y, weapon.color, source === "aim" ? 5 + levelFor(weapon.id) : 14 + levelFor(weapon.id) * 3);
}

function dealDamage(x, y, scale = 1, source = "tap") {
  if (planet.exploding) return false;
  if (!pointOnPlanet(x, y)) {
    if (source !== "tap") return false;
    const { cx, cy, radius } = planetGeometry();
    const angle = Math.atan2(y - cy, x - cx) || 0;
    x = cx + Math.cos(angle) * radius * 0.42;
    y = cy + Math.sin(angle) * radius * 0.42;
  }

  const weapon = armedWeapon();
  const damage = Math.max(1, Math.round(weaponPower(weapon) * scale));
  planet.hp = Math.max(0, planet.hp - damage);
  addHitEffects(x, y, weapon, damage, source);

  combo = Math.min(4.4, combo + (source === "aim" ? 0.035 : 0.13));
  comboTimer = 1250;
  state.bestCombo = Math.max(state.bestCombo || 1, combo);
  earn(Math.max(1, Math.round(damage * 0.24)), x, y - 22);
  announceDamageStage();

  if (source !== "aim" || damage > 25) shake();
  if (planet.hp <= 0) startExplosion();
  renderUI();
  return true;
}

function makeDebris(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.1 + Math.random() * 5.4;
    debris.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.62 + Math.random() * 0.82,
      color,
      size: 1 + Math.random() * 3.6,
    });
  }
}

function makeExplosionChunks() {
  const { cx, cy, radius } = planetGeometry();
  planet.chunks = Array.from({ length: 58 }, (_, index) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = radius * (0.14 + Math.random() * 0.82);
    const speed = 3.2 + Math.random() * 8.6;
    return {
      x: cx + Math.cos(angle) * distance,
      y: cy + Math.sin(angle) * distance,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: radius * (0.035 + Math.random() * 0.095),
      sides: 3 + (index % 3),
      rotation: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.22,
      color: planet.palette[index % planet.palette.length],
      life: 1,
    };
  });
}

function startExplosion() {
  if (planet.exploding) return;

  const reward = Math.round(110 + planet.maxHp * 0.48 + combo * 46);
  const { cx, cy } = planetGeometry();
  const stats = state.planetStats[planet.id] || { destroyed: 0 };
  state.planetStats[planet.id] = { destroyed: stats.destroyed + 1 };
  planet.exploding = true;
  planet.explosionTime = 1750;
  planet.hp = 0;
  makeExplosionChunks();
  earn(reward, cx, cy - 86);
  state.destroyed += 1;
  state.bestCombo = Math.max(state.bestCombo || 1, combo);
  showBlast(`SHATTERED +${format(reward)} COINS`);
  shake();

  impacts.push({ x: cx, y: cy, life: 1.55, type: "burst", color: "#ffd56d", size: 2.9 });
  for (let i = 0; i < 130; i += 1) makeDebris(cx, cy, planet.palette[i % 3], 1);
  clearTimeout(explosionTimeout);
  explosionTimeout = setTimeout(finishExplosion, 1750);
  save();
}

function finishExplosion() {
  if (!planet.exploding) return;
  planet = makePlanet(state.selectedPlanet);
  pointer.active = false;
  pointer.inside = false;
  aimAccumulator = 0;
  showBlast(`${planet.name.toUpperCase()} REFORMED`);
  renderUI();
}

function updateExplosion(delta) {
  if (!planet.exploding) return;

  planet.explosionTime -= delta;
  planet.chunks.forEach((chunk) => {
    chunk.x += chunk.vx;
    chunk.y += chunk.vy;
    chunk.vx *= 0.988;
    chunk.vy *= 0.988;
    chunk.rotation += chunk.vr;
    chunk.life = Math.max(0, planet.explosionTime / 1750);
  });

  if (planet.explosionTime <= 0) {
    finishExplosion();
  }
}

function selectWeapon(id) {
  state.selected = id;
  if (levelFor(id) > 0) state.equipped = id;
  save();
  renderUI();
}

function clearTargetEffects() {
  clearTimeout(explosionTimeout);
  impacts = [];
  debris = [];
  damageNumbers = [];
  coinBursts = [];
  beams = [];
  aimAccumulator = 0;
  pointer.active = false;
  pointer.inside = false;
}

function selectPlanet(id) {
  if (!solarPlanets.some((item) => item.id === id)) return;
  state.selectedPlanet = id;
  clearTargetEffects();
  planet = makePlanet(id);
  showBlast(planet.name.toUpperCase());
  save();
  renderUI();
}

function reformPlanet() {
  clearTargetEffects();
  planet = makePlanet(state.selectedPlanet);
  showBlast(`${planet.name.toUpperCase()} REFORMED`);
  renderUI();
}

function buySelected() {
  const weapon = focusedWeapon();
  const cost = nextCost(weapon);
  if (state.shards < cost) return;
  state.shards -= cost;
  state.levels[weapon.id] = levelFor(weapon.id) + 1;
  state.equipped = weapon.id;
  state.selected = weapon.id;

  const { cx, cy } = planetGeometry();
  impacts.push({ x: cx, y: cy, life: 1.1, type: "unlock", color: weapon.color, size: 1.6 });
  showBlast(`${weapon.name.toUpperCase()} ARMED`);
  save();
  renderUI();
}

function renderUI() {
  const focused = focusedWeapon();
  const armed = armedWeapon();
  const focusedLevel = levelFor(focused.id);
  const hpPercent = Math.max(0, Math.ceil((planet.hp / planet.maxHp) * 100));
  const cost = nextCost(focused);

  ui.shards.textContent = format(state.shards);
  ui.planetName.textContent = planet.name;
  ui.planetHp.textContent = `${hpPercent}%`;
  ui.hpFill.style.width = `${hpPercent}%`;
  ui.damageStage.textContent = damageStage();
  ui.destroyed.textContent = state.destroyed;
  ui.dps.textContent = `${weaponPower(armed)}/tap`;
  ui.activeWeapon.textContent = armed.name;
  ui.combo.textContent = `x${combo.toFixed(1)}`;
  ui.focusGlyph.textContent = focused.glyph;
  ui.focusName.textContent = focused.name;
  ui.focusNote.textContent = focused.note;
  ui.focusStatus.textContent = focusedLevel ? `Level ${focusedLevel} ${focused.id === state.equipped ? "armed" : "unlocked"}` : "Locked blueprint";

  ui.weapons.innerHTML = "";
  weapons.forEach((weapon) => {
    const level = levelFor(weapon.id);
    const item = document.createElement("button");
    item.className = [
      "weapon",
      state.selected === weapon.id ? "selected" : "",
      state.equipped === weapon.id ? "armed" : "",
      level ? "" : "locked",
    ]
      .filter(Boolean)
      .join(" ");
    item.innerHTML = `
      <span class="glyph" style="color: ${weapon.color}">${weapon.glyph}</span>
      <span>
        <h3>${weapon.name}</h3>
        <p>${weapon.note}</p>
        <small>${level ? `Level ${level}${state.equipped === weapon.id ? " · Armed" : ""}` : "Tap to inspect unlock"}</small>
      </span>
      <strong class="price"><span>${level ? "Upgrade" : "Unlock"}</span>${format(nextCost(weapon))} coins</strong>
    `;
    item.addEventListener("click", () => selectWeapon(weapon.id));
    ui.weapons.appendChild(item);
  });

  ui.planets.innerHTML = "";
  solarPlanets.forEach((target) => {
    const stats = state.planetStats[target.id] || { destroyed: 0 };
    const item = document.createElement("button");
    item.className = `planet-choice ${state.selectedPlanet === target.id ? "active" : ""}`;
    item.innerHTML = `
      <span class="planet-dot" style="background: radial-gradient(circle at 32% 26%, ${target.palette[2]}, ${target.palette[0]} 44%, ${target.palette[1]} 100%)"></span>
      <span>
        <strong>${target.name}</strong>
        <span>${stats.destroyed ? `${stats.destroyed} shattered` : `${target.hp} HP`}</span>
      </span>
    `;
    item.addEventListener("click", () => selectPlanet(target.id));
    ui.planets.appendChild(item);
  });

  ui.buy.textContent = focusedLevel ? `Upgrade ${focused.name} - ${format(cost)} coins` : `Unlock ${focused.name} - ${format(cost)} coins`;
  ui.buy.disabled = state.shards < cost;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches?.[0] || event.changedTouches?.[0] || event;
  return {
    x: ((touch.clientX - rect.left) / rect.width) * canvas.width,
    y: ((touch.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function updatePointer(point) {
  pointer = {
    ...point,
    active: true,
    inside: pointOnPlanet(point.x, point.y),
  };
}

function drawBackground(time) {
  const pulse = 0.5 + Math.sin(time * 0.00025) * 0.5;
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#ffe1f0");
  sky.addColorStop(0.46, "#dff5ff");
  sky.addColorStop(1, "#fff1c3");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glow = ctx.createRadialGradient(canvas.width * 0.52, canvas.height * 0.42, 20, canvas.width * 0.52, canvas.height * 0.48, canvas.width * 0.54);
  glow.addColorStop(0, `rgba(255, 255, 255, ${0.48 + pulse * 0.12})`);
  glow.addColorStop(0.45, "rgba(255, 129, 173, 0.1)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  stars.forEach((star) => {
    star.x -= star.drift;
    if (star.x < -5) {
      star.x = canvas.width + 5;
      star.y = Math.random() * canvas.height;
    }
    ctx.globalAlpha = star.a * (0.55 + Math.sin(time * 0.001 + star.y) * 0.25);
    ctx.fillStyle = star.y % 3 > 1 ? "#ff81ad" : "#ffffff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r * 1.35, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawRings(cx, cy, radius, damage, front = false) {
  if (!planet.profile.rings) return;

  ctx.save();
  ctx.globalAlpha = front ? 0.5 + damage * 0.24 : 0.28;
  ctx.strokeStyle = planet.profile.id === "saturn" ? "#f7ddb0" : "#b7f4ff";
  ctx.lineWidth = front ? 7 : 10;
  ctx.beginPath();
  const start = front ? 0 : Math.PI;
  const end = front ? Math.PI : Math.PI * 2;
  ctx.ellipse(cx, cy, radius * 1.78, radius * 0.31, -0.17, start, end);
  ctx.stroke();
  ctx.globalAlpha *= 0.55;
  ctx.lineWidth = front ? 2 : 4;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 2.04, radius * 0.37, -0.17, start, end);
  ctx.stroke();
  ctx.restore();
}

function drawSurfaceTexture(cx, cy, radius, time, damage) {
  const texture = planet.profile.texture;

  if (texture === "continents") {
    ctx.globalAlpha = 0.52;
    ctx.fillStyle = planet.palette[3];
    [
      [-0.32, -0.08, 0.24, 0.13, -0.5],
      [0.2, 0.18, 0.2, 0.1, 0.32],
      [0.08, -0.28, 0.18, 0.08, 0.68],
      [-0.08, 0.34, 0.16, 0.08, -0.2],
    ].forEach(([x, y, w, h, rotate]) => {
      ctx.beginPath();
      ctx.ellipse(cx + x * radius, cy + y * radius, w * radius, h * radius, rotate + Math.sin(time * 0.0005) * 0.1, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  if (texture === "gas" || texture === "storm" || texture === "ice") {
    planet.veins.forEach((vein, index) => {
      const y = cy + vein.offset * radius + Math.sin(time * 0.0007 + index) * (7 + damage * 9);
      ctx.globalAlpha = vein.alpha + damage * 0.12;
      ctx.strokeStyle = index % 3 === 0 ? planet.palette[3] : "#ffffff";
      ctx.lineWidth = radius * (texture === "gas" ? 0.046 : 0.032) * vein.width;
      ctx.beginPath();
      ctx.ellipse(cx + Math.sin(planet.spin + index) * 24, y, radius * (0.54 + vein.width * 0.34), radius * 0.05, Math.sin(planet.spin) * 0.18, 0, Math.PI * 2);
      ctx.stroke();
    });
  } else {
    planet.veins.forEach((vein, index) => {
      const y = cy + vein.offset * radius + Math.sin(time * 0.0007 + index) * (5 + damage * 6);
      ctx.globalAlpha = vein.alpha;
      ctx.strokeStyle = index % 3 === 0 ? planet.palette[3] : "#ffffff";
      ctx.lineWidth = radius * 0.025 * vein.width;
      ctx.beginPath();
      ctx.ellipse(cx + Math.sin(planet.spin + index) * 18, y, radius * (0.42 + vein.width * 0.22), radius * 0.035, Math.sin(planet.spin) * 0.18, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  if (planet.profile.spot) {
    ctx.globalAlpha = 0.58;
    ctx.fillStyle = planet.profile.id === "neptune" ? "#14245f" : "#b9503b";
    ctx.beginPath();
    ctx.ellipse(cx + radius * 0.32, cy + radius * 0.18, radius * 0.17, radius * 0.08, -0.24, 0, Math.PI * 2);
    ctx.fill();
  }

  if (texture === "polar") {
    ctx.globalAlpha = 0.44;
    ctx.fillStyle = "#fff5dc";
    ctx.beginPath();
    ctx.ellipse(cx - radius * 0.08, cy - radius * 0.78, radius * 0.24, radius * 0.07, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  planet.craters.forEach((crater) => {
    const x = cx + Math.cos(crater.angle) * radius * crater.distance;
    const y = cy + Math.sin(crater.angle) * radius * crater.distance;
    const size = radius * crater.size;
    ctx.globalAlpha = 0.28 + crater.shade;
    ctx.fillStyle = "#05070b";
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.78, crater.angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

function drawPlanetBody(time) {
  const { cx, cy, radius } = planetGeometry();
  const damage = woundLevel();
  const grad = ctx.createRadialGradient(cx - radius * 0.34, cy - radius * 0.4, radius * 0.06, cx, cy, radius * 1.05);
  grad.addColorStop(0, planet.palette[2]);
  grad.addColorStop(0.34, planet.palette[0]);
  grad.addColorStop(0.74, planet.palette[1]);
  grad.addColorStop(1, "#070a0d");

  drawRings(cx, cy, radius, damage, false);

  ctx.save();
  ctx.shadowColor = damage > 0.65 ? "#ff6b8a" : planet.palette[0];
  ctx.shadowBlur = 48 + damage * 36;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.clip();

  planet.spin += 0.0026 + damage * 0.002;
  drawSurfaceTexture(cx, cy, radius, time, damage);

  ctx.globalAlpha = damage * 0.72;
  ctx.fillStyle = "#2b050b";
  ctx.beginPath();
  ctx.arc(cx + radius * 0.22, cy - radius * 0.1, radius * (0.22 + damage * 0.28), 0, Math.PI * 2);
  ctx.fill();

  planet.bites.forEach((bite) => {
    if (damage < bite.threshold) return;
    const x = cx + Math.cos(bite.angle) * radius * 0.96;
    const y = cy + Math.sin(bite.angle) * radius * 0.96;
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = "#030609";
    ctx.beginPath();
    ctx.arc(x, y, radius * bite.size * (1 + damage), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "#ffb36d";
    ctx.beginPath();
    ctx.arc(x - Math.cos(bite.angle) * radius * 0.035, y - Math.sin(bite.angle) * radius * 0.035, radius * bite.size * 0.38, 0, Math.PI * 2);
    ctx.fill();
  });

  planet.wounds.forEach((wound) => {
    const size = radius * wound.size * (1 + damage * 0.6);
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = "#100308";
    ctx.beginPath();
    ctx.ellipse(wound.x, wound.y, size * 1.22, size * 0.84, wound.angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = wound.color;
    ctx.beginPath();
    ctx.ellipse(wound.x, wound.y, size * 0.5, size * 0.25, wound.angle, 0, Math.PI * 2);
    ctx.fill();
  });

  planet.fractures.forEach((fracture) => {
    if (damage < fracture.threshold) return;
    const px = cx + Math.cos(fracture.angle) * radius * fracture.distance;
    const py = cy + Math.sin(fracture.angle) * radius * fracture.distance;
    const angle = fracture.angle + Math.PI / 2 + Math.sin(time * 0.001 + fracture.twist) * 0.22;
    const length = radius * fracture.length * (1 + damage * 0.65);
    ctx.globalAlpha = 0.35 + damage * 0.45;
    ctx.strokeStyle = damage > 0.6 ? "#ffcc66" : "#101419";
    ctx.lineWidth = damage > 0.6 ? 3.4 : 4.6;
    ctx.beginPath();
    ctx.moveTo(px - Math.cos(angle) * length * 0.5, py - Math.sin(angle) * length * 0.5);
    ctx.lineTo(px + Math.cos(angle) * length * 0.5, py + Math.sin(angle) * length * 0.5);
    ctx.stroke();
    ctx.globalAlpha = 0.42 + damage * 0.45;
    ctx.strokeStyle = "#ff6b8a";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  });

  planet.scars = planet.scars.filter((scar) => scar.life > 0);
  planet.scars.forEach((scar) => {
    scar.life -= 0.004;
    ctx.globalAlpha = Math.max(0, scar.life);
    ctx.strokeStyle = "rgba(2, 5, 8, 0.9)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(scar.x, scar.y);
    ctx.lineTo(scar.x + Math.cos(scar.angle) * radius * scar.length, scar.y + Math.sin(scar.angle) * radius * scar.length);
    ctx.stroke();
    ctx.strokeStyle = scar.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });
  ctx.restore();

  drawRings(cx, cy, radius, damage, true);

  ctx.save();
  ctx.globalAlpha = 0.52;
  ctx.strokeStyle = planet.palette[2];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 1.62, radius * 0.2, -0.22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.17 + damage * 0.26;
  ctx.strokeStyle = damage > 0.55 ? "#ff6b8a" : "#ffffff";
  ctx.lineWidth = 8 + damage * 10;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * (1.18 + damage * 0.05), radius * (1.18 + damage * 0.05), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawExplosion(time) {
  const { cx, cy, radius } = planetGeometry();
  const progress = 1 - Math.max(0, planet.explosionTime) / 1750;

  ctx.save();
  ctx.globalAlpha = 1 - progress;
  ctx.fillStyle = `rgba(255, 213, 109, ${0.34 * (1 - progress)})`;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * (0.8 + progress * 3.3), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff3bd";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * (0.36 + progress * 2.15), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  planet.chunks.forEach((chunk) => {
    ctx.save();
    ctx.globalAlpha = chunk.life;
    ctx.translate(chunk.x, chunk.y);
    ctx.rotate(chunk.rotation);
    ctx.fillStyle = chunk.color;
    ctx.shadowColor = "#ffcc66";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let i = 0; i < chunk.sides; i += 1) {
      const angle = (i / chunk.sides) * Math.PI * 2;
      const x = Math.cos(angle) * chunk.size;
      const y = Math.sin(angle) * chunk.size;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  ctx.save();
  ctx.globalAlpha = Math.max(0, 0.55 - progress * 0.55);
  ctx.fillStyle = "#fff7db";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawPlanet(time) {
  if (planet.exploding) drawExplosion(time);
  else drawPlanetBody(time);

  drawAim(time);
}

function drawAim(time) {
  if (!pointer.active) return;
  const weapon = armedWeapon();
  const color = pointer.inside ? weapon.color : "rgba(255,255,255,0.55)";
  const pulse = 18 + Math.sin(time * 0.018) * 5;

  ctx.save();
  ctx.globalAlpha = pointer.inside ? 0.92 : 0.42;
  ctx.strokeStyle = color;
  ctx.lineWidth = pointer.inside ? 2.8 : 1.5;
  ctx.beginPath();
  ctx.arc(pointer.x, pointer.y, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pointer.x - pulse - 12, pointer.y);
  ctx.lineTo(pointer.x - 6, pointer.y);
  ctx.moveTo(pointer.x + 6, pointer.y);
  ctx.lineTo(pointer.x + pulse + 12, pointer.y);
  ctx.moveTo(pointer.x, pointer.y - pulse - 12);
  ctx.lineTo(pointer.x, pointer.y - 6);
  ctx.moveTo(pointer.x, pointer.y + 6);
  ctx.lineTo(pointer.x, pointer.y + pulse + 12);
  ctx.stroke();

  if (pointer.inside && !planet.exploding) {
    const originX = canvas.width * 0.08;
    const originY = canvas.height * 0.88;
    const grad = ctx.createLinearGradient(originX, originY, pointer.x, pointer.y);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.35, weapon.color);
    grad.addColorStop(1, "#ffffff");
    ctx.globalAlpha = 0.74;
    ctx.strokeStyle = grad;
    ctx.lineWidth = 4.5 + Math.sin(time * 0.03) * 1.5;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(pointer.x, pointer.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWeaponEffect(impact) {
  const progress = 1 - impact.life;
  const radius = progress * 120 * impact.size;
  ctx.save();
  ctx.globalAlpha = Math.max(0, impact.life);
  ctx.strokeStyle = impact.color;
  ctx.fillStyle = impact.color;
  ctx.lineWidth = 2 + impact.size;

  if (impact.type === "harp") {
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(impact.x - 84 + i * 18, impact.y - 38);
      ctx.lineTo(impact.x + 58, impact.y + 28 - i * 10);
      ctx.stroke();
    }
  } else if (impact.type === "loom") {
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.ellipse(impact.x, impact.y, radius * (0.65 + i * 0.28), radius * 0.24, progress + i * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (impact.type === "choir") {
    for (let i = 0; i < 14; i += 1) {
      const angle = (i / 14) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(impact.x, impact.y);
      ctx.lineTo(impact.x + Math.cos(angle) * radius, impact.y + Math.sin(angle) * radius);
      ctx.stroke();
    }
  } else if (impact.type === "needle") {
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(impact.x - radius * 0.9, impact.y);
    ctx.lineTo(impact.x + radius * 0.9, impact.y);
    ctx.moveTo(impact.x, impact.y - radius * 0.9);
    ctx.lineTo(impact.x, impact.y + radius * 0.9);
    ctx.stroke();
  } else if (impact.type === "mirror") {
    ctx.translate(impact.x, impact.y);
    ctx.strokeRect(-radius * 0.42, -radius * 0.42, radius * 0.84, radius * 0.84);
    ctx.rotate(progress * 0.8);
    ctx.strokeRect(-radius * 0.28, -radius * 0.28, radius * 0.56, radius * 0.56);
  } else if (impact.type === "garden") {
    for (let i = 0; i < 9; i += 1) {
      const angle = (i / 9) * Math.PI * 2 + progress;
      ctx.beginPath();
      ctx.ellipse(impact.x + Math.cos(angle) * radius * 0.25, impact.y + Math.sin(angle) * radius * 0.25, radius * 0.16, radius * 0.38, angle, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.arc(impact.x, impact.y, radius * 1.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(impact.x, impact.y, radius * 0.46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawImpacts(delta) {
  impacts = impacts.filter((impact) => impact.life > 0);
  impacts.forEach((impact) => {
    impact.life -= delta * 0.0018;
    drawWeaponEffect(impact);
  });
}

function drawBeams(delta) {
  beams = beams.filter((beam) => beam.life > 0);
  beams.forEach((beam) => {
    beam.life -= delta * 0.004;
    ctx.save();
    ctx.globalAlpha = Math.max(0, beam.life * 3.8);
    ctx.strokeStyle = beam.color;
    ctx.lineWidth = beam.type === "needle" ? 2 : 3.5;
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.08, canvas.height * 0.88);
    ctx.lineTo(beam.x, beam.y);
    ctx.stroke();
    ctx.restore();
  });
}

function drawDebris(delta) {
  debris = debris.filter((piece) => piece.life > 0);
  debris.forEach((piece) => {
    piece.life -= delta * 0.001;
    piece.x += piece.vx;
    piece.y += piece.vy;
    piece.vx *= 0.985;
    piece.vy *= 0.985;
    ctx.save();
    ctx.globalAlpha = Math.max(0, piece.life);
    ctx.fillStyle = piece.color;
    ctx.beginPath();
    ctx.arc(piece.x, piece.y, piece.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawDamageNumbers(delta) {
  damageNumbers = damageNumbers.filter((number) => number.life > 0);
  damageNumbers.forEach((number) => {
    number.life -= delta * 0.0015;
    number.y -= delta * 0.045;
    ctx.save();
    ctx.globalAlpha = Math.max(0, number.life);
    ctx.fillStyle = number.color;
    ctx.font = "900 22px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 8;
    ctx.fillText(`-${format(number.value)}`, number.x, number.y);
    ctx.restore();
  });
}

function drawCoinBursts(delta) {
  coinBursts = coinBursts.filter((burst) => burst.life > 0);
  coinBursts.forEach((burst) => {
    burst.life -= delta * 0.0015;
    burst.y -= delta * 0.052;
    ctx.save();
    ctx.globalAlpha = Math.max(0, burst.life);
    ctx.fillStyle = "#8b5a00";
    ctx.font = "900 24px Nunito, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#fff0a6";
    ctx.shadowBlur = 12;
    ctx.fillText(`+${format(burst.value)} coins`, burst.x, burst.y);
    ctx.restore();
  });
}

function updateAimDamage(delta) {
  pointer.inside = pointer.active && pointOnPlanet(pointer.x, pointer.y);
  if (!pointer.inside || planet.exploding) {
    aimAccumulator = 0;
    return;
  }

  aimAccumulator += delta;
  const interval = 115;
  while (aimAccumulator >= interval) {
    aimAccumulator -= interval;
    dealDamage(pointer.x, pointer.y, 0.22, "aim");
  }
}

function loop(time) {
  const rawDelta = Math.min(260, time - lastTime || 16);
  const delta = Math.min(34, rawDelta);
  lastTime = time;
  if (comboTimer > 0) {
    comboTimer -= rawDelta;
  } else {
    combo = Math.max(1, combo - rawDelta * 0.0011);
  }

  updateAimDamage(rawDelta);
  updateExplosion(rawDelta);
  drawBackground(time);
  drawBeams(delta);
  drawPlanet(time);
  drawImpacts(delta);
  drawDebris(delta);
  drawDamageNumbers(delta);
  drawCoinBursts(delta);
  ui.combo.textContent = `x${combo.toFixed(1)}`;
  ui.damageStage.textContent = damageStage();
  requestAnimationFrame(loop);
}

canvas.addEventListener("pointerdown", (event) => {
  const point = canvasPoint(event);
  updatePointer(point);
  dealDamage(point.x, point.y, 1, "tap");
});

canvas.addEventListener("pointermove", (event) => {
  updatePointer(canvasPoint(event));
});

canvas.addEventListener("pointerenter", (event) => {
  updatePointer(canvasPoint(event));
});

canvas.addEventListener("pointerleave", () => {
  pointer.active = false;
  pointer.inside = false;
});

ui.buy.addEventListener("click", buySelected);
ui.reform.addEventListener("click", reformPlanet);
ui.reset.addEventListener("click", () => {
  localStorage.removeItem("voidbreak-save");
  clearTargetEffects();
  state = load();
  planet = makePlanet(state.selectedPlanet);
  combo = 1;
  comboTimer = 0;
  showBlast("RESET DONE");
  renderUI();
});

renderUI();
requestAnimationFrame(loop);
