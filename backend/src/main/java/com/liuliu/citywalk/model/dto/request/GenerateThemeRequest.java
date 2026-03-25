package com.liuliu.citywalk.model.dto.request;

import jakarta.validation.constraints.NotBlank;

public record GenerateThemeRequest(
        @NotBlank(message = "心情不能为空")
        String mood,
        @NotBlank(message = "天气不能为空")
        String weather,
        @NotBlank(message = "季节不能为空")
        String season,
        @NotBlank(message = "偏好不能为空")
        String preference,
        @NotBlank(message = "地点名称不能为空")
        String locationName,
        @NotBlank(message = "地点环境描述不能为空")
        String locationContext,
        @NotBlank(message = "漫步模式不能为空")
        String walkMode
) {
}
