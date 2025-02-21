package com.masrah.websocket.chat;


import com.masrah.websocket.chatroom.ChatRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.MessagingException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatMessageService {

    private final ChatMessageRepository repository;
    private final ChatRoomService chatRoomService;


    // 3 Methods required, finding messages via senderID &&/|| receiverID, & message saving/finding/deletion

    public ChatMessage save(ChatMessage chatMessage) {
        var chatId = chatRoomService.getChatRoomId(
                chatMessage.getSenderId(),
                chatMessage.getReceiverId(),
                true
                // create own dedicated exception - 14/12/2024
                // Removed 'MessagingException' since it was not custom-defined exception.
        ).orElseThrow(() -> new IllegalArgumentException(
                "Chat room not found for sender: " + chatMessage.getSenderId() +
                        " and receiver: " + chatMessage.getReceiverId()
        ));
        // Set chatId before saving
        chatMessage.setChatId(chatId);
        repository.save(chatMessage);
        return chatMessage;
    }

    public List<ChatMessage> findChatMessages(
            String senderId, String receiverId
    ) {
        var chatId = chatRoomService.getChatRoomId(
                senderId,
                receiverId,
                false);
        // Use optional map to check if return status has value or not.
        return chatId.map(repository::findByChatId).orElse(new ArrayList<>());
    }
}
