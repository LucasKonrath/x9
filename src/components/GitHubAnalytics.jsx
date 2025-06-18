import React, { useState, useEffect } from 'react';
import { format, parseISO, differenceInDays, startOfDay, eachDayOfInterval, subDays } from 'date-fns';
import { contributionsQuery, fetchGraphQL } from '../utils/graphql';

function GitHubAnalytics({ username, events = [] }) {
  const [contributions, setContributions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [repositoryData, setRepositoryData] = useState([]);

  useEffect(() => {
    const fetchContributions = async () => {
      try {
        setIsLoading(true);
        const now = new Date();
        const fromDate = new Date(now);
        fromDate.setFullYear(fromDate.getFullYear() - 1);

        const data = await fetchGraphQL(contributionsQuery, {
          username,
          from: fromDate.toISOString(),
          to: now.toISOString()
        }, true);

        setContributions(data.data.user.contributionsCollection.contributionCalendar);
      } catch (error) {
        console.error('Error fetching contributions for analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (username) {
      fetchContributions();
    }
  }, [username]);

  if (isLoading) {
    return (
      <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-400">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!contributions) {
    return (
      <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-400">No contribution data available</div>
        </div>
      </div>
    );
  }

  // Extract contribution days from the GraphQL data
  const contributionDays = contributions.weeks?.flatMap(week => 
    week.contributionDays.map(day => ({
      date: day.date,
      count: day.contributionCount
    }))
  ) || [];

  // Calculate productivity trends (commits per day over last 30 days)
  const calculateProductivityTrends = () => {
    const now = startOfDay(new Date());
    const thirtyDaysAgo = subDays(now, 29); // 30 days total including today
    
    // Create array of all days in the last 30 days
    const allDays = eachDayOfInterval({ start: thirtyDaysAgo, end: now });
    
    // Create a map for quick lookup of contribution data
    const contributionMap = {};
    contributionDays.forEach(day => {
      contributionMap[day.date] = day.count;
    });

    // Create trend data
    const trendData = allDays.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return {
        date: dateKey,
        commits: contributionMap[dateKey] || 0,
        dayOfWeek: format(day, 'EEE')
      };
    });

    return trendData;
  };

  // Calculate streak analysis
  const calculateStreakAnalysis = () => {
    if (contributionDays.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalActiveDays: 0,
        consistencyScore: 0
      };
    }

    // Get unique days with contributions (only days with count > 0)
    const activeDays = contributionDays
      .filter(day => day.count > 0)
      .map(day => day.date)
      .sort(); // Sort chronologically (oldest first)

    if (activeDays.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalActiveDays: 0,
        consistencyScore: 0
      };
    }

    // Calculate current streak (from most recent commit working backwards)
    let currentStreak = 0;
    const today = startOfDay(new Date());
    const mostRecentActiveDay = startOfDay(new Date(activeDays[activeDays.length - 1]));
    
    // Check if the most recent contribution is today or yesterday
    const daysSinceLastContribution = differenceInDays(today, mostRecentActiveDay);
    
    if (daysSinceLastContribution <= 1) { // Allow for timezone differences and "yesterday counts"
      currentStreak = 1;
      
      // Work backwards from the most recent day to find consecutive days
      for (let i = activeDays.length - 2; i >= 0; i--) {
        const currentDay = startOfDay(new Date(activeDays[i + 1]));
        const previousDay = startOfDay(new Date(activeDays[i]));
        const dayDiff = differenceInDays(currentDay, previousDay);
        
        if (dayDiff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 1;
    let tempStreak = 1;
    
    for (let i = 1; i < activeDays.length; i++) {
      const currentDay = startOfDay(new Date(activeDays[i]));
      const previousDay = startOfDay(new Date(activeDays[i - 1]));
      const dayDiff = differenceInDays(currentDay, previousDay);
      
      if (dayDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak); // Don't forget the last streak

    // Calculate consistency (active days in last 30 days)
    const thirtyDaysAgo = subDays(startOfDay(new Date()), 30);
    const recentActiveDays = activeDays.filter(day => 
      startOfDay(new Date(day)) >= thirtyDaysAgo
    ).length;
    const consistencyScore = Math.round((recentActiveDays / 30) * 100);

    return {
      currentStreak,
      longestStreak,
      totalActiveDays: activeDays.length,
      consistencyScore
    };
  };

  // Calculate repository language statistics
  const calculateRepositoryStats = () => {
    const repoMap = new Map();
    const languageMap = new Map();
    
    events.forEach(event => {
      if (event.type === 'PushEvent' && event.payload?.commits) {
        const repoName = event.repo.name;
        
        if (!repoMap.has(repoName)) {
          repoMap.set(repoName, {
            name: repoName,
            commits: 0,
            lastActivity: event.created_at,
            languages: new Set()
          });
        }
        
        const repo = repoMap.get(repoName);
        repo.commits += event.payload.commits.length;
        
        // Infer language from repository name patterns (basic heuristics)
        const inferLanguage = (repoName) => {
          const lower = repoName.toLowerCase();
          if (lower.includes('react') || lower.includes('next') || lower.includes('js')) return 'JavaScript';
          if (lower.includes('python') || lower.includes('py') || lower.includes('django')) return 'Python';
          if (lower.includes('java') && !lower.includes('javascript')) return 'Java';
          if (lower.includes('go') || lower.includes('golang')) return 'Go';
          if (lower.includes('rust') || lower.includes('rs')) return 'Rust';
          if (lower.includes('cpp') || lower.includes('c++')) return 'C++';
          if (lower.includes('swift') || lower.includes('ios')) return 'Swift';
          if (lower.includes('kotlin') || lower.includes('android')) return 'Kotlin';
          if (lower.includes('php')) return 'PHP';
          if (lower.includes('ruby') || lower.includes('rails')) return 'Ruby';
          return 'Other';
        };
        
        const language = inferLanguage(repoName);
        repo.languages.add(language);
        
        languageMap.set(language, (languageMap.get(language) || 0) + event.payload.commits.length);
      }
    });
    
    const topRepositories = Array.from(repoMap.values())
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 5);
    
    const languageStats = Array.from(languageMap.entries())
      .map(([language, commits]) => ({ language, commits }))
      .sort((a, b) => b.commits - a.commits);
    
    return { topRepositories, languageStats };
  };

  // Analyze commit messages for conventional commits and patterns
  const analyzeCommitMessages = () => {
    const commitMessages = [];
    const typeMap = new Map();
    const timeMap = new Map();
    
    events.forEach(event => {
      if (event.type === 'PushEvent' && event.payload?.commits) {
        event.payload.commits.forEach(commit => {
          commitMessages.push({
            message: commit.message,
            date: event.created_at,
            repo: event.repo.name
          });
          
          // Analyze conventional commit patterns
          const conventionalMatch = commit.message.match(/^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\(.+\))?\!?:/);
          const type = conventionalMatch ? conventionalMatch[1] : 'other';
          typeMap.set(type, (typeMap.get(type) || 0) + 1);
          
          // Analyze commit timing
          const hour = new Date(event.created_at).getHours();
          timeMap.set(hour, (timeMap.get(hour) || 0) + 1);
        });
      }
    });
    
    const commitTypes = Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
    
    const peakHours = Array.from(timeMap.entries())
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    const conventionalCommitsPercentage = commitMessages.length > 0 
      ? Math.round(((commitMessages.length - (typeMap.get('other') || 0)) / commitMessages.length) * 100)
      : 0;
    
    return {
      totalCommits: commitMessages.length,
      commitTypes,
      peakHours,
      conventionalCommitsPercentage,
      avgMessageLength: commitMessages.length > 0 
        ? Math.round(commitMessages.reduce((sum, c) => sum + c.message.length, 0) / commitMessages.length)
        : 0
    };
  };

  // Calculate file type contributions
  const calculateFileTypeStats = () => {
    const fileTypeMap = new Map();
    
    events.forEach(event => {
      if (event.type === 'PushEvent' && event.payload?.commits) {
        event.payload.commits.forEach(commit => {
          // Extract file extensions from commit message (basic heuristics)
          const extensions = commit.message.match(/\.([a-zA-Z0-9]+)/g) || [];
          extensions.forEach(ext => {
            const cleanExt = ext.toLowerCase();
            fileTypeMap.set(cleanExt, (fileTypeMap.get(cleanExt) || 0) + 1);
          });
        });
      }
    });
    
    return Array.from(fileTypeMap.entries())
      .map(([extension, count]) => ({ extension, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  // Calculate branch management insights
  const calculateBranchInsights = () => {
    const branchMap = new Map();
    const repoToBranches = new Map();
    
    events.forEach(event => {
      if (event.type === 'PushEvent' && event.payload?.ref) {
        const branchName = event.payload.ref.replace('refs/heads/', '');
        const repoName = event.repo.name;
        
        // Track branch usage
        if (!branchMap.has(branchName)) {
          branchMap.set(branchName, {
            name: branchName,
            commits: 0,
            repos: new Set(),
            lastActivity: event.created_at
          });
        }
        
        const branch = branchMap.get(branchName);
        branch.commits += event.payload.commits?.length || 0;
        branch.repos.add(repoName);
        
        // Track repo to branches
        if (!repoToBranches.has(repoName)) {
          repoToBranches.set(repoName, new Set());
        }
        repoToBranches.get(repoName).add(branchName);
      }
      
      // Track branch creation events
      if (event.type === 'CreateEvent' && event.payload?.ref_type === 'branch') {
        const branchName = event.payload.ref;
        if (branchName && !branchMap.has(branchName)) {
          branchMap.set(branchName, {
            name: branchName,
            commits: 0,
            repos: new Set([event.repo.name]),
            lastActivity: event.created_at,
            created: true
          });
        }
      }
    });
    
    // Convert to arrays and calculate insights
    const branches = Array.from(branchMap.values()).map(branch => ({
      ...branch,
      repos: Array.from(branch.repos),
      repoCount: branch.repos.size
    }));
    
    const branchStats = {
      totalBranches: branches.length,
      mainBranchCommits: branches.find(b => b.name === 'main' || b.name === 'master')?.commits || 0,
      featureBranches: branches.filter(b => b.name.includes('feature') || b.name.includes('feat')).length,
      bugfixBranches: branches.filter(b => b.name.includes('fix') || b.name.includes('bug')).length,
      developmentBranches: branches.filter(b => b.name.includes('dev') || b.name.includes('develop')).length,
      mostActiveBranches: branches
        .sort((a, b) => b.commits - a.commits)
        .slice(0, 5)
    };
    
    return branchStats;
  };

  const trendData = calculateProductivityTrends();
  const streakData = calculateStreakAnalysis();
  const repositoryStats = calculateRepositoryStats();
  const commitAnalysis = analyzeCommitMessages();
  const fileTypeStats = calculateFileTypeStats();
  const branchInsights = calculateBranchInsights();

  // Calculate trend direction
  const recentCommits = trendData.slice(-7).reduce((sum, day) => sum + day.commits, 0);
  const previousCommits = trendData.slice(-14, -7).reduce((sum, day) => sum + day.commits, 0);
  const trendDirection = recentCommits > previousCommits ? 'up' : recentCommits < previousCommits ? 'down' : 'stable';

  // Get max commits for chart scaling
  const maxCommits = Math.max(...trendData.map(d => d.commits), 1);

  // Debug logging
  console.log('Analytics Debug:', {
    totalContributionDays: contributionDays.length,
    activeDays: contributionDays.filter(day => day.count > 0).length,
    trendDataLength: trendData.length,
    maxCommits,
    totalCommitsInPeriod: trendData.reduce((sum, day) => sum + day.commits, 0),
    streakData,
    sampleTrendData: trendData.slice(0, 5),
    totalContributions: contributions.totalContributions
  });

  // Intensity analysis (new feature)
  const calculateContributionIntensity = () => {
    const intensityLevels = {
      light: 0,
      moderate: 0,
      heavy: 0,
      intense: 0
    };
    
    let totalContributions = 0;
    
    contributionDays.forEach(day => {
      if (day.count >= 1 && day.count <= 2) {
        intensityLevels.light++;
      } else if (day.count >= 3 && day.count <= 5) {
        intensityLevels.moderate++;
      } else if (day.count >= 6 && day.count <= 10) {
        intensityLevels.heavy++;
      } else if (day.count > 10) {
        intensityLevels.intense++;
      }
      
      totalContributions += day.count;
    });
    
    const averageIntensity = totalContributions / contributionDays.length;
    
    return { intensityLevels, averageIntensity };
  };

  const intensityAnalysis = calculateContributionIntensity();

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6 space-y-6">
      <h3 className="text-lg font-semibold text-white flex items-center">
        <svg className="w-5 h-5 text-[#4ade80] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        GitHub Analytics
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Streak Analysis */}
        <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
          <h4 className="text-md font-medium text-white mb-4">Streak Analysis</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#4ade80]">{streakData.currentStreak}</div>
              <div className="text-sm text-gray-400">Current Streak</div>
              <div className="text-xs text-gray-500">days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#4ade80]">{streakData.longestStreak}</div>
              <div className="text-sm text-gray-400">Longest Streak</div>
              <div className="text-xs text-gray-500">days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#4ade80]">{streakData.totalActiveDays}</div>
              <div className="text-sm text-gray-400">Total Active</div>
              <div className="text-xs text-gray-500">days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#4ade80]">{streakData.consistencyScore}%</div>
              <div className="text-sm text-gray-400">Consistency</div>
              <div className="text-xs text-gray-500">last 30 days</div>
            </div>
          </div>
        </div>

        {/* Productivity Trend */}
        <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
          <h4 className="text-md font-medium text-white mb-4 flex items-center justify-between">
            <span>30-Day Productivity Trend</span>
            <div className="flex items-center gap-1">
              {trendDirection === 'up' && (
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              )}
              {trendDirection === 'down' && (
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
              {trendDirection === 'stable' && (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14" />
                </svg>
              )}
              <span className={`text-xs ${trendDirection === 'up' ? 'text-green-400' : trendDirection === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                {trendDirection}
              </span>
            </div>
          </h4>
          
          {/* Mini chart */}
          {trendData && trendData.length > 0 ? (
            <>
              <div className="h-32 flex items-end justify-between gap-px">
                {trendData.map((day, index) => (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center group relative"
                    title={`${day.dayOfWeek} ${format(new Date(day.date), 'M/d')}: ${day.commits} commits`}
                  >
                    <div
                      className={`w-full rounded-t ${
                        day.commits > 0 ? 'bg-[#4ade80]' : 'bg-[#334155]'
                      } transition-all hover:opacity-80 min-h-[2px]`}
                      style={{
                        height: `${Math.max((day.commits / maxCommits) * 80, day.commits > 0 ? 8 : 2)}px`,
                      }}
                    />
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      {format(new Date(day.date), 'MMM d')}: {day.commits} commits
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Date labels */}
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{format(new Date(trendData[0]?.date), 'MMM d')}</span>
                <span>{format(new Date(trendData[Math.floor(trendData.length / 2)]?.date), 'MMM d')}</span>
                <span>{format(new Date(trendData[trendData.length - 1]?.date), 'MMM d')}</span>
              </div>
            </>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div className="text-sm">No activity data available</div>
              </div>
            </div>
          )}
          
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-400">
              Last 30 days: <span className="text-[#4ade80] font-medium">
                {trendData.reduce((sum, day) => sum + day.commits, 0)} commits
              </span>
              {recentCommits > 0 && (
                <span className="ml-2 text-xs">
                  ({Math.round(trendData.reduce((sum, day) => sum + day.commits, 0) / 30 * 10) / 10} avg/day)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contribution Intensity */}
        <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
          <h4 className="text-md font-medium text-white mb-4">Contribution Intensity (Last 30 Days)</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-400">{intensityAnalysis.intensityLevels.light}</div>
              <div className="text-xs text-gray-400">Light Days</div>
              <div className="text-xs text-gray-500">1-2 contributions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-400">{intensityAnalysis.intensityLevels.moderate}</div>
              <div className="text-xs text-gray-400">Moderate Days</div>
              <div className="text-xs text-gray-500">3-5 contributions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-400">{intensityAnalysis.intensityLevels.heavy}</div>
              <div className="text-xs text-gray-400">Heavy Days</div>
              <div className="text-xs text-gray-500">6-10 contributions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-400">{intensityAnalysis.intensityLevels.intense}</div>
              <div className="text-xs text-gray-400">Intense Days</div>
              <div className="text-xs text-gray-500">10+ contributions</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#334155] text-center">
            <div className="text-sm text-gray-400">
              Average intensity: <span className="text-[#4ade80] font-medium">
                {intensityAnalysis.averageIntensity.toFixed(1)} contributions/day
              </span>
            </div>
          </div>
        </div>

        {/* Repository Language Statistics */}
        <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
          <h4 className="text-md font-medium text-white mb-4">Language Distribution</h4>
          <div className="space-y-3">
            {repositoryStats.languageStats.slice(0, 5).map((lang, index) => (
              <div key={lang.language} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    index === 0 ? 'bg-blue-400' :
                    index === 1 ? 'bg-green-400' :
                    index === 2 ? 'bg-yellow-400' :
                    index === 3 ? 'bg-purple-400' : 'bg-gray-400'
                  }`} />
                  <span className="text-sm text-gray-300">{lang.language}</span>
                </div>
                <span className="text-sm text-gray-400">{lang.commits} commits</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[#334155]">
            <div className="text-sm text-gray-400 text-center">
              Most used: <span className="text-[#4ade80] font-medium">
                {repositoryStats.languageStats[0]?.language || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Top Repositories */}
        <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
          <h4 className="text-md font-medium text-white mb-4">Most Active Repositories</h4>
          <div className="space-y-3">
            {repositoryStats.topRepositories.map((repo, index) => (
              <div key={repo.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-mono text-gray-400">#{index + 1}</span>
                  <span className="text-sm text-gray-300 truncate">{repo.name.split('/')[1] || repo.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-[#4ade80]">{repo.commits}</div>
                  <div className="text-xs text-gray-500">commits</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commit Message Analysis */}
        <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
          <h4 className="text-md font-medium text-white mb-4">Commit Message Analysis</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-[#4ade80]">{commitAnalysis.conventionalCommitsPercentage}%</div>
              <div className="text-xs text-gray-400">Conventional</div>
              <div className="text-xs text-gray-500">commits</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[#4ade80]">{commitAnalysis.avgMessageLength}</div>
              <div className="text-xs text-gray-400">Avg Length</div>
              <div className="text-xs text-gray-500">characters</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-xs text-gray-400 mb-2">Most Used Types:</div>
            {commitAnalysis.commitTypes.slice(0, 3).map((type, index) => (
              <div key={type.type} className="flex items-center justify-between">
                <span className="text-sm text-gray-300 capitalize">{type.type}</span>
                <span className="text-sm text-gray-400">{type.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Hours Analysis */}
        <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
          <h4 className="text-md font-medium text-white mb-4">Peak Coding Hours</h4>
          <div className="space-y-3">
            {commitAnalysis.peakHours.map((peak, index) => (
              <div key={peak.hour} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">#{index + 1}</span>
                  <span className="text-sm text-gray-300">
                    {peak.hour.toString().padStart(2, '0')}:00 - {(peak.hour + 1).toString().padStart(2, '0')}:00
                  </span>
                </div>
                <span className="text-sm text-[#4ade80]">{peak.count} commits</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[#334155] text-center">
            <div className="text-sm text-gray-400">
              Most productive at: <span className="text-[#4ade80] font-medium">
                {commitAnalysis.peakHours[0]?.hour.toString().padStart(2, '0')}:00
              </span>
            </div>
          </div>
        </div>

        {/* File Type Distribution */}
        <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
          <h4 className="text-md font-medium text-white mb-4">File Type Activity</h4>
          <div className="space-y-2">
            {fileTypeStats.slice(0, 6).map((fileType, index) => (
              <div key={fileType.extension} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-[#334155] px-2 py-1 rounded text-gray-300">
                    {fileType.extension}
                  </code>
                </div>
                <span className="text-sm text-gray-400">{fileType.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Branch Management Insights */}
        <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
          <h4 className="text-md font-medium text-white mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            Branch Management
          </h4>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-[#4ade80]">{branchInsights.totalBranches}</div>
              <div className="text-xs text-gray-400">Total Branches</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[#4ade80]">{branchInsights.mainBranchCommits}</div>
              <div className="text-xs text-gray-400">Main Branch Commits</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center bg-[#1e293b] rounded p-2">
              <div className="text-sm font-bold text-blue-400">{branchInsights.featureBranches}</div>
              <div className="text-xs text-gray-500">Feature</div>
            </div>
            <div className="text-center bg-[#1e293b] rounded p-2">
              <div className="text-sm font-bold text-red-400">{branchInsights.bugfixBranches}</div>
              <div className="text-xs text-gray-500">Bugfix</div>
            </div>
            <div className="text-center bg-[#1e293b] rounded p-2">
              <div className="text-sm font-bold text-green-400">{branchInsights.developmentBranches}</div>
              <div className="text-xs text-gray-500">Development</div>
            </div>
          </div>

          {branchInsights.mostActiveBranches.length > 0 && (
            <>
              <div className="text-xs text-gray-400 mb-2">Most Active Branches:</div>
              <div className="space-y-2">
                {branchInsights.mostActiveBranches.slice(0, 3).map((branch, index) => (
                  <div key={branch.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-400">#{index + 1}</span>
                      <code className="text-xs bg-[#334155] px-2 py-1 rounded text-gray-300 truncate">
                        {branch.name}
                      </code>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-[#4ade80]">{branch.commits}</div>
                      <div className="text-xs text-gray-500">commits</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default GitHubAnalytics;
