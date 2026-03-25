package com.liuliu.citywalk.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CombineThemeRequest(
        @NotEmpty(message = "组合主题不能为空")
        List<String> categories,
        @NotBlank(message = "地点名称不能为空")
        String locationName,
        @NotBlank(message = "地点环境描述不能为空")
        String locationContext,
        @NotBlank(message = "漫步模式不能为空")
        String walkMode
) {
}
