const DATA_URL = "data.json";
const CUSTOM_KEY = "devshortcuts_custom";

let allShortcuts = [];

/* ================= LOAD DATA ================= */
async function loadData() {
  const res = await fetch(DATA_URL);
  const json = await res.json();
  allShortcuts = json.shortcuts;

  const custom = getCustomShortcuts();
  allShortcuts = [...allShortcuts, ...custom];

  populateFilters();
  renderCards(allShortcuts);
}

function getCustomShortcuts() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCustomShortcut(sc) {
  const custom = getCustomShortcuts();

  const isDuplicate = allShortcuts.some(
    s =>
      s.software.trim().toLowerCase() === sc.software.trim().toLowerCase() &&
      s.keys.trim().toLowerCase() === sc.keys.trim().toLowerCase()
  );

  if (isDuplicate)
    return { error: "Phím tắt này đã tồn tại trong danh sách!" };

  sc.id = Date.now();
  sc.isCustom = true;

  custom.push(sc);
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));

  return { success: true, data: sc };
}

function deleteCustomShortcut(id) {
  let custom = getCustomShortcuts();
  custom = custom.filter(s => s.id != id);
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));

  allShortcuts = allShortcuts.filter(s => s.id != id);
  filterAndRender();
}

/* ================= FILTERS ================= */
function populateFilters() {
  const softwareSet = [...new Set(allShortcuts.map(s => s.software))].sort();
  const osSet = [...new Set(allShortcuts.map(s => s.os))].sort();

  const swFilter = document.getElementById("softwareFilter");
  const osFilter = document.getElementById("osFilter");

  swFilter.innerHTML = `<option value="">Tất cả phần mềm</option>`;
  osFilter.innerHTML = `<option value="">Tất cả hệ điều hành</option>`;

  softwareSet.forEach(sw => {
    const opt = document.createElement("option");
    opt.value = sw;
    opt.textContent = sw;
    swFilter.appendChild(opt);
  });

  osSet.forEach(os => {
    const opt = document.createElement("option");
    opt.value = os;
    opt.textContent = os;
    osFilter.appendChild(opt);
  });
}

/* ================= HIGHLIGHT ================= */
function highlight(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

/* ================= RENDER ================= */
function renderCards(list) {
  const grid = document.getElementById("shortcutGrid");
  const noResult = document.getElementById("noResult");
  const meta = document.getElementById("resultsMeta");
  const query = document.getElementById("searchInput").value.trim();

  grid.innerHTML = "";

  if (list.length === 0) {
    noResult.classList.remove("hidden");
    meta.textContent = "";
    return;
  }

  noResult.classList.add("hidden");
  meta.textContent = `Hiển thị ${list.length} phím tắt`;

  list.forEach(sc => {
    const card = document.createElement("div");
    card.className = "card";

    const keyParts = sc.keys.split(/\s*\+\s*/);
    const keyHTML = keyParts
      .map(
        (k, i) =>
          `<span class="key-badge">${highlight(
            k.trim(),
            query
          )}</span>${
            i < keyParts.length - 1
              ? '<span class="key-plus">+</span>'
              : ""
          }`
      )
      .join("");

    card.innerHTML = `
      ${sc.isCustom ? '<span class="card-custom-badge">✦ Tùy chỉnh</span>' : ""}
      ${
        sc.isCustom
          ? `<button class="delete-btn" data-id="${sc.id}">✕</button>`
          : ""
      }
      <span class="card-software ${
        sc.isCustom ? "custom-tag" : ""
      }">${highlight(sc.software, query)}</span>
      <div class="card-action">${highlight(sc.action, query)}</div>
      <div class="card-keys">${keyHTML}</div>
      <div class="card-os">🖥 ${sc.os}</div>
    `;

    grid.appendChild(card);
  });
}

/* ================= FILTER + SORT ================= */
function filterAndRender() {
  const query = document
    .getElementById("searchInput")
    .value.trim()
    .toLowerCase();
  const sw = document.getElementById("softwareFilter").value;
  const os = document.getElementById("osFilter").value;
  const sort = document.getElementById("sortFilter")?.value;

  let result = allShortcuts;

  if (query) {
    result = result.filter(
      s =>
        s.action.toLowerCase().includes(query) ||
        s.keys.toLowerCase().includes(query) ||
        s.software.toLowerCase().includes(query)
    );
  }

  if (sw) result = result.filter(s => s.software === sw);
  if (os) result = result.filter(s => s.os === os);

  if (sort === "software") {
    result = [...result].sort((a, b) =>
      a.software.localeCompare(b.software)
    );
  }

  if (sort === "action") {
    result = [...result].sort((a, b) =>
      a.action.localeCompare(b.action)
    );
  }

  renderCards(result);
}

/* ================= EVENTS ================= */

// Search debounce
let debounceTimer;
document.getElementById("searchInput").addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(filterAndRender, 200);
});

// Filters
document
  .getElementById("softwareFilter")
  .addEventListener("change", filterAndRender);
document
  .getElementById("osFilter")
  .addEventListener("change", filterAndRender);
document
  .getElementById("sortFilter")
  ?.addEventListener("change", filterAndRender);

// Delete button
document.addEventListener("click", e => {
  if (e.target.classList.contains("delete-btn")) {
    deleteCustomShortcut(e.target.dataset.id);
  }
});

/* ================= MODAL ADD ================= */
function openAddModal() {
  document.getElementById("modalOverlay").classList.remove("hidden");
  document.getElementById("fSoftware").focus();
}

function closeAddModal() {
  document.getElementById("modalOverlay").classList.add("hidden");
  document.getElementById("addForm").reset();
  document.getElementById("formError").classList.add("hidden");
}

document.getElementById("fabAdd").addEventListener("click", openAddModal);
document.getElementById("btnCancel").addEventListener("click", closeAddModal);
document
  .getElementById("btnAddFromNoResult")
  .addEventListener("click", openAddModal);

document
  .getElementById("modalOverlay")
  .addEventListener("click", e => {
    if (e.target === document.getElementById("modalOverlay"))
      closeAddModal();
  });

document.getElementById("addForm").addEventListener("submit", e => {
  e.preventDefault();

  const sc = {
    software: document.getElementById("fSoftware").value.trim(),
    action: document.getElementById("fAction").value.trim(),
    keys: document.getElementById("fKeys").value.trim(),
    os: document.getElementById("fOs").value
  };

  const result = saveCustomShortcut(sc);

  if (result.error) {
    const err = document.getElementById("formError");
    err.textContent = result.error;
    err.classList.remove("hidden");
    return;
  }

  allShortcuts.push(result.data);
  populateFilters();
  filterAndRender();
  closeAddModal();
});

/* ================= HELP MODAL ================= */
const helpBtn = document.getElementById("helpBtn");
const helpOverlay = document.getElementById("helpOverlay");
const helpClose = document.getElementById("helpClose");

helpBtn.addEventListener("click", () =>
  helpOverlay.classList.remove("hidden")
);
helpClose.addEventListener("click", () =>
  helpOverlay.classList.add("hidden")
);
helpOverlay.addEventListener("click", e => {
  if (e.target === helpOverlay)
    helpOverlay.classList.add("hidden");
});

/* ================= ESC CLOSE ================= */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    helpOverlay.classList.add("hidden");
    document.getElementById("modalOverlay").classList.add("hidden");
  }
});

/* ================= START ================= */
loadData();