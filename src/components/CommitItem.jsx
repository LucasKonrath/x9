import React from 'react';
import { format, parseISO } from 'date-fns';

function CommitItem({ event }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'p', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
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
                href={`https://github.com/${event.actor.login}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-[#4ade80] hover:underline"
              >
                {event.actor.login}
              </a>
              <span className="mx-2 text-gray-400">→</span>
              <a 
                href={`https://github.com/${event.repo.name}`} 
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
            {event.payload.commits.map(commit => (
              <div key={commit.sha} className="border-l-2 border-[#16a34a] pl-3">
                <div className="flex items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-200 font-mono break-all">
                      <a 
                        href={commit.url.replace('api.github.com/repos', 'github.com').replace('/commits/', '/commit/')} 
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
