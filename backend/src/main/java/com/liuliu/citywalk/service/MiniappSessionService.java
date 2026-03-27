package com.liuliu.citywalk.service;

import com.liuliu.citywalk.model.dto.response.MiniappSyncUserResponse;
import com.liuliu.citywalk.model.dto.response.MiniappUserResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class MiniappSessionService {

    private static final long DEFAULT_EXPIRES_IN = 7200L;

    private final AuthTokenService authTokenService;
    private final AtomicLong userIdSequence = new AtomicLong(2000L);
    private final Map<String, StoredMiniappUser> usersByOpenId = new ConcurrentHashMap<>();
    private final Map<String, StoredMiniappUser> sessions = new ConcurrentHashMap<>();
    private final StoredMiniappUser guestUser = new StoredMiniappUser(0L, "guest", "游客", "", "guest", 0L, 0L);

    public MiniappSessionService(AuthTokenService authTokenService) {
        this.authTokenService = authTokenService;
    }

    public MiniappSyncUserResponse syncUser(String code, String nickName, String avatarUrl) {
        long now = System.currentTimeMillis();
        String openId = buildOpenId(code, nickName);
        StoredMiniappUser existing = usersByOpenId.get(openId);
        StoredMiniappUser user = existing == null
                ? new StoredMiniappUser(
                userIdSequence.incrementAndGet(),
                openId,
                normalizeNickName(nickName),
                normalizeAvatar(avatarUrl),
                "user",
                now,
                now
        )
                : existing.withProfile(normalizeNickName(nickName), normalizeAvatar(avatarUrl), now);
        usersByOpenId.put(openId, user);

        String token = authTokenService.createAccessToken(user.id());
        String refreshToken = authTokenService.createRefreshToken(user.id());
        sessions.put(token, user);

        return new MiniappSyncUserResponse(token, refreshToken, DEFAULT_EXPIRES_IN, user.toResponse(), user.openid());
    }

    public MiniappUserResponse currentUser(String authorizationHeader) {
        return resolveUser(authorizationHeader).toResponse();
    }

    public StoredMiniappUser resolveUser(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            return guestUser;
        }
        String token = authorizationHeader.replace("Bearer ", "").trim();
        if (token.isBlank()) {
            return guestUser;
        }
        return sessions.getOrDefault(token, guestUser);
    }

    private String buildOpenId(String code, String nickName) {
        String seed = code;
        if (seed == null || seed.isBlank()) {
            seed = nickName;
        }
        if (seed == null || seed.isBlank()) {
            seed = "guest-" + System.currentTimeMillis();
        }
        return "wx_" + Integer.toUnsignedString(seed.hashCode());
    }

    private String normalizeNickName(String nickName) {
        return nickName == null || nickName.isBlank() ? "微信用户" : nickName.trim();
    }

    private String normalizeAvatar(String avatarUrl) {
        return avatarUrl == null ? "" : avatarUrl.trim();
    }

    public record StoredMiniappUser(
            Long id,
            String openid,
            String nickName,
            String avatarUrl,
            String role,
            Long createdAt,
            Long lastLoginAt
    ) {
        public StoredMiniappUser withProfile(String nextNickName, String nextAvatarUrl, Long nextLastLoginAt) {
            return new StoredMiniappUser(id, openid, nextNickName, nextAvatarUrl, role, createdAt, nextLastLoginAt);
        }

        public MiniappUserResponse toResponse() {
            return new MiniappUserResponse(id, openid, nickName, avatarUrl, role, createdAt, lastLoginAt);
        }
    }
}
