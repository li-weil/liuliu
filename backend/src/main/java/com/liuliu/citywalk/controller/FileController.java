package com.liuliu.citywalk.controller;

import com.liuliu.citywalk.common.ApiResponse;
import com.liuliu.citywalk.model.dto.response.FileUploadResponse;
import com.liuliu.citywalk.repository.UploadedFileRepository;
import com.liuliu.citywalk.service.MiniappSessionService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    private static final Path UPLOAD_ROOT = Paths.get("uploads");

    private final UploadedFileRepository uploadedFileRepository;
    private final MiniappSessionService miniappSessionService;

    public FileController(UploadedFileRepository uploadedFileRepository, MiniappSessionService miniappSessionService) {
        this.uploadedFileRepository = uploadedFileRepository;
        this.miniappSessionService = miniappSessionService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<FileUploadResponse> upload(@RequestPart("file") MultipartFile file,
                                                  @RequestParam("bizType") String bizType,
                                                  @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) throws IOException {
        String safeBizType = normalizeSegment(bizType, "common");
        String originalName = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
        String extension = extractExtension(originalName);
        String fileId = "f_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().replace("-", "");
        String fileName = fileId + extension;
        Path targetDirectory = UPLOAD_ROOT.resolve(safeBizType);
        Files.createDirectories(targetDirectory);

        Path targetPath = targetDirectory.resolve(fileName).normalize();
        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
        }

        String relativePath = "/uploads/" + safeBizType + "/" + fileName;
        String url = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path(relativePath)
                .toUriString();

        MiniappSessionService.StoredMiniappUser user = miniappSessionService.resolveUser(authorizationHeader);
        uploadedFileRepository.save(
                user == null || user.isGuest() ? null : user.id(),
                safeBizType,
                fileId,
                originalName,
                relativePath,
                file.getContentType(),
                file.getSize()
        );

        FileUploadResponse response = new FileUploadResponse(
                fileId,
                url,
                file.getContentType(),
                file.getSize()
        );
        return ApiResponse.success(response);
    }

    private String normalizeSegment(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        String normalized = value.replaceAll("[^a-zA-Z0-9_-]", "");
        return normalized.isBlank() ? fallback : normalized;
    }

    private String extractExtension(String filename) {
        int index = filename.lastIndexOf('.');
        if (index < 0 || index == filename.length() - 1) {
            return "";
        }
        return filename.substring(index);
    }
}
