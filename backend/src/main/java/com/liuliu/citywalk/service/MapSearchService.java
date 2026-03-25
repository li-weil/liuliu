package com.liuliu.citywalk.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.liuliu.citywalk.model.dto.response.LocationSearchResponse;
import com.liuliu.citywalk.model.dto.response.PoiResponse;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class MapSearchService {

    private static final String USER_AGENT = "citywalk-backend/0.1 (local-dev)";
    private static final double SEARCH_RADIUS_METERS = 800D;
    private static final int MAX_POI_RESULTS = 12;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public MapSearchService(ObjectMapper objectMapper) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = objectMapper;
    }

    public List<LocationSearchResponse> search(String query) {
        String keyword = query == null ? "" : query.trim();
        if (keyword.isBlank()) {
            return List.of();
        }

        String encodedQuery = URLEncoder.encode(keyword, StandardCharsets.UTF_8);
        String url = "https://nominatim.openstreetmap.org/search?format=json&q=" + encodedQuery
                + "&limit=5&accept-language=zh-CN";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", USER_AGENT)
                .header("Accept", "application/json")
                .GET()
                .timeout(Duration.ofSeconds(15))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            List<NominatimItem> items = objectMapper.readValue(response.body(), new TypeReference<>() {});
            return items.stream()
                    .map(item -> new LocationSearchResponse(
                            item.display_name(),
                            parseDouble(item.lat()),
                            parseDouble(item.lon())
                    ))
                    .toList();
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return fallbackLocations(keyword);
        }
    }

    public List<PoiResponse> nearbyPois(Double lat, Double lng) {
        if (lat == null || lng == null) {
            return List.of();
        }

        String overpassQuery = """
                [out:json][timeout:20];
                (
                  node(around:%d,%s,%s)[tourism];
                  node(around:%d,%s,%s)[amenity~"cafe|restaurant|library|arts_centre|museum|gallery|theatre|bar|pub"];
                  node(around:%d,%s,%s)[shop~"books|coffee|gift|art"];
                  way(around:%d,%s,%s)[tourism];
                  way(around:%d,%s,%s)[amenity~"cafe|restaurant|library|arts_centre|museum|gallery|theatre|bar|pub"];
                  way(around:%d,%s,%s)[shop~"books|coffee|gift|art"];
                );
                out center %d;
                """.formatted(
                (int) SEARCH_RADIUS_METERS, formatCoordinate(lat), formatCoordinate(lng),
                (int) SEARCH_RADIUS_METERS, formatCoordinate(lat), formatCoordinate(lng),
                (int) SEARCH_RADIUS_METERS, formatCoordinate(lat), formatCoordinate(lng),
                (int) SEARCH_RADIUS_METERS, formatCoordinate(lat), formatCoordinate(lng),
                (int) SEARCH_RADIUS_METERS, formatCoordinate(lat), formatCoordinate(lng),
                (int) SEARCH_RADIUS_METERS, formatCoordinate(lat), formatCoordinate(lng),
                MAX_POI_RESULTS
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://overpass-api.de/api/interpreter"))
                .header("User-Agent", USER_AGENT)
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(overpassQuery))
                .timeout(Duration.ofSeconds(20))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            OverpassResponse overpassResponse = objectMapper.readValue(response.body(), OverpassResponse.class);
            if (overpassResponse == null || overpassResponse.elements() == null) {
                return fallbackPois(lat, lng);
            }

            List<PoiResponse> pois = new ArrayList<>();
            for (OverpassElement element : overpassResponse.elements()) {
                String title = resolvePoiTitle(element);
                Double poiLat = element.lat() != null ? element.lat() : element.center() != null ? element.center().lat() : null;
                Double poiLng = element.lon() != null ? element.lon() : element.center() != null ? element.center().lon() : null;
                if (title == null || poiLat == null || poiLng == null) {
                    continue;
                }

                pois.add(new PoiResponse(
                        title,
                        buildOsmLink(poiLat, poiLng),
                        poiLat,
                        poiLng
                ));

                if (pois.size() >= MAX_POI_RESULTS) {
                    break;
                }
            }

            return pois.isEmpty() ? fallbackPois(lat, lng) : pois;
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return fallbackPois(lat, lng);
        }
    }

    private Double parseDouble(String value) {
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            return 0D;
        }
    }

    private String formatCoordinate(Double value) {
        return String.format(Locale.US, "%.6f", value);
    }

    private List<LocationSearchResponse> fallbackLocations(String keyword) {
        return List.of(
                new LocationSearchResponse(keyword + " 附近", 31.2304, 121.4737),
                new LocationSearchResponse(keyword + " 街区", 31.2282, 121.4781),
                new LocationSearchResponse(keyword + " 漫步点", 31.2249, 121.4695)
        );
    }

    private List<PoiResponse> fallbackPois(Double lat, Double lng) {
        return List.of(
                new PoiResponse("附近咖啡馆", buildOsmLink(lat, lng), lat, lng),
                new PoiResponse("城市书店", buildOsmLink(lat + 0.0012, lng + 0.0011), lat + 0.0012, lng + 0.0011),
                new PoiResponse("街角展览空间", buildOsmLink(lat - 0.0009, lng + 0.0008), lat - 0.0009, lng + 0.0008)
        );
    }

    private String buildOsmLink(Double lat, Double lng) {
        return "https://www.openstreetmap.org/?mlat=" + lat + "&mlon=" + lng + "#map=18/" + lat + "/" + lng;
    }

    private String resolvePoiTitle(OverpassElement element) {
        if (element.tags() == null) {
            return null;
        }
        if (element.tags().name() != null && !element.tags().name().isBlank()) {
            return element.tags().name();
        }
        if (element.tags().tourism() != null) {
            return "附近" + element.tags().tourism();
        }
        if (element.tags().amenity() != null) {
            return "附近" + element.tags().amenity();
        }
        if (element.tags().shop() != null) {
            return "附近" + element.tags().shop();
        }
        return null;
    }

    private record NominatimItem(
            String display_name,
            String lat,
            String lon
    ) {
    }

    private record OverpassResponse(
            List<OverpassElement> elements
    ) {
    }

    private record OverpassElement(
            String type,
            Long id,
            Double lat,
            Double lon,
            OverpassCenter center,
            OverpassTags tags
    ) {
    }

    private record OverpassCenter(
            Double lat,
            Double lon
    ) {
    }

    private record OverpassTags(
            String name,
            String tourism,
            String amenity,
            String shop
    ) {
    }
}
