package com.liuliu.citywalk.service;

import com.liuliu.citywalk.model.dto.request.MiniappCreateWalkRequest;
import com.liuliu.citywalk.model.dto.response.MiniappWalkRecordResponse;
import com.liuliu.citywalk.repository.MiniappWalkRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MiniappWalkService {

    private final MiniappWalkRepository miniappWalkRepository;

    public MiniappWalkService(MiniappWalkRepository miniappWalkRepository) {
        this.miniappWalkRepository = miniappWalkRepository;
    }

    @Transactional
    public MiniappWalkRecordResponse create(Long userId, MiniappCreateWalkRequest request) {
        if (userId == null || userId <= 0) {
            throw new IllegalStateException("miniapp_login_required");
        }
        return miniappWalkRepository.create(userId, request);
    }

    public List<MiniappWalkRecordResponse> listMyWalks(Long userId, int limit) {
        if (userId == null || userId <= 0) {
            return List.of();
        }
        return miniappWalkRepository.listMyWalks(userId, limit);
    }

    public List<MiniappWalkRecordResponse> listPublicWalks(int limit) {
        return miniappWalkRepository.listPublicWalks(limit);
    }

    public MiniappWalkRecordResponse getDetail(String id, Long currentUserId) {
        return miniappWalkRepository.findById(id)
                .filter(record -> Boolean.TRUE.equals(record.isPublic()) || (currentUserId != null && currentUserId > 0 && record.userId().equals(currentUserId)))
                .orElse(null);
    }
}
