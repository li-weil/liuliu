package com.liuliu.citywalk.model.dto.response;

public record MiniappMissionReviewResponse(
        Boolean passed,
        String comment,
        String confidence,
        Long reviewedAt
) {
}
