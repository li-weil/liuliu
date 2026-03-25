package com.liuliu.citywalk.model.dto.request;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "登录类型不能为空")
        String loginType,
        @NotBlank(message = "登录凭证不能为空")
        String code
) {
}
