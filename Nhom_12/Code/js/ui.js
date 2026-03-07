/* ui.js */

/* Edit mode */
function exitEditMode() {
  isEditMode = false;
  selectedIds = [];
  document.getElementById("fabEdit").style.background = "";
  document.getElementById("editActionBar").classList.add("hidden");
  filterAndRender();
}

document.getElementById("fabEdit").addEventListener("click", () => {
  if (!isAdmin()) return;
  isEditMode = !isEditMode;
  selectedIds = [];
  document.getElementById("fabEdit").style.background = isEditMode ? "var(--error)" : "";
  document.getElementById("editActionBar").classList.toggle("hidden", !isEditMode);
  document.getElementById("selectedCount").textContent = "0 đã chọn";
  filterAndRender();
});

document.getElementById("btnCancelEdit").addEventListener("click", exitEditMode);

document.getElementById("btnDeleteSelected").addEventListener("click", () => {
  if (!selectedIds.length) return;
  if (confirm(`Xóa ${selectedIds.length} phím tắt đã chọn?`)) {
    deleteShortcuts([...selectedIds]);
    exitEditMode();
  }
});

document.getElementById("btnUpdateSelected").addEventListener("click", () => {
  if (selectedIds.length !== 1) { alert("Vui lòng chỉ chọn 1 phím tắt để sửa."); return; }
  const sc = allShortcuts.find(s => String(s.id) === selectedIds[0]);
  if (!sc) return;
  editingShortcutId = sc.id;
  document.getElementById("fSoftware").value            = sc.software;
  document.getElementById("fAction").value              = sc.action;
  document.getElementById("fKeys").value                = sc.keys;
  document.getElementById("fOs").value                  = sc.os;
  document.getElementById("modalTitle").textContent     = "Chỉnh Sửa Phím Tắt";
  document.getElementById("btnSubmit").textContent      = "Cập nhật";
  document.getElementById("formError").classList.add("hidden");
  document.getElementById("modalOverlay").classList.remove("hidden");
});

/* Modal add / edit */
function openAddModal() {
  editingShortcutId = null;
  document.getElementById("addForm").reset();
  document.getElementById("modalTitle").textContent = "Thêm Phím Tắt Mới";
  document.getElementById("btnSubmit").textContent  = "Lưu phím tắt";
  document.getElementById("formError").classList.add("hidden");
  document.getElementById("modalOverlay").classList.remove("hidden");
  document.getElementById("fSoftware").focus();
}
function closeAddModal() {
  document.getElementById("modalOverlay").classList.add("hidden");
  document.getElementById("addForm").reset();
  editingShortcutId = null;
}

document.getElementById("fabAdd").addEventListener("click", openAddModal);
document.getElementById("btnCancel").addEventListener("click", closeAddModal);
document.getElementById("btnAddFromNoResult").addEventListener("click", openAddModal);
document.getElementById("modalOverlay").addEventListener("click", e => {
  if (e.target === document.getElementById("modalOverlay")) closeAddModal();
});
document.getElementById("addForm").addEventListener("submit", e => {
  e.preventDefault();
  const data = {
    software: document.getElementById("fSoftware").value.trim(),
    action:   document.getElementById("fAction").value.trim(),
    keys:     document.getElementById("fKeys").value.trim(),
    os:       document.getElementById("fOs").value,
  };
  const result = saveShortcut(data);
  if (result.error) {
    const err = document.getElementById("formError");
    err.textContent = result.error;
    err.classList.remove("hidden"); return;
  }
  filterAndRender();
  populateFilters();
  exitEditMode();
  closeAddModal();
  if (isAdmin()) {
    showToast("Đã lưu phím tắt thành công!");
  } else {
    showToast("Phím tắt đã gửi! Đang chờ Admin duyệt", "pending");
  }
});

/* Modal help */
document.getElementById("helpBtn").addEventListener("click", () =>
  document.getElementById("helpOverlay").classList.remove("hidden"));
document.getElementById("helpClose").addEventListener("click", () =>
  document.getElementById("helpOverlay").classList.add("hidden"));
document.getElementById("helpOverlay").addEventListener("click", e => {
  if (e.target === document.getElementById("helpOverlay"))
    document.getElementById("helpOverlay").classList.add("hidden");
});

/* Find & Filter */
let debounceTimer;
document.getElementById("searchInput").addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(filterAndRender, 200);
});
["softwareFilter", "osFilter", "sortFilter"].forEach(id =>
  document.getElementById(id).addEventListener("change", filterAndRender)
);

/* ESC */
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  document.getElementById("helpOverlay").classList.add("hidden");
  document.getElementById("modalOverlay").classList.add("hidden");
});

/* Toast notifications */
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast toast-${type}`;
  setTimeout(() => t.classList.add("hidden"), 3000);
}

/* Status filter (admin) */
document.getElementById("statusFilter").addEventListener("change", filterAndRender);

/* Start */
boot();
