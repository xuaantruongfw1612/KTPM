/* auth.js */
const SYSTEM_ACCOUNTS = {
  "admin": { password: "admin123", role: "admin" },
  "user":  { password: "user123",  role: "user"  }
};
const SESSION_KEY  = "devshortcuts_session";
const ACCOUNTS_KEY = "devshortcuts_accounts";

function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}
function setSession(data) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); }
function clearSession()   { sessionStorage.removeItem(SESSION_KEY); }
function isAdmin() { const s = getSession(); return s && s.role === "admin"; }

function getAllAccounts() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || {};
    return { ...SYSTEM_ACCOUNTS, ...saved };
  } catch { return { ...SYSTEM_ACCOUNTS }; }
}

function registerAccount(username, password) {
  if (getAllAccounts()[username])
    return { error: "Tên đăng nhập đã tồn tại!" };
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return { error: "Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới (_)." };
  if (password.length < 6)
    return { error: "Mật khẩu phải có ít nhất 6 ký tự." };

  const saved = JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || {};
  saved[username] = { password, role: "user" };
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(saved));
  return { success: true };
}

/* Điều hướng màn hình */
function showLogin() {
  document.getElementById("loginPage").classList.remove("hidden");
  document.getElementById("registerPage").classList.add("hidden");
  document.getElementById("appPage").classList.add("hidden");
  document.getElementById("loginError").classList.add("hidden");
}

function showRegister() {
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("registerPage").classList.remove("hidden");
  document.getElementById("appPage").classList.add("hidden");
  document.getElementById("registerError").classList.add("hidden");
  document.getElementById("registerSuccess").classList.add("hidden");
  document.getElementById("registerForm").reset();
}

function showApp(session) {
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("registerPage").classList.add("hidden");
  document.getElementById("appPage").classList.remove("hidden");

  const badge = document.getElementById("userBadge");
  badge.textContent = (session.role === "admin" ? "Quản trị" : "Người dùng") + ": " + session.username;
  badge.className = "user-badge " + (session.role === "admin" ? "role-admin" : "role-user");

  document.getElementById("fabEdit").classList.toggle("hidden", !isAdmin());
  document.getElementById("adminHelpSection").classList.toggle("hidden", !isAdmin());
  document.getElementById("statusFilter").classList.toggle("hidden", !isAdmin());

  loadData(); // defined in data.js
}

function boot() {
  const session = getSession();
  if (session) showApp(session); else showLogin();
}

/* Login */
document.getElementById("loginForm").addEventListener("submit", e => {
  e.preventDefault();
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errEl    = document.getElementById("loginError");

  if (!username || !password) {
    errEl.textContent = "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.";
    errEl.classList.remove("hidden"); return;
  }
  const account = getAllAccounts()[username];
  if (!account || account.password !== password) {
    errEl.textContent = "Tên đăng nhập hoặc mật khẩu không đúng.";
    errEl.classList.remove("hidden");
    document.getElementById("loginPassword").value = ""; return;
  }
  errEl.classList.add("hidden");
  setSession({ username, role: account.role });
  showApp(getSession());
});

/* Register */
document.getElementById("registerForm").addEventListener("submit", e => {
  e.preventDefault();
  const username = document.getElementById("regUsername").value.trim();
  const password = document.getElementById("regPassword").value;
  const confirm  = document.getElementById("regConfirm").value;
  const errEl    = document.getElementById("registerError");
  const okEl     = document.getElementById("registerSuccess");

  errEl.classList.add("hidden");
  okEl.classList.add("hidden");

  if (!username || !password || !confirm) {
    errEl.textContent = "Vui lòng điền đầy đủ các trường bắt buộc.";
    errEl.classList.remove("hidden"); return;
  }
  if (password !== confirm) {
    errEl.textContent = "Mật khẩu nhập lại không khớp!";
    errEl.classList.remove("hidden");
    document.getElementById("regConfirm").value = ""; return;
  }

  const result = registerAccount(username, password);
  if (result.error) {
    errEl.textContent = result.error;
    errEl.classList.remove("hidden"); return;
  }

  okEl.textContent = `Đăng ký thành công! Chào mừng ${username}. Đang chuyển đến trang đăng nhập...`;
  okEl.classList.remove("hidden");
  document.getElementById("registerForm").reset();
  setTimeout(() => {
    showLogin();
    document.getElementById("loginUsername").value = username;
    document.getElementById("loginPassword").focus();
  }, 1500);
});

/* Login <-> Register */
document.getElementById("goRegister").addEventListener("click", showRegister);
document.getElementById("goLogin").addEventListener("click", showLogin);

/* Logout */
document.getElementById("logoutBtn").addEventListener("click", () => {
  clearSession();
  isEditMode = false;
  selectedIds = [];
  document.getElementById("editActionBar").classList.add("hidden");
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
  showLogin();
});
