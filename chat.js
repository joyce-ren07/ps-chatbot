(() => {
  const root = document.getElementById("ps-chat");
  const toggle = document.getElementById("ps-chat-toggle");
  const panel = document.getElementById("ps-chat-panel");
  const messagesEl = document.getElementById("ps-chat-messages");
  const form = document.getElementById("ps-chat-form");
  const input = document.getElementById("ps-chat-input");
  const sendBtn = form.querySelector(".ps-chat-send");

  /** @type {{ role: "user" | "assistant", content: string }[]} */
  const history = [];

  /** Strip markdown/emojis so the chat bubble shows clean plain text. */
  function toPlainText(text) {
    return String(text)
      .replace(/```[\s\S]*?```/g, (block) =>
        block.replace(/```\w*\n?/g, "").replace(/```/g, "")
      )
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
      .replace(/^\s*[-*+]\s+/gm, "• ")
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/[\uFE0F\u200D]/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function setOpen(open) {
    root.classList.toggle("is-open", open);
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "Close Product Space Assistant" : "Open Product Space Assistant"
    );
    if (open) {
      input.focus();
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendMessage(role, content) {
    const bubble = document.createElement("div");
    bubble.className = `ps-msg ps-msg-${role}`;
    const p = document.createElement("p");
    p.textContent = content;
    bubble.appendChild(p);
    messagesEl.appendChild(bubble);
    scrollToBottom();
    return bubble;
  }

  function appendError(message) {
    const bubble = document.createElement("div");
    bubble.className = "ps-msg ps-msg-error";
    const p = document.createElement("p");
    p.textContent = message;
    bubble.appendChild(p);
    messagesEl.appendChild(bubble);
    scrollToBottom();
  }

  function showTyping() {
    const bubble = document.createElement("div");
    bubble.className = "ps-msg ps-msg-assistant";
    bubble.id = "ps-typing";
    bubble.innerHTML =
      '<div class="ps-typing" aria-label="Assistant is typing"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(bubble);
    scrollToBottom();
  }

  function hideTyping() {
    document.getElementById("ps-typing")?.remove();
  }

  function setBusy(busy) {
    input.disabled = busy;
    sendBtn.disabled = busy;
  }

  toggle.addEventListener("click", () => {
    setOpen(panel.hidden);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    appendMessage("user", message);
    history.push({ role: "user", content: message });
    input.value = "";
    setBusy(true);
    showTyping();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: history.slice(0, -1),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      const reply = toPlainText(data.reply || "");
      if (!reply) {
        throw new Error("Empty response from assistant.");
      }

      hideTyping();
      appendMessage("assistant", reply);
      history.push({ role: "assistant", content: reply });
    } catch (err) {
      hideTyping();
      // Roll back the last user turn so retries stay consistent
      history.pop();
      appendError(err.message || "Failed to reach the assistant.");
    } finally {
      setBusy(false);
      input.focus();
    }
  });
})();
