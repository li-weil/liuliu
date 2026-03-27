package com.liuliu.citywalk.model.dto.request;

public record MiniappSyncUserRequest(
        String code,
        String nickName,
        String avatarUrl
) {
}
