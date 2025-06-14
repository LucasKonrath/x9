import React from 'react';
import { format, parseISO } from 'date-fns';
import CommitItem from './CommitItem';

function CommitTimeline({ events }) {
  // Filter only for PushEvents that have commits
  const pushEvents = events.filter(event => 
    event.type === 'PushEvent' && 
    event.payload && 
    event.payload.commits && 
    event.payload.commits.length > 0
  );

  // Group events by date
  const groupedEvents = pushEvents.reduce((acc, event) => {
    const date = format(parseISO(event.created_at), 'yyyy-MM-dd');
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
    <div className="space-y-8">
      {sortedDates.map(date => (
        <div key={date} className="bg-[#1e293b] shadow rounded-lg overflow-hidden border border-[#334155]">
          <div className="bg-[#1e293b] px-6 py-4 border-b border-[#334155]">
            <h2 className="text-lg font-semibold text-[#4ade80]">
              {format(new Date(date), 'EEEE, MMMM d, yyyy')}
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
  );
}

export default CommitTimeline;
