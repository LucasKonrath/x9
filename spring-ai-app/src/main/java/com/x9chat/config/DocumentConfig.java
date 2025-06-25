package com.x9chat.config;

import com.x9chat.service.GitHubService;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.TextReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.FileSystemResource;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

@Configuration
public class DocumentConfig {

    @Value("${app.documents.path:../public}")
    private String documentsPath;

    @Value("${app.github.users:}")
    private String githubUsers;

    @Value("${app.github.commit.days:30}")
    private int commitDays;

    private final VectorStore vectorStore;
    private final GitHubService gitHubService;

    // Pattern to extract date from filename (YYYY-MM-DD format)
    private static final Pattern DATE_PATTERN = Pattern.compile("(\\d{4}-\\d{2}-\\d{2})");

    public DocumentConfig(VectorStore vectorStore, GitHubService gitHubService) {
        this.vectorStore = vectorStore;
        this.gitHubService = gitHubService;
    }

    @PostConstruct
    public void loadDocuments() {
        try {
            loadTeamDocuments();
        } catch (IOException e) {
            throw new RuntimeException("Failed to load team documents and commit data", e);
        }
    }

    private void loadTeamDocuments() throws IOException {
        Path documentsDir = Paths.get(documentsPath);

        if (!Files.exists(documentsDir)) {
            System.out.println("Documents directory does not exist: " + documentsPath);
            return;
        }

        List<Document> documents = new ArrayList<>();

        // Walk through username directories
        try (Stream<Path> userDirs = Files.list(documentsDir)) {
            userDirs.filter(Files::isDirectory)
                    .forEach(userDir -> {
                        String username = userDir.getFileName().toString();

                        // Skip non-username directories
                        if (username.equals("README.md") || username.startsWith(".")) {
                            return;
                        }

                        try (Stream<Path> files = Files.list(userDir)) {
                            files.filter(file -> file.toString().endsWith(".md") || file.toString().endsWith("reinforcements.json"))
                                    .forEach(file -> {
                                        try {
                                            loadDocumentFromFile(file, username, documents);
                                        } catch (IOException e) {
                                            System.err.println("Error loading file: " + file + " - " + e.getMessage());
                                        }
                                    });
                        } catch (IOException e) {
                            System.err.println("Error reading user directory: " + userDir + " - " + e.getMessage());
                        }
                    });
        }

        if (!documents.isEmpty()) {
            // Split documents into chunks for better retrieval
            TokenTextSplitter splitter = new TokenTextSplitter();
            List<Document> splitDocuments = splitter.apply(documents);

            // Add documents to vector store
            vectorStore.add(splitDocuments);

            System.out.println("Loaded " + splitDocuments.size() + " document chunks from " + documents.size() + " team files");
        } else {
            System.out.println("No team documents found in path: " + documentsPath);
        }
    }

    private void loadDocumentFromFile(Path file, String username, List<Document> documents) throws IOException {
        FileSystemResource resource = new FileSystemResource(file.toFile());

        if (resource.exists() && resource.isReadable()) {
            TextReader textReader = new TextReader(resource);
            List<Document> docs = textReader.get();

            // Extract date from filename
            String filename = file.getFileName().toString();
            String date = extractDateFromFilename(filename);

            // Add metadata to identify the source file and user
            for (Document doc : docs) {
                doc.getMetadata().put("source", filename);
                doc.getMetadata().put("username", username);
                
                // Determine document type based on filename
                if (filename.endsWith("reinforcements.json")) {
                    doc.getMetadata().put("type", "reinforcements");
                } else {
                    doc.getMetadata().put("type", "team-activity");
                }
                
                doc.getMetadata().put("filepath", file.toString());

                if (date != null) {
                    doc.getMetadata().put("date", date);
                }
            }

            documents.addAll(docs);
            System.out.println("Loaded document: " + filename + " for user: " + username);
        }
    }

    private String extractDateFromFilename(String filename) {
        Matcher matcher = DATE_PATTERN.matcher(filename);
        return matcher.find() ? matcher.group(1) : null;
    }


}