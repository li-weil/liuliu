package com.liuliu.citywalk.controller;

import com.liuliu.citywalk.common.ApiResponse;
import com.liuliu.citywalk.model.dto.response.LocationSearchResponse;
import com.liuliu.citywalk.model.dto.response.PoiResponse;
import com.liuliu.citywalk.service.MapSearchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/map")
public class MapController {

    private final MapSearchService mapSearchService;

    public MapController(MapSearchService mapSearchService) {
        this.mapSearchService = mapSearchService;
    }

    @GetMapping("/search")
    public ApiResponse<List<LocationSearchResponse>> search(@RequestParam String query) {
        return ApiResponse.success(mapSearchService.search(query));
    }

    @GetMapping("/pois/nearby")
    public ApiResponse<List<PoiResponse>> nearbyPois(@RequestParam Double lat, @RequestParam Double lng) {
        return ApiResponse.success(mapSearchService.nearbyPois(lat, lng));
    }
}
