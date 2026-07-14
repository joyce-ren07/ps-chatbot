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

      const reply = (data.reply || "").trim();
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
