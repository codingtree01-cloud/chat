const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const PORT = 3000;

let messages = [];
let shutdownMode = false;

const logsDir = path.join(__dirname, "logs");

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

const timeoutLogFile = path.join(logsDir, "timeout_logs.txt");

function formatDate(date) {
    const yyyy = date.getFullYear();
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");

    return `${yyyy}:${dd}:${hh}:${mm}`;
}

function timeoutMessage(msg) {
    fs.appendFileSync(
        timeoutLogFile,
        `>message timed out [${formatDate(new Date())} /${msg.name}]: ${msg.message}\n`
    );

    messages = messages.filter(m => m.id !== msg.id);

    io.emit("messages", messages);
}

setInterval(() => {
    const now = Date.now();

    messages.forEach(msg => {
        if (now - msg.timestamp >= 3600000) {
            timeoutMessage(msg);
        }
    });
}, 5000);

io.on("connection", socket => {

    let username = socket.handshake.query.username || `guest_${Math.floor(Math.random() * 99999)}`;

    socket.emit("messages", messages);

    socket.on("sendMessage", data => {

        if (shutdownMode) return;

        const text = data.message;

        if (text === "githubjutsu") {
            socket.emit("adminEnabled");
            return;
        }

        const msg = {
            id: Date.now() + Math.random(),
            name: username,
            message: text,
            timestamp: Date.now(),
            formatted: `[${formatDate(new Date())} /${username}]: ${text}`
        };

        messages.push(msg);

        io.emit("messages", messages);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});