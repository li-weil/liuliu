package com.liuliu.citywalk.model.dto.response;

public record PoiResponse(
        String title,
        String uri,
        Double lat,
        Double lng
) {
}
