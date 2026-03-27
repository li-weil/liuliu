package com.liuliu.citywalk.model.dto.response;

public record MiniappSyncUserResponse(
        String token,
        String refreshToken,
        Long expiresIn,
        MiniappUserResponse user,
        String openid
) {
}
