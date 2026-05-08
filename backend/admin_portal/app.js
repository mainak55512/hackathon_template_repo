const state = {
  token: localStorage.getItem("auth_token") || "",
  user: null,
  roles: [],
  users: [],
  usage: null,
  editingUserId: null,
};

const els = {
  authPanel: document.getElementById("authPanel"),
  dashboard: document.getElementById("dashboard"),
  authStatus: document.getElementById("authStatus"),
  authMessage: document.getElementById("authMessage"),
  userMessage: document.getElementById("userMessage"),
  loginForm: document.getElementById("loginForm"),
  logoutButton: document.getElementById("logoutButton"),
  refreshButton: document.getElementById("refreshButton"),
  statsGrid: document.getElementById("statsGrid"),
  usageGrid: document.getElementById("usageGrid"),
  usageList: document.getElementById("usageList"),
  usersTableBody: document.getElementById("usersTableBody"),
  userForm: document.getElementById("userForm"),
  userFormTitle: document.getElementById("userFormTitle"),
  userSubmitButton: document.getElementById("userSubmitButton"),
  cancelEditButton: document.getElementById("cancelEditButton"),
  userRoleSelect: document.getElementById("userRoleSelect"),
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

function setMessage(el, text, kind = "success") {
  if (!text) {
    el.hidden = true;
    el.textContent = "";
    el.className = "message";
    return;
  }
  el.hidden = false;
  el.textContent = text;
  el.className = `message ${kind === "error" ? "is-error" : "is-success"}`;
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (state.token) {
    headers.set("Authorization", `Bearer ${state.token}`);
  }
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  let payload = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    payload = await response.text();
  }

  if (!response.ok) {
    const error = new Error(payload?.error || payload || "Request failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function formatDate(value) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCost(value) {
  return money.format(Number(value || 0));
}

function renderStats(stats = {}) {
  const items = [
    ["Total users", stats.total_users ?? 0, "All accounts in the system"],
    ["Active users", stats.active_users ?? 0, "Currently enabled"],
    ["Admins", stats.admin_count ?? 0, "Users with full access"],
    ["Viewers", stats.viewer_count ?? 0, "Read-only accounts"],
  ];
  els.statsGrid.innerHTML = items
    .map(
      ([label, value, sub]) => `
        <article class="metric-card">
          <div class="metric-label">${label}</div>
          <div class="metric-value">${value}</div>
          <div class="metric-sub">${sub}</div>
        </article>
      `
    )
    .join("");
}

function renderUsage(usage = {}) {
  const items = [
    ["Events", usage.count ?? 0],
    ["Input tokens", usage.input_tokens ?? 0],
    ["Output tokens", usage.output_tokens ?? 0],
    ["Embedding tokens", usage.embedding_tokens ?? 0],
    ["Total cost", formatCost(usage.total_cost ?? 0)],
  ];
  els.usageGrid.innerHTML = items
    .map(
      ([label, value]) => `
        <article class="metric-card">
          <div class="metric-label">${label}</div>
          <div class="metric-value">${value}</div>
        </article>
      `
    )
    .join("");

  const recent = usage.recent || [];
  els.usageList.innerHTML = recent.length
    ? recent
        .map(
          (entry) => `
            <article class="usage-item">
              <div>
                <strong>${entry.event_type}</strong>
                <div class="usage-meta">${entry.model_name} · ${formatDate(entry.created_at)}</div>
              </div>
              <div class="usage-kpis">
                ${entry.total_tokens} tokens · ${formatCost(entry.total_cost)}
              </div>
            </article>
          `
        )
        .join("")
    : `<div class="usage-item"><div><strong>No usage yet</strong><div class="usage-meta">Token and cost activity will appear here after RAG calls.</div></div></div>`;
}

function renderRoles(selectValue = "") {
  els.userRoleSelect.innerHTML = state.roles
    .map((role) => `<option value="${role.name}">${role.name}</option>`)
    .join("");
  if (selectValue) {
    els.userRoleSelect.value = selectValue;
  } else if (state.roles.length > 0) {
    els.userRoleSelect.value = state.roles[0].name;
  }
}

function renderUsers() {
  els.usersTableBody.innerHTML = state.users
    .map((user) => {
      const roleOptions = state.roles
        .map(
          (role) =>
            `<option value="${role.name}" ${role.name === user.role ? "selected" : ""}>${role.name}</option>`
        )
        .join("");
      const statusClass = user.is_active ? "active" : "inactive";
      return `
        <tr data-user-id="${user.id}">
          <td>${user.username}</td>
          <td>${user.email}</td>
          <td>
            <select data-field="role">${roleOptions}</select>
          </td>
          <td>
            <label style="display:flex;align-items:center;gap:10px;">
              <input data-field="is_active" type="checkbox" ${user.is_active ? "checked" : ""} />
              <span class="status-chip ${statusClass}">${user.is_active ? "Active" : "Inactive"}</span>
            </label>
          </td>
          <td>${formatDate(user.created_at)}</td>
          <td>
            <div class="row-actions">
              <button class="inline-button" data-action="edit" type="button">Edit</button>
              <button class="inline-button danger" data-action="delete" type="button">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function populateUserForm(user = null) {
  const elements = els.userForm.elements;
  if (user) {
    elements.namedItem("username").value = user.username;
    elements.namedItem("email").value = user.email;
    elements.namedItem("password").value = "";
    elements.namedItem("is_active").checked = !!user.is_active;
    renderRoles(user.role);
    els.userFormTitle.textContent = `Editing ${user.username}`;
    els.userSubmitButton.textContent = "Update user";
    els.cancelEditButton.hidden = false;
    state.editingUserId = user.id;
    return;
  }

  els.userForm.reset();
  renderRoles(state.roles[0]?.name || "");
  els.userFormTitle.textContent = "Create a user";
  els.userSubmitButton.textContent = "Create user";
  els.cancelEditButton.hidden = true;
  state.editingUserId = null;
  elements.namedItem("is_active").checked = true;
}

async function loadPanelData() {
  const data = await apiFetch("/api/admin/panel-data");
  state.roles = data.roles || [];
  state.users = data.users || [];
  state.usage = data.usage || {};

  renderStats(data.stats || {});
  renderRoles();
  renderUsers();
  renderUsage(state.usage);
  els.dashboard.hidden = false;
  els.authPanel.hidden = true;
}

async function verifySession() {
  if (!state.token) {
    renderSignedOut();
    return;
  }

  try {
    state.user = await apiFetch("/api/auth/me");
    els.authStatus.textContent = `Signed in as ${state.user.username} (${state.user.role})`;
    await loadPanelData();
  } catch (error) {
    clearSession(error.status === 403 ? "Admin access required." : "Your session expired.");
  }
}

function renderSignedOut(message = "") {
  els.authStatus.textContent = "Not signed in";
  els.dashboard.hidden = true;
  els.authPanel.hidden = false;
  setMessage(els.authMessage, message, "error");
}

function clearSession(message = "") {
  state.token = "";
  state.user = null;
  localStorage.removeItem("auth_token");
  renderSignedOut(message);
}

async function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const payload = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
      }),
    });
    state.token = payload.access_token;
    localStorage.setItem("auth_token", state.token);
    state.user = payload.user;
    els.authStatus.textContent = `Signed in as ${state.user.username} (${state.user.role})`;
    setMessage(els.authMessage, "Login successful.", "success");
    await loadPanelData();
  } catch (error) {
    setMessage(els.authMessage, error.message, "error");
  }
}

async function handleUserSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const body = {
    username: form.get("username"),
    email: form.get("email"),
    role: form.get("role"),
    is_active: form.get("is_active") === "on",
  };

  const password = form.get("password");
  if (password) {
    body.password = password;
  }

  try {
    if (state.editingUserId) {
      await apiFetch(`/api/users/${state.editingUserId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setMessage(els.userMessage, "User updated successfully.", "success");
    } else {
      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setMessage(els.userMessage, "User created successfully.", "success");
    }
    await loadPanelData();
    populateUserForm();
  } catch (error) {
    setMessage(els.userMessage, error.message, "error");
  }
}

async function updateInlineUser(userId, patch) {
  await apiFetch(`/api/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  await loadPanelData();
}

async function deleteUser(userId) {
  if (!window.confirm("Delete this user?")) return;
  await apiFetch(`/api/users/${userId}`, { method: "DELETE" });
  await loadPanelData();
}

function wireTableActions(event) {
  const row = event.target.closest("tr[data-user-id]");
  if (!row) return;
  const userId = row.getAttribute("data-user-id");

  if (event.target.matches('[data-action="edit"]')) {
    const user = state.users.find((entry) => String(entry.id) === String(userId));
    if (user) populateUserForm(user);
    return;
  }

  if (event.target.matches('[data-action="delete"]')) {
    deleteUser(userId).catch((error) => {
      setMessage(els.userMessage, error.message, "error");
    });
    return;
  }

  if (event.target.matches('[data-field="role"]')) {
    updateInlineUser(userId, { role: event.target.value }).catch((error) => {
      setMessage(els.userMessage, error.message, "error");
    });
  }

  if (event.target.matches('[data-field="is_active"]')) {
    const label = row.querySelector(".status-chip");
    const isActive = event.target.checked;
    if (label) {
      label.textContent = isActive ? "Active" : "Inactive";
      label.className = `status-chip ${isActive ? "active" : "inactive"}`;
    }
    updateInlineUser(userId, { is_active: isActive }).catch((error) => {
      setMessage(els.userMessage, error.message, "error");
    });
  }
}

function handleLogout() {
  if (!state.token) {
    clearSession();
    return;
  }

  apiFetch("/api/auth/logout", { method: "DELETE" })
    .catch(() => null)
    .finally(() => clearSession("You have been signed out."));
}

els.loginForm.addEventListener("submit", handleLogin);
els.userForm.addEventListener("submit", handleUserSubmit);
els.cancelEditButton.addEventListener("click", () => {
  populateUserForm();
  setMessage(els.userMessage, "", "success");
});
els.logoutButton.addEventListener("click", handleLogout);
els.refreshButton.addEventListener("click", () => {
  loadPanelData().catch((error) => setMessage(els.authMessage, error.message, "error"));
});
els.usersTableBody.addEventListener("click", wireTableActions);

verifySession().catch((error) => {
  renderSignedOut(error.message);
});
