package com.liuliu.citywalk.model.dto.request;

public record MiniappGenerateRandomThemeRequest(
        String category,
        String locationName,
        String locationContext,
        String walkMode
) {
}
