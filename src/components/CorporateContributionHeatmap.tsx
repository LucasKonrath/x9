import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';

interface ContributionDay {
  contributionCount: number;
  date: string;
}

interface ContributionWeek {
  contributionDays: ContributionDay[];
}

interface CorporateContributionHeatmapProps {
  corporateUser: string;
  minimal?: boolean;
}

// Helper function to calculate contribution trend
const calculateTrend = (weeks: ContributionWeek[]) => {
  if (!weeks || weeks.length < 8) return { trend: 'neutral', percentage: 0 };
  
  // Get contributions for the last 4 weeks and previous 4 weeks
  const recentWeeks = weeks.slice(-4);
  const previousWeeks = weeks.slice(-8, -4);
  
  const recentTotal = recentWeeks.reduce((sum, week) => 
    sum + week.contributionDays.reduce((daySum, day) => daySum + day.contributionCount, 0), 0);
  
  const previousTotal = previousWeeks.reduce((sum, week) => 
    sum + week.contributionDays.reduce((daySum, day) => daySum + day.contributionCount, 0), 0);
  
  if (previousTotal === 0 && recentTotal === 0) return { trend: 'neutral', percentage: 0 };
  if (previousTotal === 0) return { trend: 'up', percentage: 100 };
  
  const changePercentage = ((recentTotal - previousTotal) / previousTotal) * 100;
  
  console.log('Corporate Trend Debug:', { recentTotal, previousTotal, weeksLength: weeks.length, changePercentage });
  
  if (Math.abs(changePercentage) < 10) return { trend: 'neutral', percentage: Math.round(changePercentage) };
  
  return {
    trend: changePercentage > 0 ? 'up' : 'down',
    percentage: Math.round(Math.abs(changePercentage))
  };
};

const CorporateContributionHeatmap: React.FC<CorporateContributionHeatmapProps> = ({ 
  corporateUser,
  minimal = false 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalContributions, setTotalContributions] = useState(0);
  const [weeks, setWeeks] = useState<ContributionWeek[]>([]);
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setIsLoading(true);
        
        const now = new Date();
        const fromDate = new Date(now);
        fromDate.setDate(now.getDate() - 365); // Fetch data for the last 365 days
        const fromIso = fromDate.toISOString();
        const tomorrow = new Date();
        tomorrow.setDate(now.getDate() + 1); // Include today
        const toIso = tomorrow.toISOString();

        const response = await fetch('/api/github-corporate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`
          },
          body: JSON.stringify({
            query: `query($username: String!, $from: DateTime!, $to: DateTime!) {
              user(login: $username) {
                contributionsCollection(from: $from, to: $to) {
                  contributionCalendar {
                    totalContributions
                    weeks {
                      contributionDays {
                        contributionCount
                        date
                      }
                    }
                  }
                }
              }
            }`,
            variables: { 
              username: corporateUser,
              from: fromIso,
              to: toIso
            }
          })
        });

        if (response.status === 401) {
          console.error('Auth token:', import.meta.env.VITE_GITHUB_TOKEN);
          throw new Error('Unauthorized: Please check GitHub token');
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Corporate contributions data:', data);
        if (!data.data?.user?.contributionsCollection?.contributionCalendar) {
          throw new Error('Invalid response format');
        }

        const calendar = data.data.user.contributionsCollection.contributionCalendar;
        setTotalContributions(calendar.totalContributions);
        setWeeks(calendar.weeks);
      } catch (error) {
        console.error('Error fetching corporate contributions:', error);
        setError('Unable to load contribution data. Please try again later.');
        setTotalContributions(0);
        setWeeks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [corporateUser]);

  const total2025Contributions = weeks.reduce((sum, week) => 
    sum + week.contributionDays.reduce((wSum, day) => 
      wSum + (day.date.startsWith('2025') ? day.contributionCount : 0), 0), 0);
  
  const trendData = calculateTrend(weeks);

  const formatTooltip = (date: string, count: number) => {
    const localDate = new Date(date);
    const formattedDate = format(localDate, 'MMMM d, yyyy');
    const commitText = count === 1 ? 'commit' : 'commits';
    return `${count} ${commitText} on ${formattedDate}`;
  };

  const getContributionColor = (count: number) => {
    if (count === 0) return 'bg-white';
    if (count <= 3) return 'bg-[#4ade80] opacity-40';
    if (count <= 6) return 'bg-[#4ade80] opacity-60';
    if (count <= 9) return 'bg-[#4ade80] opacity-80';
    return 'bg-[#4ade80]';
  };

  const handleSquareHover = (event: React.MouseEvent, date: string, count: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    
    setTooltipContent(formatTooltip(date, count));
    setTooltipPosition({
      x: rect.left + (rect.width / 2),
      y: rect.top - 8
    });
    setShowTooltip(true);
  };

  const getCorporateProfileUrl = (username: string) => {
    const org = import.meta.env.VITE_ORG;
    return org 
      ? `https://github.${org}.com/${username}`
      : `https://github.com/${username}`;
  };

  // Calculate contribution trend
  const { trend, percentage } = calculateTrend(weeks);

  return (
    <div className={`bg-[#1e293b] border border-[#334155] rounded-lg overflow-hidden ${minimal ? 'text-sm' : 'mt-4'}`}>
      <div className="px-4 py-3 border-b border-[#334155]">
        <div className="flex justify-between items-center">
          <h3 className="text-white font-semibold flex items-center">
            {minimal ? 'Corporate Activity' : 'Corporate Contribution Activity'}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[#4ade80] font-medium">
              {total2025Contributions} Corporate Commits in 2025
            </span>
            {trendData.trend !== 'neutral' && (
              <div 
                className="flex items-center gap-1 cursor-help"
                title={`Activity is ${trendData.percentage}% ${trendData.trend === 'up' ? 'higher' : 'lower'} compared to the previous 4 weeks (comparing last 4 weeks vs weeks 5-8)`}
              >
                {trendData.trend === 'up' ? (
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                )}
                <span className={`text-xs font-medium ${trendData.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                  {trendData.percentage}% {trendData.trend === 'up' ? 'up' : 'down'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`${minimal ? 'p-3' : 'p-6'}`}>
        <div className="bg-[#0f172a] rounded border border-[#334155] p-3">
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-pulse flex space-x-1">
                <div className="h-3 w-3 bg-[#4ade80] rounded-full"></div>
                <div className="h-3 w-3 bg-[#4ade80] rounded-full animation-delay-200"></div>
                <div className="h-3 w-3 bg-[#4ade80] rounded-full animation-delay-400"></div>
              </div>
            </div>
          ) : error ? (
            <div className="text-gray-400 text-sm py-4 text-center">{error}</div>
          ) : (
            <div className="flex justify-center min-h-[200px] items-center">
              <div className="flex flex-wrap gap-1 contribution-container">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.contributionDays.map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className={`w-3 h-3 rounded-sm ${getContributionColor(day.contributionCount)} hover:ring-1 hover:ring-white/50`}
                        onMouseEnter={(e) => handleSquareHover(e, day.date, day.contributionCount)}
                        onMouseLeave={() => setShowTooltip(false)}
                      />
                    ))}
                  </div>
                ))}
                {showTooltip && (
                  <div 
                    className="pointer-events-none absolute z-50 px-2 py-1 text-xs font-medium text-white bg-black/90 rounded-md shadow-lg whitespace-nowrap"
                    style={{
                      position: 'fixed',
                      left: `${tooltipPosition.x}px`,
                      top: `${tooltipPosition.y}px`,
                      transform: 'translate(-50%, -100%)',
                    }}
                  >
                    {tooltipContent}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Trend analysis section */}
          {!minimal && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white font-medium">Contribution Trend (last 4 weeks vs 5-8 weeks ago)</span>
                <span className={`font-semibold ${trendData.trend === 'up' ? 'text-green-400' : trendData.trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                  {trendData.trend === 'up' && '↑'}{trendData.trend === 'down' && '↓'} {trendData.percentage}%
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-[#334155]">
                <div 
                  className={`h-1.5 rounded-full ${trendData.trend === 'up' ? 'bg-green-500' : trendData.trend === 'down' ? 'bg-red-500' : 'bg-gray-500'}`}
                  style={{ width: `${Math.min(Math.abs(trendData.percentage), 100)}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Add this inside the bg-[#0f172a] div, after the contribution grid */}
          {!minimal && (
            <div className="mt-3 text-center">
              <a 
                href={getCorporateProfileUrl(corporateUser)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#4ade80] hover:text-[#86efac] hover:underline transition-colors"
              >
                View full profile on GitHub Enterprise
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorporateContributionHeatmap;
