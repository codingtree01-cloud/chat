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

input.addEventListener("keydown", e => {

    if (e.key === "Enter") {

        if (input.value.trim() === "") return;

        socket.emit("sendMessage", {
            message: input.value
        });

        input.value = "";
    }
});