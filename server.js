require("dotenv").config();

const express = require("express");
const http = require("http");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

/* ======================================================
   DATABASE CONNECTION
====================================================== */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

/* ======================================================
   MODELS
====================================================== */

const messageSchema = new mongoose.Schema({
  user: String,
  message: String,
  time: String,
});

const banSchema = new mongoose.Schema({
  username: String,
});

const Message = mongoose.model("Message", messageSchema);
const Ban = mongoose.model("Ban", banSchema);

/* ======================================================
   CONFIG
====================================================== */

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const RESERVED_USERNAMES = [
  "admin",
  "system",
  "root",
  "moderator",
  "support",
];

/* ======================================================
   STATE (In-Memory)
====================================================== */

const users = {};
const adminTokens = new Set();
const mutedUsers = new Set();

/* ======================================================
   UTILITIES
====================================================== */

const normalize = (name) => name.trim().toLowerCase();

const getOnlineUsernames = () =>
  Object.values(users).map((u) => u.username);

function isAdmin(socketId) {
  return users[socketId]?.role === "admin";
}

function emitAdminUpdate() {
  const adminData = Object.entries(users).map(
    ([socketId, user]) => ({
      socketId,
      username: user.username,
      role: user.role,
      joinedAt: user.joinedAt,
      muted: mutedUsers.has(socketId),
    })
  );

  Object.entries(users).forEach(([id, user]) => {
    if (user.role === "admin") {
      io.to(id).emit("admin-data", adminData);
    }
  });
}

/* ======================================================
   SOCKET LOGIC
====================================================== */

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  /* ===============================
     CHECK USERNAME
  =============================== */
  socket.on("check-username", async (data, callback) => {
    try {
      const { username, password } = data || {};
      if (!username)
        return callback({ available: false, message: "Invalid username" });

      const cleanName = normalize(username);

      const banned = await Ban.findOne({ username: cleanName });
      if (banned) {
        return callback({
          available: false,
          message: "You are banned from this chat",
        });
      }

      // ADMIN LOGIN
      if (cleanName === "admin") {
        if (password !== ADMIN_PASSWORD) {
          return callback({
            available: false,
            message: "Invalid admin password",
          });
        }

        const token = crypto.randomBytes(16).toString("hex");
        adminTokens.add(token);

        return callback({
          available: true,
          adminToken: token,
        });
      }

      if (RESERVED_USERNAMES.includes(cleanName)) {
        return callback({
          available: false,
          message: "This username is reserved",
        });
      }

      const alreadyOnline = Object.values(users).some(
        (u) => u.username === cleanName
      );

      if (alreadyOnline) {
        return callback({
          available: false,
          message: "Username already taken",
        });
      }

      callback({ available: true });
    } catch (err) {
      console.error(err);
      callback({ available: false, message: "Server error" });
    }
  });

  /* ===============================
     JOIN CHAT
  =============================== */
  socket.on("join", async (data) => {
    const { username, adminToken } = data || {};
    if (!username) return;

    const cleanName = normalize(username);

    const banned = await Ban.findOne({ username: cleanName });
    if (banned) return;

    let role = "user";
    if (cleanName === "admin" && adminTokens.has(adminToken)) {
      role = "admin";
    }

    users[socket.id] = {
      username: cleanName,
      role,
      joinedAt: new Date().toLocaleTimeString(),
    };

    // 🔥 LOAD LAST 50 MESSAGES
    const oldMessages = await Message.find().sort({ _id: -1 }).limit(50);
    socket.emit("load-messages", oldMessages.reverse());

    socket.broadcast.emit("status", {
      message: `${cleanName} joined the chat`,
    });

    io.emit("users", getOnlineUsernames());
    emitAdminUpdate();
  });

  /* ===============================
     CHAT MESSAGE (SAVE TO DB)
  =============================== */
  socket.on("chat message", async (message) => {
    if (!users[socket.id]) return;
    if (mutedUsers.has(socket.id)) return;

    const user = users[socket.id];

    const newMessage = new Message({
      user: user.username,
      message,
     time: Date.now(),
    });

    await newMessage.save();

    io.emit("chat message", {
      user: user.username,
      message,
      time: newMessage.time,
    });
  });

  /* ===============================
     TYPING
  =============================== */
  socket.on("typing", (state) => {
    if (!users[socket.id]) return;

    socket.broadcast.emit("typing", {
      user: users[socket.id].username,
      state,
    });
  });

  /* ===============================
     REACTIONS
  =============================== */
  socket.on("reaction", (emoji) => {
    io.emit("reaction", emoji);
  });

  /* ===============================
     ADMIN ACTIONS
  =============================== */

  socket.on("kick-user", (targetId) => {
    if (!isAdmin(socket.id)) return;

    io.to(targetId).emit("kicked");
    io.sockets.sockets.get(targetId)?.disconnect(true);
  });

  socket.on("mute-user", (targetId) => {
    if (!isAdmin(socket.id)) return;

    mutedUsers.add(targetId);
    io.to(targetId).emit("muted", true);
    emitAdminUpdate();
  });

  socket.on("unmute-user", (targetId) => {
    if (!isAdmin(socket.id)) return;

    mutedUsers.delete(targetId);
    io.to(targetId).emit("muted", false);
    emitAdminUpdate();
  });

  socket.on("ban-user", async (targetId) => {
    if (!isAdmin(socket.id)) return;

    const target = users[targetId];
    if (!target) return;

    await Ban.create({ username: target.username });

    io.to(targetId).emit("banned");
    io.sockets.sockets.get(targetId)?.disconnect(true);
  });

  socket.on("system-message", (text) => {
    if (!isAdmin(socket.id)) return;

    io.emit("system-message", {
      message: text,
      time: Date.now(),
    });
  });

  /* ===============================
     DISCONNECT
  =============================== */
  socket.on("disconnect", () => {
    mutedUsers.delete(socket.id);
    delete users[socket.id];

    io.emit("users", getOnlineUsernames());
    emitAdminUpdate();
  });
});

/* ======================================================
   START SERVER
====================================================== */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
