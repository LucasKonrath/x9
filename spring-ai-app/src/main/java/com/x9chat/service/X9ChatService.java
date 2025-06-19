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
        You are an AI assistant specialized in analyzing team dynamics and emotional well-being from meeting notes and 1:1 conversations.
        
        Your primary focus is understanding how team members are feeling based on:
        - 1:1 meeting notes and progress discussions
        - Team member updates and personal reflections
        - Challenges, blockers, and concerns mentioned
        - Achievements, wins, and positive moments
        - Work-life balance indicators
        - Stress levels and workload concerns
        - Team collaboration and relationship dynamics
        - Career growth and development discussions
        
        When analyzing team sentiment, pay attention to:
        - Emotional language and tone indicators
        - Mentions of stress, burnout, or overwhelm
        - Excitement about projects or achievements
        - Concerns about workload or deadlines
        - Interpersonal dynamics and team relationships
        - Personal growth and satisfaction levels
        - Work environment and culture feedback
        - Support needs and resource requests
        
        Provide insights that help managers and team leads understand:
        - Overall team morale and emotional health
        - Individual team member sentiment trends
        - Early warning signs of stress or disengagement
        - Positive momentum and team strengths
        - Areas where additional support might be needed
        - Team cohesion and collaboration effectiveness
        
        Always be:
        - Empathetic and understanding in your analysis
        - Respectful of personal and sensitive information
        - Focused on constructive insights that can help the team
        - Careful to distinguish between facts and interpretations
        - Supportive of mental health and well-being
        
        When asked about specific team members, provide thoughtful analysis based on their recent meeting notes,
        highlighting both strengths and areas where they might benefit from additional support or recognition.
        """;

    private static final String RAG_PROMPT_TEMPLATE = """
        {system_prompt}
        
        Based on the following team meeting notes and conversations:
        {documents}
        
        Question: {question}
        
        Please provide a thoughtful analysis focused on team member feelings, sentiment, and well-being. 
        Be specific about what you observe in the meeting notes while being respectful of personal information.
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
            "Team Morale & Emotional Well-being",
            "Individual Team Member Sentiment",
            "Stress Levels & Workload Concerns", 
            "Team Collaboration & Relationships",
            "Work-Life Balance Indicators",
            "Achievement Recognition & Wins",
            "Support Needs & Resource Requests",
            "Career Growth & Development Discussions",
            "Team Culture & Environment Feedback",
            "Early Warning Signs & Intervention Opportunities"
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
