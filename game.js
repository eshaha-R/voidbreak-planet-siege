const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  shards: document.querySelector("#shards"),
  planetName: document.querySelector("#planetName"),
  planetHp: document.querySelector("#planetHp"),
  weapons: document.querySelector("#weapons"),
  buy: document.querySelector("#buy"),
  destroyed: document.querySelector("#destroyed"),
  dps: document.querySelector("#dps"),
  activeWeapon: document.querySelector("#activeWeapon"),
  reset: document.querySelector("#reset"),
};

const weapons = [
  { id: "harp", name: "Ion Harp", glyph: "⌁", damage: 7, cost: 0, note: "Resonant arcs fracture crust." },
  { id: "loom", name: "Gravity Loom", glyph: "◎", damage: 18, cost: 90, note: "Pulls oceans into orbit." },
  { id: "choir", name: "Solar Choir", glyph: "✶", damage: 42, cost: 310, note: "Starfire sung into matter." },
  { id: "needle", name: "Null Needle", glyph: "⌖", damage: 88, cost: 820, note: "Pins a wound in spacetime." },
  { id: "monolith", name: "Mirror Monolith", glyph: "▰", damage: 155, cost: 1750, note: "Reflects a planet into itself." },
  { id: "garden", name: "Entropy Garden", glyph: "✣", damage: 270, cost: 3900, note: "Blooming decay, petal by petal." },
];

const planetNames = ["Aurelia", "Vesper", "Nacre-9", "Orison", "Kairox", "Velvet Moon", "Cinderglass"];
const colors = [
  ["#4bb5ff", "#214c9a", "#b5f3ff"],
  ["#ff9f6e", "#7b2445", "#ffd28f"],
  ["#7cf0ba", "#155d61", "#e8ffe5"],
  ["#d49cff", "#513889", "#fff0ff"],
  ["#f1d46a", "#7c5a1e", "#fff6b8"],
];

let state = load();
let planet = makePlanet();
let impacts = [];
let stars = Array.from({ length: 150 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  r: Math.random() * 1.7 + 0.2,
  a: Math.random() * 0.8 + 0.2,
}));

function load() {
  const saved = JSON.parse(localStorage.getItem("voidbreak-save") || "null");
  return saved || {
    shards: 0,
    destroyed: 0,
    selected: "harp",
    levels: { harp: 1 },
  };
}

function save() {
  localStorage.setItem("voidbreak-save", JSON.stringify(state));
}

function makePlanet() {
  const maxHp = Math.round(120 * Math.pow(1.22, state.destroyed));
  return {
    name: planetNames[state.destroyed % planetNames.length],
    palette: colors[state.destroyed % colors.length],
    hp: maxHp,
    maxHp,
    rotation: 0,
    cracks: [],
  };
}

function selectedWeapon() {
  return weapons.find((weapon) => weapon.id === state.selected) || weapons[0];
}

function levelFor(id) {
  return state.levels[id] || 0;
}

function weaponPower(weapon) {
  return Math.round(weapon.damage * Math.max(1, levelFor(weapon.id)) * (1 + state.destroyed * 0.035));
}

function nextCost(weapon) {
  const level = levelFor(weapon.id);
  if (!level) return weapon.cost;
  return Math.round((weapon.cost || 55) * Math.pow(1.72, level));
}

function earn(amount) {
  state.shards += amount;
  save();
}

function strike(x, y) {
  const weapon = selectedWeapon();
  const damage = weaponPower(weapon);
  planet.hp = Math.max(0, planet.hp - damage);
  planet.cracks.push({ x, y, life: 1, angle: Math.random() * Math.PI });
  impacts.push({ x, y, life: 1, weapon: weapon.id, color: planet.palette[2] });
  earn(Math.max(1, Math.round(damage * 0.16)));
  if (planet.hp <= 0) destroyPlanet();
  renderUI();
}

function destroyPlanet() {
  const reward = Math.round(55 + planet.maxHp * 0.36);
  earn(reward);
  state.destroyed += 1;
  planet = makePlanet();
  impacts.push({ x: canvas.width / 2, y: canvas.height / 2, life: 1.8, weapon: "burst", color: "#ffcc66" });
  save();
}

function renderUI() {
  ui.shards.textContent = Math.floor(state.shards).toLocaleString();
  ui.planetName.textContent = planet.name;
  ui.planetHp.textContent = `${Math.ceil((planet.hp / planet.maxHp) * 100)}%`;
  ui.destroyed.textContent = state.destroyed;
  ui.dps.textContent = `${weaponPower(selectedWeapon())}/tap`;
  ui.activeWeapon.textContent = selectedWeapon().name;

  ui.weapons.innerHTML = "";
  weapons.forEach((weapon) => {
    const level = levelFor(weapon.id);
    const item = document.createElement("button");
    item.className = `weapon ${state.selected === weapon.id ? "active" : ""} ${level ? "" : "locked"}`;
    item.innerHTML = `
      <span class="glyph">${weapon.glyph}</span>
      <span>
        <h3>${weapon.name}</h3>
        <p>${weapon.note}</p>
        <small>${level ? `Level ${level}` : "Locked"}</small>
      </span>
      <strong>${nextCost(weapon).toLocaleString()} ◇</strong>
    `;
    item.addEventListener("click", () => {
      if (level) state.selected = weapon.id;
      renderUI();
      save();
    });
    ui.weapons.appendChild(item);
  });

  const weapon = selectedWeapon();
  ui.buy.textContent = levelFor(weapon.id) ? `Upgrade ${weapon.name} - ${nextCost(weapon).toLocaleString()} ◇` : `Unlock ${weapon.name}`;
  ui.buy.disabled = state.shards < nextCost(weapon);
}

function buySelected() {
  const weapon = selectedWeapon();
  const cost = nextCost(weapon);
  if (state.shards < cost) return;
  state.shards -= cost;
  state.levels[weapon.id] = levelFor(weapon.id) + 1;
  save();
  renderUI();
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches?.[0] || event.changedTouches?.[0] || event;
  return {
    x: ((touch.clientX - rect.left) / rect.width) * canvas.width,
    y: ((touch.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function drawPlanet(time) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + 18;
  const radius = Math.min(canvas.width, canvas.height) * 0.25;
  const grad = ctx.createRadialGradient(cx - radius * 0.32, cy - radius * 0.38, radius * 0.1, cx, cy, radius);
  grad.addColorStop(0, planet.palette[2]);
  grad.addColorStop(0.42, planet.palette[0]);
  grad.addColorStop(1, planet.palette[1]);

  ctx.save();
  ctx.shadowColor = planet.palette[0];
  ctx.shadowBlur = 38;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.clip();

  planet.rotation += 0.002;
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 11;
  for (let i = -4; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.ellipse(cx + Math.sin(time * 0.0003 + i) * 18, cy + i * radius * 0.18, radius * 0.8, radius * 0.08, planet.rotation, 0, Math.PI * 2);
    ctx.stroke();
  }

  planet.cracks = planet.cracks.filter((crack) => crack.life > 0);
  planet.cracks.forEach((crack) => {
    crack.life -= 0.003;
    ctx.globalAlpha = Math.max(0, crack.life);
    ctx.strokeStyle = "#071015";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(crack.x, crack.y);
    ctx.lineTo(crack.x + Math.cos(crack.angle) * radius * 0.24, crack.y + Math.sin(crack.angle) * radius * 0.24);
    ctx.stroke();
  });
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 1.42, radius * 0.18, -0.22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawImpacts() {
  impacts = impacts.filter((impact) => impact.life > 0);
  impacts.forEach((impact) => {
    impact.life -= 0.026;
    const size = (1.4 - impact.life) * (impact.weapon === "burst" ? 170 : 72);
    ctx.save();
    ctx.globalAlpha = Math.max(0, impact.life);
    ctx.strokeStyle = impact.color;
    ctx.lineWidth = impact.weapon === "needle" ? 1 : 3;
    ctx.beginPath();
    ctx.arc(impact.x, impact.y, size, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function loop(time) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#05090e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  stars.forEach((star) => {
    ctx.globalAlpha = star.a * (0.7 + Math.sin(time * 0.001 + star.x) * 0.3);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  drawPlanet(time);
  drawImpacts();
  requestAnimationFrame(loop);
}

canvas.addEventListener("pointerdown", (event) => {
  const point = canvasPoint(event);
  strike(point.x, point.y);
});

ui.buy.addEventListener("click", buySelected);
ui.reset.addEventListener("click", () => {
  if (!confirm("Reset Voidbreak progress?")) return;
  localStorage.removeItem("voidbreak-save");
  state = load();
  planet = makePlanet();
  impacts = [];
  renderUI();
});

renderUI();
requestAnimationFrame(loop);
