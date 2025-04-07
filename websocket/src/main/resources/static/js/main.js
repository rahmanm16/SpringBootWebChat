// 'use strict' directive that enables strict mode in js - aids in generating more helpful error messages
'use strict';

const usernamePage = document.querySelector('#username-page');
const chatPage = document.querySelector('#chat-page');
const usernameForm = document.querySelector('#username-Form');
const messageForm = document.querySelector('#msgForm');
const messageInput = document.querySelector('#msg-input');
const connectingElement = document.querySelector('.connecting');
const chatArea = document.querySelector('#chat-messages');
const logoutArea = document.querySelector('#logout');

let stompClient = null;
let nickname = null;
let fullname = null;

let selectedUser = null;

function connect(event) {


    nickname = document.querySelector('#nickname').value.trim();
    fullname = document.querySelector('#fullname').value.trim();

    if(nickname && fullname) {
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');

        const socket = new SockJS('/ws');
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
        '/app/user.addUser',
        {},
        JSON.stringify({nickName: nickname, fullName: fullname, status: 'ONLINE'})
        );
        // find & display connected user(s)
        findAndDisplayConnectedUsers().then();
}


async function findAndDisplayConnectedUsers() {
    const connectedUserResponse = await fetch('/users');
    let connectedUsers = await connectedUserResponse.json();
    connectedUsers = connectedUsers.filter(user => user.nickname !== nickname);
    const connectedUserList = document.getElementById('connectedUsers');
    connectedUserList.innerHTML = '';

    connectedUsers.forEach(user => {
        appendUserElement(user, connectedUserList);
           if (connectedUsers.index(user) < connectedUsers.length -1) {
            const separator = document.createElement('li');
            separator.classList.add('separator');
            connectedUserList.appendChild(separator)
           }

    });
}

function appendUserElement(user, connectedUserList) {
    const listItem = document.createElement('li');
    listItem.classList.add('user-item');
    listItem.id = user.nickname;

    const userImage = document.createElement('img');
    userImage.src = '../img/user_icon.png';
    userImage.alt = user.fullName;

    const usernameSpan = document.createElement('span');
    // holds user info
    usernameSpan.textContent = user.fullName;

    const receivedMsg = document.createElement('span');
    receivedMsg.textContent = '';
    receivedMsg.classList.add ('usr-msg', 'hidden');

    listItem.appendChild(userImage);
    listItem.appendChild(usernameSpan);
    listItem.appendChild(receivedMsg);

    connectedUserList.appendChild(listItem);

}

function onError() {
    // connectingElement
}

function onMessageReceived() {

}


usernameForm.addEventListener('submit', connect, true);




