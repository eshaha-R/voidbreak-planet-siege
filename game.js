const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  shards: document.querySelector("#shards"),
  planetName: document.querySelector("#planetName"),
  planetHp: document.querySelector("#planetHp"),
  hpFill: document.querySelector("#hpFill"),
  weapons: document.querySelector("#weapons"),
  buy: document.querySelector("#buy"),
  destroyed: document.querySelector("#destroyed"),
  dps: document.querySelector("#dps"),
  activeWeapon: document.querySelector("#activeWeapon"),
  reset: document.querySelector("#reset"),
  combo: document.querySelector("#combo"),
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
    damage: 9,
    cost: 0,
    color: "#8ef6d8",
    note: "Cuts crust with soundless lightning.",
  },
  {
    id: "loom",
    name: "Gravity Loom",
    glyph: "◎",
    damage: 24,
    cost: 85,
    color: "#ffd56d",
    note: "Braids orbit lines into tidal collapse.",
  },
  {
    id: "choir",
    name: "Solar Choir",
    glyph: "✶",
    damage: 52,
    cost: 260,
    color: "#ffb36d",
    note: "Drops tiny stars into the mantle.",
  },
  {
    id: "needle",
    name: "Null Needle",
    glyph: "⌖",
    damage: 96,
    cost: 680,
    color: "#72d7ff",
    note: "Deletes a pinhole through spacetime.",
  },
  {
    id: "mirror",
    name: "Mirror Monolith",
    glyph: "▰",
    damage: 175,
    cost: 1450,
    color: "#d7c4ff",
    note: "Makes the planet fight its reflection.",
  },
  {
    id: "garden",
    name: "Entropy Garden",
    glyph: "✣",
    damage: 310,
    cost: 3200,
    color: "#ff6b8a",
    note: "Plants beautiful decay in the core.",
  },
];

const planetNames = ["Aurelia", "Vesper", "Nacre-9", "Orison", "Kairox", "Velvet Moon", "Cinderglass", "Umbra Reef"];
const planetPalettes = [
  ["#43d6ff", "#134a7b", "#e7fbff", "#2a9f93"],
  ["#ff9c67", "#7c2141", "#ffe0a8", "#b94c66"],
  ["#7cf0ba", "#155d61", "#f2ffe8", "#3fba8d"],
  ["#d5a7ff", "#46367f", "#fff2ff", "#8764ce"],
  ["#f2d35e", "#74521e", "#fff2a8", "#b78a37"],
  ["#ff7499", "#55273d", "#ffd5e0", "#9e405e"],
];

const defaultState = {
  shards: 0,
  destroyed: 0,
  selected: "harp",
  equipped: "harp",
  levels: { harp: 1 },
  bestCombo: 1,
};

let state = load();
let planet = makePlanet();
let impacts = [];
let debris = [];
let combo = 1;
let comboTimer = 0;
let lastTime = 0;
let pointer = { x: canvas.width / 2, y: canvas.height / 2, active: false };
let stars = makeStars();

function load() {
  const saved = JSON.parse(localStorage.getItem("voidbreak-save") || "null");
  if (!saved) return { ...defaultState, levels: { ...defaultState.levels } };

  return {
    ...defaultState,
    ...saved,
    selected: saved.selected || "harp",
    equipped: saved.equipped || (saved.levels?.[saved.selected] ? saved.selected : "harp"),
    levels: { harp: 1, ...(saved.levels || {}) },
  };
}

function save() {
  localStorage.setItem("voidbreak-save", JSON.stringify(state));
}

function makeStars() {
  return Array.from({ length: 190 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.8 + 0.2,
    a: Math.random() * 0.78 + 0.16,
    drift: Math.random() * 0.16 + 0.04,
  }));
}

function makePlanet() {
  const maxHp = Math.round(130 * Math.pow(1.24, state.destroyed));
  const palette = planetPalettes[state.destroyed % planetPalettes.length];
  return {
    name: planetNames[state.destroyed % planetNames.length],
    palette,
    hp: maxHp,
    maxHp,
    spin: Math.random() * Math.PI,
    scars: [],
    veins: Array.from({ length: 18 }, (_, index) => ({
      offset: -0.86 + index * 0.1 + Math.random() * 0.025,
      width: 0.42 + Math.random() * 0.5,
      alpha: 0.09 + Math.random() * 0.14,
    })),
  };
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
  return Math.round(weapon.damage * level * (1 + state.destroyed * 0.035) * combo);
}

function nextCost(weapon) {
  const level = levelFor(weapon.id);
  if (!level) return weapon.cost;
  return Math.round((weapon.cost || 60) * Math.pow(1.66, level));
}

function format(value) {
  return Math.floor(value).toLocaleString();
}

function earn(amount) {
  state.shards += amount;
  save();
}

function strike(x, y) {
  const weapon = armedWeapon();
  const damage = weaponPower(weapon);
  planet.hp = Math.max(0, planet.hp - damage);
  planet.scars.push({
    x,
    y,
    life: 1,
    angle: Math.random() * Math.PI,
    length: 0.16 + Math.random() * 0.22,
    color: weapon.color,
  });
  impacts.push({ x, y, life: 1, type: weapon.id, color: weapon.color, size: 1 });
  makeDebris(x, y, weapon.color, 9 + levelFor(weapon.id) * 2);
  combo = Math.min(3.5, combo + 0.08);
  comboTimer = 1300;
  state.bestCombo = Math.max(state.bestCombo || 1, combo);
  earn(Math.max(2, Math.round(damage * 0.22)));

  if (planet.hp <= 0) destroyPlanet();
  renderUI();
}

function makeDebris(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.1 + Math.random() * 4.2;
    debris.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.7 + Math.random() * 0.7,
      color,
      size: 1 + Math.random() * 3,
    });
  }
}

function destroyPlanet() {
  const reward = Math.round(90 + planet.maxHp * 0.42 + combo * 34);
  earn(reward);
  state.destroyed += 1;
  impacts.push({ x: canvas.width / 2, y: canvas.height / 2, life: 1.7, type: "burst", color: "#ffd56d", size: 2.2 });
  for (let i = 0; i < 70; i += 1) makeDebris(canvas.width / 2, canvas.height / 2, planet.palette[i % 3], 1);
  planet = makePlanet();
  save();
}

function selectWeapon(id) {
  state.selected = id;
  if (levelFor(id) > 0) state.equipped = id;
  save();
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
  impacts.push({
    x: canvas.width / 2,
    y: canvas.height * 0.52,
    life: 1.1,
    type: "unlock",
    color: weapon.color,
    size: 1.6,
  });
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
      <strong class="price"><span>${level ? "Upgrade" : "Unlock"}</span>${format(nextCost(weapon))} ◇</strong>
    `;
    item.addEventListener("click", () => selectWeapon(weapon.id));
    ui.weapons.appendChild(item);
  });

  ui.buy.textContent = focusedLevel ? `Upgrade ${focused.name} - ${format(cost)} ◇` : `Unlock ${focused.name} - ${format(cost)} ◇`;
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

function drawBackground(time) {
  const pulse = 0.5 + Math.sin(time * 0.00025) * 0.5;
  const nebula = ctx.createRadialGradient(canvas.width * 0.62, canvas.height * 0.43, 20, canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.7);
  nebula.addColorStop(0, `rgba(142, 246, 216, ${0.1 + pulse * 0.04})`);
  nebula.addColorStop(0.35, "rgba(255, 107, 138, 0.08)");
  nebula.addColorStop(1, "rgba(3, 6, 9, 0)");

  ctx.fillStyle = "#030609";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  stars.forEach((star) => {
    star.x -= star.drift;
    if (star.x < -5) {
      star.x = canvas.width + 5;
      star.y = Math.random() * canvas.height;
    }
    ctx.globalAlpha = star.a * (0.7 + Math.sin(time * 0.001 + star.y) * 0.3);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawPlanet(time) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + 34;
  const radius = Math.min(canvas.width, canvas.height) * 0.27;
  const grad = ctx.createRadialGradient(cx - radius * 0.34, cy - radius * 0.4, radius * 0.06, cx, cy, radius * 1.05);
  grad.addColorStop(0, planet.palette[2]);
  grad.addColorStop(0.38, planet.palette[0]);
  grad.addColorStop(0.78, planet.palette[1]);
  grad.addColorStop(1, "#070a0d");

  ctx.save();
  ctx.shadowColor = planet.palette[0];
  ctx.shadowBlur = 46;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.clip();

  planet.spin += 0.0024;
  planet.veins.forEach((vein, index) => {
    const y = cy + vein.offset * radius + Math.sin(time * 0.0007 + index) * 7;
    ctx.globalAlpha = vein.alpha;
    ctx.strokeStyle = index % 3 === 0 ? planet.palette[3] : "#ffffff";
    ctx.lineWidth = radius * 0.035 * vein.width;
    ctx.beginPath();
    ctx.ellipse(cx + Math.sin(planet.spin + index) * 24, y, radius * (0.48 + vein.width * 0.28), radius * 0.045, Math.sin(planet.spin) * 0.18, 0, Math.PI * 2);
    ctx.stroke();
  });

  const woundAlpha = 1 - planet.hp / planet.maxHp;
  ctx.globalAlpha = woundAlpha * 0.45;
  ctx.fillStyle = "#17080d";
  ctx.beginPath();
  ctx.arc(cx + radius * 0.24, cy - radius * 0.12, radius * 0.32, 0, Math.PI * 2);
  ctx.fill();

  planet.scars = planet.scars.filter((scar) => scar.life > 0);
  planet.scars.forEach((scar) => {
    scar.life -= 0.0038;
    ctx.globalAlpha = Math.max(0, scar.life);
    ctx.strokeStyle = "rgba(2, 5, 8, 0.86)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(scar.x, scar.y);
    ctx.lineTo(scar.x + Math.cos(scar.angle) * radius * scar.length, scar.y + Math.sin(scar.angle) * radius * scar.length);
    ctx.stroke();
    ctx.strokeStyle = scar.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = planet.palette[2];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 1.62, radius * 0.2, -0.22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 1.18, radius * 1.18, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (pointer.active) {
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = armedWeapon().color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 16 + Math.sin(time * 0.01) * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawWeaponEffect(impact) {
  const progress = 1 - impact.life;
  const radius = progress * 110 * impact.size;
  ctx.save();
  ctx.globalAlpha = Math.max(0, impact.life);
  ctx.strokeStyle = impact.color;
  ctx.fillStyle = impact.color;
  ctx.lineWidth = 2 + impact.size;

  if (impact.type === "harp") {
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(impact.x - 70 + i * 18, impact.y - 34);
      ctx.lineTo(impact.x + 48, impact.y + 24 - i * 10);
      ctx.stroke();
    }
  } else if (impact.type === "loom") {
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.ellipse(impact.x, impact.y, radius * (0.65 + i * 0.28), radius * 0.24, progress + i * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (impact.type === "choir") {
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(impact.x, impact.y);
      ctx.lineTo(impact.x + Math.cos(angle) * radius, impact.y + Math.sin(angle) * radius);
      ctx.stroke();
    }
  } else if (impact.type === "needle") {
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(impact.x - radius * 0.8, impact.y);
    ctx.lineTo(impact.x + radius * 0.8, impact.y);
    ctx.moveTo(impact.x, impact.y - radius * 0.8);
    ctx.lineTo(impact.x, impact.y + radius * 0.8);
    ctx.stroke();
  } else if (impact.type === "mirror") {
    ctx.translate(impact.x, impact.y);
    ctx.strokeRect(-radius * 0.38, -radius * 0.38, radius * 0.76, radius * 0.76);
    ctx.rotate(progress * 0.6);
    ctx.strokeRect(-radius * 0.26, -radius * 0.26, radius * 0.52, radius * 0.52);
  } else if (impact.type === "garden") {
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2 + progress;
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

function drawImpacts() {
  impacts = impacts.filter((impact) => impact.life > 0);
  impacts.forEach((impact) => {
    impact.life -= 0.028;
    drawWeaponEffect(impact);
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

function loop(time) {
  const delta = Math.min(34, time - lastTime || 16);
  lastTime = time;
  if (comboTimer > 0) {
    comboTimer -= delta;
  } else {
    combo = Math.max(1, combo - delta * 0.0011);
  }

  drawBackground(time);
  drawPlanet(time);
  drawImpacts();
  drawDebris(delta);
  ui.combo.textContent = `x${combo.toFixed(1)}`;
  requestAnimationFrame(loop);
}

canvas.addEventListener("pointerdown", (event) => {
  const point = canvasPoint(event);
  pointer = { ...point, active: true };
  strike(point.x, point.y);
});

canvas.addEventListener("pointermove", (event) => {
  pointer = { ...canvasPoint(event), active: true };
});

canvas.addEventListener("pointerleave", () => {
  pointer.active = false;
});

ui.buy.addEventListener("click", buySelected);
ui.reset.addEventListener("click", () => {
  if (!confirm("Reset Voidbreak progress?")) return;
  localStorage.removeItem("voidbreak-save");
  state = load();
  planet = makePlanet();
  impacts = [];
  debris = [];
  combo = 1;
  comboTimer = 0;
  renderUI();
});

renderUI();
requestAnimationFrame(loop);
