(function () {
  const existingChat = document.getElementById("ptit-chat");
  if (existingChat) return;

  const chatContainer = document.createElement("div");
  chatContainer.id = "ptit-chat";

  chatContainer.innerHTML = `
    <div class="ptit-box">
      <div class="ptit-header">Giải đáp thắc mắc cùng PTIT</div>
      <div class="ptit-body" id="ptit-chat-body">
        <div class="ptit-message ptit-bot">
          <div class="ptit-text">Xin chào, mình là PTIT, mình có thể giúp gì cho bạn?</div>
          <img src="${chrome.runtime.getURL("icon.png")}" class="ptit-avatar" />
        </div>
      </div>
      <div class="ptit-footer">
        <input id="ptit-chat-input" class="ptit-input" placeholder="Nhập nội dung..." />
        <button id="ptit-send-btn" class="ptit-send-btn">➤</button>
      </div>
    </div>
  `;
  document.body.appendChild(chatContainer);

  const chatBody = document.getElementById("ptit-chat-body");
  const chatInput = document.getElementById("ptit-chat-input");
  const sendBtn = document.getElementById("ptit-send-btn");

  function saveChat() {
    localStorage.setItem("ptit-chat-history", chatBody.innerHTML);
  }

  function loadChat() {
    const saved = localStorage.getItem("ptit-chat-history");
    if (saved) {
      chatBody.innerHTML = saved;
    }
  }

  // MARKDOWN PARSER
  function parseMarkdown(md) {
    md = md.replace(/```([\s\S]*?)```/g, '<pre class="ptit-code-block"><code>$1</code></pre>');
    md = md.replace(/`([^`]+)`/g, '<code class="ptit-inline-code">$1</code>');
    md = md.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    md = md.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    md = md.replace(/\n(\d+)\. /g, '<br>$1. ');
    md = md.replace(/\n- /g, '<br>- ');
    md = md.replace(/\n/g, '<br>');
    return md;
  }

  // GỌI GEMINI TRẢ LỜI
  async function callGeminiAPI(question) {
    const API_KEY = "AIzaSyCJz9FSu_HtPz9K7ea6SkgVRRH4_9E8DhY";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    const body = {
      contents: [{ parts: [{ text: question }] }]
    };

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi.";

      const botMsg = document.createElement("div");
      botMsg.className = "ptit-message ptit-bot";
      botMsg.innerHTML = `
        <div class="ptit-text">${parseMarkdown(reply)}</div>
        <img src="${chrome.runtime.getURL("icon.png")}" class="ptit-avatar" />
      `;
      chatBody.appendChild(botMsg);
      chatBody.scrollTop = chatBody.scrollHeight;
      saveChat();
    } catch (error) {
      const errorMsg = document.createElement("div");
      errorMsg.className = "ptit-message ptit-bot";
      errorMsg.innerHTML = `
        <div class="ptit-text">Lỗi khi gọi API.</div>
        <img src="${chrome.runtime.getURL("icon.png")}" class="ptit-avatar" />
      `;
      chatBody.appendChild(errorMsg);
    }
  }

  // GỌI GEMINI PHÂN LOẠI Ý ĐỊNH
  async function classifyIntentWithGemini(text) {
    const prompt = `
Bạn là một mô hình phân loại câu hỏi. Dựa trên nội dung sau, hãy phân loại nó thành một trong các loại:
- "solve_request" nếu người dùng đang yêu cầu giải bài, làm bài.
- "chat" nếu là trò chuyện chung, hỏi đáp thông tin.
- "other" nếu không rõ hoặc không thuộc hai nhóm trên.

Câu hỏi: "${text}"
Phân loại:`;

    const API_KEY = "AIzaSyCJz9FSu_HtPz9K7ea6SkgVRRH4_9E8DhY";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await res.json();
    const classification = data.candidates?.[0]?.content?.parts?.[0]?.text?.toLowerCase()?.trim() || "other";
    return classification;
  }

  // SỰ KIỆN KHI NHẤN GỬI
  sendBtn.addEventListener("click", async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    // hiển thị user msg
    const userMsg = document.createElement("div");
    userMsg.className = "ptit-message ptit-user";
    userMsg.innerHTML = `<div class="ptit-text">${text}</div>`;
    chatBody.appendChild(userMsg);
    chatInput.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;
    saveChat();

    // phân loại ý định bằng Gemini
    const intent = await classifyIntentWithGemini(text);
    let fullPrompt = text;

    if (intent === "solve_request") {
      const des = document.querySelector(".submit__des")?.innerText.trim() || "";
      const req = document.querySelector(".submit__req")?.innerText.trim() || "";
      if (des || req) {
        fullPrompt = `Làm bài này với đề bài là: "${des}" và yêu cầu là: "${req}". ${text}`;
      }
    }

    await callGeminiAPI(fullPrompt);
  });

  loadChat();
})();
