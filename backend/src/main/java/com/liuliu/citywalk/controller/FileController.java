package com.liuliu.citywalk.controller;

import com.liuliu.citywalk.common.ApiResponse;
import com.liuliu.citywalk.model.dto.response.FileUploadResponse;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<FileUploadResponse> upload(@RequestPart("file") MultipartFile file,
                                                  @RequestParam("bizType") String bizType) {
        FileUploadResponse response = new FileUploadResponse(
                "f_" + System.currentTimeMillis(),
                "https://cdn.example.com/uploads/" + file.getOriginalFilename(),
                file.getContentType(),
                file.getSize()
        );
        return ApiResponse.success(response);
    }
}
