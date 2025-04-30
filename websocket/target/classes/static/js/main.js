// 'use strict' directive that enables strict mode in js - aids in generating more helpful error messages
"use strict";

const usernamePage = document.querySelector("#username-page");
const chatPage = document.querySelector("#chat-page");
const usernameForm = document.querySelector("#username-Form");
const messageForm = document.querySelector("#msgForm");
const messageInput = document.querySelector("#message");
const connectingElement = document.querySelector(".connecting");
const chatArea = document.querySelector("#chat-messages");
const logoutArea = document.querySelector("#logout");

const accessibilityBtn = document.getElementById("accessibility-toggle");
const accessibilityMenu = document.getElementById("accessibility-menu");

const highContrastToggle = document.getElementById("high-contrast-toggle");
const fontSlider = document.getElementById("font-slider");
const spacingToggle = document.getElementById("spacing-toggle");

let stompClient = null;
let nickname = null;
let fullname = null;

let selectedUserID = null;

window.addEventListener("load", () => {
  const savedMode = localStorage.getItem("accessibility");
  if (savedMode === "on") {
    enableAccessibility();
  }
});

accessibilityBtn.addEventListener("click", () => {
  const expanded = accessibilityBtn.getAttribute("aria-expanded") === "true";
  accessibilityBtn.setAttribute("aria-expanded", String(!expanded));
  accessibilityMenu.setAttribute("aria-hidden", String(expanded));
});

// Initialize saved preferences
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.toggle(
    "high-contrast",
    localStorage.getItem("high-contrast") === "true"
  );
  highContrastToggle.checked = localStorage.getItem("high-contrast") === "true";

  const fontScale = localStorage.getItem("font-scale") || "100";
  document.documentElement.style.fontSize = `${fontScale}%`;
  fontSlider.value = fontScale;

  document.body.classList.toggle(
    "increased-spacing",
    localStorage.getItem("increased-spacing") === "true"
  );
  spacingToggle.checked = localStorage.getItem("increased-spacing") === "true";
});

// Event listeners for accessibility options
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

function enableAccessibility() {
  document.body.classList.add("accessibility-mode");
  updateAccessibilityButtonText(true);
}

function updateAccessibilityButtonText(enabled) {
  accessibilityBtn.textContent = enabled ? "Default" : "Accessiblity Options";
  accessibilityBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
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
  // Prevent default propagation
  event.preventDefault();
}

function onConnected() {
  stompClient.subscribe(`/user/${nickname}/queue/messages`, onMessageReceived);
  stompClient.subscribe(`/user/public`, onMessageReceived);

  // Register connected user obtained from usr controller msg mapping
  stompClient.send(
    "/app/user.addUser",
    {},
    JSON.stringify({ nickName: nickname, fullName: fullname, status: "ONLINE" })
  );
  // find & display connected user(s)
  findAndDisplayConnectedUsers().then();
}

async function findAndDisplayConnectedUsers() {
  const connectedUserResponse = await fetch("/users");
  let connectedUsers = await connectedUserResponse.json();
  connectedUsers = connectedUsers.filter((user) => user.nickName !== nickname);
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
  // holds user info
  usernameSpan.textContent = user.fullName;

  const receivedMsg = document.createElement("span");
  receivedMsg.textContent = "";
  receivedMsg.classList.add("usr-msg", "hidden");

  listItem.appendChild(userImage);
  listItem.appendChild(usernameSpan);
  listItem.appendChild(receivedMsg);

  listItem.addEventListener("click", userItemClick);

  connectedUserList.appendChild(listItem);
}

function userItemClick(event) {
  // set item as 'active' - change bg? fetch user msgs.

  document.querySelectorAll(".user-item").forEach((item) => {
    item.classList.remove("active");
  });

  messageForm.classList.remove("hidden");

  // selects all clicked elements
  const clickedUser = event.currentTarget;

  selectedUserID = clickedUser.getAttribute("id");
  fetchAndDisplayUserChat().then();

  // save msgs
  const usrMsg = clickedUser.querySelector(".usr-msg");
  usrMsg.classList.add("hidden");
}

async function fetchAndDisplayUserChat() {
  const userChatResponse = await fetch(
    `/messages/${nickname}/${selectedUserID}`
  );

  const userChat = await userChatResponse.json();

  chatArea.innerHTML = "";
  userChat.forEach((chat) => {
    displayMessage(chat.senderId, chat.content);
  });
  chatArea.scrollTop = chatArea.scrollHeight;
}

function displayMessage(senderId, content) {
  const msgContainer = document.createElement("div");
  msgContainer.classList.add("message");
  if (senderId === nickname) {
    msgContainer.classList.add("sender");
  } else {
    msgContainer.classList.add("receiver");
  }

  const message = document.createElement("p");
  message.textContent = content;
  msgContainer.appendChild(message);
  chatArea.appendChild(msgContainer);
}

function onError() {
  // connectingElement
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
  }
  chatArea.scrollTop = chatArea.scrollHeight;
  event.preventDefault();
}

async function onMessageReceived(payload) {
  await findAndDisplayConnectedUsers();
  const message = JSON.parse(payload.body);
  if (selectedUserID && selectedUserID === message.senderId) {
    displayMessage(message.senderId, message.content);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  if (selectedUserID) {
    document.querySelector(`#${selectedUserID}`).classList.add("active");
  } else {
    messageForm.classList.add("hidden");
  }

  const notifiedUser = document.querySelector(`#${message.senderId}`);

  if (notifiedUser && !notifiedUser.classList.contains("active")) {
    const usrMsg = notifiedUser.querySelector(".usr-msg");
    usrMsg.classList.remove("hidden");
    usrMsg.textContent = "";
  }
}

usernameForm.addEventListener("submit", connect, true);

messageForm.addEventListener("submit", sendMsg, true);
