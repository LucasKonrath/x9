import React, { useState, useEffect } from 'react';
import { format, parseISO, differenceInDays, startOfDay, eachDayOfInterval, subDays } from 'date-fns';
import { contributionsQuery, fetchGraphQL } from '../utils/graphql';

function GitHubAnalytics({ username }) {
  const [contributions, setContributions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const trendData = calculateProductivityTrends();
  const streakData = calculateStreakAnalysis();

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
      </div>
    </div>
  );
}

export default GitHubAnalytics;
