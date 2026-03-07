/* render.js */

function highlight(text, query) {
  if (!query) return text;
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${safe})`, "gi"), "<mark>$1</mark>");
}

function currentList() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const sw    = document.getElementById("softwareFilter").value;
  const os    = document.getElementById("osFilter").value;
  const sort  = document.getElementById("sortFilter").value;
  let result  = allShortcuts;

  if (query) result = result.filter(s =>
    s.action.toLowerCase().includes(query)   ||
    s.keys.toLowerCase().includes(query)     ||
    s.software.toLowerCase().includes(query)
  );
  if (sw)   result = result.filter(s => s.software === sw);
  if (os)   result = result.filter(s => s.os === os);
  if (sort === "software") result = [...result].sort((a, b) => a.software.localeCompare(b.software));
  if (sort === "action")   result = [...result].sort((a, b) => a.action.localeCompare(b.action));
  if (sort === "newest")   result = [...result].sort((a, b) => (b._createdAt || 0) - (a._createdAt || 0));
  if (sort === "oldest")   result = [...result].sort((a, b) => (a._createdAt || 0) - (b._createdAt || 0));

  // Lọc theo trạng thái duyệt (admin)
  if (isAdmin()) {
    const sf = document.getElementById("statusFilter")?.value || "all";
    if (sf === "pending")  result = result.filter(s => s.isCustom && s.status === "pending");
    if (sf === "approved") result = result.filter(s => !s.isCustom || s.status === "approved");
  }
  return result;
}

function filterAndRender() { renderCards(currentList()); }

function renderCards(list) {
  const grid     = document.getElementById("shortcutGrid");
  const noResult = document.getElementById("noResult");
  const meta     = document.getElementById("resultsMeta");
  const query    = document.getElementById("searchInput").value.trim();
  grid.innerHTML = "";

  if (list.length === 0) {
    noResult.classList.remove("hidden");
    meta.textContent = "";
    return;
  }
  noResult.classList.add("hidden");
  meta.textContent = `Đang hiển thị ${list.length} phím tắt`;

  list.forEach(sc => {
    const card       = document.createElement("div");
    const isSelected = selectedIds.includes(String(sc.id));
    card.className   = `card${isEditMode ? " edit-mode" : ""}${isSelected ? " selected-card" : ""}`;
    card.dataset.id  = sc.id;

    const keyParts = sc.keys.split(/\s*\+\s*/);
    const keyHTML  = keyParts.map((k, i) =>
      `<span class="key-badge">${highlight(k.trim(), query)}</span>` +
      (i < keyParts.length - 1 ? '<span class="key-plus">+</span>' : "")
    ).join("");

    const checkboxHTML = isAdmin() && isEditMode
      ? `<div class="card-checkbox${isSelected ? " selected" : ""}"></div>` : "";

    const isPending = sc.isCustom && sc.status === "pending";
    // Admin + pending → nút Duyệt / Từ chối; Admin + approved + không edit → nút Xóa
    const deleteBtn = isAdmin() && !isEditMode && !isPending
      ? `<button class="delete-btn" data-id="${sc.id}">Xóa</button>` : "";
    const approveBar = isAdmin() && isPending
      ? `<div class="approve-bar">
           <button class="btn-approve" data-id="${sc.id}">Duyệt</button>
           <button class="btn-reject"  data-id="${sc.id}">Từ chối</button>
         </div>` : "";

    if (isPending) card.classList.add("card-pending");
    card.innerHTML = `
      ${checkboxHTML}
      ${isPending ? '<span class="card-custom-badge pending-badge">Chờ duyệt</span>'
                  : sc.isCustom ? '<span class="card-custom-badge">Tùy chỉnh</span>' : ""}
      <span class="card-software${sc.isCustom ? " custom-tag" : ""}">${highlight(sc.software, query)}</span>
      <div class="card-action">${highlight(sc.action, query)}</div>
      <div class="card-keys">${keyHTML}</div>
      <div class="card-os">${sc.os}</div>
      ${deleteBtn}${approveBar}
    `;

    if (isAdmin() && isEditMode)
      card.addEventListener("click", () => toggleSelect(String(sc.id)));

    const db = card.querySelector(".delete-btn");
    if (db) db.addEventListener("click", e => {
      e.stopPropagation();
      if (confirm("Xóa phím tắt này?")) deleteShortcuts([sc.id]);
    });
    card.querySelector(".btn-approve")?.addEventListener("click", e => {
      e.stopPropagation(); approveShortcut(sc.id);
    });
    card.querySelector(".btn-reject")?.addEventListener("click", e => {
      e.stopPropagation();
      if (confirm(`Từ chối và xóa phím tắt "${sc.action}"?`)) rejectShortcut(sc.id);
    });

    grid.appendChild(card);
  });
}

function toggleSelect(id) {
  const idx = selectedIds.indexOf(id);
  if (idx === -1) selectedIds.push(id); else selectedIds.splice(idx, 1);
  document.getElementById("selectedCount").textContent = `${selectedIds.length} đã chọn`;
  renderCards(currentList());
}
