package com.liuliu.citywalk.model.dto.request;

public record MiniappRoutePointRequest(
        Double latitude,
        Double longitude,
        Long timestamp
) {
}
