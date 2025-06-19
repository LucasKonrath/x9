package com.x9chat.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GitHubService {

    @Value("${VITE_GITHUB_TOKEN:}")
    private String githubToken;

    @Value("${VITE_PERSONAL_GITHUB_TOKEN:}")
    private String personalGithubToken;
    
    @Value("${VITE_ORG:}")
    private String githubOrg;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public GitHubService() {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
    }

    public List<CommitData> fetchRecentCommits(String username, int days) {
        List<CommitData> allCommits = new ArrayList<>();
        
        try {
            // First, get user's recent events to find repositories they've pushed to
            List<String> recentRepos = getRecentRepositories(username, days);
            
            // Then fetch commits from those repositories
            for (String repo : recentRepos) {
                try {
                    List<CommitData> repoCommits = fetchCommitsFromRepository(repo, username, days);
                    allCommits.addAll(repoCommits);
                } catch (Exception e) {
                    System.err.println("Error fetching commits from repo " + repo + ": " + e.getMessage());
                }
            }
            
        } catch (Exception e) {
            System.err.println("Error fetching recent commits for " + username + ": " + e.getMessage());
        }
        
        return allCommits;
    }

    private List<String> getRecentRepositories(String username, int days) throws IOException, InterruptedException {
        String url = "https://api.github.com/users/" + username + "/events?per_page=100";
        
        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Accept", "application/vnd.github+json")
                .header("User-Agent", "X9-Chat-AI");
        
        // Use personal token for events API
        if (!personalGithubToken.isEmpty()) {
            requestBuilder.header("Authorization", "Bearer " + personalGithubToken);
        }
        
        HttpRequest request = requestBuilder.build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() != 200) {
            throw new IOException("GitHub API returned status: " + response.statusCode());
        }
        
        JsonNode events = objectMapper.readTree(response.body());
        List<String> repos = new ArrayList<>();
        
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(days);
        
        for (JsonNode event : events) {
            String eventType = event.get("type").asText();
            String createdAt = event.get("created_at").asText();
            
            LocalDateTime eventDate = LocalDateTime.parse(createdAt, DateTimeFormatter.ISO_DATE_TIME);
            if (eventDate.isBefore(cutoffDate)) {
                continue;
            }
            
            if ("PushEvent".equals(eventType) || "CreateEvent".equals(eventType)) {
                JsonNode repo = event.get("repo");
                if (repo != null) {
                    String repoName = repo.get("name").asText();
                    if (!repos.contains(repoName)) {
                        repos.add(repoName);
                    }
                }
            }
        }
        
        return repos;
    }

    private List<CommitData> fetchCommitsFromRepository(String repoFullName, String username, int days) 
            throws IOException, InterruptedException {
        
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        String sinceParam = since.format(DateTimeFormatter.ISO_DATE_TIME);
        
        String url = String.format("https://api.github.com/repos/%s/commits?author=%s&since=%s&per_page=100",
                repoFullName, username, sinceParam);
        
        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Accept", "application/vnd.github+json")
                .header("User-Agent", "X9-Chat-AI");
        
        // Use personal token for commit data
        if (!personalGithubToken.isEmpty()) {
            requestBuilder.header("Authorization", "Bearer " + personalGithubToken);
        }
        
        HttpRequest request = requestBuilder.build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() != 200) {
            System.out.println("Failed to fetch commits from " + repoFullName + ": " + response.statusCode());
            return new ArrayList<>();
        }
        
        JsonNode commits = objectMapper.readTree(response.body());
        List<CommitData> commitList = new ArrayList<>();
        
        for (JsonNode commit : commits) {
            try {
                CommitData commitData = parseCommitData(commit, repoFullName);
                commitList.add(commitData);
            } catch (Exception e) {
                System.err.println("Error parsing commit data: " + e.getMessage());
            }
        }
        
        return commitList;
    }

    private CommitData parseCommitData(JsonNode commitNode, String repoName) {
        JsonNode commit = commitNode.get("commit");
        JsonNode author = commit.get("author");
        
        String sha = commitNode.get("sha").asText();
        String message = commit.get("message").asText();
        String authorName = author.get("name").asText();
        String date = author.get("date").asText();
        String url = commitNode.get("html_url").asText();
        
        return new CommitData(sha, message, authorName, date, repoName, url);
    }

    /**
     * Fetches GitHub contribution data using GraphQL API for personal repositories
     * Note: Days parameter is ignored - always fetches from beginning of year for better LLama training
     */
    public ContributionData fetchContributionData(String username, int days) {
        return fetchContributionDataInternal(username, days, true);
    }
    
    /**
     * Fetches GitHub contribution data using GraphQL API for enterprise repositories
     * Note: Days parameter is ignored - always fetches from beginning of year for better LLama training
     */
    public ContributionData fetchEnterpriseContributionData(String username, int days) {
        return fetchContributionDataInternal(username, days, false);
    }
    
    /**
     * Internal method to fetch contribution data with token selection
     */
    private ContributionData fetchContributionDataInternal(String username, int days, boolean usePersonalToken) {
        try {
            // Fetch data from beginning of year instead of last N days for better LLama training
            LocalDateTime fromDate = LocalDateTime.now().withDayOfYear(1).withHour(0).withMinute(0).withSecond(0);
            LocalDateTime toDate = LocalDateTime.now();
            
            String query = """
                query($username: String!, $from: DateTime!, $to: DateTime!) {
                    user(login: $username) {
                        contributionsCollection(from: $from, to: $to) {
                            totalCommitContributions
                            totalIssueContributions
                            totalPullRequestContributions
                            totalPullRequestReviewContributions
                            restrictedContributionsCount
                            contributionCalendar {
                                totalContributions
                                weeks {
                                    contributionDays {
                                        contributionCount
                                        date
                                        weekday
                                    }
                                }
                            }
                            commitContributionsByRepository(maxRepositories: 10) {
                                repository {
                                    name
                                    primaryLanguage {
                                        name
                                    }
                                }
                                contributions(first: 100) {
                                    nodes {
                                        commitCount
                                        occurredAt
                                    }
                                }
                            }
                        }
                        repositories(first: 20, orderBy: {field: UPDATED_AT, direction: DESC}) {
                            nodes {
                                name
                                description
                                stargazerCount
                                forkCount
                                primaryLanguage {
                                    name
                                }
                                languages(first: 5) {
                                    nodes {
                                        name
                                    }
                                }
                                updatedAt
                                createdAt
                            }
                        }
                    }
                }
                """;
            
            Map<String, Object> variables = new HashMap<>();
            variables.put("username", username);
            variables.put("from", fromDate.format(DateTimeFormatter.ISO_DATE_TIME));
            variables.put("to", toDate.format(DateTimeFormatter.ISO_DATE_TIME));
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("query", query);
            requestBody.put("variables", variables);
            
            String requestJson = objectMapper.writeValueAsString(requestBody);
            
            // Choose GraphQL endpoint and token based on type
            String graphqlEndpoint = usePersonalToken 
                ? "https://api.github.com/graphql"
                : (githubOrg != null && !githubOrg.isEmpty()) 
                    ? "https://github." + githubOrg + ".com/api/graphql"
                    : "https://api.github.com/graphql"; // fallback to public if no org configured
            
            String tokenToUse = usePersonalToken ? personalGithubToken : githubToken;
            
            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(graphqlEndpoint))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson));
            
            if (!tokenToUse.isEmpty()) {
                requestBuilder.header("Authorization", "Bearer " + tokenToUse);
            }
            
            HttpRequest request = requestBuilder.build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                JsonNode jsonResponse = objectMapper.readTree(response.body());
                JsonNode userData = jsonResponse.path("data").path("user");
                
                if (!userData.isMissingNode()) {
                    return parseContributionData(userData, username);
                }
            } else {
                System.err.println("GraphQL request failed for " + username + ": " + response.statusCode());
            }
            
        } catch (Exception e) {
            System.err.println("Error fetching contribution data for " + username + ": " + e.getMessage());
        }
        
        return new ContributionData(username, 0, new ArrayList<>(), new ArrayList<>());
    }
    
    private ContributionData parseContributionData(JsonNode userData, String username) {
        JsonNode contributionsCollection = userData.path("contributionsCollection");
        JsonNode contributionCalendar = contributionsCollection.path("contributionCalendar");
        
        int totalContributions = contributionCalendar.path("totalContributions").asInt();
        int restrictedContributions = contributionsCollection.path("restrictedContributionsCount").asInt();
        
        // Extract detailed contribution metrics for better LLama understanding
        int totalCommits = contributionsCollection.path("totalCommitContributions").asInt();
        int totalIssues = contributionsCollection.path("totalIssueContributions").asInt();
        int totalPRs = contributionsCollection.path("totalPullRequestContributions").asInt();
        int totalReviews = contributionsCollection.path("totalPullRequestReviewContributions").asInt();
        
        List<DailyContribution> dailyContributions = new ArrayList<>();
        List<String> insights = new ArrayList<>();
        
        // Parse weekly contribution data with enhanced context
        JsonNode weeks = contributionCalendar.path("weeks");
        if (weeks.isArray()) {
            for (JsonNode week : weeks) {
                JsonNode days = week.path("contributionDays");
                if (days.isArray()) {
                    for (JsonNode day : days) {
                        String date = day.path("date").asText();
                        int count = day.path("contributionCount").asInt();
                        int weekday = day.path("weekday").asInt(0);
                        dailyContributions.add(new DailyContribution(date, count, weekday));
                    }
                }
            }
        }
        
        // Enhanced insights for LLama with year-to-date context
        LocalDateTime startOfYear = LocalDateTime.now().withDayOfYear(1);
        long daysSinceStartOfYear = java.time.temporal.ChronoUnit.DAYS.between(startOfYear, LocalDateTime.now()) + 1;
        
        insights.add("YEAR-TO-DATE SUMMARY (" + daysSinceStartOfYear + " days analyzed):");
        insights.add("Total contributions: " + totalContributions);
        insights.add("Commits: " + totalCommits + ", Issues: " + totalIssues + ", Pull Requests: " + totalPRs + ", Reviews: " + totalReviews);
        
        if (restrictedContributions > 0) {
            insights.add("Private repository contributions: " + restrictedContributions);
        }
        
        // Repository and language analysis
        JsonNode repositories = userData.path("repositories").path("nodes");
        Map<String, Integer> languageStats = new HashMap<>();
        List<String> activeRepos = new ArrayList<>();
        
        if (repositories.isArray()) {
            for (JsonNode repo : repositories) {
                String repoName = repo.path("name").asText();
                activeRepos.add(repoName);
                
                JsonNode primaryLang = repo.path("primaryLanguage");
                if (!primaryLang.isMissingNode()) {
                    String language = primaryLang.path("name").asText();
                    languageStats.put(language, languageStats.getOrDefault(language, 0) + 1);
                }
            }
        }
        
        if (!languageStats.isEmpty()) {
            insights.add("PRIMARY LANGUAGES: " + languageStats.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .map(e -> e.getKey() + " (" + e.getValue() + " repos)")
                .reduce((a, b) -> a + ", " + b).orElse(""));
        }
        
        if (!activeRepos.isEmpty()) {
            insights.add("ACTIVE REPOSITORIES: " + activeRepos.stream().limit(5)
                .reduce((a, b) -> a + ", " + b).orElse("") + 
                (activeRepos.size() > 5 ? " and " + (activeRepos.size() - 5) + " more" : ""));
        }
        
        // Calculate activity patterns
        long activeDays = dailyContributions.stream().mapToLong(d -> d.count > 0 ? 1 : 0).sum();
        long totalDays = dailyContributions.size();
        insights.add("Active days: " + activeDays + " out of " + totalDays + " (" + String.format("%.1f", (activeDays * 100.0 / totalDays)) + "% active)");
        
        double avgContributions = totalContributions / (double) Math.max(1, totalDays);
        insights.add("Average contributions per day: " + String.format("%.2f", avgContributions));
        
        // Calculate streaks and patterns
        int currentStreak = calculateCurrentStreak(dailyContributions);
        int longestStreak = calculateLongestStreak(dailyContributions);
        insights.add("Current contribution streak: " + currentStreak + " days");
        insights.add("Longest contribution streak: " + longestStreak + " days");
        
        // Weekly patterns
        Map<String, Integer> weeklyPattern = analyzeWeeklyPattern(dailyContributions);
        String mostActiveDay = weeklyPattern.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("Unknown");
        insights.add("Most active day of week: " + mostActiveDay);
        
        // Productivity trends
        String trend = analyzeTrend(dailyContributions);
        insights.add("Recent activity trend: " + trend);
        
        // High-activity days
        long highActivityDays = dailyContributions.stream()
                .mapToLong(d -> d.count >= 5 ? 1 : 0).sum();
        if (highActivityDays > 0) {
            insights.add("High-activity days (5+ contributions): " + highActivityDays);
        }
        
        return new ContributionData(username, totalContributions, dailyContributions, insights);
    }
    
    private int calculateCurrentStreak(List<DailyContribution> contributions) {
        if (contributions.isEmpty()) return 0;
        
        int streak = 0;
        // Start from the most recent day and work backwards
        for (int i = contributions.size() - 1; i >= 0; i--) {
            if (contributions.get(i).getCount() > 0) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }
    
    private int calculateLongestStreak(List<DailyContribution> contributions) {
        if (contributions.isEmpty()) return 0;
        
        int longestStreak = 0;
        int currentStreak = 0;
        
        for (DailyContribution day : contributions) {
            if (day.getCount() > 0) {
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        }
        return longestStreak;
    }
    
    private Map<String, Integer> analyzeWeeklyPattern(List<DailyContribution> contributions) {
        Map<String, Integer> weeklyPattern = new HashMap<>();
        String[] dayNames = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
        
        for (String day : dayNames) {
            weeklyPattern.put(day, 0);
        }
        
        for (DailyContribution day : contributions) {
            try {
                LocalDateTime date = LocalDateTime.parse(day.getDate() + "T00:00:00");
                int dayOfWeek = date.getDayOfWeek().getValue() % 7; // Convert to 0-6 (Sunday=0)
                String dayName = dayNames[dayOfWeek];
                weeklyPattern.put(dayName, weeklyPattern.get(dayName) + day.getCount());
            } catch (Exception e) {
                // Skip if date parsing fails
            }
        }
        
        return weeklyPattern;
    }
    
    private String analyzeTrend(List<DailyContribution> contributions) {
        if (contributions.size() < 14) return "insufficient data";
        
        // Compare last 7 days with previous 7 days
        int recent7Days = contributions.subList(contributions.size() - 7, contributions.size())
                .stream().mapToInt(DailyContribution::getCount).sum();
        int previous7Days = contributions.subList(contributions.size() - 14, contributions.size() - 7)
                .stream().mapToInt(DailyContribution::getCount).sum();
        
        if (recent7Days > previous7Days * 1.2) {
            return "increasing (+" + (recent7Days - previous7Days) + " vs previous week)";
        } else if (recent7Days < previous7Days * 0.8) {
            return "decreasing (-" + (previous7Days - recent7Days) + " vs previous week)";
        } else {
            return "stable (~" + recent7Days + " contributions/week)";
        }
    }
    
    // Data classes for GraphQL response
    public static class ContributionData {
        private final String username;
        private final int totalContributions;
        private final List<DailyContribution> dailyContributions;
        private final List<String> insights;
        
        public ContributionData(String username, int totalContributions, 
                              List<DailyContribution> dailyContributions, List<String> insights) {
            this.username = username;
            this.totalContributions = totalContributions;
            this.dailyContributions = dailyContributions;
            this.insights = insights;
        }
        
        // Getters
        public String getUsername() { return username; }
        public int getTotalContributions() { return totalContributions; }
        public List<DailyContribution> getDailyContributions() { return dailyContributions; }
        public List<String> getInsights() { return insights; }
    }
    
    public static class DailyContribution {
        private final String date;
        private final int count;
        private final int weekday;
        
        public DailyContribution(String date, int count) {
            this.date = date;
            this.count = count;
            this.weekday = 0; // Default for backward compatibility
        }
        
        public DailyContribution(String date, int count, int weekday) {
            this.date = date;
            this.count = count;
            this.weekday = weekday;
        }
        
        // Getters
        public String getDate() { return date; }
        public int getCount() { return count; }
        public int getWeekday() { return weekday; }
    }
    
    public static class CommitData {
        private final String sha;
        private final String message;
        private final String author;
        private final String date;
        private final String repository;
        private final String url;

        public CommitData(String sha, String message, String author, String date, String repository, String url) {
            this.sha = sha;
            this.message = message;
            this.author = author;
            this.date = date;
            this.repository = repository;
            this.url = url;
        }

        // Getters
        public String getSha() { return sha; }
        public String getMessage() { return message; }
        public String getAuthor() { return author; }
        public String getDate() { return date; }
        public String getRepository() { return repository; }
        public String getUrl() { return url; }

        @Override
        public String toString() {
            return String.format("Commit in %s by %s on %s:\n%s\nSHA: %s\nURL: %s", 
                    repository, author, date, message, sha.substring(0, 8), url);
        }
    }
}
