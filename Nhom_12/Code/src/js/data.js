/* data.js */
function getLocal(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
function setLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

async function loadData() {
  const res  = await fetch(DATA_URL);
  const json = await res.json();
  const deletedIds  = getLocal(DELETED_KEY).map(String);
  const customItems = getLocal(CUSTOM_KEY);
  const customIds   = customItems.map(c => String(c.id));

  let defaults = json.shortcuts.map((s, idx) => ({
    ...s, id: String(s.id || `default_${idx}`)
  }));
  defaults = defaults.filter(s => !deletedIds.includes(s.id));
  defaults = defaults.filter(s => !customIds.includes(s.id));

  // Sort mới nhất / cũ nhất
  defaults     = defaults.map((s, i) => ({ ...s, _createdAt: i }));
  // Non-admin chỉ thấy phím tắt đã được duyệt
  const visibleCustom = isAdmin()
    ? customItems
    : customItems.filter(s => s.status === "approved");

  const customWithTs = visibleCustom.map(s => ({
    ...s,
    _createdAt: /^custom_(\d+)$/.test(s.id) ? parseInt(s.id.split('_')[1]) : Date.now()
  }));

  allShortcuts = [...defaults, ...customWithTs];
  populateFilters();
  filterAndRender();
}

function saveShortcut(data) {
  const custom = getLocal(CUSTOM_KEY);
  const isDup = allShortcuts.some(s =>
    s.software.trim().toLowerCase() === data.software.trim().toLowerCase() &&
    s.keys.trim().toLowerCase()     === data.keys.trim().toLowerCase()     &&
    String(s.id) !== String(editingShortcutId)
  );
  if (isDup) return { error: "Phím tắt này đã tồn tại trong danh sách!" };

  // Admin add → approved; User add → pending 
  const status = isAdmin() ? "approved" : "pending";
  const newObj = { ...data, isCustom: true, status };
  if (editingShortcutId) {
    newObj.id = String(editingShortcutId);
    const ci = custom.findIndex(c => String(c.id) === newObj.id);
    if (ci !== -1) custom[ci] = newObj; else custom.push(newObj);
    const ri = allShortcuts.findIndex(s => String(s.id) === newObj.id);
    if (ri !== -1) allShortcuts[ri] = newObj;
  } else {
    newObj.id = `custom_${Date.now()}`;
    custom.push(newObj);
    allShortcuts.push(newObj);
  }
  setLocal(CUSTOM_KEY, custom);
  return { success: true };
}

function deleteShortcuts(idsArray) {
  const custom  = getLocal(CUSTOM_KEY);
  const deleted = getLocal(DELETED_KEY);
  idsArray.forEach(id => {
    const strId = String(id);
    const ci = custom.findIndex(c => String(c.id) === strId);
    if (ci !== -1) custom.splice(ci, 1);
    if (!deleted.includes(strId)) deleted.push(strId);
    allShortcuts = allShortcuts.filter(s => String(s.id) !== strId);
  });
  setLocal(CUSTOM_KEY, custom);
  setLocal(DELETED_KEY, deleted);
  filterAndRender();
  populateFilters();
}

function populateFilters() {
  const softwareSet = [...new Set(allShortcuts.map(s => s.software))].sort();
  const osSet       = [...new Set(allShortcuts.map(s => s.os))].sort();
  const swFilter    = document.getElementById("softwareFilter");
  const osFilter    = document.getElementById("osFilter");

  swFilter.innerHTML = `<option value="">Tất cả phần mềm</option>`;
  osFilter.innerHTML = `<option value="">Lọc theo mặc định</option>`;

  softwareSet.forEach(sw => {
    const opt = document.createElement("option");
    opt.value = sw; opt.textContent = sw; swFilter.appendChild(opt);
  });
  osSet.forEach(os => {
    const opt = document.createElement("option");
    opt.value = os; opt.textContent = os; osFilter.appendChild(opt);
  });
}

/* Duyệt phím tắt (admin) */
function approveShortcut(id) {
  const custom = getLocal(CUSTOM_KEY);
  const idx = custom.findIndex(c => String(c.id) === String(id));
  if (idx !== -1) {
    custom[idx].status = "approved";
    setLocal(CUSTOM_KEY, custom);
  }
  const ri = allShortcuts.findIndex(s => String(s.id) === String(id));
  if (ri !== -1) allShortcuts[ri].status = "approved";
  filterAndRender();
  populateFilters();
}

/* Từ chối phím tắt (admin) */
function rejectShortcut(id) {
  deleteShortcuts([id]);
}
