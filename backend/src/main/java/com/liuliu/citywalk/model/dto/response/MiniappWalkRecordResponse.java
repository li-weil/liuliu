package com.liuliu.citywalk.model.dto.response;

import java.util.List;
import java.util.Map;

public record MiniappWalkRecordResponse(
        String _id,
        Long userId,
        String themeTitle,
        MiniappThemeSnapshotResponse themeSnapshot,
        String locationName,
        String locationContext,
        List<MiniappRoutePointResponse> routePoints,
        List<String> missionsCompleted,
        Map<String, MiniappMissionReviewResponse> missionReviews,
        List<String> photoList,
        String coverImage,
        String noteText,
        Boolean isPublic,
        String walkMode,
        String generationSource,
        Long createdAt
) {
}
