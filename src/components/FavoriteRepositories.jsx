import React, { useState, useEffect } from 'react';

function FavoriteRepositories({ events, onPin, onUnpin }) {
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorite-repositories');
    return saved ? JSON.parse(saved) : [];
  });
  const [isExpanded, setIsExpanded] = useState(false);

  // Get unique repositories from events
  const repositories = [...new Set(events.map(event => event.repo?.name).filter(Boolean))];

  useEffect(() => {
    localStorage.setItem('favorite-repositories', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (repoName) => {
    if (favorites.includes(repoName)) {
      const newFavorites = favorites.filter(name => name !== repoName);
      setFavorites(newFavorites);
      onUnpin?.(repoName);
    } else {
      const newFavorites = [...favorites, repoName];
      setFavorites(newFavorites);
      onPin?.(repoName);
    }
  };

  const isFavorite = (repoName) => favorites.includes(repoName);

  // Get recent activity for each favorite
  const getFavoriteWithStats = (repoName) => {
    const repoEvents = events.filter(event => event.repo?.name === repoName);
    const lastActivity = repoEvents[0]?.created_at;
    const commitCount = repoEvents
      .filter(event => event.type === 'PushEvent')
      .reduce((sum, event) => sum + (event.payload?.commits?.length || 0), 0);

    return {
      name: repoName,
      lastActivity,
      commitCount,
      eventCount: repoEvents.length
    };
  };

  const favoriteReposWithStats = favorites.map(getFavoriteWithStats);

  if (repositories.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left hover:bg-[#334155] transition-colors duration-200"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-md font-medium text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Favorite Repositories
            <span className="text-xs text-gray-400">({favorites.length})</span>
          </h3>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[#334155]">
          {/* Favorite repositories list */}
          {favoriteReposWithStats.length > 0 && (
            <div className="p-4 border-b border-[#334155]">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Pinned Repositories</h4>
              <div className="space-y-3">
                {favoriteReposWithStats.map(repo => (
                  <div key={repo.name} className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://github.com/${repo.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[#4ade80] hover:text-[#86efac] hover:underline truncate"
                        >
                          {repo.name.split('/')[1] || repo.name}
                        </a>
                        <button
                          onClick={() => toggleFavorite(repo.name)}
                          className="text-yellow-400 hover:text-yellow-300"
                          title="Unpin repository"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>{repo.commitCount} commits</span>
                        <span>{repo.eventCount} events</span>
                        {repo.lastActivity && (
                          <span>Last: {new Date(repo.lastActivity).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All repositories */}
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-400 mb-3">All Repositories</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {repositories.map(repoName => (
                <div key={repoName} className="flex items-center justify-between p-2 hover:bg-[#334155] rounded">
                  <a
                    href={`https://github.com/${repoName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-300 hover:text-[#4ade80] hover:underline truncate flex-1"
                  >
                    {repoName}
                  </a>
                  <button
                    onClick={() => toggleFavorite(repoName)}
                    className={`ml-2 p-1 ${isFavorite(repoName) ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'}`}
                    title={isFavorite(repoName) ? 'Unpin repository' : 'Pin repository'}
                  >
                    <svg className={`w-4 h-4 ${isFavorite(repoName) ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FavoriteRepositories;
