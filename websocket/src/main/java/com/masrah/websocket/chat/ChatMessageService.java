package com.masrah.websocket.chat;


import com.masrah.websocket.chatroom.ChatRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.MessagingException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatMessageService {

    private final ChatMessageRepository repository;
    private final ChatRoomService chatRoomService;


    // 3 Methods required, finding messages via senderID &&/|| receiverID, & message saving

    public ChatMessage save(ChatMessage chatMessage) {
        var chatId = chatRoomService.getChatRoomId(
                chatMessage.getSenderId(),
                chatMessage.getReceiverId(),
                true
        ).orElseThrow(() -> new MessagingException("Message id: " + chatMessage.getSenderId() + " and " + chatMessage.getReceiverId() + " not found"));
        return chatMessage;
    }
}
