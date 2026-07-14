(() => {
  const root = document.getElementById("ps-chat");
  const toggle = document.getElementById("ps-chat-toggle");
  const panel = document.getElementById("ps-chat-panel");
  const resizeHandle = document.getElementById("ps-chat-resize");
  const messagesEl = document.getElementById("ps-chat-messages");
  const form = document.getElementById("ps-chat-form");
  const input = document.getElementById("ps-chat-input");
  const sendBtn = form.querySelector(".ps-chat-send");

  const SIZE_KEY = "ps-chat-size";
  const DEFAULT_W = 390;
  const DEFAULT_H = 560;

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

  function bounds() {
    const marginX = window.matchMedia("(max-width: 640px)").matches ? 24 : 32;
    const marginY = window.matchMedia("(max-width: 640px)").matches ? 88 : 112;
    return {
      minW: 280,
      minH: 320,
      maxW: Math.max(280, window.innerWidth - marginX),
      maxH: Math.max(320, window.innerHeight - marginY),
    };
  }

  function clampSize(width, height) {
    const { minW, minH, maxW, maxH } = bounds();
    return {
      width: Math.round(Math.min(maxW, Math.max(minW, width))),
      height: Math.round(Math.min(maxH, Math.max(minH, height))),
    };
  }

  function applySize(width, height) {
    const size = clampSize(width, height);
    panel.style.setProperty("--ps-chat-w", `${size.width}px`);
    panel.style.setProperty("--ps-chat-h", `${size.height}px`);
    return size;
  }

  function saveSize(size) {
    try {
      localStorage.setItem(SIZE_KEY, JSON.stringify(size));
    } catch {
      // ignore quota / private mode
    }
  }

  function loadSize() {
    try {
      const raw = localStorage.getItem(SIZE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        typeof parsed?.width === "number" &&
        typeof parsed?.height === "number"
      ) {
        return clampSize(parsed.width, parsed.height);
      }
    } catch {
      // ignore
    }
    return null;
  }

  function initSize() {
    const saved = loadSize();
    if (saved) {
      applySize(saved.width, saved.height);
    } else {
      applySize(
        Math.min(DEFAULT_W, bounds().maxW),
        Math.min(DEFAULT_H, bounds().maxH)
      );
    }
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
      initSize();
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

  function appendSethPhoto() {
    const bubble = document.createElement("div");
    bubble.className = "ps-msg ps-msg-assistant ps-msg-photo";
    const img = document.createElement("img");
    img.src = "assets/seth.png";
    img.alt = "Seth";
    img.loading = "eager";
    bubble.appendChild(img);
    messagesEl.appendChild(bubble);
    scrollToBottom();
    return bubble;
  }

  function isSethRequest(message) {
    return /\bseth\b/i.test(message);
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

  /* Resize: drag top-left corner (panel is anchored bottom-right). */
  let resizing = false;
  let startX = 0;
  let startY = 0;
  let startW = 0;
  let startH = 0;

  function onPointerMove(event) {
    if (!resizing) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    // Dragging left/up grows; right/down shrinks
    applySize(startW - dx, startH - dy);
  }

  function onPointerUp(event) {
    if (!resizing) return;
    resizing = false;
    panel.classList.remove("is-resizing");
    document.body.style.cursor = "";
    resizeHandle.releasePointerCapture?.(event.pointerId);
    const rect = panel.getBoundingClientRect();
    saveSize(clampSize(rect.width, rect.height));
  }

  resizeHandle.addEventListener("pointerdown", (event) => {
    if (panel.hidden) return;
    event.preventDefault();
    resizing = true;
    panel.classList.add("is-resizing");
    document.body.style.cursor = "nwse-resize";
    startX = event.clientX;
    startY = event.clientY;
    const rect = panel.getBoundingClientRect();
    startW = rect.width;
    startH = rect.height;
    resizeHandle.setPointerCapture?.(event.pointerId);
  });

  resizeHandle.addEventListener("pointermove", onPointerMove);
  resizeHandle.addEventListener("pointerup", onPointerUp);
  resizeHandle.addEventListener("pointercancel", onPointerUp);

  window.addEventListener("resize", () => {
    if (panel.hidden) return;
    const rect = panel.getBoundingClientRect();
    applySize(rect.width, rect.height);
  });

  toggle.addEventListener("click", () => {
    setOpen(panel.hidden);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    appendMessage("user", message);
    input.value = "";

    // Easter egg: reply with Seth's photo only
    if (isSethRequest(message)) {
      appendSethPhoto();
      input.focus();
      return;
    }

    history.push({ role: "user", content: message });
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
      history.pop();
      appendError(err.message || "Failed to reach the assistant.");
    } finally {
      setBusy(false);
      input.focus();
    }
  });
})();
