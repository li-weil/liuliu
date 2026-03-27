package com.liuliu.citywalk.controller;

import com.liuliu.citywalk.common.ApiResponse;
import com.liuliu.citywalk.model.dto.request.MiniappSyncUserRequest;
import com.liuliu.citywalk.model.dto.response.MiniappSyncUserResponse;
import com.liuliu.citywalk.model.dto.response.MiniappUserResponse;
import com.liuliu.citywalk.service.MiniappSessionService;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/miniapp/auth")
public class MiniappAuthController {

    private final MiniappSessionService miniappSessionService;

    public MiniappAuthController(MiniappSessionService miniappSessionService) {
        this.miniappSessionService = miniappSessionService;
    }

    @PostMapping("/sync-user")
    public ApiResponse<MiniappSyncUserResponse> syncUser(@RequestBody MiniappSyncUserRequest request) {
        return ApiResponse.success(miniappSessionService.syncUser(request.code(), request.nickName(), request.avatarUrl()));
    }

    @GetMapping("/me")
    public ApiResponse<MiniappUserResponse> currentUser(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader
    ) {
        return ApiResponse.success(miniappSessionService.currentUser(authorizationHeader));
    }
}
