import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { contributionsQuery, fetchGraphQL } from '../utils/graphql';

const GitHubRanking = ({ users = [], corporateUsers = [] }) => {
  const { theme } = useTheme();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [rankingType, setRankingType] = useState('combined'); // 'personal', 'corporate', 'combined'
  const [includePrivate, setIncludePrivate] = useState(true); // true = public + private, false = public only

  // Re-sort rankings when filters change
  useEffect(() => {
    if (rankings.length > 0) {
      const sortedRankings = [...rankings].sort((a, b) => getRankingValue(b) - getRankingValue(a));
      setRankings(sortedRankings);
    }
  }, [rankingType, includePrivate]);

  const fetchContributionsRanking = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const fromDate = new Date(`${selectedYear}-01-01T00:00:00Z`);
      const toDate = new Date(`${selectedYear}-12-31T23:59:59Z`);
      
      const rankingData = await Promise.all(
        users.map(async (username, index) => {
          try {
            // Fetch personal contributions
            const personalData = await fetchGraphQL(contributionsQuery, {
              username,
              from: fromDate.toISOString(),
              to: toDate.toISOString()
            }, true);

            // Fetch corporate contributions
            const corporateUser = corporateUsers[index];
            let corporateData = null;
            if (corporateUser) {
              try {
                corporateData = await fetchGraphQL(contributionsQuery, {
                  username: corporateUser,
                  from: fromDate.toISOString(),
                  to: toDate.toISOString()
                }, false);
              } catch (corpError) {
                console.warn(`Failed to fetch corporate data for ${corporateUser}:`, corpError);
              }
            }

            const personalContributions = personalData?.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions || 0;
            const personalPrivateContributions = personalData?.data?.user?.contributionsCollection?.restrictedContributionsCount || 0;
            const personalPublicContributions = personalContributions - personalPrivateContributions;

            const corporateContributions = corporateData?.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions || 0;
            const corporatePrivateContributions = corporateData?.data?.user?.contributionsCollection?.restrictedContributionsCount || 0;
            const corporatePublicContributions = corporateContributions - corporatePrivateContributions;

            return {
              username,
              corporateUser,
              personalContributions: {
                total: personalContributions,
                public: personalPublicContributions,
                private: personalPrivateContributions
              },
              corporateContributions: {
                total: corporateContributions,
                public: corporatePublicContributions,
                private: corporatePrivateContributions
              },
              success: true
            };
          } catch (userError) {
            console.error(`Error fetching data for ${username}:`, userError);
            return {
              username,
              corporateUser: corporateUsers[index],
              personalContributions: {
                total: 0,
                public: 0,
                private: 0
              },
              corporateContributions: {
                total: 0,
                public: 0,
                private: 0
              },
              success: false,
              error: userError.message
            };
          }
        })
      );

      // Sort based on ranking type and privacy filter
      const sortedRankings = rankingData.sort((a, b) => getRankingValue(b) - getRankingValue(a));

      setRankings(sortedRankings);
    } catch (err) {
      console.error('Error fetching contributions ranking:', err);
      setError('Failed to fetch contributions data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRankingValue = (user) => {
    const getContributionCount = (contributions) => {
      return includePrivate ? contributions.total : contributions.public;
    };

    switch (rankingType) {
      case 'personal':
        return getContributionCount(user.personalContributions || { total: 0, public: 0 });
      case 'corporate':
        return getContributionCount(user.corporateContributions || { total: 0, public: 0 });
      case 'combined':
      default:
        const personalCount = getContributionCount(user.personalContributions || { total: 0, public: 0 });
        const corporateCount = getContributionCount(user.corporateContributions || { total: 0, public: 0 });
        return personalCount + corporateCount;
    }
  };

  const getRankingIcon = (position) => {
    switch (position) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return `#${position + 1}`;
    }
  };

  const getProgressBarColor = (position) => {
    switch (position) {
      case 0:
        return 'bg-yellow-500'; // Gold
      case 1:
        return 'bg-gray-400'; // Silver
      case 2:
        return 'bg-amber-600'; // Bronze
      default:
        return 'bg-blue-500'; // Default blue
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-white">Team Contributions</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1 border rounded-md bg-[#0f172a] border-[#334155] text-white"
            >
              {[2025, 2024, 2023, 2022].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-white">Type:</label>
            <select
              value={rankingType}
              onChange={(e) => setRankingType(e.target.value)}
              className="px-3 py-1 border rounded-md bg-[#0f172a] border-[#334155] text-white"
            >
              <option value="combined">Combined</option>
              <option value="personal">Personal</option>
              <option value="corporate">Corporate</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-white">Commits:</label>
            <select
              value={includePrivate ? 'all' : 'public'}
              onChange={(e) => setIncludePrivate(e.target.value === 'all')}
              className="px-3 py-1 border rounded-md bg-[#0f172a] border-[#334155] text-white"
            >
              <option value="all">Public + Private</option>
              <option value="public">Public Only</option>
            </select>
          </div>
          
          <button
            onClick={fetchContributionsRanking}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Fetch Rankings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {rankings.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-gray-400 mb-4">
            Showing {rankingType} {includePrivate ? 'public + private' : 'public only'} contributions for {selectedYear} ({rankings.filter(r => r.success).length}/{rankings.length} users loaded successfully)
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-200">Total Commits</h4>
              <p className="text-2xl font-bold text-blue-400">
                {rankings.reduce((sum, user) => sum + getRankingValue(user), 0).toLocaleString()}
              </p>
              <p className="text-xs text-blue-300 mt-1">
                {includePrivate ? 'Public + Private' : 'Public Only'}
              </p>
            </div>
            
            <div className="bg-green-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-green-200">Average per User</h4>
              <p className="text-2xl font-bold text-green-400">
                {rankings.length > 0 ? Math.round(rankings.reduce((sum, user) => sum + getRankingValue(user), 0) / rankings.length).toLocaleString() : 0}
              </p>
            </div>
            
            <div className="bg-purple-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-purple-200">Top Performer</h4>
              <p className="text-lg font-bold text-purple-400">
                {rankings[0]?.username || 'N/A'}
              </p>
              <p className="text-sm text-purple-400">
                {rankings[0] ? getRankingValue(rankings[0]).toLocaleString() : 0} commits
              </p>
            </div>
          </div>

          {/* Rankings List */}
          <div className="space-y-3">
            {rankings.map((user, index) => {
              const maxValue = Math.max(...rankings.map(r => getRankingValue(r)));
              const userValue = getRankingValue(user);
              const percentage = maxValue > 0 ? (userValue / maxValue) * 100 : 0;

              return (
                <div
                  key={user.username}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    index < 3 
                      ? 'bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-600' 
                      : 'bg-[#0f172a] border-[#334155]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {getRankingIcon(index)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-white">{user.username}</h4>
                        {user.corporateUser && (
                          <p className="text-sm text-gray-400">
                            Corporate: {user.corporateUser}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {userValue.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">
                        commits
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-1000 ease-out ${getProgressBarColor(index)}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Detailed Breakdown */}
                  {rankingType === 'combined' && (
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>
                        Personal: {includePrivate 
                          ? user.personalContributions?.total?.toLocaleString() || '0'
                          : user.personalContributions?.public?.toLocaleString() || '0'
                        }
                      </span>
                      <span>
                        Corporate: {includePrivate 
                          ? user.corporateContributions?.total?.toLocaleString() || '0'
                          : user.corporateContributions?.public?.toLocaleString() || '0'
                        }
                      </span>
                    </div>
                  )}

                  {/* Privacy Breakdown */}
                  {includePrivate && (
                    <div className="mt-2 text-xs text-gray-500">
                      {rankingType === 'personal' && (
                        <span>Public: {user.personalContributions?.public?.toLocaleString() || '0'} | Private: {user.personalContributions?.private?.toLocaleString() || '0'}</span>
                      )}
                      {rankingType === 'corporate' && (
                        <span>Public: {user.corporateContributions?.public?.toLocaleString() || '0'} | Private: {user.corporateContributions?.private?.toLocaleString() || '0'}</span>
                      )}
                      {rankingType === 'combined' && (
                        <span>
                          Total Public: {((user.personalContributions?.public || 0) + (user.corporateContributions?.public || 0)).toLocaleString()} | 
                          Total Private: {((user.personalContributions?.private || 0) + (user.corporateContributions?.private || 0)).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}

                  {!user.success && (
                    <div className="mt-2 text-sm text-red-400">
                      ⚠️ Failed to load: {user.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rankings.length === 0 && !loading && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Click "Fetch Rankings" to see GitHub contributions ranking
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHubRanking;
