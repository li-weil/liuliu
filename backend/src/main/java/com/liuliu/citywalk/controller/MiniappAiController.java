package com.liuliu.citywalk.controller;

import com.liuliu.citywalk.common.ApiResponse;
import com.liuliu.citywalk.model.dto.request.CombineThemeRequest;
import com.liuliu.citywalk.model.dto.request.GenerateThemeRequest;
import com.liuliu.citywalk.model.dto.request.MiniappGenerateRandomThemeRequest;
import com.liuliu.citywalk.model.dto.request.MiniappLocationContextRequest;
import com.liuliu.citywalk.model.dto.request.MiniappMissionVerifyRequest;
import com.liuliu.citywalk.model.dto.response.MiniappLocationContextResponse;
import com.liuliu.citywalk.model.dto.response.MiniappMissionVerifyResponse;
import com.liuliu.citywalk.model.dto.response.MiniappThemeResultResponse;
import com.liuliu.citywalk.service.MiniappAiService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/miniapp")
public class MiniappAiController {

    private final MiniappAiService miniappAiService;

    public MiniappAiController(MiniappAiService miniappAiService) {
        this.miniappAiService = miniappAiService;
    }

    @PostMapping("/themes/generate")
    public ApiResponse<MiniappThemeResultResponse> generateTheme(@RequestBody GenerateThemeRequest request) {
        return ApiResponse.success(miniappAiService.generateTheme(request));
    }

    @PostMapping("/themes/random")
    public ApiResponse<MiniappThemeResultResponse> randomTheme(@RequestBody MiniappGenerateRandomThemeRequest request) {
        return ApiResponse.success(miniappAiService.generateRandomTheme(request));
    }

    @PostMapping("/themes/combined")
    public ApiResponse<MiniappThemeResultResponse> combinedTheme(@RequestBody CombineThemeRequest request) {
        return ApiResponse.success(miniappAiService.generateCombinedTheme(request));
    }

    @GetMapping("/location/context")
    public ApiResponse<MiniappLocationContextResponse> locationContext(
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(required = false) String placeName
    ) {
        return ApiResponse.success(miniappAiService.getLocationContext(new MiniappLocationContextRequest(latitude, longitude, placeName)));
    }

    @PostMapping("/missions/verify")
    public ApiResponse<MiniappMissionVerifyResponse> verifyMission(@RequestBody MiniappMissionVerifyRequest request) {
        return ApiResponse.success(miniappAiService.verifyMission(request));
    }
}
