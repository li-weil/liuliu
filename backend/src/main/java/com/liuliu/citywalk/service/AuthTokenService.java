package com.liuliu.citywalk.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AuthTokenService {

    private final ObjectMapper objectMapper;
    private final byte[] secretBytes;
    private final String issuer;
    private final long accessExpireSeconds;
    private final long refreshExpireSeconds;

    public AuthTokenService(
            ObjectMapper objectMapper,
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.issuer:liuliu-backend}") String issuer,
            @Value("${jwt.access-expire-seconds:7200}") long accessExpireSeconds,
            @Value("${jwt.refresh-expire-seconds:2592000}") long refreshExpireSeconds
    ) {
        this.objectMapper = objectMapper;
        this.secretBytes = normalizeSecret(secret).getBytes(StandardCharsets.UTF_8);
        this.issuer = issuer;
        this.accessExpireSeconds = accessExpireSeconds;
        this.refreshExpireSeconds = refreshExpireSeconds;
    }

    public String createAccessToken(Long userId) {
        return buildToken(userId, "access", accessExpireSeconds);
    }

    public String createRefreshToken(Long userId) {
        return buildToken(userId, "refresh", refreshExpireSeconds);
    }

    public TokenClaims parseAccessToken(String token) {
        TokenClaims claims = parseToken(token);
        if (!"access".equals(claims.tokenType())) {
            throw new IllegalArgumentException("jwt_token_type_invalid");
        }
        return claims;
    }

    public TokenClaims parseToken(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("jwt_missing");
        }

        String[] parts = token.trim().split("\\.");
        if (parts.length != 3) {
            throw new IllegalArgumentException("jwt_format_invalid");
        }

        String signingInput = parts[0] + "." + parts[1];
        String expectedSignature = base64UrlEncode(hmacSha256(signingInput));
        if (!MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                parts[2].getBytes(StandardCharsets.UTF_8)
        )) {
            throw new IllegalArgumentException("jwt_signature_invalid");
        }

        Map<String, Object> payload = readPayload(parts[1]);
        String tokenIssuer = readString(payload, "iss");
        if (!issuer.equals(tokenIssuer)) {
            throw new IllegalArgumentException("jwt_issuer_invalid");
        }

        Long expiresAt = readLong(payload, "exp");
        long nowSeconds = Instant.now().getEpochSecond();
        if (expiresAt == null || expiresAt <= nowSeconds) {
            throw new IllegalArgumentException("jwt_expired");
        }

        Long userId = readLong(payload, "uid");
        if (userId == null) {
            userId = readLong(payload, "sub");
        }
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("jwt_uid_invalid");
        }

        return new TokenClaims(
                userId,
                readString(payload, "sub"),
                readString(payload, "tokenType"),
                readLong(payload, "iat"),
                expiresAt,
                tokenIssuer
        );
    }

    public long getAccessExpireSeconds() {
        return accessExpireSeconds;
    }

    public long getRefreshExpireSeconds() {
        return refreshExpireSeconds;
    }

    private String buildToken(Long userId, String tokenType, long expireSeconds) {
        long nowSeconds = Instant.now().getEpochSecond();

        Map<String, Object> header = Map.of(
                "alg", "HS256",
                "typ", "JWT"
        );

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("iss", issuer);
        payload.put("sub", String.valueOf(userId));
        payload.put("uid", userId);
        payload.put("tokenType", tokenType);
        payload.put("iat", nowSeconds);
        payload.put("exp", nowSeconds + expireSeconds);

        String encodedHeader = base64UrlEncode(writeJson(header));
        String encodedPayload = base64UrlEncode(writeJson(payload));
        String signingInput = encodedHeader + "." + encodedPayload;
        String signature = base64UrlEncode(hmacSha256(signingInput));
        return signingInput + "." + signature;
    }

    private byte[] hmacSha256(String content) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretBytes, "HmacSHA256"));
            return mac.doFinal(content.getBytes(StandardCharsets.UTF_8));
        } catch (Exception error) {
            throw new IllegalStateException("jwt_sign_failed", error);
        }
    }

    private byte[] writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsBytes(value);
        } catch (JsonProcessingException error) {
            throw new IllegalStateException("jwt_json_failed", error);
        }
    }

    private String base64UrlEncode(byte[] value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }

    private byte[] base64UrlDecode(String value) {
        try {
            return Base64.getUrlDecoder().decode(value);
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("jwt_base64_invalid", error);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readPayload(String encodedPayload) {
        try {
            return objectMapper.readValue(base64UrlDecode(encodedPayload), Map.class);
        } catch (Exception error) {
            throw new IllegalArgumentException("jwt_payload_invalid", error);
        }
    }

    private String readString(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private Long readLong(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException error) {
            return null;
        }
    }

    private String normalizeSecret(String secret) {
        String value = secret == null ? "" : secret.trim();
        if (value.length() >= 32) {
            return value;
        }

        StringBuilder builder = new StringBuilder(value);
        while (builder.length() < 32) {
            builder.append("liuliu-jwt-secret-padding");
        }
        return builder.substring(0, 32);
    }

    public record TokenClaims(
            Long userId,
            String subject,
            String tokenType,
            Long issuedAt,
            Long expiresAt,
            String issuer
    ) {
    }
}
