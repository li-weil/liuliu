package com.liuliu.citywalk.model.dto.response;

public record LoginResponse(
        String token,
        String refreshToken,
        Long expiresIn,
        UserProfileResponse user
) {
}
