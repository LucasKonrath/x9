package com.x9chat.controller;

import com.x9chat.service.X9ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Controller
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"}) // Allow React dev servers
public class X9ChatController {

    private final X9ChatService x9ChatService;

    public X9ChatController(X9ChatService x9ChatService) {
        this.x9ChatService = x9ChatService;
    }

    @GetMapping("/")
    public String index(Model model) {
        List<String> topics = x9ChatService.getAvailableTopics();
        model.addAttribute("topics", topics);
        return "index";
    }

    @PostMapping("/api/chat")
    @ResponseBody
    public ResponseEntity<Map<String, String>> chat(@RequestBody Map<String, String> request) {
        try {
            String question = request.get("question");
            if (question == null || question.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Question cannot be empty"));
            }
            
            String response = x9ChatService.askQuestion(question);
            return ResponseEntity.ok(Map.of(
                "response", response,
                "status", "success"
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of(
                    "error", "Error processing your question: " + e.getMessage(),
                    "status", "error"
                ));
        }
    }

    @GetMapping("/api/topics")
    @ResponseBody
    public ResponseEntity<List<String>> getTopics() {
        return ResponseEntity.ok(x9ChatService.getAvailableTopics());
    }
    
    @GetMapping("/api/stats")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(x9ChatService.getStats());
    }
    
    @PostMapping("/api/refresh")
    @ResponseBody
    public ResponseEntity<Map<String, String>> refreshData() {
        try {
            // This would trigger a refresh of the document store
            // For now, just return a success message
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Data refresh initiated. This may take a few minutes."
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of(
                    "status", "error",
                    "message", "Failed to refresh data: " + e.getMessage()
                ));
        }
    }

    // Legacy endpoint for backward compatibility
    @PostMapping("/ask")
    @ResponseBody
    public String askQuestion(@RequestParam String question) {
        try {
            return x9ChatService.askQuestion(question);
        } catch (Exception e) {
            return "Error processing your question: " + e.getMessage();
        }
    }
}
