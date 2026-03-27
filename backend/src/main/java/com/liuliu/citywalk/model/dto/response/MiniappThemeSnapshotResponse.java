package com.liuliu.citywalk.model.dto.response;

import java.util.List;

public record MiniappThemeSnapshotResponse(
        String title,
        String description,
        String category,
        List<String> missions,
        String vibeColor,
        String provider
) {
}
