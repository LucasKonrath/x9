import React, { useState } from 'react';
import { contributionsQuery, fetchGraphQL } from '../utils/graphql';
import CorporateContributionHeatmap from './CorporateContributionHeatmap';
import { format } from 'date-fns';

function GitHubContributionGraph({ username, corporateUser }) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [contributions, setContributions] = React.useState(null);
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  React.useEffect(() => {
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
        console.error('Error fetching contributions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContributions();
  }, [username]);

  const getContributionColor = (count) => {
    if (count === 0) return 'bg-white';
    if (count <= 3) return 'bg-[#4ade80] opacity-40';
    if (count <= 6) return 'bg-[#4ade80] opacity-60';
    if (count <= 9) return 'bg-[#4ade80] opacity-80';
    return 'bg-[#4ade80]';
  };

  const handleSquareHover = (event, date, count) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const localDate = new Date(date);
    
    setTooltipContent(`${count} contributions on ${format(localDate, 'MMM d, yyyy')}`);
    setTooltipPosition({
      x: rect.left + (rect.width / 2),
      y: rect.top - 8
    });
    setShowTooltip(true);
  };

  const total2025Contributions = contributions?.weeks?.reduce((sum, week) => 
    sum + week.contributionDays.reduce((wSum, day) => 
      wSum + (day.date.startsWith('2025') ? day.contributionCount : 0), 0), 0) || 0;

  return (
    <div>
      <div className="mb-6 bg-[#1e293b] border border-[#334155] rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[#334155]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#4ade80]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Contribution Activity
            </h3>
            <span className="text-[#4ade80] font-medium">
              {total2025Contributions} Commits in 2025
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-[#0f172a] rounded border border-[#334155] p-3">
            <div className="flex justify-center min-h-[200px] items-center">
              {isLoading ? (
                <div className="h-32 flex items-center justify-center">
                  <div className="animate-pulse flex space-x-1">
                    <div className="h-3 w-3 bg-[#4ade80] rounded-full"></div>
                    <div className="h-3 w-3 bg-[#4ade80] rounded-full animation-delay-200"></div>
                    <div className="h-3 w-3 bg-[#4ade80] rounded-full animation-delay-400"></div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1 contribution-container">
                  {contributions?.weeks?.map((week, weekIndex) => (
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
              )}
            </div>

            {/* Remove legend section and keep only the profile link */}
            <div className="mt-3 text-center">
              <a 
                href={`https://github.com/${username}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-[#4ade80] hover:text-[#86efac] hover:underline transition-colors"
              >
                View full profile on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {corporateUser && <CorporateContributionHeatmap corporateUser={corporateUser} />}
    </div>
  );
}

export default GitHubContributionGraph;
