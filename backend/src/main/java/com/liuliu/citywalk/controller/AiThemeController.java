package com.liuliu.citywalk.controller;

import com.liuliu.citywalk.common.ApiResponse;
import com.liuliu.citywalk.model.dto.request.CombineThemeRequest;
import com.liuliu.citywalk.model.dto.request.GeneratePresetThemeRequest;
import com.liuliu.citywalk.model.dto.request.GenerateThemeRequest;
import com.liuliu.citywalk.model.dto.response.LocationContextResponse;
import com.liuliu.citywalk.model.dto.response.ThemeResponse;
import com.liuliu.citywalk.service.GeminiThemeService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
public class AiThemeController {

    private final GeminiThemeService geminiThemeService;

    public AiThemeController(GeminiThemeService geminiThemeService) {
        this.geminiThemeService = geminiThemeService;
    }

    @PostMapping("/themes/generate")
    public ApiResponse<ThemeResponse> generate(@Valid @RequestBody GenerateThemeRequest request) {
        return ApiResponse.success(geminiThemeService.generateTheme(request));
    }

    @PostMapping("/themes/preset")
    public ApiResponse<ThemeResponse> generatePreset(@Valid @RequestBody GeneratePresetThemeRequest request) {
        return ApiResponse.success(geminiThemeService.generatePreset(request));
    }

    @PostMapping("/themes/combine")
    public ApiResponse<ThemeResponse> combine(@Valid @RequestBody CombineThemeRequest request) {
        return ApiResponse.success(geminiThemeService.combineTheme(request));
    }

    @GetMapping("/location/context")
    public ApiResponse<LocationContextResponse> context(@RequestParam Double lat, @RequestParam Double lng) {
        return ApiResponse.success(geminiThemeService.locationContext(lat, lng));
    }

    @GetMapping("/location/search-context")
    public ApiResponse<LocationContextResponse> searchContext(@RequestParam String query) {
        return ApiResponse.success(geminiThemeService.searchContext(query));
    }
}
