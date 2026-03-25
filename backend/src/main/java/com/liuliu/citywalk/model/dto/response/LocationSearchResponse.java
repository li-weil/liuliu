package com.liuliu.citywalk.model.dto.response;

public record LocationSearchResponse(
        String name,
        Double lat,
        Double lng
) {
}
