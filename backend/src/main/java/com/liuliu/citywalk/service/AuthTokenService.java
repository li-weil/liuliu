package com.liuliu.citywalk.service;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
public class AuthTokenService {

    public String createAccessToken(Long userId) {
        String raw = "citywalk:" + userId + ":" + System.currentTimeMillis();
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    public String createRefreshToken(Long userId) {
        String raw = "refresh:" + userId + ":" + System.nanoTime();
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }
}
