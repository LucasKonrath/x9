package com.x9chat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Stream;

@Service
public class ReinforcementService {

    @Value("${app.documents.path:../public}")
    private String documentsPath;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<String> getAllUsers() throws IOException {
        Path documentsDir = Paths.get(documentsPath);
        if (!Files.exists(documentsDir)) {
            return Collections.emptyList();
        }

        List<String> users = new ArrayList<>();
        try (Stream<Path> userDirs = Files.list(documentsDir)) {
            userDirs.filter(Files::isDirectory)
                   .forEach(userDir -> {
                       String username = userDir.getFileName().toString();
                       if (!username.equals("README.md") && !username.startsWith(".")) {
                           users.add(username);
                       }
                   });
        }
        return users;
    }

    public Map<String, Object> getUserReinforcements(String username) throws IOException {
        Path reinforcementFile = getUserReinforcementFile(username);
        if (!Files.exists(reinforcementFile)) {
            return createDefaultReinforcements(username);
        }

        return objectMapper.readValue(reinforcementFile.toFile(), Map.class);
    }

    public Map<String, Object> saveUserReinforcements(String username, Map<String, Object> reinforcements) throws IOException {
        // Update lastUpdated timestamp
        reinforcements.put("lastUpdated", LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));
        
        Path reinforcementFile = getUserReinforcementFile(username);
        Files.createDirectories(reinforcementFile.getParent());
        
        objectMapper.writerWithDefaultPrettyPrinter()
                   .writeValue(reinforcementFile.toFile(), reinforcements);
        
        return reinforcements;
    }

    public Map<String, Object> addReinforcement(String username, Map<String, Object> reinforcement) throws IOException {
        Map<String, Object> userReinforcements = getUserReinforcements(username);
        
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> reinforcementList = (List<Map<String, Object>>) userReinforcements.get("reinforcements");
        
        // Generate new ID
        int maxId = reinforcementList.stream()
                                   .mapToInt(r -> (Integer) r.getOrDefault("id", 0))
                                   .max()
                                   .orElse(0);
        
        reinforcement.put("id", maxId + 1);
        reinforcement.put("dateAdded", LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));
        
        reinforcementList.add(reinforcement);
        
        return saveUserReinforcements(username, userReinforcements);
    }

    public Map<String, Object> updateReinforcement(String username, int reinforcementId, Map<String, Object> updatedReinforcement) throws IOException {
        Map<String, Object> userReinforcements = getUserReinforcements(username);
        
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> reinforcementList = (List<Map<String, Object>>) userReinforcements.get("reinforcements");
        
        for (int i = 0; i < reinforcementList.size(); i++) {
            Map<String, Object> existing = reinforcementList.get(i);
            if ((Integer) existing.get("id") == reinforcementId) {
                updatedReinforcement.put("id", reinforcementId);
                // Preserve dateAdded if not provided
                if (!updatedReinforcement.containsKey("dateAdded")) {
                    updatedReinforcement.put("dateAdded", existing.get("dateAdded"));
                }
                reinforcementList.set(i, updatedReinforcement);
                break;
            }
        }
        
        return saveUserReinforcements(username, userReinforcements);
    }

    public Map<String, Object> deleteReinforcement(String username, int reinforcementId) throws IOException {
        Map<String, Object> userReinforcements = getUserReinforcements(username);
        
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> reinforcementList = (List<Map<String, Object>>) userReinforcements.get("reinforcements");
        
        reinforcementList.removeIf(r -> (Integer) r.get("id") == reinforcementId);
        
        return saveUserReinforcements(username, userReinforcements);
    }

    private Path getUserReinforcementFile(String username) {
        return Paths.get(documentsPath, username, "reinforcements.json");
    }

    private Map<String, Object> createDefaultReinforcements(String username) {
        Map<String, Object> defaultReinforcements = new HashMap<>();
        defaultReinforcements.put("version", "1.0");
        defaultReinforcements.put("lastUpdated", LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));
        defaultReinforcements.put("reinforcements", new ArrayList<>());
        
        try {
            return saveUserReinforcements(username, defaultReinforcements);
        } catch (IOException e) {
            throw new RuntimeException("Failed to create default reinforcements for user: " + username, e);
        }
    }
}
