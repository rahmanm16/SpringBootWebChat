"use strict";

// Global variables
let stompClient = null;
let nickname = null;
let fullname = null;
let selectedUserID = null;

// DOMContentLoaded for initializing DOM-dependent code
document.addEventListener("DOMContentLoaded", () => {
  // DOM element selections
  const usernamePage = document.querySelector("#username-page");
  const chatPage = document.querySelector("#chat-page");
  const usernameForm = document.querySelector("#username-Form");
  const messageForm = document.querySelector("#msgForm");
  const messageInput = document.querySelector("#message");
  const chatArea = document.querySelector("#chat-messages");
  const logoutArea = document.querySelector("#logout");
  const accessibilityBtn = document.getElementById("accessibility-toggle");
  const accessibilityMenu = document.getElementById("accessibility-menu");
  const highContrastToggle = document.getElementById("high-contrast-toggle");
  const fontSlider = document.getElementById("font-slider");
  const spacingToggle = document.getElementById("spacing-toggle");

  // Accessibility Initialization
  initializeAccessibility();

  // Accessibility Button toggle
  accessibilityBtn.addEventListener("click", () => {
    const expanded = accessibilityBtn.getAttribute("aria-expanded") === "true";
    accessibilityBtn.setAttribute("aria-expanded", String(!expanded));
    accessibilityMenu.setAttribute("aria-hidden", String(expanded));
  });

  // Accessibility Event Listeners
  highContrastToggle.addEventListener("change", () => {
    document.body.classList.toggle("high-contrast", highContrastToggle.checked);
    localStorage.setItem("high-contrast", highContrastToggle.checked);
  });

  fontSlider.addEventListener("input", () => {
    document.documentElement.style.fontSize = `${fontSlider.value}%`;
    localStorage.setItem("font-scale", fontSlider.value);
  });

  spacingToggle.addEventListener("change", () => {
    document.body.classList.toggle("increased-spacing", spacingToggle.checked);
    localStorage.setItem("increased-spacing", spacingToggle.checked);
  });

  // Form submissions
  usernameForm.addEventListener("submit", connect, true);
  messageForm.addEventListener("submit", sendMsg, true);

  // Function Definitions

  // Accessibility initialization function
  function initializeAccessibility() {
    const highContrast = localStorage.getItem("high-contrast") === "true";
    document.body.classList.toggle("high-contrast", highContrast);
    highContrastToggle.checked = highContrast;

    const fontScale = localStorage.getItem("font-scale") || "100";
    document.documentElement.style.fontSize = `${fontScale}%`;
    fontSlider.value = fontScale;

    const increasedSpacing =
      localStorage.getItem("increased-spacing") === "true";
    document.body.classList.toggle("increased-spacing", increasedSpacing);
    spacingToggle.checked = increasedSpacing;
  }

  // Chat Connection Functions
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
    stompClient.subscribe(
      `/user/${nickname}/queue/messages`,
      onMessageReceived
    );
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
    const connectedUserResponse = await fetch("/users");
    let connectedUsers = await connectedUserResponse.json();
    connectedUsers = connectedUsers.filter(
      (user) => user.nickName !== nickname
    );
    const connectedUserList = document.getElementById("connectedUsers");
    connectedUserList.innerHTML = "";

    connectedUsers.forEach((user, index) => {
      appendUserElement(user, connectedUserList);
      if (index < connectedUsers.length - 1) {
        const separator = document.createElement("li");
        separator.classList.add("separator");
        connectedUserList.appendChild(separator);
      }
    });
  }

  function appendUserElement(user, connectedUserList) {
    const listItem = document.createElement("li");
    listItem.classList.add("user-item");
    listItem.id = user.nickName;

    const userImage = document.createElement("img");
    userImage.src = "../imgs/user_icon.png";
    userImage.alt = user.fullName;

    const usernameSpan = document.createElement("span");
    usernameSpan.textContent = user.fullName;

    const receivedMsg = document.createElement("span");
    receivedMsg.textContent = "";
    receivedMsg.classList.add("usr-msg", "hidden");

    listItem.append(userImage, usernameSpan, receivedMsg);
    listItem.addEventListener("click", userItemClick);
    connectedUserList.appendChild(listItem);
  }

  function userItemClick(event) {
    document
      .querySelectorAll(".user-item")
      .forEach((item) => item.classList.remove("active"));
    messageForm.classList.remove("hidden");

    const clickedUser = event.currentTarget;
    selectedUserID = clickedUser.id;
    fetchAndDisplayUserChat().then();

    const usrMsg = clickedUser.querySelector(".usr-msg");
    usrMsg.classList.add("hidden");
  }

  async function fetchAndDisplayUserChat() {
    const userChatResponse = await fetch(
      `/messages/${nickname}/${selectedUserID}`
    );
    const userChat = await userChatResponse.json();

    chatArea.innerHTML = "";
    userChat.forEach((chat) => displayMessage(chat.senderId, chat.content));
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function displayMessage(senderId, content) {
    const msgContainer = document.createElement("div");
    msgContainer.classList.add(
      "message",
      senderId === nickname ? "sender" : "receiver"
    );
    msgContainer.innerHTML = `<p>${content}</p>`;
    chatArea.appendChild(msgContainer);
  }

  function sendMsg(event) {
    const messageContent = messageInput.value.trim();
    if (messageContent && stompClient) {
      const chatMsg = {
        senderId: nickname,
        receiverId: selectedUserID,
        content: messageContent,
        timestamp: new Date(),
      };
      stompClient.send("/app/chat", {}, JSON.stringify(chatMsg));
      displayMessage(nickname, messageContent);
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

    const notifiedUser = document.querySelector(`#${message.senderId}`);
    if (notifiedUser && !notifiedUser.classList.contains("active")) {
      const usrMsg = notifiedUser.querySelector(".usr-msg");
      usrMsg.classList.remove("hidden");
      usrMsg.textContent = "New message!";
    }
  }
});
