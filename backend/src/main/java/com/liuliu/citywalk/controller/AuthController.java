package com.liuliu.citywalk.controller;

import com.liuliu.citywalk.common.ApiResponse;
import com.liuliu.citywalk.model.dto.request.LoginRequest;
import com.liuliu.citywalk.model.dto.request.WebSyncUserRequest;
import com.liuliu.citywalk.model.dto.response.LoginResponse;
import com.liuliu.citywalk.model.dto.response.MiniappSyncUserResponse;
import com.liuliu.citywalk.model.dto.response.UserProfileResponse;
import com.liuliu.citywalk.model.dto.response.WechatLoginUrlResponse;
import com.liuliu.citywalk.service.AuthTokenService;
import com.liuliu.citywalk.service.MiniappSessionService;
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
    private final AuthTokenService authTokenService;
    private final MiniappSessionService miniappSessionService;

    public AuthController(
            WechatAuthService wechatAuthService,
            AuthTokenService authTokenService,
            MiniappSessionService miniappSessionService
    ) {
        this.wechatAuthService = wechatAuthService;
        this.authTokenService = authTokenService;
        this.miniappSessionService = miniappSessionService;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        Long userId = 1001L;
        UserProfileResponse user = new UserProfileResponse(userId, "六六", "https://cdn.example.com/avatar.jpg");
        LoginResponse response = new LoginResponse(
                authTokenService.createAccessToken(userId),
                authTokenService.createRefreshToken(userId),
                authTokenService.getAccessExpireSeconds(),
                user
        );
        return ApiResponse.success(response);
    }

    @PostMapping("/mock-login")
    public ApiResponse<LoginResponse> mockLogin() {
        Long userId = 1001L;
        UserProfileResponse user = new UserProfileResponse(userId, "本地测试用户", "https://cdn.example.com/avatar.jpg");
        LoginResponse response = new LoginResponse(
                authTokenService.createAccessToken(userId),
                authTokenService.createRefreshToken(userId),
                authTokenService.getAccessExpireSeconds(),
                user
        );
        return ApiResponse.success(response);
    }

    @PostMapping("/sync-user")
    public ApiResponse<MiniappSyncUserResponse> syncUser(@RequestBody(required = false) WebSyncUserRequest request) {
        WebSyncUserRequest finalRequest = request == null
                ? new WebSyncUserRequest(null, null, null, null)
                : request;
        return ApiResponse.success(
                miniappSessionService.syncWebUser(
                        finalRequest.resolvedCode(),
                        finalRequest.resolvedNickName(),
                        finalRequest.resolvedAvatarUrl()
                )
        );
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
        MiniappSessionService.StoredMiniappUser currentUser = miniappSessionService.resolveUser(authorizationHeader);
        if (currentUser != null && !currentUser.isGuest()) {
            return ApiResponse.success(new UserProfileResponse(
                    currentUser.id(),
                    currentUser.nickName(),
                    currentUser.avatarUrl()
            ));
        }
        return ApiResponse.success(wechatAuthService.loadCurrentUser(authorizationHeader));
    }

    @PostMapping("/logout")
    public ApiResponse<Boolean> logout() {
        return ApiResponse.success(Boolean.TRUE);
    }
}
