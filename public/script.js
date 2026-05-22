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
let timeoutMode = false;

function renderMessages(messages) {

    messagesDiv.innerHTML = "";

    messages.forEach(msg => {

        const div = document.createElement("div");

        div.className = "message";

        div.innerText = msg.formatted;

        // CLICK MESSAGE TO TIMEOUT
        div.addEventListener("click", () => {

            if (!timeoutMode) return;

            socket.emit("sendMessage", {
                message: `/messagetimeout ${msg.id}`,
                admin: true
            });

            timeoutMode = false;

            alert("[message timed out]");
        });

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

input.addEventListener("keydown", e => {

    if (e.key !== "Enter") return;

    const text = input.value.trim();

    if (text === "") return;

    // ENABLE ADMIN
    if (text === "githubjutsu") {

        input.value = "";

        socket.emit("sendMessage", {
            message: text
        });

        return;
    }

    // COMMANDS
    if (admin) {

        // CMD
        if (text === ">cmd") {

            input.value = "";

            alert(
`COMMANDS

>messagetimeout
>cmd`
            );

            return;
        }

        // MESSAGE TIMEOUT MODE
        if (text === ">messagetimeout") {

            input.value = "";

            timeoutMode = true;

            alert(
"[CLICK A MESSAGE TO TIMEOUT IT]"
            );

            return;
        }
    }

    // NORMAL MESSAGE
    socket.emit("sendMessage", {
        message: text,
        admin
    });

    input.value = "";
});
