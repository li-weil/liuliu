package com.liuliu.citywalk.model.dto.response;

public record MiniappMissionVerifyResponse(
        boolean passed,
        String comment,
        String confidence,
        Long reviewedAt,
        String reason
) {
}
