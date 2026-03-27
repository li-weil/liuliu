package com.liuliu.citywalk.model.dto.response;

public record MiniappUserResponse(
        Long id,
        String openid,
        String nickName,
        String avatarUrl,
        String role,
        Long createdAt,
        Long lastLoginAt
) {
}
