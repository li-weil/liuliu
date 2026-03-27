package com.liuliu.citywalk.service;

import com.liuliu.citywalk.model.dto.response.MiniappSyncUserResponse;
import com.liuliu.citywalk.model.dto.response.MiniappUserResponse;
import com.liuliu.citywalk.repository.MiniappSessionRepository;
import com.liuliu.citywalk.repository.MiniappUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MiniappSessionService {

    private static final long DEFAULT_EXPIRES_IN = 7200L;

    private final AuthTokenService authTokenService;
    private final MiniappUserRepository miniappUserRepository;
    private final MiniappSessionRepository miniappSessionRepository;
    private final StoredMiniappUser guestUser = new StoredMiniappUser(0L, "guest", "游客", "", "guest", 0L, 0L);

    public MiniappSessionService(
            AuthTokenService authTokenService,
            MiniappUserRepository miniappUserRepository,
            MiniappSessionRepository miniappSessionRepository
    ) {
        this.authTokenService = authTokenService;
        this.miniappUserRepository = miniappUserRepository;
        this.miniappSessionRepository = miniappSessionRepository;
    }

    @Transactional
    public MiniappSyncUserResponse syncUser(String code, String nickName, String avatarUrl) {
        String openId = buildOpenId(code, nickName);
        MiniappUserRepository.MiniappUserRecord user = miniappUserRepository.findByOpenid(openId)
                .map(item -> miniappUserRepository.updateProfileAndLogin(item.id(), normalizeNickName(nickName), normalizeAvatar(avatarUrl)))
                .orElseGet(() -> miniappUserRepository.create(openId, normalizeNickName(nickName), normalizeAvatar(avatarUrl)));

        String token = authTokenService.createAccessToken(user.id());
        String refreshToken = authTokenService.createRefreshToken(user.id());
        miniappSessionRepository.createSession(user.id(), token, refreshToken, DEFAULT_EXPIRES_IN, "miniapp");

        return new MiniappSyncUserResponse(token, refreshToken, DEFAULT_EXPIRES_IN, toResponse(user), user.openid());
    }

    public MiniappUserResponse currentUser(String authorizationHeader) {
        return toResponse(resolveUser(authorizationHeader));
    }

    public StoredMiniappUser resolveUser(String authorizationHeader) {
        String token = extractToken(authorizationHeader);
        if (token == null) {
            return guestUser;
        }

        return miniappSessionRepository.findValidByAccessToken(token)
                .flatMap(session -> miniappUserRepository.findById(session.userId()))
                .map(this::toStoredUser)
                .orElse(guestUser);
    }

    private String extractToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            return null;
        }
        String token = authorizationHeader.replace("Bearer ", "").trim();
        return token.isBlank() ? null : token;
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

    private StoredMiniappUser toStoredUser(MiniappUserRepository.MiniappUserRecord user) {
        return new StoredMiniappUser(
                user.id(),
                user.openid(),
                user.nickname(),
                user.avatarUrl(),
                user.role(),
                user.createdAt(),
                user.lastLoginAt()
        );
    }

    private MiniappUserResponse toResponse(StoredMiniappUser user) {
        return user == null ? null : new MiniappUserResponse(
                user.id(),
                user.openid(),
                user.nickName(),
                user.avatarUrl(),
                user.role(),
                user.createdAt(),
                user.lastLoginAt()
        );
    }

    private MiniappUserResponse toResponse(MiniappUserRepository.MiniappUserRecord user) {
        return user == null ? null : new MiniappUserResponse(
                user.id(),
                user.openid(),
                user.nickname(),
                user.avatarUrl(),
                user.role(),
                user.createdAt(),
                user.lastLoginAt()
        );
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
        public boolean isGuest() {
            return id == null || id <= 0;
        }
    }
}
