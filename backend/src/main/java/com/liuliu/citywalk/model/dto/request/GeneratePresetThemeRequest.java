package com.liuliu.citywalk.model.dto.request;

import jakarta.validation.constraints.NotBlank;

public record GeneratePresetThemeRequest(
        @NotBlank(message = "主题分类不能为空")
        String category,
        @NotBlank(message = "地点名称不能为空")
        String locationName,
        @NotBlank(message = "地点环境描述不能为空")
        String locationContext,
        @NotBlank(message = "漫步模式不能为空")
        String walkMode
) {
}
