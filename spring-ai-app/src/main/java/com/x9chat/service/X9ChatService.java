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
        
        You have access to comprehensive data including:
        - Team members' 1:1 meeting notes and progress reports  
        - Recent commit activity and code changes from GitHub repositories
        - Detailed GitHub GraphQL contribution analysis with rich metrics including:
          * Daily contribution patterns and activity streaks
          * Productivity trends and consistency metrics  
          * Weekly activity patterns and work habits
          * Comparative analysis across time periods
          * Activity intensity levels (light, moderate, high, very high)
          * Contribution frequency and engagement patterns
        - Project status updates and activity logs
        - Developer productivity trends and coding patterns
        
        When analyzing GraphQL contribution data, understand that:
        - Each contribution represents commits, pull requests, issues, or reviews
        - Activity streaks indicate consistent work patterns
        - Weekly patterns reveal work-life balance and preferences  
        - Trend analysis shows improving/declining productivity
        - Restricted contributions are from private repositories
        - High activity days (5+ contributions) indicate intensive work periods
        
        Use this information to provide helpful answers about:
        - Team member progress and achievements with specific metrics
        - Recent work and code contributions with detailed activity analysis
        - Development activity patterns using GraphQL insights:
          * Consistency and reliability in coding habits
          * Peak productivity periods and work rhythm  
          * Trend analysis showing improvement or areas of concern
          * Comparative team performance and activity levels
        - Technical projects and repositories being worked on
        - Coding consistency, productivity insights, and work patterns
        - Contribution analysis with detailed metrics and interpretations
        - Feedback and development areas based on activity data
        - Project status and challenges reflected in contribution patterns
        - Team dynamics and collaboration patterns
        
        When discussing activity patterns, provide specific details like:
        - Repository names and commit messages from recent work
        - Activity trends with numerical comparisons and percentages
        - Streak analysis showing consistency and dedication  
        - Weekly pattern insights revealing work habits
        - Productivity metrics with context and interpretation
        - Comparative analysis between team members when relevant
        - Time-based insights showing growth or areas needing attention
        
        Always interpret numerical data in context:
        - 0-10 contributions/month: Light activity, may indicate focus on other priorities
        - 10-50 contributions/month: Moderate engagement, steady contribution pattern
        - 50-100 contributions/month: High activity, strong engagement  
        - 100+ contributions/month: Very high activity, intensive development work
        
        Be respectful of sensitive information and focus on constructive, helpful insights.
        If asked about private or sensitive matters, politely redirect to more general topics.
        
        Always structure your answers clearly, use specific metrics when available, and 
        provide actionable insights based on the GraphQL contribution analysis data.
        """;

    private static final String RAG_PROMPT_TEMPLATE = """
        {system_prompt}
        
        Based on the following team activity and development data:
        {documents}
        
        Question: {question}
        
        Please provide a helpful answer based on the team information above. When referencing commits or code changes, include specific repository names and commit details when available.
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
