package com.liuliu.citywalk.controller;

import com.liuliu.citywalk.common.ApiResponse;
import com.liuliu.citywalk.model.dto.request.CreateWalkRequest;
import com.liuliu.citywalk.model.dto.response.WalkResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/walks")
public class WalkController {

    @PostMapping
    public ApiResponse<WalkResponse> create(@Valid @RequestBody CreateWalkRequest request) {
        WalkResponse response = new WalkResponse(
                1000L,
                request.themeTitle(),
                request.themeCategory(),
                request.locationName(),
                request.recordUnit(),
                Boolean.TRUE.equals(request.isPublic()),
                request.noteText(),
                request.photoUrl(),
                request.videoUrl(),
                request.audioUrl(),
                request.path(),
                request.completedMissions()
        );
        return ApiResponse.success(response);
    }

    @GetMapping("/me")
    public ApiResponse<List<WalkResponse>> myWalks(@RequestParam(defaultValue = "1") Integer page,
                                                   @RequestParam(defaultValue = "20") Integer pageSize) {
        List<WalkResponse> response = List.of(
                new WalkResponse(1000L, "梧桐影子漫步", "城市", "上海武康路", "image", true,
                        "今天的光线很好", "https://cdn.example.com/walks/cover.jpg", null, null, List.of(), List.of())
        );
        return ApiResponse.success(response);
    }

    @GetMapping("/public")
    public ApiResponse<List<WalkResponse>> publicWalks(@RequestParam(defaultValue = "1") Integer page,
                                                       @RequestParam(defaultValue = "20") Integer pageSize) {
        List<WalkResponse> response = List.of(
                new WalkResponse(1001L, "夜色霓虹", "视觉", "上海安福路", "image", true,
                        "街区夜晚很有层次", "https://cdn.example.com/walks/public.jpg", null, null, List.of(), List.of())
        );
        return ApiResponse.success(response);
    }

    @GetMapping("/{walkId}")
    public ApiResponse<WalkResponse> detail(@PathVariable Long walkId) {
        WalkResponse response = new WalkResponse(
                walkId,
                "夜色霓虹",
                "视觉",
                "上海安福路",
                "image",
                true,
                "街区夜晚很有层次",
                "https://cdn.example.com/walks/public.jpg",
                null,
                null,
                List.of(),
                List.of()
        );
        return ApiResponse.success(response);
    }
}
