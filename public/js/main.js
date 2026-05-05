if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}

let deferredPrompt;
const installContainer = document.getElementById("installContainer");
const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installContainer.classList.remove("hidden");
});

installBtn.addEventListener("click", async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      installContainer.classList.add("hidden");
    }
    deferredPrompt = null;
  }
});

const chatTrigger = document.getElementById("chatTrigger");
const chatInterface = document.getElementById("chatInterface");
const closeChat = document.getElementById("closeChat");
const chatWrapper = document.getElementById("chatTriggerWrapper");

chatTrigger.addEventListener("click", () => {
  chatInterface.classList.add("active");
  chatTrigger.classList.add("scale-0", "opacity-0");
  chatWrapper.classList.add("scale-0", "opacity-0", "pointer-events-none");
});

closeChat.addEventListener("click", () => {
  chatInterface.classList.remove("active");
  setTimeout(() => {
    chatTrigger.classList.remove("scale-0", "opacity-0");
    chatWrapper.classList.remove("scale-0", "opacity-0", "pointer-events-none");
  }, 300);
});

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const typingIndicator = document.getElementById("typingIndicator");

function appendMessage(role, text) {
  const isBot = role === "bot";
  const messageDiv = document.createElement("div");
  messageDiv.className = `flex flex-col gap-2 ${isBot ? "" : "items-end"}`;

  messageDiv.innerHTML = `
        <div class="${isBot ? "bg-zinc-900/50 border-zinc-800 rounded-tl-none" : "bg-emerald-600 text-white border-emerald-500 rounded-tr-none"} border p-4 rounded-2xl max-w-[85%]">
            <p class="text-xs leading-relaxed font-sans ${isBot ? "italic text-zinc-300" : "font-medium"}">${text}</p>
        </div>
        <span class="text-[8px] text-zinc-600 uppercase tracking-widest ${isBot ? "ml-1" : "mr-1"}">
            ${isBot ? "HH Bot" : "You"}
        </span>
    `;

  chatMessages.insertBefore(messageDiv, typingIndicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
}
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  appendMessage("user", message);
  chatInput.value = "";

  typingIndicator.classList.remove("hidden");
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();

    typingIndicator.classList.add("hidden");
    appendMessage("bot", data.reply);
  } catch (error) {
    typingIndicator.classList.add("hidden");
    appendMessage(
      "bot",
      "Connection unstable. Please check your network link.",
    );
  }
});

let lastScrollTop = 0;

window.addEventListener("scroll", () => {
  let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  if (scrollTop > lastScrollTop && scrollTop > 100) {
    chatWrapper.classList.add("hide-on-scroll");
  } else {
    chatWrapper.classList.remove("hide-on-scroll");
  }
  lastScrollTop = scrollTop;
});
