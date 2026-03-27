package com.liuliu.citywalk.model.dto.request;

public record MiniappMissionReviewItem(
        Boolean passed,
        String comment,
        String confidence,
        Long reviewedAt
) {
}
