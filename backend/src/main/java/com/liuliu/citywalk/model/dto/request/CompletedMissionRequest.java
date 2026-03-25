package com.liuliu.citywalk.model.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CompletedMissionRequest(
        @NotBlank(message = "任务内容不能为空")
        String mission,
        String mediaUrl,
        String mediaType
) {
}
