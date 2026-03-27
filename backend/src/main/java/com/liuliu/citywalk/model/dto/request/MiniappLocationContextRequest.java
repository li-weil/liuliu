package com.liuliu.citywalk.model.dto.request;

public record MiniappLocationContextRequest(
        Double latitude,
        Double longitude,
        String placeName
) {
}
