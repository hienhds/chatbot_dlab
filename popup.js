const API_KEY = "AIzaSyCQqPJfxbVTz4XSZTYdczJ3fG2sC8k9k4o"; // ← Thay bằng API key thật
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + API_KEY;

const messagesEl = document.getElementById("chat-messages");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("user-input");
function appendMessage(text, sender, includeImage = false) {
    const wrapper = document.createElement("div");
    wrapper.className = `message ${sender}-message`;

    const bubble = document.createElement("div");
    bubble.textContent = text;
    bubble.className = sender === "bot" ? "bot-message" : "user-message";

    wrapper.appendChild(bubble);

    if (includeImage) {
        const img = document.createElement("img");
        img.src = chrome.runtime.getURL("icon.png");
        img.className = "avatar";
        wrapper.appendChild(img);
    }

    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}


async function sendMessage(question) {
    appendMessage(question, "user");
    inputEl.value = "";

    const body = {
        contents: [
            {
                parts: [{ text: question }]
            }
        ]
    };

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi.";
        appendMessage(reply, "bot");
    } catch (error) {
        appendMessage("Lỗi khi kết nối với API.", "bot");
    }
}

formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const question = inputEl.value.trim();
    if (question) sendMessage(question);
});
