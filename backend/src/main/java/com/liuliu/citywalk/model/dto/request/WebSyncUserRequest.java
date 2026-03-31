package com.liuliu.citywalk.model.dto.request;

public record WebSyncUserRequest(
        String code,
        String nickName,
        String avatarUrl,
        Profile profile
) {

    public String resolvedCode() {
        return normalize(code);
    }

    public String resolvedNickName() {
        String directValue = normalize(nickName);
        if (directValue != null) {
            return directValue;
        }
        return profile == null ? null : normalize(profile.nickName());
    }

    public String resolvedAvatarUrl() {
        String directValue = normalize(avatarUrl);
        if (directValue != null) {
            return directValue;
        }
        return profile == null ? null : normalize(profile.avatarUrl());
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    public record Profile(
            String nickName,
            String avatarUrl
    ) {
    }
}
