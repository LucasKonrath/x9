import React from 'react';
import { format, parseISO } from 'date-fns';

function CommitItem({ event, isOrganizational = false, filterUsername = null }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'p', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  };

  // Filter commits for organizational view to show only those by the specific user
  const getFilteredCommits = () => {
    if (!event.payload?.commits) return [];
    
    if (isOrganizational && filterUsername) {
      // For organizational commits, filter by author name or email
      return event.payload.commits.filter(commit => {
        const authorName = commit.author?.name?.toLowerCase();
        const authorEmail = commit.author?.email?.toLowerCase();
        const usernameToMatch = filterUsername.toLowerCase();
        
        // Match by name or if email contains the username
        return authorName === usernameToMatch || 
               authorEmail?.includes(usernameToMatch) ||
               authorEmail?.startsWith(usernameToMatch);
      });
    }
    
    return event.payload.commits;
  };

  const filteredCommits = getFilteredCommits();

  // Don't render if no commits match the filter
  if (filteredCommits.length === 0) {
    return null;
  }

  // Get the appropriate base URL
  const getBaseUrl = () => {
    if (isOrganizational) {
      const orgDomain = import.meta.env.VITE_ORG;
      return orgDomain ? `https://github.${orgDomain}.com` : 'https://github.com';
    }
    return 'https://github.com';
  };

  const baseUrl = getBaseUrl();

  // Convert API URL to web URL for commits
  const getCommitUrl = (commit) => {
    if (isOrganizational) {
      // For organizational commits, replace the API URL structure
      return commit.url
        .replace(/https:\/\/github\.[\w.-]+\.com\/api\/v3\/repos/, baseUrl)
        .replace('/commits/', '/commit/');
    } else {
      // For personal commits, use existing logic
      return commit.url
        .replace('api.github.com/repos', 'github.com')
        .replace('/commits/', '/commit/');
    }
  };

  return (
    <div className="p-6 hover:bg-[#1e293b] transition duration-150">
      <div className="flex items-start">
        <img 
          src={event.actor.avatar_url} 
          alt={`${event.actor.login}'s avatar`} 
          className="h-10 w-10 rounded-full mr-4"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-medium text-gray-100 truncate">
              <a 
                href={`${baseUrl}/${event.actor.login}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-[#4ade80] hover:underline"
              >
                {event.actor.login}
              </a>
              <span className="mx-2 text-gray-400">→</span>
              <a 
                href={`${baseUrl}/${event.repo.name}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-[#4ade80] hover:underline"
              >
                {event.repo.name.split('/')[1]}
              </a>
            </h3>
            <span className="text-xs text-gray-400">
              {formatDate(event.created_at)}
            </span>
          </div>

          <div className="space-y-3 mt-3">
            {filteredCommits.map(commit => (
              <div key={commit.sha} className="border-l-2 border-[#16a34a] pl-3">
                <div className="flex items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-200 font-mono break-all">
                      <a 
                        href={getCommitUrl(commit)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#4ade80] hover:text-[#86efac] hover:underline"
                      >
                        {commit.sha.substring(0, 7)}
                      </a>
                      <span className="ml-2 text-gray-300">{commit.message}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Authored by {commit.author.name}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 text-xs text-gray-400">
            <span className="inline-flex items-center">
              <span className="flex-shrink-0 mr-1.5">Branch:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#334155] text-[#86efac] border border-[#166534]">
                {event.payload.ref.replace('refs/heads/', '')}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommitItem;
