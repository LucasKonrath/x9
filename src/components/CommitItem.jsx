import React from 'react';
import { format, parseISO } from 'date-fns';

function CommitItem({ event }) {
  return (
    <div className="p-6 hover:bg-gray-50 transition duration-150">
      <div className="flex items-start">
        <img 
          src={event.actor.avatar_url} 
          alt={`${event.actor.login}'s avatar`} 
          className="h-10 w-10 rounded-full mr-4"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              <a 
                href={`https://github.com/${event.actor.login}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {event.actor.login}
              </a>
              <span className="mx-2 text-gray-500">→</span>
              <a 
                href={`https://github.com/${event.repo.name}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {event.repo.name.split('/')[1]}
              </a>
            </h3>
            <span className="text-xs text-gray-500">
              {format(parseISO(event.created_at), 'h:mm a')}
            </span>
          </div>

          <div className="space-y-3 mt-3">
            {event.payload.commits.map(commit => (
              <div key={commit.sha} className="border-l-2 border-gray-300 pl-3">
                <div className="flex items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900 font-mono break-all">
                      <a 
                        href={commit.url.replace('api.github.com/repos', 'github.com').replace('/commits/', '/commit/')} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-gray-900 hover:underline"
                      >
                        {commit.sha.substring(0, 7)}
                      </a>
                      <span className="ml-2 text-gray-700">{commit.message}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Authored by {commit.author.name}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 text-xs text-gray-500">
            <span className="inline-flex items-center">
              <span className="flex-shrink-0 mr-1.5">Branch:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100">
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
