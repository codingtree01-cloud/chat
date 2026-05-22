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

const mutedUsers = {};
const bannedUsers = [];

const logsDir = path.join(__dirname, "logs");

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

const timeoutLogFile = path.join(logsDir, "timeout_logs.txt");

if (!fs.existsSync(timeoutLogFile)) {
    fs.writeFileSync(timeoutLogFile, "");
}

function formatDate(date) {

    const yyyy = date.getFullYear();
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");

    return `${yyyy}:${dd}:${hh}:${mm}:${ss}`;
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

    let username =
        socket.handshake.query.username ||
        `guest_${Math.floor(Math.random() * 99999)}`;

    if (bannedUsers.includes(username)) {

        socket.emit("kicked", "YOU ARE BANNED");

        socket.disconnect();

        return;
    }

    socket.emit("messages", messages);

    socket.on("sendMessage", data => {

        if (shutdownMode) return;

        const text = data.message;

        // MUTED
        if (mutedUsers[username]) {

            if (Date.now() < mutedUsers[username]) {

                socket.emit("muted");

                return;
            }
        }

        // ADMIN MODE
        if (text === "githubjutsu") {

            socket.emit("adminEnabled");

            return;
        }

        // COMMANDS
        if (data.admin && text.startsWith("/")) {

            const parts = text.split(" ");
            const cmd = parts[0];

            // HELP
            if (
                cmd === "/help" ||
                cmd === "/?" ||
                cmd === "/cmds"
            ) {

                socket.emit(
                    "systemMessage",
`[commandlist]

/messagetimeout [id]
/ban [user]
/shutdown
/shutdown in [seconds]
/mute [user] [minutes] [seconds]
/kick [user] [message]
`
                );

                return;
            }

            // TIMEOUT MESSAGE
            if (cmd === "/messagetimeout") {

                const id = parts[1];

                const msg = messages.find(
                    m => String(m.id) === String(id)
                );

                if (msg) {

                    timeoutMessage(msg);

                    socket.emit(
                        "systemMessage",
                        "[message timed out]"
                    );
                }

                return;
            }

            // BAN
            if (cmd === "/ban") {

                const user = parts[1];

                bannedUsers.push(user);

                for (let [id, s] of io.of("/").sockets) {

                    if (s.handshake.query.username === user) {

                        s.emit("kicked", "YOU WERE BANNED");

                        s.disconnect();
                    }
                }

                socket.emit(
                    "systemMessage",
                    `[banned]: ${user}`
                );

                return;
            }

            // SHUTDOWN
            if (cmd === "/shutdown") {

                if (parts[1] === "in") {

                    const seconds = Number(parts[2]);

                    socket.emit(
                        "systemMessage",
                        `[shutdown in ${seconds}s]`
                    );

                    setTimeout(() => {

                        shutdownMode = true;

                        messages = [];

                        io.emit("shutdown");

                        setTimeout(() => {

                            shutdownMode = false;

                            io.emit("messages", messages);

                        }, 3000);

                    }, seconds * 1000);

                } else {

                    shutdownMode = true;

                    messages = [];

                    io.emit("shutdown");

                    setTimeout(() => {

                        shutdownMode = false;

                        io.emit("messages", messages);

                    }, 3000);
                }

                return;
            }

            // MUTE
            if (cmd === "/mute") {

                const user = parts[1];

                const mins = Number(parts[2]);
                const secs = Number(parts[3]);

                const total =
                    ((mins * 60) + secs) * 1000;

                mutedUsers[user] =
                    Date.now() + total;

                socket.emit(
                    "systemMessage",
                    `[muted]: ${user}`
                );

                return;
            }

            // KICK
            if (cmd === "/kick") {

                const user = parts[1];

                const reason =
                    parts.slice(2).join(" ");

                for (let [id, s] of io.of("/").sockets) {

                    if (s.handshake.query.username === user) {

                        s.emit("kicked", reason);
                    }
                }

                socket.emit(
                    "systemMessage",
                    `[kicked]: ${user}`
                );

                return;
            }

            return;
        }

        // NORMAL MESSAGE
        const msg = {

            id: Date.now() + Math.random(),

            name: username,

            message: text,

            timestamp: Date.now(),

            formatted:
                `[${formatDate(new Date())} /${username}]: ${text}`
        };

        messages.push(msg);

        io.emit("messages", messages);
    });
});

server.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );
});
