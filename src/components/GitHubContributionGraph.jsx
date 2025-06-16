import React from 'react';
import CorporateContributionHeatmap from './CorporateContributionHeatmap';

function GitHubContributionGraph({ username, corporateUser }) {
  // State to track if the image is loading
  const [isLoading, setIsLoading] = React.useState(true);
  const [totalCommits, setTotalCommits] = React.useState(0);

  // GitHub contribution graph is loaded from an external service
  const contributionUrl = `https://ghchart.rshah.org/${username}`;

  // Function to fetch and parse SVG data
  const fetchTotalCommits = async () => {
    try {
      const response = await fetch(`/api/github-stats/${username}`);
      const data = await response.json();
      const commits = data.total['2025'] || 0;
      setTotalCommits(commits);
    } catch (error) {
      console.error('Error fetching commit data:', error);
    }
  };

  React.useEffect(() => {
    fetchTotalCommits();
  }, [username]);

  return (
    <div>
      {/* Existing public contribution graph */}
      <div className="mb-6 bg-[#1e293b] border border-[#334155] rounded-lg p-4 shadow-md">
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#4ade80]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Contribution Activity
            </h3>
            <span className="text-[#4ade80] font-medium">{totalCommits} Commits Last Year</span>
          </div>

          <div className="bg-[#0f172a] rounded border border-[#334155] p-3 overflow-hidden">
            <div className="flex justify-center">
              {isLoading && (
                <div className="h-32 flex items-center justify-center">
                  <div className="animate-pulse flex space-x-1">
                    <div className="h-3 w-3 bg-[#4ade80] rounded-full"></div>
                    <div className="h-3 w-3 bg-[#4ade80] rounded-full animation-delay-200"></div>
                    <div className="h-3 w-3 bg-[#4ade80] rounded-full animation-delay-400"></div>
                  </div>
                </div>
              )}
              <img 
                src={contributionUrl} 
                alt={`${username}'s GitHub contribution graph`} 
                className={`max-w-full h-auto transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                style={{ filter: 'brightness(0.95) hue-rotate(10deg)' }} // Apply slight adjustment to match theme
                onLoad={() => setIsLoading(false)}
                onError={(e) => {
                  setIsLoading(false);
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  const container = e.target.parentNode;
                  const errorMsg = document.createElement('p');
                  errorMsg.textContent = 'Unable to load contribution graph. Check your connection or try again later.';
                  errorMsg.className = 'text-gray-400 text-sm py-4';
                  container.appendChild(errorMsg);
                }}
              />
            </div>

            <div className="mt-2 text-xs text-gray-400 flex justify-between items-center">
              <span>Less</span>
              <div className="flex space-x-1">
                <span className="inline-block w-3 h-3 bg-[#0e4429] rounded-sm opacity-20"></span>
                <span className="inline-block w-3 h-3 bg-[#0e4429] rounded-sm opacity-40"></span>
                <span className="inline-block w-3 h-3 bg-[#0e4429] rounded-sm opacity-60"></span>
                <span className="inline-block w-3 h-3 bg-[#0e4429] rounded-sm opacity-80"></span>
                <span className="inline-block w-3 h-3 bg-[#0e4429] rounded-sm"></span>
              </div>
              <span>More</span>
            </div>

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
      
      {/* Add corporate contribution heatmap */}
      <CorporateContributionHeatmap corporateUser={corporateUser} />
    </div>
  );
}

export default GitHubContributionGraph;
