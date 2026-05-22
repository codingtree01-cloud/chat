const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

app.use(express.static("public"));

let messages = [];
let shutdownMode = false;

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

    socket.emit("messages", messages);

    socket.on("sendMessage", data => {

        if (shutdownMode) return;

        const text = data.message;

        // ENABLE ADMIN MODE
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
/guestban
/shutdown
/shutdown in [seconds]
/mute [user] [minutes] [seconds]
/kick [user] [message]
/help
/? 
/cmds`
                );

                return;
            }

            // MESSAGE TIMEOUT
            if (cmd === "/messagetimeout") {

                const id = parts[1];

                const msg = messages.find(m => String(m.id) === String(id));

                if (msg) {

                    timeoutMessage(msg);

                    socket.emit(
                        "systemMessage",
                        `[command detected]: message timed out`
                    );
                }

                return;
            }

            // BAN
            if (cmd === "/ban") {

                const user = parts[1];

                socket.emit(
                    "systemMessage",
                    `[command detected]: banned ${user}`
                );

                return;
            }

            // SHUTDOWN
            if (cmd === "/shutdown") {

                if (parts[1] === "in") {

                    const seconds = Number(parts[2]);

                    socket.emit(
                        "systemMessage",
                        `[command detected]: shutdown in ${seconds} seconds`
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

                    socket.emit(
                        "systemMessage",
                        `[command detected]: shutdown`
                    );

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
                const mins = parts[2];
                const secs = parts[3];

                socket.emit(
                    "systemMessage",
                    `[command detected]: muted ${user} for ${mins}m ${secs}s`
                );

                return;
            }

            // KICK
            if (cmd === "/kick") {

                const user = parts[1];
                const reason = parts.slice(2).join(" ");

                for (let [id, s] of io.of("/").sockets) {

                    if (s.handshake.query.username === user) {

                        s.emit("kicked", reason);
                    }
                }

                socket.emit(
                    "systemMessage",
                    `[command detected]: kicked ${user}`
                );

                return;
            }

            // GUESTBAN
            if (cmd === "/guestban") {

                socket.emit(
                    "systemMessage",
                    `[command detected]: guestban`
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

    socket.on("disconnect", () => {

        console.log(`${username} disconnected.`);
    });
});

server.listen(PORT, () => {

    console.log(`Server running on http://localhost:${PORT}`);
});
