// ============================================================
//  js/messenger.js — In-App Worker Live Location & Messaging Suite
//  Provides interactive real-time messaging, simulated replies,
//  live telemetry, quick chips, and masked direct call routing.
// ============================================================

import { getWorkers, money, stars } from "./store.js";
import { getCategoryConfig } from "./categoryConfig.js";

let modalEl = null;
let currentWorker = null;
let currentBooking = null;

function getChatKey(workerId) {
  return `hs_chat_${workerId || "default"}`;
}

function loadMessages(workerId) {
  try {
    const raw = localStorage.getItem(getChatKey(workerId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      sender: "system",
      text: "🔒 Cooperative Verified Connection · Telemetry & Masked Routing Active",
      time: new Date(Date.now() - 15 * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
    {
      sender: "worker",
      text: "Namaste! I have accepted your service request and I'm currently on my way. Please feel free to share any landmark details or gate instructions.",
      time: new Date(Date.now() - 10 * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ];
}

function saveMessages(workerId, messages) {
  try {
    localStorage.setItem(getChatKey(workerId), JSON.stringify(messages));
  } catch {}
}

export function openWorkerMessenger(workerOrId, bookingInfo = null) {
  let worker = null;
  if (typeof workerOrId === "object" && workerOrId !== null) {
    worker = workerOrId;
  } else {
    const all = getWorkers();
    worker = all.find((w) => w.id === workerOrId) || all[0];
  }

  if (!worker) {
    worker = {
      id: "demo_worker",
      name: "Ramen Das",
      phone: "9876543210",
      category: "plumbing",
      rating: 4.9,
      ratingCount: 38,
      lat: 26.15,
      lng: 91.74,
      expectedRate: 400,
    };
  }

  currentWorker = worker;
  currentBooking = bookingInfo;

  if (!modalEl) {
    createModalDOM();
  }

  populateModalData(worker, bookingInfo);
  modalEl.classList.add("active");
  document.body.style.overflow = "hidden";

  // Scroll to bottom of message list
  setTimeout(() => {
    const box = document.getElementById("hs-chat-messages");
    if (box) box.scrollTop = box.scrollHeight;
    const input = document.getElementById("hs-chat-input");
    if (input) input.focus();
  }, 100);
}

export function closeWorkerMessenger() {
  if (modalEl) {
    modalEl.classList.remove("active");
    document.body.style.overflow = "";
  }
}

function createModalDOM() {
  modalEl = document.createElement("div");
  modalEl.id = "hs-chat-modal-overlay";
  modalEl.className = "hs-chat-overlay";
  modalEl.innerHTML = `
    <div class="hs-chat-container">
      <!-- Header -->
      <div class="hs-chat-header">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="hs-chat-avatar" id="hs-chat-w-avatar">RD</div>
          <div>
            <div style="display:flex;align-items:center;gap:6px">
              <h3 id="hs-chat-w-name" style="margin:0;font-size:1.05rem;font-weight:800">Worker Name</h3>
              <span class="badge badge-success" style="font-size:0.68rem;padding:2px 6px">Verified</span>
            </div>
            <div class="hs-chat-telemetry" id="hs-chat-telemetry">
              <span class="live-beacon" style="width:7px;height:7px"></span>
              <span id="hs-chat-w-status">GPS Active · ~1.2 km away (ETA 6m)</span>
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <button class="btn btn-ghost btn-sm" id="hs-chat-call-btn" title="Masked Call">📞 Call</button>
          <a class="btn btn-ghost btn-sm" id="hs-chat-map-btn" href="track.html" title="View Live Tracking Map">🗺️ Track</a>
          <button class="hs-chat-close-btn" id="hs-chat-close" title="Close">✕</button>
        </div>
      </div>

      <!-- Quick Action Chips -->
      <div class="hs-chat-quick-chips">
        <button class="hs-chip" data-text="📍 Here is my exact location pin and landmark.">📍 Share Location</button>
        <button class="hs-chip" data-text="📞 Please give me a quick ring once you reach the gate.">📞 Call at Gate</button>
        <button class="hs-chip" data-text="⌛ I might be 5 minutes late to open the door, please wait.">⌛ Running 5m Late</button>
        <button class="hs-chip" data-text="🚪 Flat 302, 3rd Floor, Lift is working.">🚪 Gate / Flat Info</button>
      </div>

      <!-- Messages Stream -->
      <div class="hs-chat-messages" id="hs-chat-messages"></div>

      <!-- Typing Indicator -->
      <div class="hs-chat-typing" id="hs-chat-typing" style="display:none">
        <span id="hs-chat-typing-name">Worker</span> is typing<span class="dots">...</span>
      </div>

      <!-- Input Form -->
      <form class="hs-chat-input-bar" id="hs-chat-form">
        <input type="text" id="hs-chat-input" class="hs-chat-input" placeholder="Type a message or instruction..." autocomplete="off" required />
        <button type="submit" class="btn btn-primary hs-chat-send-btn" title="Send Message">
          <span>Send</span> ➤
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(modalEl);

  // Close handlers
  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl) closeWorkerMessenger();
  });
  document.getElementById("hs-chat-close").addEventListener("click", closeWorkerMessenger);

  // Call Handler
  document.getElementById("hs-chat-call-btn").addEventListener("click", () => {
    if (!currentWorker) return;
    alert(`📞 Connecting masked call to ${currentWorker.name} (+91 ${currentWorker.phone || "9876543210"})...\n(Private cooperative phone proxy protects customer & worker numbers).`);
  });

  // Form Submit Handler
  document.getElementById("hs-chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("hs-chat-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    sendUserMessage(text);
  });

  // Quick Chips Handler
  modalEl.querySelectorAll(".hs-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      sendUserMessage(chip.dataset.text);
    });
  });
}

function populateModalData(worker, booking) {
  const cfg = getCategoryConfig(worker.category);
  const initials = worker.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  const avatar = document.getElementById("hs-chat-w-avatar");
  avatar.textContent = initials;
  avatar.style.background = cfg?.theme.primary || "var(--coop-teal)";

  document.getElementById("hs-chat-w-name").textContent = worker.name;
  document.getElementById("hs-chat-w-status").textContent = `${cfg?.label || worker.category} · ● Live GPS (~1.4 km away)`;
  document.getElementById("hs-chat-typing-name").textContent = worker.name.split(" ")[0];

  const mapBtn = document.getElementById("hs-chat-map-btn");
  if (booking?.id) {
    mapBtn.href = `track.html?booking=${booking.id}`;
  } else {
    mapBtn.href = `track.html`;
  }

  renderMessagesList();
}

function renderMessagesList() {
  if (!currentWorker) return;
  const messages = loadMessages(currentWorker.id);
  const box = document.getElementById("hs-chat-messages");
  if (!box) return;

  box.innerHTML = messages
    .map((m) => {
      if (m.sender === "system") {
        return `<div class="hs-msg-system"><span>${m.text}</span></div>`;
      }
      const isMe = m.sender === "user";
      return `
        <div class="hs-msg-row ${isMe ? "hs-msg-me" : "hs-msg-worker"}">
          <div class="hs-msg-bubble">
            <div class="hs-msg-text">${escapeHtml(m.text)}</div>
            <div class="hs-msg-time">${m.time} ${isMe ? '<span class="hs-msg-check">✓✓</span>' : ""}</div>
          </div>
        </div>
      `;
    })
    .join("");

  box.scrollTop = box.scrollHeight;
}

function sendUserMessage(text) {
  if (!currentWorker) return;
  const workerId = currentWorker.id;
  const messages = loadMessages(workerId);

  const newMsg = {
    sender: "user",
    text,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  messages.push(newMsg);
  saveMessages(workerId, messages);
  renderMessagesList();

  // Trigger simulated worker response after 1.4s
  triggerWorkerResponse(text);
}

function triggerWorkerResponse(userText) {
  const typingEl = document.getElementById("hs-chat-typing");
  if (typingEl) typingEl.style.display = "block";

  const box = document.getElementById("hs-chat-messages");
  if (box) box.scrollTop = box.scrollHeight;

  setTimeout(() => {
    if (typingEl) typingEl.style.display = "none";
    if (!currentWorker) return;

    let reply = "Got it! Thanks for letting me know. I'll reach the location shortly.";
    const lower = userText.toLowerCase();

    if (lower.includes("location") || lower.includes("pin") || lower.includes("landmark")) {
      reply = "Thank you! I received your location pin and landmark details. Navigating straight there now.";
    } else if (lower.includes("gate") || lower.includes("call") || lower.includes("phone") || lower.includes("ring")) {
      reply = "Understood! I will give you a call right when I reach the building entrance.";
    } else if (lower.includes("late") || lower.includes("wait") || lower.includes("time")) {
      reply = "No problem at all, take your time! I will wait at the entrance.";
    } else if (lower.includes("floor") || lower.includes("flat") || lower.includes("door")) {
      reply = `Noted! Heading to your doorstep as soon as I arrive.`;
    }

    const messages = loadMessages(currentWorker.id);
    messages.push({
      sender: "worker",
      text: reply,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });

    saveMessages(currentWorker.id, messages);
    renderMessagesList();
  }, 1400);
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Global hook for convenience
if (typeof window !== "undefined") {
  window.openWorkerMessenger = openWorkerMessenger;
  window.closeWorkerMessenger = closeWorkerMessenger;
}
