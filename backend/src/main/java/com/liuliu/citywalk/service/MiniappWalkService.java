package com.liuliu.citywalk.service;

import com.liuliu.citywalk.model.dto.request.MiniappCreateWalkRequest;
import com.liuliu.citywalk.model.dto.request.MiniappMissionReviewItem;
import com.liuliu.citywalk.model.dto.request.MiniappRoutePointRequest;
import com.liuliu.citywalk.model.dto.request.MiniappThemeSnapshotRequest;
import com.liuliu.citywalk.model.dto.response.MiniappMissionReviewResponse;
import com.liuliu.citywalk.model.dto.response.MiniappRoutePointResponse;
import com.liuliu.citywalk.model.dto.response.MiniappThemeSnapshotResponse;
import com.liuliu.citywalk.model.dto.response.MiniappWalkRecordResponse;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class MiniappWalkService {

    private final AtomicLong walkIdSequence = new AtomicLong(10000L);
    private final Map<String, MiniappWalkRecordResponse> records = new ConcurrentHashMap<>();

    public MiniappWalkRecordResponse create(Long userId, MiniappCreateWalkRequest request) {
        long now = System.currentTimeMillis();
        String id = "walk_" + walkIdSequence.incrementAndGet();
        List<String> photoList = safeStringList(request.photoList());
        MiniappWalkRecordResponse response = new MiniappWalkRecordResponse(
                id,
                userId,
                request.themeSnapshot() != null ? safeText(request.themeSnapshot().title(), "城市漫步") : "城市漫步",
                mapThemeSnapshot(request.themeSnapshot()),
                safeText(request.locationName(), "当前位置"),
                safeText(request.locationContext(), "城市街道"),
                mapRoutePoints(request.routePoints()),
                safeStringList(request.missionsCompleted()),
                mapMissionReviews(request.missionReviews()),
                photoList,
                photoList.isEmpty() ? "" : photoList.get(0),
                safeText(request.noteText(), ""),
                Boolean.TRUE.equals(request.isPublic()),
                safeText(request.walkMode(), "pure"),
                safeText(request.generationSource(), "backend"),
                now
        );
        records.put(id, response);
        return response;
    }

    public List<MiniappWalkRecordResponse> listMyWalks(Long userId, int limit) {
        return records.values().stream()
                .filter(item -> item.userId().equals(userId))
                .sorted(Comparator.comparing(MiniappWalkRecordResponse::createdAt).reversed())
                .limit(limit)
                .toList();
    }

    public List<MiniappWalkRecordResponse> listPublicWalks(int limit) {
        return records.values().stream()
                .filter(item -> Boolean.TRUE.equals(item.isPublic()))
                .sorted(Comparator.comparing(MiniappWalkRecordResponse::createdAt).reversed())
                .limit(limit)
                .toList();
    }

    public MiniappWalkRecordResponse getDetail(String id, Long currentUserId) {
        MiniappWalkRecordResponse record = records.get(id);
        if (record == null) {
            return null;
        }
        if (Boolean.TRUE.equals(record.isPublic()) || record.userId().equals(currentUserId)) {
            return record;
        }
        return null;
    }

    private MiniappThemeSnapshotResponse mapThemeSnapshot(MiniappThemeSnapshotRequest snapshot) {
        if (snapshot == null) {
            return new MiniappThemeSnapshotResponse("城市漫步", "", "探索", List.of(), "#5a5a40", "backend");
        }
        return new MiniappThemeSnapshotResponse(
                safeText(snapshot.title(), "城市漫步"),
                safeText(snapshot.description(), ""),
                safeText(snapshot.category(), "探索"),
                safeStringList(snapshot.missions()),
                safeText(snapshot.vibeColor(), "#5a5a40"),
                safeText(snapshot.provider(), "backend")
        );
    }

    private List<MiniappRoutePointResponse> mapRoutePoints(List<MiniappRoutePointRequest> routePoints) {
        if (routePoints == null || routePoints.isEmpty()) {
            return List.of();
        }
        return routePoints.stream()
                .map(item -> new MiniappRoutePointResponse(item.latitude(), item.longitude(), item.timestamp()))
                .toList();
    }

    private Map<String, MiniappMissionReviewResponse> mapMissionReviews(Map<String, MiniappMissionReviewItem> missionReviews) {
        if (missionReviews == null || missionReviews.isEmpty()) {
            return Map.of();
        }
        Map<String, MiniappMissionReviewResponse> result = new LinkedHashMap<>();
        missionReviews.forEach((key, value) -> result.put(
                key,
                new MiniappMissionReviewResponse(
                        value != null ? value.passed() : null,
                        value != null ? value.comment() : "",
                        value != null ? value.confidence() : "medium",
                        value != null ? value.reviewedAt() : null
                )
        ));
        return result;
    }

    private List<String> safeStringList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        return values.stream()
                .filter(item -> item != null && !item.isBlank())
                .map(String::trim)
                .toList();
    }

    private String safeText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
