const socket = io();

// ===============================
// DOM ELEMENTS
// ===============================
const messages = document.getElementById("messages");
const userList = document.getElementById("userList");
const input = document.getElementById("input");
const typingIndicator = document.getElementById("typingIndicator");

// Admin elements
const adminPanel = document.getElementById("adminPanel");
const adminTable = document.getElementById("adminTable");

// Theme toggle
const themeToggle = document.getElementById("themeToggle");

// ===============================
// STORED SESSION DATA
// ===============================
const username = localStorage.getItem("username");
const adminToken = localStorage.getItem("adminToken");

// 🚫 CLIENT GUARD
if (!username) {
  window.location = "/";
}

// ===============================
// JOIN CHAT (SECURE)
// ===============================
socket.emit("join", {
  username,
  adminToken,
});

// ===============================
// THEME TOGGLE (PERSISTENT)
// ===============================
if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light");
}

if (themeToggle) {
  themeToggle.onclick = () => {
    document.body.classList.toggle("light");
    localStorage.setItem(
      "theme",
      document.body.classList.contains("light") ? "light" : "dark"
    );
  };
}

// ===============================
// SEND MESSAGE + ADMIN COMMAND
// ===============================
let typingTimeout;

input.addEventListener("input", () => {
  socket.emit("typing", true);

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("typing", false);
  }, 800);
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && input.value.trim()) {
    const text = input.value.trim();

    // 📢 Admin announcement
    if (text.startsWith("/announce ")) {
      socket.emit("system-message", text.replace("/announce ", ""));
      input.value = "";
      return;
    }

    socket.emit("chat message", text);
    input.value = "";
  }
});

// ===============================
// RECEIVE CHAT MESSAGE
// ===============================
socket.on("chat message", (data) => {
  const div = document.createElement("div");
  div.innerHTML = `
    <strong>${data.user}</strong>
    <small>${data.time}</small><br>
    ${data.message}
  `;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

// ===============================
// SYSTEM MESSAGE
// ===============================
socket.on("system-message", (data) => {
  const div = document.createElement("div");
  div.className = "status";
  div.style.background = "#111";
  div.style.color = "#facc15";
  div.style.padding = "8px";
  div.style.margin = "6px 0";
  div.innerText = `📢 SYSTEM: ${data.message}`;
  messages.appendChild(div);
});

// ===============================
// TYPING INDICATOR
// ===============================
socket.on("typing", ({ user, state }) => {
  if (!typingIndicator) return;
  typingIndicator.innerText = state ? `${user} is typing…` : "";
});

// ===============================
// ONLINE USERS
// ===============================
socket.on("users", (users) => {
  userList.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    li.innerText = u;
    userList.appendChild(li);
  });
});

// ===============================
// EMOJI REACTIONS
// ===============================
function react(emoji) {
  socket.emit("reaction", emoji);
}

socket.on("reaction", (emoji) => {
  const span = document.createElement("span");
  span.className = "reaction";
  span.innerText = emoji;
  span.style.left = Math.random() * 80 + 10 + "%";
  document.body.appendChild(span);

  setTimeout(() => span.remove(), 2000);
});

// ===============================
// ADMIN DASHBOARD (LIVE)
// ===============================
socket.emit("get-admin-data");

socket.on("admin-data", (users) => {
  if (!adminPanel || !adminTable) return;

  adminPanel.style.display = "block";
  adminTable.innerHTML = "";

  users.forEach((u) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${u.username}</td>
      <td>${u.role}</td>
      <td>
        ${
          u.role !== "admin"
            ? `
          <button onclick="kickUser('${u.socketId}')">Kick</button>
          <button onclick="toggleMute('${u.socketId}', ${u.muted})">
            ${u.muted ? "Unmute" : "Mute"}
          </button>
          <button onclick="banUser('${u.socketId}')">Ban</button>
        `
            : "—"
        }
      </td>
    `;

    adminTable.appendChild(row);
  });
});

// ===============================
// ADMIN ACTIONS
// ===============================
function kickUser(socketId) {
  socket.emit("kick-user", socketId);
}

function toggleMute(socketId, muted) {
  socket.emit(muted ? "unmute-user" : "mute-user", socketId);
}

function banUser(socketId) {
  if (confirm("Are you sure you want to ban this user?")) {
    socket.emit("ban-user", socketId);
  }
}

// ===============================
// ADMIN EFFECTS ON USERS
// ===============================
socket.on("kicked", () => {
  alert("You were kicked by admin");
  localStorage.clear();
  window.location = "/";
});

socket.on("banned", () => {
  alert("You are banned from this chat");
  localStorage.clear();
  window.location = "/";
});

socket.on("muted", (state) => {
  alert(state ? "You are muted" : "You are unmuted");
});
