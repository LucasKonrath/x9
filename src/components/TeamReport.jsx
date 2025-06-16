import React, { useState, useEffect } from 'react';
import { contributionsQuery, fetchGraphQL } from '../utils/graphql';
import { fetchMarkdownPosts } from '../services/githubService';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import CorporateContributionHeatmap from './CorporateContributionHeatmap';
import GitHubContributionGraph from './GitHubContributionGraph';

function TeamReport({ users, onClose }) {
  const [isLoading, setIsLoading] = useState(true);
  const [teamData, setTeamData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeamData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userData = await Promise.all(users.map(async (username) => {
          // Fetch personal contributions
          const now = new Date();
          const fromDate = new Date(now);
          fromDate.setFullYear(fromDate.getFullYear() - 1);

          const personalData = await fetchGraphQL(contributionsQuery, {
            username,
            from: fromDate.toISOString(),
            to: now.toISOString()
          }, true);

          // Fetch corporate contributions
          const corporateData = await fetchGraphQL(contributionsQuery, {
            username,
            from: '2025-01-01T00:00:00Z',
            to: now.toISOString()
          }, false);

          // Fetch latest meeting notes
          const markdownPosts = await fetchMarkdownPosts(username);
          const latestNote = markdownPosts.length > 0 ? markdownPosts[0] : null;

          // Calculate 2025 contributions
          const personal2025Contributions = personalData.data.user.contributionsCollection.contributionCalendar.weeks
            .reduce((sum, week) => sum + week.contributionDays
              .reduce((daySum, day) => daySum + (day.date.startsWith('2025') ? day.contributionCount : 0), 0), 0);

          const corporate2025Contributions = corporateData.data.user.contributionsCollection.contributionCalendar.weeks
            .reduce((sum, week) => sum + week.contributionDays
              .reduce((daySum, day) => daySum + (day.date.startsWith('2025') ? day.contributionCount : 0), 0), 0);

          return {
            username,
            personal2025Contributions,
            corporate2025Contributions,
            latestNote
          };
        }));

        setTeamData(userData);
      } catch (err) {
        console.error('Error fetching team data:', err);
        setError('Failed to load team data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamData();
  }, [users]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6 w-full max-w-4xl mx-4">
          <div className="text-red-400 text-center">
            <p>{error}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-[#334155] text-white rounded hover:bg-[#475569]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Team Activity Report</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse flex space-x-2">
              <div className="h-4 w-4 bg-[#4ade80] rounded-full"></div>
              <div className="h-4 w-4 bg-[#4ade80] rounded-full animation-delay-200"></div>
              <div className="h-4 w-4 bg-[#4ade80] rounded-full animation-delay-400"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {teamData.map((userData) => (
              <div
                key={userData.username}
                className="bg-[#0f172a] border border-[#334155] rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-white">
                    {userData.username}
                  </h3>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Personal Commits (2025)</p>
                      <p className="text-lg font-medium text-[#4ade80]">
                        {userData.personal2025Contributions}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Corporate Commits (2025)</p>
                      <p className="text-lg font-medium text-[#4ade80]">
                        {userData.corporate2025Contributions}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <GitHubContributionGraph username={userData.username} minimal={true} />
                  <CorporateContributionHeatmap corporateUser={userData.username} minimal={true} />
                </div>

                {userData.latestNote && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2 flex justify-between items-center">
                      <span>Latest Meeting Notes</span>
                      <span className="text-[#4ade80]">
                        {userData.latestNote.date}
                      </span>
                    </h4>
                    <div className="bg-[#1e293b] rounded p-4">
                      <div className="prose prose-invert max-w-none">
                        <ReactMarkdown>{userData.latestNote.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamReport;
