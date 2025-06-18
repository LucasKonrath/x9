import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

function RecentActivityQuickView({ events }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get recent 5 activities
  const recentActivities = events.slice(0, 5);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'PushEvent':
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        );
      case 'CreateEvent':
        return (
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      case 'IssuesEvent':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'PullRequestEvent':
        return (
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getActivityDescription = (event) => {
    switch (event.type) {
      case 'PushEvent':
        const commitCount = event.payload?.commits?.length || 0;
        return `Pushed ${commitCount} commit${commitCount !== 1 ? 's' : ''} to ${event.repo.name}`;
      case 'CreateEvent':
        return `Created ${event.payload.ref_type} ${event.payload.ref || ''} in ${event.repo.name}`;
      case 'IssuesEvent':
        return `${event.payload.action} issue in ${event.repo.name}`;
      case 'PullRequestEvent':
        return `${event.payload.action} pull request in ${event.repo.name}`;
      default:
        return `${event.type} in ${event.repo.name}`;
    }
  };

  if (recentActivities.length === 0) {
    return (
      <div className="relative">
        <button
          className="p-2 rounded-lg border border-[#334155] bg-[#1e293b] opacity-50 cursor-not-allowed
                     flex items-center gap-2"
          title="No recent activity"
          disabled
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-sm text-gray-500 hidden sm:inline">Activity</span>
          <span className="text-xs text-gray-500 bg-[#334155] px-1.5 py-0.5 rounded">0</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-2 rounded-lg border border-[#334155] bg-[#1e293b] hover:bg-[#334155] 
                   transition-colors duration-200 flex items-center gap-2"
        title="Recent Activity"
      >
        <svg className="w-5 h-5 text-[#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-sm text-gray-300 hidden sm:inline">Activity</span>
        <span className="text-xs text-gray-400 bg-[#334155] px-1.5 py-0.5 rounded">
          {recentActivities.length}
        </span>
      </button>

      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-[#1e293b] border border-[#334155] 
                        rounded-lg shadow-lg z-50 animate-fadeIn">
          <div className="p-4 border-b border-[#334155]">
            <h3 className="text-md font-medium text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-[#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Recent Activity
            </h3>
          </div>
          
          <div className="max-h-64 overflow-y-auto p-4 space-y-3">
            {recentActivities.map((event, index) => (
              <div key={event.id} className="flex items-start gap-3">
                <div className="mt-1">
                  {getActivityIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 break-words">
                    {getActivityDescription(event)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(event.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {events.length > 5 && (
            <div className="text-center p-3 border-t border-[#334155]">
              <span className="text-xs text-gray-500">
                +{events.length - 5} more activities in timeline below
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Backdrop to close dropdown when clicking outside */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}

export default RecentActivityQuickView;
