import React from 'react';
import { format, parseISO } from 'date-fns';
import CommitItem from './CommitItem';

function CommitTimeline({ events }) {
  const [isCollapsed, setIsCollapsed] = React.useState(true);

  // Filter only for PushEvents that have commits
  const pushEvents = events.filter(event => 
    event.type === 'PushEvent' && 
    event.payload && 
    event.payload.commits && 
    event.payload.commits.length > 0
  );

  // Group events by date using local timezone
  const groupedEvents = pushEvents.reduce((acc, event) => {
    const date = new Date(event.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {});

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedEvents).sort((a, b) => new Date(b) - new Date(a));

  if (pushEvents.length === 0) {
    return (
      <div className="bg-[#1e293b] shadow rounded-lg p-6 mt-4 border border-[#334155]">
        <p className="text-gray-400 text-center">No commit events found for this user.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded-lg p-4 transition-colors duration-200 group"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-white">Recent Commits</h2>
            <span className="text-[#4ade80] text-sm">
              Click here to {isCollapsed ? 'show' : 'hide'} commit activity
            </span>
          </div>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-6 w-6 text-[#4ade80] transition-transform duration-300 ${isCollapsed ? '' : 'transform rotate-180'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      <div className={`space-y-8 transition-all duration-300 ${isCollapsed ? 'h-0 overflow-hidden opacity-0' : 'opacity-100'}`}>
        {sortedDates.map(date => (
          <div key={date} className="bg-[#1e293b] shadow rounded-lg overflow-hidden border border-[#334155]">
            <div className="bg-[#1e293b] px-6 py-4 border-b border-[#334155]">
              <h2 className="text-lg font-semibold text-[#4ade80]">
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h2>
            </div>
            <div className="divide-y divide-[#334155]">
              {groupedEvents[date].map(event => (
                <CommitItem key={event.id} event={event} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CommitTimeline;
