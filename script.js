(function(){
"use strict";
 
const LS = {
  UNITS: "sd01_units",
  VEHICLES: "sd01_vehicles",
  ACTIONS: "sd01_actions",
  HISTORY: "sd01_history",
  HISTORY_DAY: "sd01_history_day",
  PROFILES: "sd01_profiles",
  ACTIVE_PROFILE: "sd01_active_profile",
  ACTION_COUNTER: "sd01_action_counter",
  SEEDED: "sd01_seeded"
};
 
const STATUS = {
  DOSTEPNY: "DOSTEPNY",
  ZADYSPONOWANY: "ZADYSPONOWANY",
  W_AKCJI: "W_AKCJI",
  PRZEDYSPONOWANY: "PRZEDYSPONOWANY",
  NIEDOSTEPNY: "NIEDOSTEPNY"
};
 
const STATUS_LABEL = {
  DOSTEPNY: "Dostępny",
  ZADYSPONOWANY: "Zadysponowany",
  W_AKCJI: "W akcji",
  PRZEDYSPONOWANY: "Przedysponowany",
  NIEDOSTEPNY: "Niedostępny"
};
 
const ACTIVE_STATUSES = [STATUS.ZADYSPONOWANY, STATUS.W_AKCJI, STATUS.PRZEDYSPONOWANY];
 
/* ============================================================
   2. STAN APLIKACJI
   ============================================================ */
let DB = {
  units: [],
  vehicles: [],
  actions: [],
  history: [],
  profiles: [],
  activeProfileId: null
};
 
let UI = {
  view: "dashboard",
  vehicleUnitFilter: "ALL",
  currentActionId: null,
  currentHistoryId: null
};
 
/* ============================================================
   3. STORAGE HELPERS
   ============================================================ */
function safeGet(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(raw === null) return fallback;
    return JSON.parse(raw);
  }catch(e){
    console.error("Błąd odczytu localStorage:", key, e);
    return fallback;
  }
}
function safeSet(key, value){
  try{
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  }catch(e){
    console.error("Błąd zapisu localStorage:", key, e);
    toast("Nie udało się zapisać danych lokalnie.", "danger");
    return false;
  }
}
 
function saveUnits(){ safeSet(LS.UNITS, DB.units); }
function saveVehicles(){ safeSet(LS.VEHICLES, DB.vehicles); }
function saveActions(){ safeSet(LS.ACTIONS, DB.actions); }
function saveHistory(){ safeSet(LS.HISTORY, DB.history); }
function saveProfiles(){ safeSet(LS.PROFILES, DB.profiles); }
function saveActiveProfile(){ safeSet(LS.ACTIVE_PROFILE, DB.activeProfileId); }
 
/* ============================================================
   4. UTIL
   ============================================================ */
function uid(prefix){
  return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}
function pad2(n){ return String(n).padStart(2,"0"); }
function nowTimeStr(){
  const d = new Date();
  return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}
function nowFull(){
  const d = new Date();
  return pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
}
function todayISO(){
  const d = new Date();
  return d.getFullYear() + "-" + pad2(d.getMonth()+1) + "-" + pad2(d.getDate());
}
function todayDisplay(){
  const d = new Date();
  return pad2(d.getDate()) + "." + pad2(d.getMonth()+1) + "." + d.getFullYear();
}
function esc(str){
  if(str === undefined || str === null) return "";
  return String(str)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function nextActionNumber(){
  let counter = safeGet(LS.ACTION_COUNTER, 0);
  counter += 1;
  safeSet(LS.ACTION_COUNTER, counter);
  return String(counter).padStart(4, "0");
}
 
/* ============================================================
   5. DANE DEMONSTRACYJNE
   ============================================================ */
function seedDemoData(){
  const u1 = { id: uid("u"), name: "JRG 1" };
  const u2 = { id: uid("u"), name: "JRG 2" };
  const u3 = { id: uid("u"), name: "OSP Workowice" };
  const u4 = { id: uid("u"), name: "OSP Rudniki" };
  DB.units = [u1, u2, u3, u4];
 
  DB.vehicles = [
    { id: uid("v"), code: "GBA 301[G]21", type: "GBA", unitId: u1.id, status: STATUS.DOSTEPNY, info: "", actionId: null },
    { id: uid("v"), code: "GCBA 301[G]25", type: "GCBA", unitId: u1.id, status: STATUS.DOSTEPNY, info: "", actionId: null },
    { id: uid("v"), code: "SLRR 301[G]90", type: "SLRR", unitId: u2.id, status: STATUS.DOSTEPNY, info: "", actionId: null },
    { id: uid("v"), code: "GBA 359[G]12", type: "GBA", unitId: u4.id, status: STATUS.DOSTEPNY, info: "", actionId: null }
  ];
 
  DB.actions = [];
  DB.history = [];
 
  const p1 = { id: uid("p"), name: "Dyspozytor JRG 1", desc: "Stanowisko podstawowe", created: todayDisplay() };
  DB.profiles = [p1];
  DB.activeProfileId = p1.id;
 
  saveUnits(); saveVehicles(); saveActions(); saveHistory(); saveProfiles(); saveActiveProfile();
  safeSet(LS.HISTORY_DAY, todayISO());
  safeSet(LS.SEEDED, true);
}
 
/* ============================================================
   6. INICJALIZACJA / WCZYTYWANIE
   ============================================================ */
function loadData(){
  const seeded = safeGet(LS.SEEDED, false);
  if(!seeded){
    seedDemoData();
    return;
  }
  DB.units = safeGet(LS.UNITS, []);
  DB.vehicles = safeGet(LS.VEHICLES, []);
  DB.actions = safeGet(LS.ACTIONS, []);
  DB.history = safeGet(LS.HISTORY, []);
  DB.profiles = safeGet(LS.PROFILES, []);
  DB.activeProfileId = safeGet(LS.ACTIVE_PROFILE, null);
 
  if(!DB.profiles.length){
    const p = { id: uid("p"), name: "Dyspozytor", desc: "", created: todayDisplay() };
    DB.profiles = [p];
    DB.activeProfileId = p.id;
    saveProfiles(); saveActiveProfile();
  }
  if(!DB.activeProfileId || !DB.profiles.find(p => p.id === DB.activeProfileId)){
    DB.activeProfileId = DB.profiles[0].id;
    saveActiveProfile();
  }
 
  checkDailyReset();
}
 
function checkDailyReset(){
  const storedDay = safeGet(LS.HISTORY_DAY, null);
  const today = todayISO();
  if(storedDay !== today){
    DB.history = [];
    saveHistory();
    safeSet(LS.HISTORY_DAY, today);
  }
}
 
/* ============================================================
   7. LOOKUP HELPERS
   ============================================================ */
function unitById(id){ return DB.units.find(u => u.id === id); }
function vehicleById(id){ return DB.vehicles.find(v => v.id === id); }
function actionById(id){ return DB.actions.find(a => a.id === id); }
function unitName(id){ const u = unitById(id); return u ? u.name : "—"; }
function profileById(id){ return DB.profiles.find(p => p.id === id); }
 
function vehiclesOfAction(action){
  return action.vehicleIds.map(vehicleById).filter(Boolean);
}
function unitsOfAction(action){
  const names = new Set(vehiclesOfAction(action).map(v => unitName(v.unitId)));
  return [...names];
}
function vehiclesOfUnit(unitId){
  return DB.vehicles.filter(v => v.unitId === unitId);
}
 
function logToAction(action, text){
  action.history.push({ time: nowTimeStr(), text: text });
}
 
/* ============================================================
   8. TOASTS
   ============================================================ */
function toast(msg, kind){
  const stack = document.getElementById("toastStack");
  const el = document.createElement("div");
  el.className = "toast" + (kind ? " toast-" + kind : "");
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => { el.remove(); }, 3600);
}
 
/* ============================================================
   9. MODAL SYSTEM
   ============================================================ */
function openModal(opts){
  // opts: {title, bodyHTML, wide, footButtons:[{label,className,onClick,close}]}
  const root = document.getElementById("modalRoot");
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal ${opts.wide ? "modal-wide" : ""}" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>${esc(opts.title)}</h3>
        <button class="modal-close" aria-label="Zamknij" type="button">&times;</button>
      </div>
      <div class="modal-body"></div>
      <div class="modal-foot"></div>
    </div>
  `;
  const modal = backdrop.querySelector(".modal");
  const bodyEl = modal.querySelector(".modal-body");
  if(typeof opts.bodyHTML === "string"){ bodyEl.innerHTML = opts.bodyHTML; }
  else if(opts.bodyHTML instanceof Node){ bodyEl.appendChild(opts.bodyHTML); }
 
  const footEl = modal.querySelector(".modal-foot");
  (opts.footButtons || []).forEach(btnDef => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn " + (btnDef.className || "");
    b.textContent = btnDef.label;
    b.addEventListener("click", () => {
      const result = btnDef.onClick ? btnDef.onClick(modal) : undefined;
      if(result !== false && btnDef.close !== false) closeModal(backdrop);
    });
    footEl.appendChild(b);
  });
 
  function closeHandler(e){
    if(e.target === backdrop) closeModal(backdrop);
  }
  backdrop.addEventListener("click", closeHandler);
  modal.querySelector(".modal-close").addEventListener("click", () => closeModal(backdrop));
 
  root.appendChild(backdrop);
  const firstInput = modal.querySelector("input, select, textarea");
  if(firstInput) setTimeout(() => firstInput.focus(), 30);
 
  return { backdrop, modal, bodyEl, close: () => closeModal(backdrop) };
}
function closeModal(backdrop){
  backdrop.remove();
}
 
function confirmModal(title, message, onConfirm, confirmLabel){
  openModal({
    title: title,
    bodyHTML: `<div class="modal-warn-box">${message}</div>`,
    footButtons: [
      { label: "ANULUJ", className: "btn-ghost" },
      { label: confirmLabel || "USUŃ", className: "btn-danger", onClick: onConfirm }
    ]
  });
}
 
/* ============================================================
   9b. STYLED CHECKBOX HELPER
   ------------------------------------------------------------
   Every checklist in the app (new-action vehicle picker, add-
   vehicle-to-action picker, and any future ones) renders through
   this single helper so the custom checkbox markup/behaviour
   (checkbox-wrapper-42 + .cbx) stays identical everywhere.
   ============================================================ */
function renderCheckRow(opts){
  // opts: {id, title, sub, value}
  const checkboxId = `chk-${opts.id}`;
  return `
    <label class="check-row" for="${checkboxId}">
      <div class="checkbox-wrapper-42">
        <input id="${checkboxId}" type="checkbox" value="${esc(opts.value)}">
        <label class="cbx" for="${checkboxId}"></label>
      </div>
      <div>
        <div class="check-row-title">${esc(opts.title)}</div>
        <div class="check-row-sub">${esc(opts.sub || "")}</div>
      </div>
    </label>
  `;
}
 
function renderVehicleChecklist(vehicles){
  if(!vehicles.length){
    return `<div class="empty-state">Brak dostępnych pojazdów.</div>`;
  }
  return `<div class="checklist">${vehicles.map(v => renderCheckRow({
    id: v.id,
    title: v.code,
    sub: `${unitName(v.unitId)} · ${v.type}`,
    value: v.id
  })).join("")}</div>`;
}
 
function getCheckedValues(modal){
  return [...modal.querySelectorAll('input[type="checkbox"]:checked')].map(c => c.value);
}
 
/* ============================================================
   10. NAWIGACJA
   ============================================================ */
function switchView(viewName){
  UI.view = viewName;
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  const target = document.getElementById("view-" + viewName);
  if(target) target.classList.remove("hidden");
 
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });
 
  closeMobileNav();
  renderAll();
}
 
function closeMobileNav(){
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("navOverlay").classList.remove("show");
}
 
/* ============================================================
   11. RENDER — DASHBOARD
   ============================================================ */
function statusChip(status){
  return `<span class="status-chip status-${status}">${STATUS_LABEL[status]}</span>`;
}
 
function renderStatRow(){
  const total = DB.vehicles.length;
  const counts = { DOSTEPNY:0, ZADYSPONOWANY:0, W_AKCJI:0, PRZEDYSPONOWANY:0, NIEDOSTEPNY:0 };
  DB.vehicles.forEach(v => { counts[v.status] = (counts[v.status]||0) + 1; });
 
  const cards = [
    { lbl: "Pojazdy ogółem", val: total, dot: "" },
    { lbl: "Dostępne", val: counts.DOSTEPNY, dot: "dot-ok" },
    { lbl: "W akcji", val: counts.W_AKCJI, dot: "dot-danger" },
    { lbl: "Zadysponowane", val: counts.ZADYSPONOWANY, dot: "dot-warn" },
    { lbl: "Aktywne akcje", val: DB.actions.length, dot: "dot-info" }
  ];
  document.getElementById("statRow").innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-num">${c.val}</div>
      <div class="stat-lbl">${c.dot ? `<span class="dot ${c.dot}"></span>` : ""}${c.lbl}</div>
    </div>
  `).join("");
}
 
function renderDashboard(){
  renderStatRow();
 
  const activeBox = document.getElementById("dashActiveActions");
  if(!DB.actions.length){
    activeBox.innerHTML = `<div class="empty-state">Brak aktywnych akcji. Kliknij „+ NOWY WYJAZD”, aby utworzyć zgłoszenie.</div>`;
  } else {
    activeBox.innerHTML = DB.actions.slice(-5).reverse().map(a => `
      <div class="mini-row">
        <div style="flex:1;min-width:0;">
          <div class="mini-title">AKCJA #${a.number} — ${esc(a.type)}</div>
          <div class="mini-sub">${esc(a.location)} · ${a.vehicleIds.length} poj. · od ${a.startTime}</div>
        </div>
      </div>
    `).join("");
    activeBox.querySelectorAll(".mini-row").forEach((row, i) => {
      row.style.cursor = "pointer";
      row.addEventListener("click", () => openActionDetail(DB.actions.slice(-5).reverse()[i].id));
    });
  }
 
  const vehBox = document.getElementById("dashVehicles");
  if(!DB.vehicles.length){
    vehBox.innerHTML = `<div class="empty-state">Brak zarejestrowanych pojazdów.</div>`;
  } else {
    vehBox.innerHTML = DB.vehicles.slice(0,6).map(v => `
      <div class="mini-row">
        <div style="flex:1;min-width:0;">
          <div class="mini-title" style="font-family:var(--mono);">${esc(v.code)}</div>
          <div class="mini-sub">${esc(unitName(v.unitId))}</div>
        </div>
        ${statusChip(v.status)}
      </div>
    `).join("");
  }
 
  const logBox = document.getElementById("dashLog");
  const allLogs = [];
  DB.actions.forEach(a => a.history.forEach(h => allLogs.push({ time: h.time, text: h.text })));
  if(!allLogs.length){
    logBox.innerHTML = `<div class="empty-state">Brak zdarzeń w logu.</div>`;
  } else {
    logBox.innerHTML = allLogs.slice(-8).reverse().map(l => `
      <div class="log-line"><span class="t">${l.time}</span>${esc(l.text)}</div>
    `).join("");
  }
 
  const badge = document.getElementById("navBadgeActions");
  badge.textContent = DB.actions.length;
  badge.dataset.zero = DB.actions.length === 0 ? "1" : "0";
}
 
/* ============================================================
   12. RENDER — AKCJE (lista)
   ============================================================ */
function renderActionsList(){
  const grid = document.getElementById("actionsGrid");
  if(!DB.actions.length){
    grid.innerHTML = `<div class="empty-state">Brak aktywnych akcji. Rozpocznij nowy wyjazd przyciskiem powyżej.</div>`;
    return;
  }
  grid.innerHTML = DB.actions.slice().reverse().map(a => `
    <div class="card" data-action-id="${a.id}">
      <div class="card-top">
        <div>
          <div class="card-id">AKCJA #${a.number}</div>
          <div class="card-title">${esc(a.type)}</div>
        </div>
        <span class="status-chip status-${STATUS.W_AKCJI}">AKTYWNA</span>
      </div>
      <div class="card-sub">${esc(a.location)}</div>
      <div class="card-meta">
        <span>Rozpoczęto: ${a.startTime}</span>
        <span>${a.vehicleIds.length} pojazd(y)</span>
        <span>${esc(unitsOfAction(a).join(", ") || "—")}</span>
      </div>
    </div>
  `).join("");
  grid.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => openActionDetail(card.dataset.actionId));
  });
}
 
/* ============================================================
   13. WIDOK SZCZEGÓŁOWY AKCJI
   ============================================================ */
function openActionDetail(actionId){
  UI.currentActionId = actionId;
  switchView("action-detail");
}
 
function renderActionDetail(){
  const action = actionById(UI.currentActionId);
  const body = document.getElementById("actionDetailBody");
  const btnBox = document.getElementById("detailActionButtons");
 
  if(!action){
    body.innerHTML = `<div class="empty-state">Nie znaleziono akcji. Mogła zostać zakończona lub usunięta.</div>`;
    btnBox.innerHTML = "";
    return;
  }
 
  btnBox.innerHTML = `
    <button class="btn" id="btnAddVehicleToAction">+ DODAJ POJAZD</button>
    <button class="btn btn-primary" id="btnFinishAction">ZAKOŃCZ AKCJĘ</button>
    <button class="btn btn-outline-danger" id="btnDeleteAction">USUŃ AKCJĘ</button>
  `;
 
  const vehicles = vehiclesOfAction(action);
  const units = unitsOfAction(action);
 
  body.innerHTML = `
    <div class="detail-hero">
      <div class="detail-hero-top">
        <div>
          <div class="detail-num">AKCJA #${action.number}</div>
          <div class="detail-type">${esc(action.type)}</div>
          <div class="detail-loc">${esc(action.location)}</div>
        </div>
      </div>
      ${action.description ? `<div class="detail-desc">${esc(action.description)}</div>` : ""}
      <div class="detail-grid">
        <div class="detail-fact"><div class="k">Rozpoczęto</div><div class="v">${action.startTime}</div></div>
        <div class="detail-fact"><div class="k">Pojazdy</div><div class="v">${vehicles.length}</div></div>
        <div class="detail-fact"><div class="k">Jednostki</div><div class="v">${esc(units.join(", ") || "—")}</div></div>
      </div>
    </div>
 
    <div class="panel">
      <div class="panel-head"><h2>Zadysponowane pojazdy</h2></div>
      <div class="panel-body" id="actionVehiclesList"></div>
    </div>
 
    <div class="panel">
      <div class="panel-head"><h2>Historia zmian</h2></div>
      <div class="panel-body" id="actionHistoryList"></div>
    </div>
  `;
 
  const vehList = document.getElementById("actionVehiclesList");
  if(!vehicles.length){
    vehList.innerHTML = `<div class="empty-state">Brak pojazdów przypisanych do tej akcji.</div>`;
  } else {
    vehList.innerHTML = vehicles.map(v => `
      <div class="veh-row">
        <div class="veh-row-main">
          <div class="vehicle-code">${esc(v.code)}</div>
          <div class="mini-sub">${esc(unitName(v.unitId))} · ${esc(v.type)}</div>
        </div>
        ${statusChip(v.status)}
        <div class="veh-row-actions">
          ${v.status === STATUS.ZADYSPONOWANY ? `<button class="btn btn-sm" data-onscene="${v.id}">NA MIEJSCU</button>` : ""}
          <button class="btn btn-sm" data-redispatch="${v.id}">PRZEDYSPONUJ</button>
          <button class="btn btn-sm" data-remove="${v.id}">USUŃ Z AKCJI</button>
          <button class="btn btn-sm btn-outline-danger" data-return="${v.id}">POWRÓT</button>
        </div>
      </div>
    `).join("");
  }
 
  const histList = document.getElementById("actionHistoryList");
  if(!action.history.length){
    histList.innerHTML = `<div class="empty-state">Brak wpisów.</div>`;
  } else {
    histList.innerHTML = action.history.slice().reverse().map(h => `
      <div class="log-line"><span class="t">${h.time}</span>${esc(h.text)}</div>
    `).join("");
  }
 
  // bind buttons
  document.getElementById("btnAddVehicleToAction").addEventListener("click", () => openAddVehicleToActionModal(action.id));
  document.getElementById("btnFinishAction").addEventListener("click", () => finishActionFlow(action.id));
  document.getElementById("btnDeleteAction").addEventListener("click", () => deleteActionFlow(action.id));
 
  vehList.querySelectorAll("[data-onscene]").forEach(b => b.addEventListener("click", () => setVehicleOnScene(action.id, b.dataset.onscene)));
  vehList.querySelectorAll("[data-redispatch]").forEach(b => b.addEventListener("click", () => openRedispatchModal(action.id, b.dataset.redispatch)));
  vehList.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => removeVehicleFromAction(action.id, b.dataset.remove, false)));
  vehList.querySelectorAll("[data-return]").forEach(b => b.addEventListener("click", () => returnVehicleFlow(action.id, b.dataset.return)));
 
  document.getElementById("btnBackFromDetail").onclick = () => switchView("actions");
}
 
/* ---- akcje na pojazdach w akcji ---- */
function setVehicleOnScene(actionId, vehicleId){
  const action = actionById(actionId);
  const v = vehicleById(vehicleId);
  if(!action || !v) return;
  v.status = STATUS.W_AKCJI;
  logToAction(action, `${v.code} przybył na miejsce zdarzenia (W AKCJI)`);
  saveVehicles(); saveActions();
  renderAll();
  toast(`${v.code} oznaczony jako W AKCJI`, "ok");
}
 
function removeVehicleFromAction(actionId, vehicleId, silent){
  const action = actionById(actionId);
  const v = vehicleById(vehicleId);
  if(!action || !v) return;
  action.vehicleIds = action.vehicleIds.filter(id => id !== vehicleId);
  v.status = STATUS.DOSTEPNY;
  v.actionId = null;
  logToAction(action, `Usunięto pojazd ${v.code} z AKCJA #${action.number}`);
  saveVehicles(); saveActions();
  renderAll();
  if(!silent) toast(`${v.code} usunięty z akcji, status: DOSTĘPNY`, "ok");
}
 
function returnVehicleFlow(actionId, vehicleId){
  const action = actionById(actionId);
  const v = vehicleById(vehicleId);
  if(!action || !v) return;
  confirmModal(
    "Potwierdź powrót pojazdu",
    `Czy potwierdzasz powrót pojazdu <strong>${esc(v.code)}</strong> z AKCJA #${action.number}? Pojazd otrzyma status DOSTĘPNY.`,
    () => {
      action.vehicleIds = action.vehicleIds.filter(id => id !== vehicleId);
      v.status = STATUS.DOSTEPNY;
      v.actionId = null;
      const t = nowTimeStr();
      logToAction(action, `${v.code} powrócił z akcji AKCJA #${action.number} (godz. ${t})`);
      saveVehicles(); saveActions();
      renderAll();
      toast(`${v.code} zarejestrowano jako DOSTĘPNY`, "ok");
    },
    "POTWIERDŹ POWRÓT"
  );
}
 
function openRedispatchModal(fromActionId, vehicleId){
  const v = vehicleById(vehicleId);
  const fromAction = actionById(fromActionId);
  const options = DB.actions.filter(a => a.id !== fromActionId);
 
  if(!options.length){
    toast("Brak innych aktywnych akcji do przedysponowania.", "danger");
    return;
  }
 
  const listHtml = options.map(a => `
    <label class="radio-row">
      <input type="radio" name="redispatchTarget" value="${a.id}">
      <div>
        <div class="mini-title">AKCJA #${a.number} — ${esc(a.type)}</div>
        <div class="mini-sub">${esc(a.location)}</div>
      </div>
    </label>
  `).join("");
 
  openModal({
    title: `Przedysponuj ${v.code}`,
    bodyHTML: `
      <div class="form-group">
        <label>Aktualna akcja</label>
        <div class="hint">AKCJA #${fromAction.number} — ${esc(fromAction.location)}</div>
      </div>
      <div class="form-group">
        <label>Wybierz akcję docelową</label>
        <div class="radio-list">${listHtml}</div>
      </div>
    `,
    footButtons: [
      { label: "ANULUJ", className: "btn-ghost" },
      { label: "PRZEDYSPONUJ", className: "btn-primary", onClick: (modal) => {
        const sel = modal.querySelector('input[name="redispatchTarget"]:checked');
        if(!sel){ toast("Wybierz akcję docelową.", "danger"); return false; }
        redispatchVehicle(fromActionId, sel.value, vehicleId);
      }}
    ]
  });
}
 
function redispatchVehicle(fromActionId, toActionId, vehicleId){
  const fromAction = actionById(fromActionId);
  const toAction = actionById(toActionId);
  const v = vehicleById(vehicleId);
  if(!fromAction || !toAction || !v) return;
 
  fromAction.vehicleIds = fromAction.vehicleIds.filter(id => id !== vehicleId);
  toAction.vehicleIds.push(vehicleId);
  v.status = STATUS.PRZEDYSPONOWANY;
  v.actionId = toAction.id;
 
  const t = nowTimeStr();
  logToAction(fromAction, `${v.code} przedysponowany z AKCJA #${fromAction.number} do AKCJA #${toAction.number} (godz. ${t})`);
  logToAction(toAction, `${v.code} przedysponowany z AKCJA #${fromAction.number} do AKCJA #${toAction.number} (godz. ${t})`);
 
  saveVehicles(); saveActions();
  renderAll();
  toast(`${v.code} przedysponowany do AKCJA #${toAction.number}`, "ok");
}
 
function openAddVehicleToActionModal(actionId){
  const action = actionById(actionId);
  const available = DB.vehicles.filter(v => v.status === STATUS.DOSTEPNY && !action.vehicleIds.includes(v.id));
 
  if(!available.length){
    openModal({
      title: "Dodaj pojazd do akcji",
      bodyHTML: `<div class="empty-state">Brak dostępnych pojazdów. Wszystkie są zadysponowane lub niedostępne.</div>`,
      footButtons: [{ label: "ZAMKNIJ", className: "btn-ghost" }]
    });
    return;
  }
 
  openModal({
    title: `Dodaj pojazd — AKCJA #${action.number}`,
    wide: true,
    bodyHTML: renderVehicleChecklist(available),
    footButtons: [
      { label: "ANULUJ", className: "btn-ghost" },
      { label: "DODAJ ZAZNACZONE", className: "btn-primary", onClick: (modal) => {
        const checked = getCheckedValues(modal);
 
        if(!checked.length){
          toast("Zaznacz co najmniej jeden pojazd.", "danger");
          return false;
        }
 
        checked.forEach(vid => {
          const v = vehicleById(vid);
          if(!v || action.vehicleIds.includes(vid)) return;
 
          action.vehicleIds.push(vid);
          v.status = STATUS.ZADYSPONOWANY;
          v.actionId = action.id;
 
          logToAction(action, `Dodano ${v.code} do AKCJA #${action.number}`);
        });
 
        saveVehicles();
        saveActions();
        renderAll();
 
        toast("Pojazdy dodane do akcji.", "ok");
      }}
    ]
  });
}
 
function finishActionFlow(actionId){
  const action = actionById(actionId);
  if(!action) return;
  confirmModal(
    "Zakończ akcję",
    `Czy na pewno chcesz zakończyć <strong>AKCJA #${action.number}</strong>? Wszystkie przypisane pojazdy otrzymają status DOSTĘPNY, a akcja trafi do historii.`,
    () => {
      vehiclesOfAction(action).forEach(v => {
        v.status = STATUS.DOSTEPNY;
        v.actionId = null;
      });
      const t = nowTimeStr();
      logToAction(action, `Zakończono AKCJĘ #${action.number} (godz. ${t})`);
 
      DB.actions = DB.actions.filter(a => a.id !== actionId);
      DB.history.push({
        ...action,
        endTime: t,
        date: todayISO(),
        dateDisplay: todayDisplay(),
        vehicleSnapshot: vehiclesOfAction(action).map(v => ({ code: v.code, unit: unitName(v.unitId) }))
      });
 
      saveVehicles(); saveActions(); saveHistory();
      switchView("actions");
      toast(`AKCJA #${action.number} zakończona i przeniesiona do historii.`, "ok");
    },
    "ZAKOŃCZ AKCJĘ"
  );
}
 
function deleteActionFlow(actionId){
  const action = actionById(actionId);
  if(!action) return;
  confirmModal(
    "Usuń akcję",
    `Czy na pewno chcesz usunąć <strong>AKCJA #${action.number}</strong> bez zapisu do historii? Ta operacja jest nieodwracalna. Przypisane pojazdy wrócą do statusu DOSTĘPNY.`,
    () => {
      vehiclesOfAction(action).forEach(v => {
        v.status = STATUS.DOSTEPNY;
        v.actionId = null;
      });
      DB.actions = DB.actions.filter(a => a.id !== actionId);
      saveVehicles(); saveActions();
      switchView("actions");
      toast(`AKCJA #${action.number} usunięta.`, "ok");
    },
    "USUŃ AKCJĘ"
  );
}
 
/* ============================================================
   14. NOWY WYJAZD (MODAL)
   ============================================================ */
function openNewActionModal(){
  const available = DB.vehicles.filter(v => v.status === STATUS.DOSTEPNY);
  const listHtml = renderVehicleChecklist(available);
 
  const bodyHTML = `
    <div class="form-group">
      <label for="fLocation">Lokalizacja</label>
      <input type="text" id="fLocation" placeholder="np. ul. Główna 15, Rudniki">
    </div>
    <div class="form-group">
      <label for="fType">Rodzaj zdarzenia</label>
      <input type="text" id="fType" placeholder="np. Pożar budynku">
    </div>
    <div class="form-group">
      <label for="fDesc">Opis / dodatkowe informacje</label>
      <textarea id="fDesc" placeholder="np. Pożar poddasza, potwierdzony dym"></textarea>
    </div>
    <div class="form-group">
      <label>Pojazdy do zadysponowania</label>
      ${listHtml}
    </div>
  `;
 
  openModal({
    title: "Nowy wyjazd",
    wide: true,
    bodyHTML: bodyHTML,
    footButtons: [
      { label: "ANULUJ", className: "btn-ghost" },
      { label: "UTWÓRZ AKCJĘ", className: "btn-primary", onClick: (modal) => {
        const location = modal.querySelector("#fLocation").value.trim();
        const type = modal.querySelector("#fType").value.trim();
        const desc = modal.querySelector("#fDesc").value.trim();
        if(!location || !type){
          toast("Podaj lokalizację i rodzaj zdarzenia.", "danger");
          return false;
        }
        const checked = getCheckedValues(modal);
 
        const action = {
          id: uid("a"),
          number: nextActionNumber(),
          location, type, description: desc,
          startTime: nowTimeStr(),
          status: "AKTYWNA",
          vehicleIds: [],
          history: []
        };
        logToAction(action, `Utworzono AKCJĘ #${action.number}`);
 
        checked.forEach(vid => {
          const v = vehicleById(vid);
          if(!v) return;
          action.vehicleIds.push(vid);
          v.status = STATUS.ZADYSPONOWANY;
          v.actionId = action.id;
          logToAction(action, `Dodano ${v.code} do AKCJA #${action.number}`);
        });
 
        DB.actions.push(action);
        saveActions(); saveVehicles();
        renderAll();
        toast(`Utworzono AKCJA #${action.number}`, "ok");
        openActionDetail(action.id);
      }}
    ]
  });
}
 
/* ============================================================
   15. RENDER — POJAZDY
   ============================================================ */
function renderUnitFilterRow(){
  const row = document.getElementById("unitFilterRow");
  const chips = [{ id: "ALL", name: "WSZYSTKIE" }, ...DB.units.map(u => ({ id: u.id, name: u.name }))];
  row.innerHTML = chips.map(c => `
    <button class="filter-chip ${UI.vehicleUnitFilter === c.id ? "active" : ""}" data-unit="${c.id}">${esc(c.name)}</button>
  `).join("");
  row.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      UI.vehicleUnitFilter = chip.dataset.unit;
      renderVehicles();
    });
  });
}
 
function renderVehicles(){
  renderUnitFilterRow();
  const grid = document.getElementById("vehiclesGrid");
  let list = DB.vehicles;
  if(UI.vehicleUnitFilter !== "ALL") list = list.filter(v => v.unitId === UI.vehicleUnitFilter);
 
  if(!list.length){
    grid.innerHTML = `<div class="empty-state">Brak pojazdów spełniających kryteria filtra.</div>`;
    return;
  }
 
  grid.innerHTML = list.map(v => {
    const inAction = v.actionId ? actionById(v.actionId) : null;
    return `
    <div class="card" data-static="1">
      <div class="card-top">
        <div>
          <div class="vehicle-code">${esc(v.code)}</div>
          <div class="card-sub">${esc(v.type)} · ${esc(unitName(v.unitId))}</div>
        </div>
        ${statusChip(v.status)}
      </div>
      ${v.info ? `<div class="card-sub">${esc(v.info)}</div>` : ""}
      ${inAction ? `<div class="card-meta"><span>Aktualnie: AKCJA #${inAction.number}</span></div>` : ""}
      <div class="card-foot">
        <div class="card-actions">
          <button class="btn btn-sm" data-edit-vehicle="${v.id}">EDYTUJ</button>
          <button class="btn btn-sm btn-outline-danger" data-del-vehicle="${v.id}">USUŃ</button>
        </div>
        ${inAction ? `<button class="link-btn" data-goto-action="${inAction.id}">zobacz akcję &rarr;</button>` : ""}
      </div>
    </div>
  `;}).join("");
 
  grid.querySelectorAll("[data-edit-vehicle]").forEach(b => b.addEventListener("click", (e) => { e.stopPropagation(); openEditVehicleModal(b.dataset.editVehicle); }));
  grid.querySelectorAll("[data-del-vehicle]").forEach(b => b.addEventListener("click", (e) => { e.stopPropagation(); deleteVehicleFlow(b.dataset.delVehicle); }));
  grid.querySelectorAll("[data-goto-action]").forEach(b => b.addEventListener("click", (e) => { e.stopPropagation(); openActionDetail(b.dataset.gotoAction); }));
}
 
function openAddVehicleModal(){
  if(!DB.units.length){
    toast("Najpierw dodaj przynajmniej jedną jednostkę.", "danger");
    return;
  }
  const unitOptions = DB.units.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join("");
  openModal({
    title: "Dodaj pojazd",
    bodyHTML: `
      <div class="form-group">
        <label for="fCode">Oznaczenie pojazdu</label>
        <input type="text" id="fCode" placeholder="np. GBA 301[G]21">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="fType">Typ</label>
          <input type="text" id="fType" placeholder="np. GBA">
        </div>
        <div class="form-group">
          <label for="fUnit">Jednostka</label>
          <select id="fUnit">${unitOptions}</select>
        </div>
      </div>
      <div class="form-group">
        <label for="fInfo">Dodatkowe informacje</label>
        <input type="text" id="fInfo" placeholder="opcjonalnie">
      </div>
    `,
    footButtons: [
      { label: "ANULUJ", className: "btn-ghost" },
      { label: "DODAJ POJAZD", className: "btn-primary", onClick: (modal) => {
        const code = modal.querySelector("#fCode").value.trim();
        const type = modal.querySelector("#fType").value.trim();
        const unitId = modal.querySelector("#fUnit").value;
        const info = modal.querySelector("#fInfo").value.trim();
        if(!code || !type){ toast("Podaj oznaczenie i typ pojazdu.", "danger"); return false; }
        DB.vehicles.push({ id: uid("v"), code, type, unitId, status: STATUS.DOSTEPNY, info, actionId: null });
        saveVehicles();
        renderAll();
        toast(`Dodano pojazd ${code}`, "ok");
      }}
    ]
  });
}
 
function openEditVehicleModal(vehicleId){
  const v = vehicleById(vehicleId);
  if(!v) return;
  const unitOptions = DB.units.map(u => `<option value="${u.id}" ${u.id===v.unitId?"selected":""}>${esc(u.name)}</option>`).join("");
  const statusOptions = Object.keys(STATUS).map(s => `<option value="${s}" ${s===v.status?"selected":""}>${STATUS_LABEL[s]}</option>`).join("");
  const lockedStatus = !!v.actionId;
 
  openModal({
    title: `Edytuj pojazd — ${v.code}`,
    bodyHTML: `
      <div class="form-group">
        <label for="fCode">Oznaczenie pojazdu</label>
        <input type="text" id="fCode" value="${esc(v.code)}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="fType">Typ</label>
          <input type="text" id="fType" value="${esc(v.type)}">
        </div>
        <div class="form-group">
          <label for="fUnit">Jednostka</label>
          <select id="fUnit">${unitOptions}</select>
        </div>
      </div>
      <div class="form-group">
        <label for="fInfo">Dodatkowe informacje</label>
        <input type="text" id="fInfo" value="${esc(v.info || "")}">
      </div>
      <div class="form-group">
        <label for="fStatus">Status</label>
        <select id="fStatus" ${lockedStatus ? "disabled" : ""}>${statusOptions}</select>
        ${lockedStatus ? `<div class="hint">Pojazd jest przypisany do aktywnej akcji — status zmienia się automatycznie. Użyj „Powrót” lub „Przedysponuj” w szczegółach akcji.</div>` : ""}
      </div>
    `,
    footButtons: [
      { label: "ANULUJ", className: "btn-ghost" },
      { label: "ZAPISZ ZMIANY", className: "btn-primary", onClick: (modal) => {
        const code = modal.querySelector("#fCode").value.trim();
        const type = modal.querySelector("#fType").value.trim();
        if(!code || !type){ toast("Podaj oznaczenie i typ pojazdu.", "danger"); return false; }
        v.code = code;
        v.type = type;
        v.unitId = modal.querySelector("#fUnit").value;
        v.info = modal.querySelector("#fInfo").value.trim();
        if(!lockedStatus) v.status = modal.querySelector("#fStatus").value;
        saveVehicles();
        renderAll();
        toast("Zapisano zmiany pojazdu.", "ok");
      }}
    ]
  });
}
 
function deleteVehicleFlow(vehicleId){
  const v = vehicleById(vehicleId);
  if(!v) return;
  if(v.actionId){
    openModal({
      title: "Nie można usunąć pojazdu",
      bodyHTML: `<div class="modal-warn-box">Pojazd <strong>${esc(v.code)}</strong> jest aktualnie przypisany do aktywnej akcji. Najpierw oznacz jego powrót lub usuń go z akcji.</div>`,
      footButtons: [{ label: "ROZUMIEM", className: "btn-ghost" }]
    });
    return;
  }
  confirmModal(
    "Usuń pojazd",
    `Czy na pewno chcesz usunąć pojazd <strong>${esc(v.code)}</strong>? Ta operacja jest nieodwracalna.`,
    () => {
      DB.vehicles = DB.vehicles.filter(x => x.id !== vehicleId);
      saveVehicles();
      renderAll();
      toast(`Pojazd ${v.code} usunięty.`, "ok");
    }
  );
}
 
/* ============================================================
   16. RENDER — JEDNOSTKI
   ============================================================ */
function renderUnits(){
  const grid = document.getElementById("unitsGrid");
  if(!DB.units.length){
    grid.innerHTML = `<div class="empty-state">Brak jednostek. Dodaj pierwszą jednostkę powyżej.</div>`;
    return;
  }
  grid.innerHTML = DB.units.map(u => {
    const veh = vehiclesOfUnit(u.id);
    return `
    <div class="card" data-static="1">
      <div class="card-top">
        <div>
          <div class="card-title">${esc(u.name)}</div>
          <div class="card-sub">${veh.length} pojazd(y)</div>
        </div>
      </div>
      <div class="card-meta">
        ${veh.slice(0,4).map(v => `<span style="font-family:var(--mono);">${esc(v.code)}</span>`).join("")}
        ${veh.length > 4 ? `<span>+${veh.length-4} więcej</span>` : ""}
        ${!veh.length ? `<span>Brak przypisanych pojazdów</span>` : ""}
      </div>
      <div class="card-foot">
        <div class="card-actions">
          <button class="btn btn-sm" data-rename-unit="${u.id}">ZMIEŃ NAZWĘ</button>
          <button class="btn btn-sm btn-outline-danger" data-del-unit="${u.id}">USUŃ</button>
        </div>
        <button class="link-btn" data-filter-unit="${u.id}">pojazdy &rarr;</button>
      </div>
    </div>
  `;}).join("");
 
  grid.querySelectorAll("[data-rename-unit]").forEach(b => b.addEventListener("click", () => openRenameUnitModal(b.dataset.renameUnit)));
  grid.querySelectorAll("[data-del-unit]").forEach(b => b.addEventListener("click", () => deleteUnitFlow(b.dataset.delUnit)));
  grid.querySelectorAll("[data-filter-unit]").forEach(b => b.addEventListener("click", () => {
    UI.vehicleUnitFilter = b.dataset.filterUnit;
    switchView("vehicles");
  }));
}
 
function openAddUnitModal(){
  openModal({
    title: "Dodaj jednostkę",
    bodyHTML: `
      <div class="form-group">
        <label for="fUnitName">Nazwa jednostki</label>
        <input type="text" id="fUnitName" placeholder="np. OSP Nowa Wieś">
      </div>
    `,
    footButtons: [
      { label: "ANULUJ", className: "btn-ghost" },
      { label: "DODAJ JEDNOSTKĘ", className: "btn-primary", onClick: (modal) => {
        const name = modal.querySelector("#fUnitName").value.trim();
        if(!name){ toast("Podaj nazwę jednostki.", "danger"); return false; }
        DB.units.push({ id: uid("u"), name });
        saveUnits();
        renderAll();
        toast(`Dodano jednostkę ${name}`, "ok");
      }}
    ]
  });
}
 
function openRenameUnitModal(unitId){
  const u = unitById(unitId);
  if(!u) return;
  openModal({
    title: "Zmień nazwę jednostki",
    bodyHTML: `
      <div class="form-group">
        <label for="fUnitName">Nazwa jednostki</label>
        <input type="text" id="fUnitName" value="${esc(u.name)}">
      </div>
    `,
    footButtons: [
      { label: "ANULUJ", className: "btn-ghost" },
      { label: "ZAPISZ", className: "btn-primary", onClick: (modal) => {
        const name = modal.querySelector("#fUnitName").value.trim();
        if(!name){ toast("Podaj nazwę jednostki.", "danger"); return false; }
        u.name = name;
        saveUnits();
        renderAll();
        toast("Nazwa jednostki zaktualizowana.", "ok");
      }}
    ]
  });
}
 
function deleteUnitFlow(unitId){
  const u = unitById(unitId);
  if(!u) return;
  const veh = vehiclesOfUnit(unitId);
  const busy = veh.some(v => v.actionId);
  if(busy){
    openModal({
      title: "Nie można usunąć jednostki",
      bodyHTML: `<div class="modal-warn-box">Jednostka <strong>${esc(u.name)}</strong> ma pojazdy przypisane do aktywnej akcji. Zakończ lub zwolnij te pojazdy przed usunięciem jednostki.</div>`,
      footButtons: [{ label: "ROZUMIEM", className: "btn-ghost" }]
    });
    return;
  }
  const msg = veh.length
    ? `Jednostka <strong>${esc(u.name)}</strong> posiada ${veh.length} pojazd(y). Zostaną one również usunięte. Ta operacja jest nieodwracalna.`
    : `Czy na pewno chcesz usunąć jednostkę <strong>${esc(u.name)}</strong>? Ta operacja jest nieodwracalna.`;
  confirmModal("Usuń jednostkę", msg, () => {
    DB.vehicles = DB.vehicles.filter(v => v.unitId !== unitId);
    DB.units = DB.units.filter(x => x.id !== unitId);
    if(UI.vehicleUnitFilter === unitId) UI.vehicleUnitFilter = "ALL";
    saveUnits(); saveVehicles();
    renderAll();
    toast(`Jednostka ${u.name} usunięta.`, "ok");
  });
}
 
/* ============================================================
   17. RENDER — HISTORIA
   ============================================================ */
function renderHistory(){
  document.getElementById("historyDateLabel").textContent = `Zakończone akcje — ${todayDisplay()}`;
  const grid = document.getElementById("historyGrid");
  if(!DB.history.length){
    grid.innerHTML = `<div class="empty-state">Brak zakończonych akcji w dniu dzisiejszym.</div>`;
    return;
  }
  grid.innerHTML = DB.history.slice().reverse().map(a => `
    <div class="card" data-history-id="${a.id}">
      <div class="card-top">
        <div>
          <div class="card-id">AKCJA #${a.number}</div>
          <div class="card-title">${esc(a.type)}</div>
        </div>
        <span class="status-chip status-DOSTEPNY">ZAKOŃCZONA</span>
      </div>
      <div class="card-sub">${esc(a.location)}</div>
      <div class="card-meta">
        <span>${a.startTime} &ndash; ${a.endTime}</span>
        <span>${(a.vehicleSnapshot||[]).length} pojazd(y)</span>
      </div>
    </div>
  `).join("");
  grid.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      UI.currentHistoryId = card.dataset.historyId;
      switchView("history-detail");
    });
  });
}
 
function renderHistoryDetail(){
  const a = DB.history.find(h => h.id === UI.currentHistoryId);
  const body = document.getElementById("historyDetailBody");
  if(!a){
    body.innerHTML = `<div class="empty-state">Nie znaleziono wpisu historii.</div>`;
    return;
  }
  body.innerHTML = `
    <div class="detail-hero">
      <div class="detail-num">AKCJA #${a.number} · ${esc(a.dateDisplay)}</div>
      <div class="detail-type">${esc(a.type)}</div>
      <div class="detail-loc">${esc(a.location)}</div>
      ${a.description ? `<div class="detail-desc">${esc(a.description)}</div>` : ""}
      <div class="detail-grid">
        <div class="detail-fact"><div class="k">Rozpoczęto</div><div class="v">${a.startTime}</div></div>
        <div class="detail-fact"><div class="k">Zakończono</div><div class="v">${a.endTime}</div></div>
        <div class="detail-fact"><div class="k">Pojazdy</div><div class="v">${(a.vehicleSnapshot||[]).length}</div></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Wykorzystane pojazdy</h2></div>
      <div class="panel-body">
        ${(a.vehicleSnapshot||[]).map(v => `
          <div class="mini-row"><div class="mini-title" style="font-family:var(--mono);">${esc(v.code)}</div><div class="mini-sub">${esc(v.unit)}</div></div>
        `).join("") || `<div class="empty-state">Brak danych o pojazdach.</div>`}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Historia zmian / przedysponowania</h2></div>
      <div class="panel-body">
        ${a.history.map(h => `<div class="log-line"><span class="t">${h.time}</span>${esc(h.text)}</div>`).join("") || `<div class="empty-state">Brak wpisów.</div>`}
      </div>
    </div>
  `;
  document.getElementById("btnBackFromHistoryDetail").onclick = () => switchView("history");
}
 
/* ============================================================
   18. RENDER — PROFILE
   ============================================================ */
function renderProfiles(){
  const grid = document.getElementById("profilesGrid");
  grid.innerHTML = DB.profiles.map(p => `
    <div class="card" data-static="1">
      <div class="card-top">
        <div>
          <div class="card-title">${esc(p.name)}</div>
          <div class="card-sub">${esc(p.desc || "Brak opisu")}</div>
        </div>
        ${p.id === DB.activeProfileId ? `<span class="status-chip status-DOSTEPNY">AKTYWNY</span>` : ""}
      </div>
      <div class="card-meta"><span>Utworzono: ${esc(p.created)}</span></div>
      <div class="card-foot">
        <div class="card-actions">
          ${p.id !== DB.activeProfileId ? `<button class="btn btn-sm" data-switch-profile="${p.id}">PRZEŁĄCZ</button>` : ""}
          <button class="btn btn-sm" data-rename-profile="${p.id}">ZMIEŃ NAZWĘ</button>
          <button class="btn btn-sm btn-outline-danger" data-del-profile="${p.id}">USUŃ</button>
        </div>
      </div>
    </div>
  `).join("");
 
  grid.querySelectorAll("[data-switch-profile]").forEach(b => b.addEventListener("click", () => {
    DB.activeProfileId = b.dataset.switchProfile;
    saveActiveProfile();
    renderAll();
    toast("Przełączono profil.", "ok");
  }));
  grid.querySelectorAll("[data-rename-profile]").forEach(b => b.addEventListener("click", () => openEditProfileModal(b.dataset.renameProfile)));
  grid.querySelectorAll("[data-del-profile]").forEach(b => b.addEventListener("click", () => deleteProfileFlow(b.dataset.delProfile)));
}
 
function openAddProfileModal(){
  openModal({
    title: "Nowy profil",
    bodyHTML: `
      <div class="form-group">
        <label for="fPName">Nazwa profilu</label>
        <input type="text" id="fPName" placeholder="np. Dyspozytor JRG 2">
      </div>
      <div class="form-group">
        <label for="fPDesc">Opis (opcjonalnie)</label>
        <input type="text" id="fPDesc" placeholder="np. Stanowisko nocne">
      </div>
    `,
    footButtons: [
      { label: "ANULUJ", className: "btn-ghost" },
      { label: "UTWÓRZ PROFIL", className: "btn-primary", onClick: (modal) => {
        const name = modal.querySelector("#fPName").value.trim();
        const desc = modal.querySelector("#fPDesc").value.trim();
        if(!name){ toast("Podaj nazwę profilu.", "danger"); return false; }
        const p = { id: uid("p"), name, desc, created: todayDisplay() };
        DB.profiles.push(p);
        saveProfiles();
        renderAll();
        toast(`Utworzono profil ${name}`, "ok");
      }}
    ]
  });
}
 
function openEditProfileModal(profileId){
  const p = profileById(profileId);
  if(!p) return;
  openModal({
    title: "Zmień profil",
    bodyHTML: `
      <div class="form-group">
        <label for="fPName">Nazwa profilu</label>
        <input type="text" id="fPName" value="${esc(p.name)}">
      </div>
      <div class="form-group">
        <label for="fPDesc">Opis (opcjonalnie)</label>
        <input type="text" id="fPDesc" value="${esc(p.desc || "")}">
      </div>
    `,
    footButtons: [
      { label: "ANULUJ", className: "btn-ghost" },
      { label: "ZAPISZ", className: "btn-primary", onClick: (modal) => {
        const name = modal.querySelector("#fPName").value.trim();
        if(!name){ toast("Podaj nazwę profilu.", "danger"); return false; }
        p.name = name;
        p.desc = modal.querySelector("#fPDesc").value.trim();
        saveProfiles();
        renderAll();
        toast("Profil zaktualizowany.", "ok");
      }}
    ]
  });
}
 
function deleteProfileFlow(profileId){
  if(DB.profiles.length <= 1){
    toast("Nie można usunąć jedynego profilu.", "danger");
    return;
  }
  const p = profileById(profileId);
  if(!p) return;
  confirmModal("Usuń profil", `Czy na pewno chcesz usunąć profil <strong>${esc(p.name)}</strong>?`, () => {
    DB.profiles = DB.profiles.filter(x => x.id !== profileId);
    if(DB.activeProfileId === profileId){
      DB.activeProfileId = DB.profiles[0].id;
      saveActiveProfile();
    }
    saveProfiles();
    renderAll();
    toast(`Profil ${p.name} usunięty.`, "ok");
  });
}
 
/* ============================================================
   19. RENDER — USTAWIENIA
   ============================================================ */
function renderSettings(){
  document.getElementById("settingsStats").innerHTML = `
    <div class="stat-card"><div class="stat-num">${DB.units.length}</div><div class="stat-lbl">Jednostki</div></div>
    <div class="stat-card"><div class="stat-num">${DB.vehicles.length}</div><div class="stat-lbl">Pojazdy</div></div>
    <div class="stat-card"><div class="stat-num">${DB.actions.length}</div><div class="stat-lbl">Aktywne akcje</div></div>
  `;
}
 
function bindSettingsActions(){
  document.querySelectorAll("[data-clear]").forEach(btn => {
    btn.addEventListener("click", () => {
      const kind = btn.dataset.clear;
      handleClear(kind);
    });
  });
  document.getElementById("btnDeleteAllData").addEventListener("click", () => {
    confirmModal(
      "Usuń wszystkie dane",
      "Czy na pewno chcesz usunąć wszystkie zapisane dane? Ta operacja jest nieodwracalna.",
      () => {
        localStorage.removeItem(LS.UNITS);
        localStorage.removeItem(LS.VEHICLES);
        localStorage.removeItem(LS.ACTIONS);
        localStorage.removeItem(LS.HISTORY);
        localStorage.removeItem(LS.HISTORY_DAY);
        localStorage.removeItem(LS.PROFILES);
        localStorage.removeItem(LS.ACTIVE_PROFILE);
        localStorage.removeItem(LS.ACTION_COUNTER);
        localStorage.removeItem(LS.SEEDED);
        seedDemoData();
        UI = { view: "dashboard", vehicleUnitFilter: "ALL", currentActionId: null, currentHistoryId: null };
        switchView("dashboard");
        toast("Wszystkie dane zostały usunięte i przywrócono dane demonstracyjne.", "ok");
      },
      "USUŃ WSZYSTKO"
    );
  });
}
 
function handleClear(kind){
  const map = {
    history: {
      title: "Wyczyść historię",
      msg: "Czy na pewno chcesz usunąć wszystkie wpisy historii bieżącego dnia?",
      action: () => { DB.history = []; saveHistory(); }
    },
    vehicles: {
      title: "Wyczyść pojazdy",
      msg: "Czy na pewno chcesz usunąć wszystkie pojazdy nieprzypisane do aktywnej akcji?",
      action: () => {
        DB.vehicles = DB.vehicles.filter(v => !!v.actionId);
        saveVehicles();
      }
    },
    units: {
      title: "Wyczyść jednostki",
      msg: "Czy na pewno chcesz usunąć wszystkie jednostki, które nie posiadają żadnych pojazdów?",
      action: () => {
        const usedUnitIds = new Set(DB.vehicles.map(v => v.unitId));
        DB.units = DB.units.filter(u => usedUnitIds.has(u.id));
        saveUnits();
      }
    },
    profiles: {
      title: "Wyczyść profile",
      msg: "Czy na pewno chcesz usunąć wszystkie profile poza aktywnym?",
      action: () => {
        DB.profiles = DB.profiles.filter(p => p.id === DB.activeProfileId);
        saveProfiles();
      }
    }
  };
  const cfg = map[kind];
  if(!cfg) return;
  confirmModal(cfg.title, cfg.msg, () => {
    cfg.action();
    renderAll();
    toast(cfg.title + " — wykonano.", "ok");
  });
}
 
/* ============================================================
   20. RENDER GLOBALNY / PROFIL W SIDEBARZE / ZEGAR
   ============================================================ */
function renderSidebarProfile(){
  const p = profileById(DB.activeProfileId);
  const name = p ? p.name : "—";
  document.getElementById("activeProfileName").textContent = name;
  document.getElementById("profileAvatar").textContent = name.charAt(0).toUpperCase();
}
 
function tickClock(){
  const t = nowFull();
  const sc = document.getElementById("sidebarClock");
  const mc = document.getElementById("mobileClock");
  if(sc) sc.textContent = t;
  if(mc) mc.textContent = t.slice(0,5);
}
 
function renderAll(){
  renderSidebarProfile();
  switch(UI.view){
    case "dashboard": renderDashboard(); break;
    case "actions": renderActionsList(); break;
    case "action-detail": renderActionDetail(); break;
    case "vehicles": renderVehicles(); break;
    case "units": renderUnits(); break;
    case "history": renderHistory(); break;
    case "history-detail": renderHistoryDetail(); break;
    case "profiles": renderProfiles(); break;
    case "settings": renderSettings(); break;
  }
  // dashboard badge should always reflect current count even off-view
  const badge = document.getElementById("navBadgeActions");
  if(badge){
    badge.textContent = DB.actions.length;
    badge.dataset.zero = DB.actions.length === 0 ? "1" : "0";
  }
}
 
/* ============================================================
   21. BINDOWANIE ZDARZEŃ GLOBALNYCH
   ============================================================ */
function bindGlobalEvents(){
  document.querySelectorAll(".nav-item[data-view]").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
  document.getElementById("activeProfileBox").addEventListener("click", () => switchView("profiles"));
 
  document.getElementById("btnNewActionMain").addEventListener("click", openNewActionModal);
  document.getElementById("btnNewActionActions").addEventListener("click", openNewActionModal);
  document.getElementById("btnAddVehicle").addEventListener("click", openAddVehicleModal);
  document.getElementById("btnAddUnit").addEventListener("click", openAddUnitModal);
  document.getElementById("btnAddProfile").addEventListener("click", openAddProfileModal);
 
  document.getElementById("menuToggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("navOverlay").classList.toggle("show");
  });
  document.getElementById("navOverlay").addEventListener("click", closeMobileNav);
 
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape"){
      const backdrops = document.querySelectorAll(".modal-backdrop");
      if(backdrops.length) closeModal(backdrops[backdrops.length - 1]);
    }
  });
 
  bindSettingsActions();
}
 
/* ============================================================
   22. START
   ============================================================ */
function init(){
  loadData();
  bindGlobalEvents();
  switchView("dashboard");
  tickClock();
  setInterval(tickClock, 1000);
  // codzienna kontrola resetu historii (na wypadek pozostawienia karty otwartej przez północ)
  setInterval(checkDailyReset, 60000);
}
 
document.addEventListener("DOMContentLoaded", init);
 
})();
 
