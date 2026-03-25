package com.liuliu.citywalk.model.dto.response;

public record WechatCallbackResponse(
        String token,
        String refreshToken,
        UserProfileResponse user
) {
}
