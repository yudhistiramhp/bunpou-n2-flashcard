const STORE = "bunpouN2FlashcardsV2",
  WSTORE = "bunpouN2WeekV2";
let ratings = {};
try {
  ratings = JSON.parse(localStorage.getItem(STORE) || "{}");
} catch (e) {
  ratings = {};
}
let deck = [],
  index = 0,
  rot = 0,
  busy = false,
  finished = false,
  week = "Minggu 1",
  mode = "all";
try {
  const w = localStorage.getItem(WSTORE);
  if (w && (w === "Semua" || DATA.weeks[w])) week = w;
} catch (e) {}
const $ = (id) => document.getElementById(id);
const allCards = () => Object.values(DATA.weeks).flat();
const isFlipped = () => Math.round(Math.abs(rot) / 180) % 2 === 1;
function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify(ratings));
  } catch (e) {}
}
function getSource() {
  return week === "Semua" ? allCards() : DATA.weeks[week];
}
function loadDeck(resetIndex = true) {
  let src = getSource();
  deck = mode === "pending" ? src.filter((c) => ratings[c.id] !== "yes") : src.slice();
  if (resetIndex) index = 0;
  if (index >= deck.length) index = Math.max(0, deck.length - 1);
  finished = false;
  resetRot();
  render();
}
function resetRot() {
  // kembali ke sisi depan tanpa animasi
  rot = 0;
  const el = $("inner");
  el.classList.add("notrans");
  el.style.transform = "rotateX(0deg)";
  void el.offsetWidth;
  el.classList.remove("notrans");
}
function renderWeeks() {
  const row = (label, cards, cls, cur) => {
    const t = cards.length,
      y = cards.filter((c) => ratings[c.id] === "yes").length,
      n = cards.filter((c) => ratings[c.id] === "no").length,
      pct = t ? Math.round((y / t) * 100) : 0;
    return `<div class="wrow ${cls}${cur ? " cur" : ""}"><span>${esc(label)}</span><div class="wbar"><i class="y" style="width:${(y / t) * 100}%"></i><i class="n" style="width:${(n / t) * 100}%"></i></div><span class="wnum"><b>${pct}%</b> · ${y}/${t}</span></div>`;
  };
  $("weekRows").innerHTML =
    Object.entries(DATA.weeks)
      .map(([w, cs]) => row(w, cs, "", week === w))
      .join("") + row("Semua minggu", allCards(), "all", week === "Semua");
}
function updateStats() {
  renderWeeks();
  const src = getSource(),
    known = src.filter((c) => ratings[c.id] === "yes").length,
    no = src.filter((c) => ratings[c.id] === "no").length;
  $("known").textContent = known;
  $("pending").textContent = src.length - known;
  $("total").textContent = deck.length;
  $("cntYes").textContent = known;
  $("cntNo").textContent = no;
}
function related(c) {
  return DATA.comparisons.filter((g) => g.items.some((x) => x.bun === c.bun));
}
function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m],
  );
}
function render() {
  updateStats();
  if (!deck.length) {
    $("stage").style.display = "none";
    $("finish").style.display = "none";
    $("emptyMessage").style.display = "block";
    $("emptyMessage").innerHTML =
      '<h2>Sesi selesai!</h2><p>Tidak ada kartu yang tersisa pada pilihan ini. Semua kartu sudah dinilai paham, atau belum ada kartu untuk sesi tersebut.</p><button class="primary" id="showAll">Lihat semua kartu</button>';
    $("showAll").addEventListener("click", () => {
      $("mode").value = "all";
      mode = "all";
      loadDeck();
    });
    $("counter").textContent = "Sesi selesai";
    $("weeklabel").textContent = week;
    $("fill").style.width = "100%";
    return;
  }
  if (finished) {
    showFinish();
    return;
  }
  $("finish").style.display = "none";
  $("stage").style.display = "block";
  $("emptyMessage").style.display = "none";
  const c = deck[index];
  $("bun").textContent = c.bun;
  $("arti").textContent = c.arti;
  $("fungsi").textContent = c.fungsi;
  $("pola").textContent = c.pola;
  $("exJp").textContent = c.ex_jp || "";
  $("exId").textContent = c.ex_id || "";
  $("weeklabel").textContent = c.week;
  $("counter").textContent = `Kartu ${index + 1} dari ${deck.length}`;
  $("fill").style.width = `${((index + 1) / deck.length) * 100}%`;
  $("prev").disabled = index === 0;
  $("next").disabled = index === deck.length - 1;
  $("flip").textContent = isFlipped() ? "Lihat bunpou" : "Balik kartu";
  $("compare").innerHTML = related(c)
    .map(
      (g) =>
        `<div class="compare"><h3>Bandingkan</h3><div class="title">${esc(g.title)}</div><ul>${g.items.map((it) => `<li><b>${esc(it.bun)}</b>: ${esc(it.point)}</li>`).join("")}</ul></div>`,
    )
    .join("");
}
function showFinish() {
  const src = getSource(),
    total = src.length,
    yes = src.filter((c) => ratings[c.id] === "yes").length,
    left = total - yes;
  const pct = total ? Math.round((yes / total) * 100) : 0;
  $("stage").style.display = "none";
  $("emptyMessage").style.display = "none";
  const f = $("finish");
  f.style.display = "block";
  f.innerHTML = `<h2>${pct === 100 ? "Hebat, semua sudah paham! 🎉" : "Flashcard selesai!"}</h2>
 <p class="lead">${esc(week === "Semua" ? "Semua minggu" : week)} · ${yes} dari ${total} kartu sudah paham</p>
 <div class="ring" id="ring"><div id="ringTxt">0%</div></div>
 <div class="sumrow"><span class="pill y">Paham ${yes}</span><span class="pill n">Belum paham ${left}</span></div>
 <div class="actions">
  <button class="primary" id="retryPending" ${left ? "" : "disabled"}>Belajar ulang yang belum paham (${left})</button>
  <button id="repeatAll">Ulangi semua</button>
 </div>
 <p class="keyhint kb">Tekan <kbd>R</kbd> untuk reset semua dari awal</p>`;
  $("counter").textContent = "Selesai";
  $("fill").style.width = "100%";
  $("retryPending").addEventListener("click", retryPending);
  $("repeatAll").addEventListener("click", repeatAll);
  // animasi persentase naik
  const t0 = performance.now(),
    dur = 900;
  (function step(t) {
    const k = Math.min(1, (t - t0) / dur),
      v = Math.round(pct * (1 - Math.pow(1 - k, 3)));
    const r = $("ring"),
      x = $("ringTxt");
    if (!r || !x) return;
    r.style.background = `conic-gradient(var(--green) ${v}%,#e2e8f0 0)`;
    x.textContent = v + "%";
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}
function retryPending() {
  mode = "pending";
  $("mode").value = "pending";
  loadDeck();
}
function repeatAll() {
  getSource().forEach((c) => delete ratings[c.id]);
  save();
  mode = "all";
  $("mode").value = "all";
  loadDeck();
}
function resetAll() {
  if (busy) return;
  getSource().forEach((c) => delete ratings[c.id]);
  save();
  mode = "all";
  $("mode").value = "all";
  loadDeck();
}
function flip(dir) {
  // dir: -1 = ke atas (↑), 1 = ke bawah (↓)
  if (!deck.length || busy) return;
  rot += dir === 1 ? -180 : 180; // ↑ = rotateX positif, ↓ = rotateX negatif
  $("inner").style.transform = `rotateX(${rot}deg)`;
  $("flip").textContent = isFlipped() ? "Lihat bunpou" : "Balik kartu";
}
function goTo(n) {
  if (n < 0 || n >= deck.length) return;
  index = n;
  resetRot();
  render();
  const card = $("card");
  card.classList.remove("in");
  void card.offsetWidth;
  card.classList.add("in");
}
function move(delta) {
  if (!deck.length || busy) return;
  goTo(index + delta);
}
function rate(value, swiped = false) {
  if (!deck.length || busy) return;
  busy = true;
  ratings[deck[index].id] = value;
  save();
  const card = $("card"),
    badge = value === "yes" ? $("badgeYes") : $("badgeNo");
  updateStats();
  // animasi badge: pop + "+1"
  badge.classList.remove("pop");
  void badge.offsetWidth;
  badge.classList.add("pop");
  const plus = document.createElement("div");
  plus.className = "plus " + value;
  plus.textContent = "+1";
  card.appendChild(plus);
  setTimeout(() => plus.remove(), 700);
  // animasi kartu keluar ke kiri / kanan
  card.classList.remove("in");
  if (!swiped) card.classList.add(value === "yes" ? "out-yes" : "out-no");
  setTimeout(() => {
    card.classList.remove("out-yes", "out-no", "drag-yes", "drag-no");
    if (swiped) clearDragStyle(card);
    if (index < deck.length - 1) index++;
    else finished = true;
    resetRot();
    render();
    if (!finished) {
      void card.offsetWidth;
      card.classList.add("in");
    }
    busy = false;
  }, 280);
}
function shuffle() {
  if (busy) return;
  for (let i = deck.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  index = 0;
  finished = false;
  resetRot();
  render();
}
$("week").addEventListener("change", (e) => {
  week = e.target.value;
  try {
    localStorage.setItem(WSTORE, week);
  } catch (err) {}
  loadDeck();
});
$("mode").addEventListener("change", (e) => {
  mode = e.target.value;
  loadDeck();
});
$("shuffle").addEventListener("click", shuffle);
$("reset").addEventListener("click", resetAll);
$("flip").addEventListener("click", () => flip(-1));
$("card").addEventListener("click", () => {
  if (dragged) {
    dragged = false;
    return;
  }
  flip(-1);
});

// ===== Swipe di layar sentuh: kanan = paham, kiri = belum =====
let drag = null,
  dragged = false;
const cardEl = $("card");
function clearDragStyle(card) {
  card.classList.remove("dragging");
  card.style.transition = "none";
  card.style.transform = "";
  card.style.opacity = "";
  card.style.removeProperty("--py");
  card.style.removeProperty("--pn");
  void card.offsetWidth;
  card.style.transition = "";
}
function dragTo(dx) {
  const w = cardEl.offsetWidth || 300,
    p = Math.min(1, Math.abs(dx) / (w * 0.35));
  cardEl.style.transform = `translateX(${dx}px) rotate(${Math.max(-12, Math.min(12, dx / 14))}deg)`;
  cardEl.style.setProperty("--py", dx > 0 ? p : 0);
  cardEl.style.setProperty("--pn", dx < 0 ? p : 0);
  cardEl.classList.toggle("drag-yes", dx > 25);
  cardEl.classList.toggle("drag-no", dx < -25);
}
cardEl.addEventListener("pointerdown", (e) => {
  if (busy || !deck.length || finished || e.pointerType === "mouse") return;
  drag = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    dx: 0,
    active: false,
    t: e.timeStamp,
    lastX: e.clientX,
    lastT: e.timeStamp,
    v: 0,
  };
});
cardEl.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x,
    dy = e.clientY - drag.y;
  if (!drag.active) {
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      drag.active = true;
      cardEl.setPointerCapture(e.pointerId);
      cardEl.classList.remove("in");
      cardEl.classList.add("dragging");
    } else if (Math.abs(dy) > 10) {
      drag = null; // scroll vertikal, bukan swipe
      return;
    } else return;
  }
  const dt = e.timeStamp - drag.lastT;
  if (dt > 0) drag.v = (e.clientX - drag.lastX) / dt;
  drag.lastX = e.clientX;
  drag.lastT = e.timeStamp;
  drag.dx = dx;
  dragTo(dx);
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  drag = null;
  if (!d.active) return;
  dragged = true;
  setTimeout(() => (dragged = false), 60);
  const w = cardEl.offsetWidth || 300,
    far = Math.abs(d.dx) > Math.min(110, w * 0.3),
    flick = Math.abs(d.v) > 0.6 && Math.abs(d.dx) > 40,
    dir = d.dx > 0 ? 1 : -1;
  if (e.type !== "pointercancel" && (far || flick)) {
    cardEl.style.transition = "transform .25s ease-in, opacity .25s ease-in";
    cardEl.style.transform = `translateX(${dir * (window.innerWidth + 40)}px) rotate(${dir * 18}deg)`;
    cardEl.style.opacity = "0";
    rate(dir > 0 ? "yes" : "no", true);
  } else {
    // kembali ke tengah (membal)
    cardEl.style.transition = "transform .3s cubic-bezier(.2,.9,.3,1.2)";
    cardEl.style.transform = "";
    cardEl.style.removeProperty("--py");
    cardEl.style.removeProperty("--pn");
    cardEl.classList.remove("drag-yes", "drag-no");
    setTimeout(() => {
      cardEl.style.transition = "";
      cardEl.classList.remove("dragging");
    }, 300);
  }
}
cardEl.addEventListener("pointerup", endDrag);
cardEl.addEventListener("pointercancel", endDrag);
$("prev").addEventListener("click", () => move(-1));
$("next").addEventListener("click", () => move(1));
$("no").addEventListener("click", () => rate("no"));
$("yes").addEventListener("click", () => rate("yes"));
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (
    (e.key === "r" || e.key === "R") &&
    !["SELECT", "INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    e.preventDefault();
    if (!e.repeat) resetAll();
    return;
  }
  if (finished) return;
  if (
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key) &&
    !["SELECT", "INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    e.preventDefault();
    if (e.repeat) return;
    if (e.key === "ArrowLeft") rate("no");
    else if (e.key === "ArrowRight") rate("yes");
    else if (e.key === "ArrowUp" || e.key === " ") flip(-1);
    else if (e.key === "ArrowDown") flip(1);
  }
});
$("week").value = week;
loadDeck();
