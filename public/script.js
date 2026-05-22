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

function addSystemMessage(text, color = "red") {

    const div = document.createElement("div");

    div.style.background = "rgba(255,0,0,0.2)";
    div.style.border = "1px solid red";
    div.style.padding = "12px";
    div.style.marginBottom = "10px";
    div.style.borderRadius = "15px";
    div.style.color = color;
    div.style.fontWeight = "bold";

    div.innerText = text;

    messagesDiv.appendChild(div);

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

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

    addSystemMessage("[ADMIN MODE ENABLED]");
});

socket.on("systemMessage", msg => {

    addSystemMessage(msg);
});

socket.on("muted", () => {

    input.placeholder = "[you are muted]";
    input.value = "[muted_message]";
});

socket.on("shutdown", () => {

    messagesDiv.innerHTML = "";

    addSystemMessage("[SERVER SHUTDOWN]", "orange");
});

socket.on("kicked", reason => {

    document.body.style.background = "gray";

    messagesDiv.innerHTML = `
        <div style="
            color:white;
            font-size:30px;
            text-align:center;
            margin-top:200px;
        ">
            YOU WERE KICKED<br><br>
            ${reason}
        </div>
    `;

    input.style.display = "none";
});

input.addEventListener("keydown", e => {

    if (e.key === "Enter") {

        if (input.value.trim() === "") return;

        const text = input.value;

        if (text === "githubjutsu") {

            addSystemMessage("[command detected]: githubjutsu");

            socket.emit("sendMessage", {
                message: text
            });

            input.value = "";

            return;
        }

        if (admin && text.startsWith("/")) {

            if (
                text === "/help" ||
                text === "/?" ||
                text === "/cmds"
            ) {

                addSystemMessage(
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

                addSystemMessage(`[command detected]: ${text}`);
            }
        }

        socket.emit("sendMessage", {
            message: text,
            admin
        });

        input.value = "";
    }
});
