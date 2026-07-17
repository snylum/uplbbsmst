(function () {
  "use strict";

  const loginSection = document.getElementById("login-section");
  const adminPanel = document.getElementById("admin-panel");
  const loginForm = document.getElementById("login-form");
  const loginStatus = document.getElementById("login-status");
  const emailDisplay = document.getElementById("admin-email-display");
  const logoutBtn = document.getElementById("logout-btn");
  const contentForm = document.getElementById("content-form");
  const fieldGroupsEl = document.getElementById("field-groups");
  const saveStatus = document.getElementById("save-status");
  const unsavedIndicator = document.getElementById("unsaved-indicator");
  const reloadBtn = document.getElementById("reload-btn");
  const messagesToggle = document.getElementById("messages-toggle");
  const messagesPanel = document.getElementById("messages-panel");
  const messagesList = document.getElementById("messages-list");

  let manifest = null;
  let currentContent = null;
  let dirty = false;

  function showLogin(message) {
    loginSection.classList.remove("is-hidden");
    adminPanel.classList.remove("is-visible");
    if (message) {
      loginStatus.textContent = message;
      loginStatus.hidden = false;
    } else {
      loginStatus.hidden = true;
    }
  }

  function showPanel(email) {
    loginSection.classList.add("is-hidden");
    adminPanel.classList.add("is-visible");
    emailDisplay.textContent = email;
  }

  function getByPath(obj, path) {
    return path.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
  }

  function setByPath(obj, path, value) {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  async function checkSession() {
    try {
      const res = await fetch("/api/session");
      const data = await res.json();
      if (data.authenticated) {
        showPanel(data.email);
        await loadEditor();
      } else {
        showLogin();
      }
    } catch (err) {
      showLogin();
    }
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const btn = loginForm.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Signing In…";
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        showLogin(data.error || "Sign in failed.");
        return;
      }
      showPanel(data.email);
      await loadEditor();
    } catch (err) {
      showLogin("Could not reach the server. Please try again.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Sign In";
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" });
    location.reload();
  });

  async function loadEditor() {
    const [manifestRes, contentRes] = await Promise.all([
      fetch("/manifest.json", { cache: "no-store" }),
      fetch("/api/content", { cache: "no-store" }),
    ]);
    manifest = await manifestRes.json();
    currentContent = await contentRes.json();
    renderForm();
  }

  function renderForm() {
    fieldGroupsEl.innerHTML = "";
    manifest.groups.forEach((group) => {
      const wrap = document.createElement("div");
      wrap.className = "admin-page-group";
      const h2 = document.createElement("h2");
      h2.textContent = group.label;
      wrap.appendChild(h2);

      group.fields.forEach((field) => {
        const fieldWrap = document.createElement("div");
        fieldWrap.className = "form-field admin-field";
        const label = document.createElement("label");
        const inputId = "field-" + field.key.replace(/\./g, "-");
        label.setAttribute("for", inputId);
        label.textContent = field.label;
        fieldWrap.appendChild(label);

        let input;
        if (field.type === "textarea") {
          input = document.createElement("textarea");
        } else {
          input = document.createElement("input");
          input.type = "text";
        }
        input.id = inputId;
        input.name = field.key;
        input.value = getByPath(currentContent, field.key) || "";
        input.addEventListener("input", () => {
          setByPath(currentContent, field.key, input.value);
          setDirty(true);
        });
        fieldWrap.appendChild(input);
        wrap.appendChild(fieldWrap);
      });

      fieldGroupsEl.appendChild(wrap);
    });
  }

  function setDirty(value) {
    dirty = value;
    unsavedIndicator.hidden = !value;
  }

  contentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = contentForm.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Saving…";
    saveStatus.hidden = true;
    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentContent),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      saveStatus.textContent = "Changes saved. The live site now reflects your edits.";
      saveStatus.className = "form-status success";
      saveStatus.hidden = false;
      setDirty(false);
    } catch (err) {
      saveStatus.textContent = "Could not save changes: " + err.message;
      saveStatus.className = "form-status error";
      saveStatus.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = "Save Changes";
    }
  });

  reloadBtn.addEventListener("click", async () => {
    if (dirty && !confirm("Discard unsaved changes and reload from server?")) return;
    await loadEditor();
    setDirty(false);
  });

  messagesToggle.addEventListener("click", async () => {
    const isHidden = messagesPanel.hidden;
    messagesPanel.hidden = !isHidden;
    if (!isHidden) return;
    messagesList.innerHTML = "<p>Loading…</p>";
    try {
      const res = await fetch("/api/contact");
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        messagesList.innerHTML = "<p>No messages received yet.</p>";
        return;
      }
      messagesList.innerHTML = "";
      data.forEach((m) => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML =
          "<p><strong>" + escapeHtml(m.name) + "</strong> &lt;" + escapeHtml(m.email) + "&gt;</p>" +
          "<p><em>" + escapeHtml(m.subject || "(no subject)") + "</em> — " + escapeHtml(m.receivedAt) + "</p>" +
          "<p>" + escapeHtml(m.message) + "</p>";
        messagesList.appendChild(card);
      });
    } catch (err) {
      messagesList.innerHTML = "<p>Could not load messages.</p>";
    }
  });

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  checkSession();
})();
