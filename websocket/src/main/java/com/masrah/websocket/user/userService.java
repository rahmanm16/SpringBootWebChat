package com.masrah.websocket.user;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class userService {

    private final UserRepository repository;

    public void saveUser(User user) {
        user.setStatus(Status.ONLINE);
        repository.save(user);


    }

    public void disconnect(User user) {
        var storedUser = repository.findById(user.getUserName())
                .orElse(null);

        if (storedUser != null) {
            storedUser.setStatus(Status.ONLINE);
            repository.save(storedUser);
        }
    }

    public List<User> findConnectedUsers() {

        return repository.findAllByStatus(Status.ONLINE);
    }
}
