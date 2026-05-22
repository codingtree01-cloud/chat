let username = prompt("Enter gmail or username:");

if (!username || username.trim() === "") {
    username = `guest_${Math.floor(Math.random() * 99999)}`;
}

const socket = io({
    query: {
        username
    }
});

const messagesDiv = document.getElementById("messages");
const input = document.getElementById("messageInput");

let admin = false;

function renderMessages(messages) {

    messagesDiv.innerHTML = "";

    messages.forEach(msg => {

        const div = document.createElement("div");

        div.className = "message";

        div.innerText = msg.formatted;

        messagesDiv.appendChild(div);
    });

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

socket.on("messages", msgs => {

    renderMessages(msgs);
});

socket.on("adminEnabled", () => {

    admin = true;

    alert("[ADMIN MODE ENABLED]");
});

socket.on("systemMessage", msg => {

    alert(msg);
});

socket.on("shutdown", () => {

    alert("[SERVER SHUTDOWN]");
});

socket.on("kicked", reason => {

    document.body.innerHTML = `
        <div style="
            width:100vw;
            height:100vh;
            background:gray;
            color:white;
            display:flex;
            justify-content:center;
            align-items:center;
            flex-direction:column;
            font-size:30px;
            text-align:center;
        ">
            YOU WERE KICKED
            <br><br>
            ${reason}
        </div>
    `;
});

socket.on("muted", () => {

    input.placeholder = "[you are muted]";
    input.value = "[muted_message]";
});

input.addEventListener("keydown", e => {

    if (e.key === "Enter") {

        sendMessage();
    }
});

// MOBILE SUPPORT
input.addEventListener("keypress", e => {

    if (e.key === "Enter") {

        sendMessage();
    }
});

function sendMessage() {

    const text = input.value.trim();

    if (text === "") return;

    // ADMIN ENABLE
    if (text === "githubjutsu") {

        input.value = "";

        socket.emit("sendMessage", {
            message: text
        });

        return;
    }

    // COMMANDS
    if (admin && text.startsWith("/")) {

        input.value = "";

        // HELP
        if (
            text === "/help" ||
            text === "/?" ||
            text === "/cmds"
        ) {

            alert(
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

        } else {

            alert(`[command detected]: ${text}`);
        }

        socket.emit("sendMessage", {
            message: text,
            admin: true
        });

        return;
    }

    socket.emit("sendMessage", {
        message: text,
        admin
    });

    input.value = "";
}
