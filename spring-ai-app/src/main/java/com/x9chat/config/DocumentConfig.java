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
            loadCommitData();
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
                           files.filter(file -> file.toString().endsWith(".md"))
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
                doc.getMetadata().put("type", "team-activity");
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
    
    private void loadCommitData() {
        if (githubUsers.isEmpty()) {
            System.out.println("No GitHub users configured. Skipping commit data loading.");
            return;
        }

        String[] users = githubUsers.split(",");
        List<Document> commitDocuments = new ArrayList<>();
        
        for (String username : users) {
            final String finalUsername = username.trim();
            if (finalUsername.isEmpty()) continue;
            
            System.out.println("Loading commit data for user: " + finalUsername);
            
            try {
                // Load basic commit data
                List<GitHubService.CommitData> commits = gitHubService.fetchRecentCommits(finalUsername, commitDays);
                
                // Create monthly summaries for temporal indexing
                Map<String, MonthlyCommitSummary> monthlySummaries = new HashMap<>();
                
                for (GitHubService.CommitData commit : commits) {
                    // Create individual commit document
                    String content = formatCommitAsDocument(commit);
                    Document doc = new Document(content);
                    
                    // Add metadata with month information
                    String commitMonth = extractMonthFromDate(commit.getDate());
                    doc.getMetadata().put("type", "commit");
                    doc.getMetadata().put("username", finalUsername);
                    doc.getMetadata().put("repository", commit.getRepository());
                    doc.getMetadata().put("commit_sha", commit.getSha());
                    doc.getMetadata().put("commit_date", commit.getDate());
                    doc.getMetadata().put("commit_month", commitMonth);
                    doc.getMetadata().put("source", "github-commits");
                    
                    commitDocuments.add(doc);
                    
                    // Aggregate for monthly summary
                    monthlySummaries.computeIfAbsent(commitMonth, k -> new MonthlyCommitSummary(finalUsername, k))
                        .addCommit(commit);
                }
                
                // Create monthly summary documents for better temporal queries
                for (MonthlyCommitSummary summary : monthlySummaries.values()) {
                    String monthlyContent = formatMonthlySummaryAsDocument(summary);
                    Document monthlyDoc = new Document(monthlyContent);
                    
                    monthlyDoc.getMetadata().put("type", "monthly-commit-summary");
                    monthlyDoc.getMetadata().put("username", finalUsername);
                    monthlyDoc.getMetadata().put("month", summary.getMonth());
                    monthlyDoc.getMetadata().put("year", summary.getMonth().substring(0, 4));
                    monthlyDoc.getMetadata().put("commit_count", String.valueOf(summary.getCommitCount()));
                    monthlyDoc.getMetadata().put("source", "github-monthly-summary");
                    
                    commitDocuments.add(monthlyDoc);
                }
                
                // Load GraphQL contribution data with monthly indexing
                GitHubService.ContributionData personalContributionData = gitHubService.fetchContributionData(finalUsername, commitDays);
                if (personalContributionData != null && personalContributionData.getTotalContributions() > 0) {
                    // Create overall contribution document
                    String contributionContent = formatContributionAsDocument(personalContributionData, "Personal");
                    Document contributionDoc = new Document(contributionContent);
                    
                    contributionDoc.getMetadata().put("type", "contribution-analysis-personal");
                    contributionDoc.getMetadata().put("username", finalUsername);
                    contributionDoc.getMetadata().put("total_contributions", String.valueOf(personalContributionData.getTotalContributions()));
                    contributionDoc.getMetadata().put("source", "github-graphql-personal");
                    contributionDoc.getMetadata().put("period_days", String.valueOf(commitDays));
                    
                    commitDocuments.add(contributionDoc);
                    
                    // Create monthly contribution summaries for temporal indexing
                    Map<String, Integer> monthlyContributions = aggregateContributionsByMonth(personalContributionData);
                    for (Map.Entry<String, Integer> entry : monthlyContributions.entrySet()) {
                        String monthlyContribContent = formatMonthlyContributionSummary(username, entry.getKey(), entry.getValue(), "Personal");
                        Document monthlyContribDoc = new Document(monthlyContribContent);
                        
                        monthlyContribDoc.getMetadata().put("type", "monthly-contribution-summary");
                        monthlyContribDoc.getMetadata().put("username", username);
                        monthlyContribDoc.getMetadata().put("month", entry.getKey());
                        monthlyContribDoc.getMetadata().put("year", entry.getKey().substring(0, 4));
                        monthlyContribDoc.getMetadata().put("contributions_count", String.valueOf(entry.getValue()));
                        monthlyContribDoc.getMetadata().put("source", "github-monthly-contributions");
                        monthlyContribDoc.getMetadata().put("account_type", "personal");
                        
                        commitDocuments.add(monthlyContribDoc);
                    }
                    
                    System.out.println("Loaded personal contribution analysis for " + username + 
                            " (" + personalContributionData.getTotalContributions() + " contributions)");
                }
                
                // Load enterprise contribution data
                GitHubService.ContributionData enterpriseContributionData = gitHubService.fetchEnterpriseContributionData(username, commitDays);
                if (enterpriseContributionData != null && enterpriseContributionData.getTotalContributions() > 0) {
                    String contributionContent = formatContributionAsDocument(enterpriseContributionData, "Enterprise");
                    Document contributionDoc = new Document(contributionContent);
                    
                    // Add metadata
                    contributionDoc.getMetadata().put("type", "contribution-analysis-enterprise");
                    contributionDoc.getMetadata().put("username", username);
                    contributionDoc.getMetadata().put("total_contributions", String.valueOf(enterpriseContributionData.getTotalContributions()));
                    contributionDoc.getMetadata().put("source", "github-graphql-enterprise");
                    contributionDoc.getMetadata().put("period_days", String.valueOf(commitDays));
                    
                    commitDocuments.add(contributionDoc);
                    
                    System.out.println("Loaded enterprise contribution analysis for " + username + 
                            " (" + enterpriseContributionData.getTotalContributions() + " contributions)");
                }
                
                System.out.println("Loaded " + commits.size() + " commits for " + username);
                
            } catch (Exception e) {
                System.err.println("Error loading commits for " + username + ": " + e.getMessage());
            }
        }
        
        if (!commitDocuments.isEmpty()) {
            // Split commit documents for better retrieval
            TokenTextSplitter splitter = new TokenTextSplitter();
            List<Document> splitCommitDocuments = splitter.apply(commitDocuments);
            
            // Add to vector store
            vectorStore.add(splitCommitDocuments);
            
            System.out.println("Loaded " + splitCommitDocuments.size() + " commit document chunks from " + 
                    commitDocuments.size() + " commits");
        } else {
            System.out.println("No commit data loaded.");
        }
    }
    
    private String formatCommitAsDocument(GitHubService.CommitData commit) {
        StringBuilder content = new StringBuilder();
        content.append("# Commit Activity\n\n");
        content.append("**Repository:** ").append(commit.getRepository()).append("\n");
        content.append("**Author:** ").append(commit.getAuthor()).append("\n");
        content.append("**Date:** ").append(commit.getDate()).append("\n");
        content.append("**SHA:** ").append(commit.getSha()).append("\n");
        content.append("**URL:** ").append(commit.getUrl()).append("\n\n");
        content.append("**Commit Message:**\n");
        content.append(commit.getMessage()).append("\n\n");
        content.append("This represents recent development work and code changes made by the team member.");
        
        return content.toString();
    }
    
    private String formatContributionAsDocument(GitHubService.ContributionData contributionData, String type) {
        StringBuilder content = new StringBuilder();
        content.append("# GitHub Contribution Analysis - ").append(type).append("\n\n");
        content.append("**Developer:** ").append(contributionData.getUsername()).append("\n");
        content.append("**Analysis Type:** ").append(type).append(" repositories\n");
        content.append("**Analysis Period:** Last ").append(commitDays).append(" days\n");
        content.append("**Total Contributions:** ").append(contributionData.getTotalContributions()).append("\n\n");
        
        // Add detailed activity insights
        content.append("## Comprehensive Activity Analysis\n");
        for (String insight : contributionData.getInsights()) {
            content.append("- ").append(insight).append("\n");
        }
        content.append("\n");
        
        // Add structured daily activity data for better LLama understanding
        content.append("## Detailed Daily Activity Pattern\n");
        content.append("This section provides day-by-day contribution data for pattern analysis:\n\n");
        
        // Group activities by week for better readability
        List<GitHubService.DailyContribution> dailyContributions = contributionData.getDailyContributions();
        for (int i = 0; i < dailyContributions.size(); i += 7) {
            int weekEnd = Math.min(i + 7, dailyContributions.size());
            List<GitHubService.DailyContribution> week = dailyContributions.subList(i, weekEnd);
            
            content.append("### Week ").append((i / 7) + 1).append(":\n");
            for (GitHubService.DailyContribution day : week) {
                if (day.getCount() > 0) {
                    content.append("- ").append(day.getDate())
                           .append(": ").append(day.getCount())
                           .append(" contributions");
                    
                    // Add qualitative descriptors for LLama to understand
                    if (day.getCount() >= 10) {
                        content.append(" (very high activity)");
                    } else if (day.getCount() >= 5) {
                        content.append(" (high activity)");
                    } else if (day.getCount() >= 2) {
                        content.append(" (moderate activity)");
                    } else {
                        content.append(" (light activity)");
                    }
                    content.append("\n");
                }
            }
            content.append("\n");
        }
        
        // Add context for LLama's understanding
        content.append("## Context for Analysis\n");
        content.append("This ").append(type.toLowerCase()).append(" contribution analysis reveals the developer's ");
        content.append("coding patterns, work consistency, and engagement level. ");
        
        if (contributionData.getTotalContributions() > 100) {
            content.append("This developer shows high engagement with frequent contributions. ");
        } else if (contributionData.getTotalContributions() > 30) {
            content.append("This developer shows moderate but consistent engagement. ");
        } else if (contributionData.getTotalContributions() > 0) {
            content.append("This developer shows selective engagement patterns. ");
        } else {
            content.append("This developer shows minimal activity in this period. ");
        }
        
        content.append("The data includes both public and private repository activities in ")
               .append(type.toLowerCase()).append(" GitHub environment, providing insights into ");
        content.append("productivity trends, work habits, and development consistency over the ")
               .append(commitDays).append("-day analysis period.\n\n");
        
        // Add metadata for better vector search
        content.append("## Searchable Keywords\n");
        content.append("Developer activity, coding patterns, contribution frequency, ");
        content.append("productivity analysis, work consistency, development trends, ");
        content.append("GitHub metrics, commit activity, code contributions, ");
        content.append("software development, programming productivity, ");
        content.append(contributionData.getUsername()).append(" performance");
        
        return content.toString();
    }
    
    // Helper method to extract month from date string
    private String extractMonthFromDate(String dateString) {
        try {
            // Parse various date formats that might come from GitHub
            LocalDateTime date;
            if (dateString.contains("T")) {
                date = LocalDateTime.parse(dateString, DateTimeFormatter.ISO_DATE_TIME);
            } else {
                date = LocalDateTime.parse(dateString + "T00:00:00", DateTimeFormatter.ISO_DATE_TIME);
            }
            return String.format("%04d-%02d", date.getYear(), date.getMonthValue());
        } catch (Exception e) {
            // Fallback: try to extract year-month from string
            if (dateString.length() >= 7) {
                return dateString.substring(0, 7); // YYYY-MM
            }
            return "unknown";
        }
    }
    
    // Aggregate contributions by month
    private Map<String, Integer> aggregateContributionsByMonth(GitHubService.ContributionData contributionData) {
        Map<String, Integer> monthlyContributions = new HashMap<>();
        
        for (GitHubService.DailyContribution daily : contributionData.getDailyContributions()) {
            String month = extractMonthFromDate(daily.getDate());
            monthlyContributions.merge(month, daily.getCount(), Integer::sum);
        }
        
        return monthlyContributions;
    }
    
    // Format monthly commit summary
    private String formatMonthlySummaryAsDocument(MonthlyCommitSummary summary) {
        StringBuilder content = new StringBuilder();
        content.append("# Monthly Commit Summary - ").append(summary.getMonth()).append("\n\n");
        content.append("**Developer:** ").append(summary.getUsername()).append("\n");
        content.append("**Month:** ").append(summary.getMonth()).append("\n");
        content.append("**Total Commits:** ").append(summary.getCommitCount()).append("\n");
        content.append("**Active Repositories:** ").append(summary.getRepositories().size()).append("\n\n");
        
        content.append("## Monthly Activity Overview\n");
        content.append("In ").append(summary.getMonth()).append(", ").append(summary.getUsername())
               .append(" made ").append(summary.getCommitCount()).append(" commits across ")
               .append(summary.getRepositories().size()).append(" repositories.\n\n");
        
        content.append("## Repository Breakdown\n");
        for (Map.Entry<String, Integer> repo : summary.getRepositoryCommitCounts().entrySet()) {
            content.append("- **").append(repo.getKey()).append(":** ")
                   .append(repo.getValue()).append(" commits\n");
        }
        content.append("\n");
        
        content.append("## Sample Recent Commits\n");
        for (GitHubService.CommitData commit : summary.getSampleCommits()) {
            content.append("- ").append(commit.getDate()).append(" in ")
                   .append(commit.getRepository()).append(": ")
                   .append(commit.getMessage().split("\n")[0]).append("\n");
        }
        
        content.append("\n## Searchable Context\n");
        content.append("Monthly commit activity, ").append(summary.getMonth()).append(" commits, ");
        content.append(summary.getUsername()).append(" development activity, monthly productivity, ");
        content.append("code contributions by month, repository activity, commit frequency");
        
        return content.toString();
    }
    
    // Format monthly contribution summary
    private String formatMonthlyContributionSummary(String username, String month, int contributionCount, String type) {
        StringBuilder content = new StringBuilder();
        content.append("# Monthly Contribution Summary - ").append(month).append("\n\n");
        content.append("**Developer:** ").append(username).append("\n");
        content.append("**Month:** ").append(month).append("\n");
        content.append("**Account Type:** ").append(type).append("\n");
        content.append("**Total Contributions:** ").append(contributionCount).append("\n\n");
        
        // Convert month to readable format
        String[] monthNames = {"", "January", "February", "March", "April", "May", "June", 
                              "July", "August", "September", "October", "November", "December"};
        String[] parts = month.split("-");
        String readableMonth = monthNames[Integer.parseInt(parts[1])] + " " + parts[0];
        
        content.append("## Summary\n");
        content.append("In ").append(readableMonth).append(", ").append(username)
               .append(" made ").append(contributionCount)
               .append(" contributions to ").append(type.toLowerCase()).append(" repositories. ");
        
        if (contributionCount >= 80) {
            content.append("This represents very high activity for the month.");
        } else if (contributionCount >= 40) {
            content.append("This represents high activity for the month.");
        } else if (contributionCount >= 15) {
            content.append("This represents moderate activity for the month.");
        } else if (contributionCount > 0) {
            content.append("This represents light activity for the month.");
        } else {
            content.append("No contributions recorded for this month.");
        }
        content.append("\n\n");
        
        content.append("## Context for Analysis\n");
        content.append("This monthly summary helps track productivity trends, seasonal patterns, ");
        content.append("and activity consistency across different months. It includes commits, ");
        content.append("pull requests, issues, and code reviews from ").append(type.toLowerCase()).append(" repositories.\n\n");
        
        content.append("## Searchable Keywords\n");
        content.append(readableMonth).append(" contributions, ").append(month).append(" activity, ");
        content.append(username).append(" monthly productivity, monthly commits, ");
        content.append("monthly development activity, ").append(type.toLowerCase()).append(" contributions");
        
        return content.toString();
    }
    
    // Helper class for monthly commit aggregation
    private static class MonthlyCommitSummary {
        private final String username;
        private final String month;
        private final List<GitHubService.CommitData> commits;
        private final Map<String, Integer> repositoryCommitCounts;
        
        public MonthlyCommitSummary(String username, String month) {
            this.username = username;
            this.month = month;
            this.commits = new ArrayList<>();
            this.repositoryCommitCounts = new HashMap<>();
        }
        
        public void addCommit(GitHubService.CommitData commit) {
            commits.add(commit);
            repositoryCommitCounts.merge(commit.getRepository(), 1, Integer::sum);
        }
        
        public String getUsername() { return username; }
        public String getMonth() { return month; }
        public int getCommitCount() { return commits.size(); }
        public Set<String> getRepositories() { return repositoryCommitCounts.keySet(); }
        public Map<String, Integer> getRepositoryCommitCounts() { return repositoryCommitCounts; }
        public List<GitHubService.CommitData> getSampleCommits() { 
            return commits.subList(0, Math.min(5, commits.size())); 
        }
    }
}
