package com.liuliu.citywalk.model.dto.response;

public record FileUploadResponse(
        String fileId,
        String url,
        String contentType,
        Long size
) {
}
