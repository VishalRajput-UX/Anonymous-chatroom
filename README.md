# 💬 Anonymous Chatroom

A real-time, full-stack chat application with admin moderation, live updates, and modern SaaS-style UI.

Built with **Node.js, Express, Socket.io, MongoDB, and modern frontend UI**.

---

## 🌐 Overview

Anonymous Chatroom is a production-ready real-time chat platform featuring:

- Instant messaging
- Live online users
- Admin dashboard
- Moderation tools
- Persistent database storage
- Luxury animated UI
- Mobile responsive design

This project demonstrates full-stack architecture, real-time systems, authentication logic, and cloud deployment.

---

## ✨ Features

### 👥 Real-Time Chat
- Instant messaging with Socket.io
- Live online user list
- Typing indicators
- Emoji reactions
- Auto-scroll chat feed
- Persistent messages (MongoDB)

### 👑 Admin System
- Secure admin login (password + token-based)
- Live admin dashboard
- Kick users
- Mute / Unmute users
- Ban users
- System announcements
- Real-time moderation updates

### 🔒 Security
- Reserved username protection
- Username validation
- Admin token verification
- Banned user blocking
- Environment-based secret configuration (.env)

### 💾 Database
- MongoDB Atlas integration
- Cloud message storage
- Auto-load previous messages on join

### 🎨 UI / UX
- Animated gradient background
- Glassmorphism design
- Dark / Light theme toggle
- Floating emoji animations
- Mobile responsive layout
- Modern SaaS-style interface

---

## 🛠 Tech Stack

### Backend
- Node.js
- Express
- Socket.io
- MongoDB
- Mongoose
- dotenv

### Frontend
- HTML5
- CSS3 (Animations + Responsive Design)
- Vanilla JavaScript
- Socket.io Client

---

## 📁 Project Structure

Anonymous-chatroom/
│
├── public/
│ ├── index.html
│ ├── chat.html
│ ├── style.css
│ ├── script.js
│
├── server.js
├── package.json
├── .env
└── README.md

---

## ⚙️ Installation

Clone the repository:


git clone https://github.com/VishalRajput-UX/Anonymous-chatroom.git
cd Anonymous-chatroom

Install dependencies:
npm install

Create a .env file:
ADMIN_PASSWORD=your_admin_password
MONGO_URI=your_mongodb_connection_string

Start the server:
node server.js

Server will run on:
http://localhost:3000

👨‍💻 Author
Vishal Rajput
GitHub: https://github.com/VishalRajput-UX
