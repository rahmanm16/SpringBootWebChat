"use strict";

let stompClient = null;
let nickname = null;
let fullname = null;
let selectedUserID = null;

document.addEventListener("DOMContentLoaded", () => {

  const usernamePage = document.querySelector("#username-page");
  const chatPage = document.querySelector("#chat-page");
  const usernameForm = document.querySelector("#username-form");
  const messageForm = document.querySelector("#msg-form");
  const messageInput = document.querySelector("#message");
  const chatArea = document.querySelector("#chat-messages");
  const logoutArea = document.querySelector("#logout");

  const accessibilityBtn = document.getElementById("accessibility-toggle");
  const accessibilityMenu = document.getElementById("accessibility-menu");
  const highContrastToggle = document.getElementById("high-contrast-toggle");
  const fontSlider = document.getElementById("font-slider");
  const spacingToggle = document.getElementById("spacing-toggle");

  if (
    accessibilityBtn &&
    accessibilityMenu &&
    highContrastToggle &&
    fontSlider &&
    spacingToggle
  ) {
    // initialise persisted prefs
    initialiseAccessibility();

    // toggle the dropdown
    accessibilityBtn.addEventListener("click", () => {
      const expanded = accessibilityBtn.getAttribute("aria-expanded") === "true";
      accessibilityBtn.setAttribute("aria-expanded", String(!expanded));
      accessibilityMenu.setAttribute("aria-hidden", String(expanded));
    });

    // high contrast checkbox
    highContrastToggle.addEventListener("change", () => {
      document.body.classList.toggle("high-contrast", highContrastToggle.checked);
      localStorage.setItem("high-contrast", highContrastToggle.checked);
    });

    // font-size slider
    fontSlider.addEventListener("input", () => {
      document.documentElement.style.fontSize = `${fontSlider.value}%`;
      localStorage.setItem("font-scale", fontSlider.value);
    });

    // spacing checkbox
    spacingToggle.addEventListener("change", () => {
      document.body.classList.toggle("increased-spacing", spacingToggle.checked);
      localStorage.setItem("increased-spacing", spacingToggle.checked);
    });
  }
  else {
    console.warn("Accessibility controls missing—skipping accessibility setup.");
  }


  function initialiseAccessibility() {
    const fontScale = localStorage.getItem("font-scale") || "100";
    document.documentElement.style.fontSize = `${fontScale}%`;
    fontSlider.value = fontScale;

    const highContrast = localStorage.getItem("high-contrast") === "true";
    document.body.classList.toggle("high-contrast", highContrast);
    highContrastToggle.checked = highContrast;

    const increasedSpacing = localStorage.getItem("increased-spacing") === "true";
    document.body.classList.toggle("increased-spacing", increasedSpacing);
    spacingToggle.checked = increasedSpacing;
  }

  function connect(event) {
    nickname = document.querySelector("#nickname").value.trim();
    fullname = document.querySelector("#fullname").value.trim();

    if (nickname && fullname) {
      usernamePage.classList.add("hidden");
      chatPage.classList.remove("hidden");

      const socket = new SockJS("/ws");
      stompClient = Stomp.over(socket);
      stompClient.connect({}, onConnected, onError);
    }
    event.preventDefault();
  }

  function onConnected() {
    stompClient.subscribe(`/user/${nickname}/queue/messages`, onMessageReceived);
    stompClient.subscribe(`/user/public`, onMessageReceived);

    stompClient.send(
      "/app/user.addUser",
      {},
      JSON.stringify({
        nickName: nickname,
        fullName: fullname,
        status: "ONLINE",
      })
    );

    findAndDisplayConnectedUsers().then();
  }

  function onError(error) {
    console.error("Connection error:", error);
  }

  async function findAndDisplayConnectedUsers() {
    const response = await fetch("/users");
    let users = await response.json();
    users = users.filter((user) => user.nickName !== nickname);

    const userList = document.getElementById("connectedUsers");
    userList.innerHTML = "";

    users.forEach((user, index) => {
      appendUserElement(user, userList);
      if (index < users.length - 1) {
        const separator = document.createElement("li");
        separator.classList.add("separator");
        userList.appendChild(separator);
      }
    });
  }

  function appendUserElement(user, container) {
    const item = document.createElement("li");
    item.classList.add("user-item");
    item.id = user.nickName;

    const img = document.createElement("img");
    img.src = "../imgs/user_icon.png";
    img.alt = user.fullName;

    const nameSpan = document.createElement("span");
    nameSpan.textContent = user.fullName;

    const msgSpan = document.createElement("span");
    msgSpan.textContent = "";
    msgSpan.classList.add("usr-msg", "hidden");

    item.append(img, nameSpan, msgSpan);
    item.addEventListener("click", userItemClick);
    container.appendChild(item);
  }

  function userItemClick(event) {
    document.querySelectorAll(".user-item").forEach((el) => el.classList.remove("active"));
    messageForm.classList.remove("hidden");

    const user = event.currentTarget;
    selectedUserID = user.id;
    fetchAndDisplayUserChat().then();

    const alertMsg = user.querySelector(".usr-msg");
    alertMsg.classList.add("hidden");
  }

  async function fetchAndDisplayUserChat() {
    const res = await fetch(`/messages/${nickname}/${selectedUserID}`);
    const chatData = await res.json();

    chatArea.innerHTML = "";
    chatData.forEach(({ senderId, content }) => displayMessage(senderId, content));
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function displayMessage(senderId, content) {
    const div = document.createElement("div");
    div.classList.add("message", senderId === nickname ? "sender" : "receiver");
    div.innerHTML = `<p>${content}</p>`;
    chatArea.appendChild(div);
  }

  function sendMsg(event) {
    const content = messageInput.value.trim();
    if (content && stompClient) {
      const msg = {
        senderId: nickname,
        receiverId: selectedUserID,
        content,
        timestamp: new Date(),
      };
      stompClient.send("/app/chat", {}, JSON.stringify(msg));
      displayMessage(nickname, content);
      messageInput.value = "";
    }
    chatArea.scrollTop = chatArea.scrollHeight;
    event.preventDefault();
  }

  async function onMessageReceived(payload) {
    await findAndDisplayConnectedUsers();
    const message = JSON.parse(payload.body);
    if (selectedUserID === message.senderId) {
      displayMessage(message.senderId, message.content);
      chatArea.scrollTop = chatArea.scrollHeight;
    }

    const userEl = document.querySelector(`#${message.senderId}`);
    if (userEl && !userEl.classList.contains("active")) {
      const alert = userEl.querySelector(".usr-msg");
      alert.classList.remove("hidden");
      alert.textContent = "New message!";
    }
  }

    // Submit Events
    usernameForm.addEventListener("submit", connect, true);
    messageForm.addEventListener("submit", sendMsg, true);
});
