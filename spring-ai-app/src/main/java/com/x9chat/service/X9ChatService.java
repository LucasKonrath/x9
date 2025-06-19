package com.x9chat.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class X9ChatService {

    private final ChatClient chatClient;
    private final VectorStore vectorStore;

    private static final String SYSTEM_PROMPT = """
        You are an AI assistant for the X9 team that helps with questions about team activities, progress, and insights.
        
        You have access to team members' 1:1 meeting notes, progress reports, and activity logs.
        
        Use this information to provide helpful answers about:
        - Team member progress and achievements
        - Recent work and contributions
        - Feedback and development areas
        - Project status and challenges
        - Team dynamics and collaboration
        
        Be respectful of sensitive information and focus on constructive, helpful insights.
        If asked about private or sensitive matters, politely redirect to more general topics.
        
        Always structure your answers clearly and cite relevant sources when possible.
        """;

    private static final String RAG_PROMPT_TEMPLATE = """
        {system_prompt}
        
        Based on the following team activity data:
        {documents}
        
        Question: {question}
        
        Please provide a helpful answer based on the team information above.
        """;

    public X9ChatService(ChatClient.Builder chatClientBuilder, VectorStore vectorStore) {
        this.chatClient = chatClientBuilder.build();
        this.vectorStore = vectorStore;
    }

    public String askQuestion(String question) {
        // Retrieve relevant documents
        List<Document> relevantDocs = vectorStore.similaritySearch(
            SearchRequest.query(question).withTopK(5)
        );

        // Combine document content
        String documents = relevantDocs.stream()
            .map(doc -> {
                String source = (String) doc.getMetadata().get("source");
                String username = (String) doc.getMetadata().get("username");
                String date = (String) doc.getMetadata().get("date");
                
                StringBuilder context = new StringBuilder();
                context.append("Source: ").append(source);
                if (username != null) {
                    context.append(" (User: ").append(username).append(")");
                }
                if (date != null) {
                    context.append(" (Date: ").append(date).append(")");
                }
                context.append("\n").append(doc.getContent());
                
                return context.toString();
            })
            .collect(Collectors.joining("\n\n---\n\n"));

        // Create prompt with context
        PromptTemplate promptTemplate = new PromptTemplate(RAG_PROMPT_TEMPLATE);
        Prompt prompt = promptTemplate.create(Map.of(
            "system_prompt", SYSTEM_PROMPT,
            "documents", documents.isEmpty() ? "No relevant team information found." : documents,
            "question", question
        ));

        // Get response from AI
        return chatClient.prompt(prompt).call().content();
    }

    public List<String> getAvailableTopics() {
        return List.of(
            "Team Progress & Achievements",
            "Recent Work & Contributions",
            "Code Reviews & Technical Discussions",
            "Feedback & Development Areas", 
            "Project Challenges & Roadblocks",
            "Team Collaboration & Communication",
            "Meeting Notes & Action Items",
            "Skills Development & Learning",
            "Process Improvements",
            "Team Dynamics"
        );
    }
    
    public Map<String, Object> getStats() {
        // This could be enhanced to return actual stats from the vector store
        return Map.of(
            "totalDocuments", "Loading...",
            "lastUpdated", "Loading...",
            "teamMembers", "Loading..."
        );
    }
}
