package com.liuliu.citywalk.model.dto.request;

import jakarta.validation.constraints.NotNull;

public record PathPointRequest(
        @NotNull(message = "纬度不能为空")
        Double lat,
        @NotNull(message = "经度不能为空")
        Double lng,
        @NotNull(message = "时间戳不能为空")
        Long timestamp
) {
}
