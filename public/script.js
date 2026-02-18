const socket = io();

/* ===============================
   DOM ELEMENTS
=============================== */
const messages = document.getElementById("messages");
const userList = document.getElementById("userList");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const typingIndicator = document.getElementById("typingIndicator");

const adminPanel = document.getElementById("adminPanel");
const adminTable = document.getElementById("adminTable");

const themeToggle = document.getElementById("themeToggle");

/* ===============================
   SESSION DATA
=============================== */
const username = localStorage.getItem("username");
const adminToken = localStorage.getItem("adminToken");

if (!username) {
  window.location = "/";
}

/* ===============================
   JOIN CHAT
=============================== */
socket.emit("join", { username, adminToken });

/* ===============================
   THEME TOGGLE
=============================== */
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

/* ===============================
   SEND MESSAGE FUNCTION
=============================== */
function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  if (text.startsWith("/announce ")) {
    socket.emit("system-message", text.replace("/announce ", ""));
    input.value = "";
    return;
  }

  socket.emit("chat message", text);
  input.value = "";
}

/* ===============================
   INPUT EVENTS
=============================== */
let typingTimeout;

input.addEventListener("input", () => {
  socket.emit("typing", true);

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("typing", false);
  }, 800);
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

if (sendBtn) {
  sendBtn.addEventListener("click", sendMessage);
}

/* ===============================
   RECEIVE CHAT MESSAGE
=============================== */
socket.on("chat message", (data) => {
  const div = document.createElement("div");
  div.className = "message";

  // Convert timestamp to user's local time
  const localTime = new Date(data.time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  div.innerHTML = `
    <strong>${data.user}</strong>
    <small>${localTime}</small><br>
    ${data.message}
  `;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

/* ===============================
   SYSTEM MESSAGE
=============================== */
socket.on("system-message", (data) => {
  const div = document.createElement("div");
  div.className = "status";

  const localTime = new Date(data.time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  div.innerHTML = `
    <small>${localTime}</small><br>
    📢 SYSTEM: ${data.message}
  `;

  messages.appendChild(div);
});

/* ===============================
   TYPING INDICATOR
=============================== */
socket.on("typing", ({ user, state }) => {
  if (!typingIndicator) return;
  typingIndicator.innerText = state ? `${user} is typing…` : "";
});

/* ===============================
   ONLINE USERS
=============================== */
socket.on("users", (users) => {
  userList.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    li.innerText = u;
    userList.appendChild(li);
  });
});

/* ===============================
   EMOJI REACTIONS
=============================== */
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

/* ===============================
   ADMIN DASHBOARD
=============================== */
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

/* ===============================
   ADMIN ACTIONS
=============================== */
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

/* ===============================
   ADMIN EFFECTS
=============================== */
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
