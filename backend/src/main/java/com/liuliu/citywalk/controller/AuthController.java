package com.liuliu.citywalk.controller;

import com.liuliu.citywalk.common.ApiResponse;
import com.liuliu.citywalk.model.dto.request.LoginRequest;
import com.liuliu.citywalk.model.dto.response.LoginResponse;
import com.liuliu.citywalk.model.dto.response.UserProfileResponse;
import com.liuliu.citywalk.model.dto.response.WechatLoginUrlResponse;
import com.liuliu.citywalk.service.WechatAuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final WechatAuthService wechatAuthService;

    public AuthController(WechatAuthService wechatAuthService) {
        this.wechatAuthService = wechatAuthService;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        UserProfileResponse user = new UserProfileResponse(1001L, "六六", "https://cdn.example.com/avatar.jpg");
        LoginResponse response = new LoginResponse("mock-jwt-token", "mock-refresh-token", 7200L, user);
        return ApiResponse.success(response);
    }

    @PostMapping("/mock-login")
    public ApiResponse<LoginResponse> mockLogin() {
        UserProfileResponse user = new UserProfileResponse(1001L, "本地测试用户", "https://cdn.example.com/avatar.jpg");
        LoginResponse response = new LoginResponse("mock-jwt-token", "mock-refresh-token", 7200L, user);
        return ApiResponse.success(response);
    }

    @GetMapping("/wechat/url")
    public ApiResponse<WechatLoginUrlResponse> wechatLoginUrl(@RequestParam(required = false) String redirectUri) {
        return ApiResponse.success(wechatAuthService.buildLoginUrl(redirectUri));
    }

    @GetMapping("/wechat/callback")
    public ResponseEntity<Void> wechatCallback(@RequestParam String code, @RequestParam String state) {
        String redirectUrl = wechatAuthService.handleCallback(code, state);
        return ResponseEntity.status(302)
                .header(HttpHeaders.LOCATION, redirectUrl)
                .build();
    }

    @GetMapping("/me")
    public ApiResponse<UserProfileResponse> currentUser(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader
    ) {
        return ApiResponse.success(wechatAuthService.loadCurrentUser(authorizationHeader));
    }

    @PostMapping("/logout")
    public ApiResponse<Boolean> logout() {
        return ApiResponse.success(Boolean.TRUE);
    }
}
