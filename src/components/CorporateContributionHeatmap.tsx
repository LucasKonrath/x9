import React, { useEffect, useState } from 'react';

interface ContributionDay {
  contributionCount: number;
  date: string;
}

interface ContributionWeek {
  contributionDays: ContributionDay[];
}

interface CorporateContributionHeatmapProps {
  username: string;
}

const CorporateContributionHeatmap: React.FC<CorporateContributionHeatmapProps> = ({ username }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalContributions, setTotalContributions] = useState(0);
  const [weeks, setWeeks] = useState<ContributionWeek[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setIsLoading(true);

        const response = await fetch('/api/github-corporate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`,
            'X-Github-Next-Global-ID': '1'
          },
          body: JSON.stringify({
            query: `query($username: String!) {
              user(login: $username) {
                contributionsCollection {
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
            variables: { username }
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
  }, [username]);

  const getContributionColor = (count: number) => {
    if (count === 0) return 'bg-white';
    if (count <= 3) return 'bg-[#4ade80] opacity-40';
    if (count <= 6) return 'bg-[#4ade80] opacity-60';
    if (count <= 9) return 'bg-[#4ade80] opacity-80';
    return 'bg-[#4ade80]';
  };

  return (
    <div className="bg-[#1e293b] shadow rounded-lg overflow-hidden border border-[#334155] mt-4">
      <div className="px-6 py-4 border-b border-[#334155]">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white flex items-center">
            Corporate Contribution Activity
          </h3>
          <span className="text-[#4ade80] font-medium">
            {totalContributions} Corporate Commits in 2025
          </span>
        </div>
      </div>

      <div className="p-6">
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
            <div className="flex flex-wrap gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.contributionDays.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`w-3 h-3 rounded-sm ${getContributionColor(day.contributionCount)}`}
                      title={`${day.date}: ${day.contributionCount} contributions`}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorporateContributionHeatmap;
