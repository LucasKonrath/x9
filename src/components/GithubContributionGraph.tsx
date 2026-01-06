import React, { useEffect, useState } from 'react';

interface GithubContributionGraphProps {
  username: string;
}

const GithubContributionGraph: React.FC<GithubContributionGraphProps> = ({ username }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalCommits, setTotalCommits] = useState<number>(0);

  const fetchTotalCommits = async (username: string) => {
    try {
      const response = await fetch(`/api/github-stats/${username}`);
      const data = await response.json();
      const currentYear = new Date().getFullYear().toString();
      return data.total[currentYear] || 0;
    } catch (error) {
      console.error('Error fetching commit data:', error);
      return 0;
    }
  };

  useEffect(() => {
    const getTotalCommits = async () => {
      const commits = await fetchTotalCommits(username);
      setTotalCommits(commits);
      setIsLoading(false);
    };

    getTotalCommits();
  }, [username]);

  return (
    <div className="bg-[#1e293b] shadow rounded-lg overflow-hidden border border-[#334155]">
      <div className="px-6 py-4 border-b border-[#334155]">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#4ade80]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            Contribution Activity
          </h3>
          <span className="text-[#4ade80] font-medium">{totalCommits} Commits in {new Date().getFullYear()}</span>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-[#0f172a] rounded border border-[#334155] p-3 overflow-hidden">
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-pulse flex space-x-1">
                <div className="h-3 w-3 bg-[#4ade80] rounded-full"></div>
                <div className="h-3 w-3 bg-[#4ade80] rounded-full animation-delay-200"></div>
                <div className="h-3 w-3 bg-[#4ade80] rounded-full animation-delay-400"></div>
              </div>
            </div>
          ) : (
            <img 
              src={`/api/github-contributions/${username}`}
              alt={`${username}'s GitHub contribution graph`}
              className="max-w-full h-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const errorMsg = document.createElement('p');
                errorMsg.textContent = 'Unable to load contribution graph.';
                errorMsg.className = 'text-gray-400 text-sm py-4 text-center';
                e.currentTarget.parentElement?.appendChild(errorMsg);
              }}
            />
          )}
          
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
        </div>
      </div>
    </div>
  );
};

export default GithubContributionGraph;
