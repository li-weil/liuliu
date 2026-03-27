package com.liuliu.citywalk.model.dto.request;

import java.util.List;
import java.util.Map;

public record MiniappCreateWalkRequest(
        MiniappThemeSnapshotRequest themeSnapshot,
        String locationName,
        String locationContext,
        List<MiniappRoutePointRequest> routePoints,
        List<String> missionsCompleted,
        Map<String, MiniappMissionReviewItem> missionReviews,
        List<String> photoList,
        String noteText,
        Boolean isPublic,
        String walkMode,
        String generationSource
) {
}
