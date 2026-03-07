const DATA_URL = "data.json";
const CUSTOM_KEY = "devshortcuts_custom";
const DELETED_KEY = "devshortcuts_deleted";

let allShortcuts = [];
let isEditMode = false;
let selectedIds = [];
let editingShortcutId = null;

/* ================= UTILS (Quản lý LocalStorage) ================= */
function getLocal(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
function setLocal(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/* ================= LOAD DATA ================= */
async function loadData() {
  const res = await fetch(DATA_URL);
  const json = await res.json();
  
  const deletedIds = getLocal(DELETED_KEY).map(String);
  const customItems = getLocal(CUSTOM_KEY);
  const customIds = customItems.map(c => String(c.id));
  
  // 1. Gắn ID chuỗi cho dữ liệu gốc để tránh lỗi kiểu dữ liệu
  let defaults = json.shortcuts.map((s, idx) => ({
    ...s,
    id: String(s.id || `default_${idx}`) 
  }));

  // 2. Lọc bỏ vĩnh viễn những phím tắt nằm trong sổ đen (Đã xóa)
  defaults = defaults.filter(s => !deletedIds.includes(s.id));
  
  // 3. Lọc bỏ những phím gốc đã bị Cập nhật (để nhường chỗ cho bản custom tải lên)
  defaults = defaults.filter(s => !customIds.includes(s.id));

  // 4. Gộp lại
  allShortcuts = [...defaults, ...customItems];

  populateFilters();
  filterAndRender();
}

/* ================= HÀM XỬ LÝ LƯU (Add/Update) ================= */
function saveShortcut(data) {
  const custom = getLocal(CUSTOM_KEY);
  
  // Kiểm tra trùng lặp
  const isDup = allShortcuts.some(s => 
    s.software.trim().toLowerCase() === data.software.trim().toLowerCase() &&
    s.keys.trim().toLowerCase() === data.keys.trim().toLowerCase() &&
    String(s.id) !== String(editingShortcutId) // Bỏ qua chính nó nếu đang update
  );

  if (isDup) return { error: "Phím tắt này đã tồn tại trong danh sách!" };

  const newObj = { ...data, isCustom: true };
  
  if (editingShortcutId) {
    // ĐANG UPDATE
    newObj.id = String(editingShortcutId);
    
    // Lưu vào Custom (Ghi đè hoặc thêm mới vào mảng Custom)
    const customIdx = custom.findIndex(c => String(c.id) === newObj.id);
    if (customIdx !== -1) custom[customIdx] = newObj;
    else custom.push(newObj);
    
    // Cập nhật lên RAM hiển thị
    const ramIdx = allShortcuts.findIndex(s => String(s.id) === newObj.id);
    if (ramIdx !== -1) allShortcuts[ramIdx] = newObj;
  } else {
    // ĐANG THÊM MỚI
    newObj.id = `custom_${Date.now()}`;
    custom.push(newObj);
    allShortcuts.push(newObj);
  }

  setLocal(CUSTOM_KEY, custom);
  return { success: true };
}

/* ================= HÀM XỬ LÝ XÓA (Xóa 1 hoặc nhiều) ================= */
function deleteShortcuts(idsArray) {
  const custom = getLocal(CUSTOM_KEY);
  const deleted = getLocal(DELETED_KEY);

  idsArray.forEach(id => {
    const strId = String(id);
    
    // 1. Xóa khỏi mảng Custom (nếu nó ở đó)
    const customIdx = custom.findIndex(c => String(c.id) === strId);
    if (customIdx !== -1) custom.splice(customIdx, 1);
    
    // 2. Thêm vào sổ đen (Bắt buộc với mọi ID để chặn hồi sinh khi F5)
    if (!deleted.includes(strId)) deleted.push(strId);
    
    // 3. Xóa khỏi RAM hiển thị
    allShortcuts = allShortcuts.filter(s => String(s.id) !== strId);
  });

  setLocal(CUSTOM_KEY, custom);
  setLocal(DELETED_KEY, deleted);
  
  filterAndRender();
  populateFilters();
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
    
    const isSelected = selectedIds.includes(String(sc.id));
    card.className = `card ${isEditMode ? "edit-mode" : ""} ${isSelected ? "selected-card" : ""}`;
    card.dataset.id = sc.id;

    const keyParts = sc.keys.split(/\s*\+\s*/);
    const keyHTML = keyParts
      .map((k, i) => `<span class="key-badge">${highlight(k.trim(), query)}</span>${i < keyParts.length - 1 ? '<span class="key-plus">+</span>' : ""}`)
      .join("");

    card.innerHTML = `
      <div class="card-checkbox ${isSelected ? "selected" : ""}" data-id="${sc.id}"></div>
      ${sc.isCustom ? '<span class="card-custom-badge">✦ Tùy chỉnh</span>' : ""}
      ${sc.isCustom && !isEditMode ? `<button class="delete-btn" data-id="${sc.id}">✕</button>` : ""}
      <span class="card-software ${sc.isCustom ? "custom-tag" : ""}">${highlight(sc.software, query)}</span>
      <div class="card-action">${highlight(sc.action, query)}</div>
      <div class="card-keys">${keyHTML}</div>
      <div class="card-os">🖥 ${sc.os}</div>
    `;

    grid.appendChild(card);
  });
}

/* ================= FILTER + SORT ================= */
function filterAndRender() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
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
    result = [...result].sort((a, b) => a.software.localeCompare(b.software));
  }

  if (sort === "action") {
    result = [...result].sort((a, b) => a.action.localeCompare(b.action));
  }

  renderCards(result);
}

/* ================= EVENTS (Search & Filters) ================= */
let debounceTimer;
document.getElementById("searchInput").addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(filterAndRender, 200);
});

document.getElementById("softwareFilter").addEventListener("change", filterAndRender);
document.getElementById("osFilter").addEventListener("change", filterAndRender);
document.getElementById("sortFilter")?.addEventListener("change", filterAndRender);

// Bấm nút xóa (Dấu X trên Card)
document.addEventListener("click", e => {
  if (e.target.classList.contains("delete-btn")) {
    deleteShortcuts([e.target.dataset.id]);
  }
});

/* ================= MODAL ADD/UPDATE ================= */
function openAddModal() {
  document.getElementById("modalOverlay").classList.remove("hidden");
  document.getElementById("fSoftware").focus();
}

function closeAddModal() {
  document.getElementById("modalOverlay").classList.add("hidden");
  document.getElementById("addForm").reset();
  document.getElementById("formError").classList.add("hidden");
  editingShortcutId = null; // Reset id
}

document.getElementById("fabAdd").addEventListener("click", () => {
  editingShortcutId = null;
  document.querySelector("#modalOverlay h2").textContent = "Thêm Phím Tắt Mới";
  openAddModal();
});

document.getElementById("btnCancel").addEventListener("click", closeAddModal);
document.getElementById("btnAddFromNoResult").addEventListener("click", () => {
  editingShortcutId = null;
  document.querySelector("#modalOverlay h2").textContent = "Thêm Phím Tắt Mới";
  openAddModal();
});

document.getElementById("modalOverlay").addEventListener("click", e => {
  if (e.target === document.getElementById("modalOverlay")) closeAddModal();
});

// Xử lý Gửi Form (Lưu)
document.getElementById("addForm").addEventListener("submit", e => {
  e.preventDefault();

  const sc = {
    software: document.getElementById("fSoftware").value.trim(),
    action: document.getElementById("fAction").value.trim(),
    keys: document.getElementById("fKeys").value.trim(),
    os: document.getElementById("fOs").value
  };

  const result = saveShortcut(sc);

  if (result.error) {
    const err = document.getElementById("formError");
    err.textContent = result.error;
    err.classList.remove("hidden");
    return;
  }

  // Tắt chế độ Edit nếu đang bật
  if (editingShortcutId) {
    isEditMode = false;
    selectedIds = [];
    updateActionBarVisibility();
  }

  populateFilters();
  filterAndRender();
  closeAddModal();
});

/* ================= EDIT MODE LOGIC ================= */
const fabEdit = document.getElementById("fabEdit");
const editActionBar = document.getElementById("editActionBar");
const btnCancelEdit = document.getElementById("btnCancelEdit");
const btnDeleteSelected = document.getElementById("btnDeleteSelected");
const btnUpdateSelected = document.getElementById("btnUpdateSelected");

function toggleEditMode() {
  isEditMode = !isEditMode;
  selectedIds = [];
  updateActionBarVisibility();
  filterAndRender(); 
}

function updateActionBarVisibility() {
  if (isEditMode) {
    editActionBar.classList.remove("hidden");
    document.getElementById("selectedCount").textContent = `Đã chọn ${selectedIds.length}`;
    
    btnUpdateSelected.style.display = selectedIds.length === 1 ? "inline-block" : "none";
    btnDeleteSelected.style.display = selectedIds.length > 0 ? "inline-block" : "none";
  } else {
    editActionBar.classList.add("hidden");
  }
}

if(fabEdit) fabEdit.addEventListener("click", toggleEditMode);
if(btnCancelEdit) btnCancelEdit.addEventListener("click", toggleEditMode);

// Click chọn nhiều thẻ
document.addEventListener("click", e => {
  if (isEditMode) {
    const card = e.target.closest(".card");
    if (card && !e.target.classList.contains("delete-btn")) {
      const id = String(card.dataset.id);
      
      if (selectedIds.includes(id)) {
        selectedIds = selectedIds.filter(i => i !== id);
      } else {
        selectedIds.push(id);
      }
      
      updateActionBarVisibility();
      filterAndRender();
    }
  }
});

// Nút Xóa Nhiều Thẻ
if(btnDeleteSelected) {
  btnDeleteSelected.addEventListener("click", () => {
    if (confirm(`Bạn có chắc muốn xóa ${selectedIds.length} phím tắt đã chọn?`)) {
      deleteShortcuts(selectedIds);
      selectedIds = [];
      isEditMode = false;
      updateActionBarVisibility();
    }
  });
}

// Nút Sửa Thẻ Chọn
if(btnUpdateSelected) {
  btnUpdateSelected.addEventListener("click", () => {
    const targetId = selectedIds[0];
    const sc = allShortcuts.find(s => String(s.id) === targetId);
    
    if (sc) {
      editingShortcutId = targetId;
      document.getElementById("fSoftware").value = sc.software;
      document.getElementById("fAction").value = sc.action;
      document.getElementById("fKeys").value = sc.keys;
      document.getElementById("fOs").value = sc.os;
      
      document.querySelector("#modalOverlay h2").textContent = "Cập nhật Phím Tắt";
      document.getElementById("modalOverlay").classList.remove("hidden");
    }
  });
}

/* ================= HELP MODAL ================= */
const helpBtn = document.getElementById("helpBtn");
const helpOverlay = document.getElementById("helpOverlay");
const helpClose = document.getElementById("helpClose");

helpBtn.addEventListener("click", () => helpOverlay.classList.remove("hidden"));
helpClose.addEventListener("click", () => helpOverlay.classList.add("hidden"));
helpOverlay.addEventListener("click", e => {
  if (e.target === helpOverlay) helpOverlay.classList.add("hidden");
});

/* ================= ESC CLOSE ================= */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    helpOverlay.classList.add("hidden");
    document.getElementById("modalOverlay").classList.add("hidden");
    if (isEditMode) {
      isEditMode = false;
      selectedIds = [];
      updateActionBarVisibility();
      filterAndRender();
    }
  }
});

/* ================= START ================= */
loadData();