package com.liuliu.citywalk.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "mission-verify-ai")
public class MissionVerifyAiProperties {

    private String apiKey;
    private String model = "qwen-vl-plus";
    private String baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1";
    private Integer requestTimeoutMs = 2200;

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public Integer getRequestTimeoutMs() {
        return requestTimeoutMs;
    }

    public void setRequestTimeoutMs(Integer requestTimeoutMs) {
        this.requestTimeoutMs = requestTimeoutMs;
    }
}
