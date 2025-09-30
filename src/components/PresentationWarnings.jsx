import React, { useState, useEffect } from 'react';
import { format, parseISO, isAfter, isBefore, addDays, startOfDay, differenceInDays } from 'date-fns';

const PresentationWarnings = () => {
  const [warnings, setWarnings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchAllPresentations();
  }, []);

  const fetchAllPresentations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/presentations/all');
      if (response.ok) {
        const allPresentations = await response.json();
        const warningPresentations = getWarningPresentations(allPresentations);
        setWarnings(warningPresentations);
      }
    } catch (error) {
      console.error('Error fetching presentations for warnings:', error);
    }
    setIsLoading(false);
  };

  const getWarningPresentations = (presentations) => {
    const today = startOfDay(new Date());
    const thirtyDaysFromNow = addDays(today, 30);

    return presentations
      .filter(presentation => {
        const presentationDate = parseISO(presentation.date);
        // Show warnings for presentations in next 30 days or overdue
        return (
          (isAfter(presentationDate, today) || presentationDate.getTime() === today.getTime()) &&
          isBefore(presentationDate, thirtyDaysFromNow)
        ) || (
          isBefore(presentationDate, today) && presentation.status !== 'completed' && presentation.status !== 'cancelled'
        );
      })
      .map(presentation => {
        const presentationDate = parseISO(presentation.date);
        const daysUntil = differenceInDays(presentationDate, today);
        
        let urgency, urgencyColor, message;
        
        if (daysUntil < 0) {
          urgency = 'overdue';
          urgencyColor = 'bg-red-500';
          message = `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'}`;
        } else if (daysUntil === 0) {
          urgency = 'today';
          urgencyColor = 'bg-red-400';
          message = 'Today';
        } else if (daysUntil <= 7) {
          urgency = 'this-week';
          urgencyColor = 'bg-orange-500';
          message = `In ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
        } else if (daysUntil <= 14) {
          urgency = 'next-week';
          urgencyColor = 'bg-yellow-500';
          message = `In ${daysUntil} days`;
        } else {
          urgency = 'this-month';
          urgencyColor = 'bg-blue-500';
          message = `In ${daysUntil} days`;
        }

        return {
          ...presentation,
          daysUntil,
          urgency,
          urgencyColor,
          message
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil); // Sort by urgency (most urgent first)
  };

  const getPreparationStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return { icon: '✅', color: 'text-green-400' };
      case 'in-progress':
        return { icon: '🔄', color: 'text-yellow-400' };
      default:
        return { icon: '⚠️', color: 'text-red-400' };
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'overdue':
        return '🚨';
      case 'today':
        return '⏰';
      case 'this-week':
        return '⚡';
      case 'next-week':
        return '📅';
      default:
        return '📌';
    }
  };

  if (isLoading) {
    return null; // Don't show loading state for warnings
  }

  if (warnings.length === 0) {
    return null; // Don't show anything if no warnings
  }

  // Group warnings by urgency
  const groupedWarnings = warnings.reduce((groups, warning) => {
    if (!groups[warning.urgency]) {
      groups[warning.urgency] = [];
    }
    groups[warning.urgency].push(warning);
    return groups;
  }, {});

  const urgencyOrder = ['overdue', 'today', 'this-week', 'next-week', 'this-month'];
  const highPriorityCount = warnings.filter(w => ['overdue', 'today', 'this-week'].includes(w.urgency)).length;

  return (
    <div className="mb-6">
      {/* Compact Warning Bar */}
      <div 
        className={`${
          highPriorityCount > 0 ? 'bg-red-900/30 border-red-600/30' : 'bg-yellow-900/30 border-yellow-600/30'
        } border rounded-lg p-4 cursor-pointer transition-all hover:bg-opacity-80`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {highPriorityCount > 0 ? '🚨' : '📅'}
            </span>
            <div>
              <h3 className={`font-semibold ${highPriorityCount > 0 ? 'text-red-300' : 'text-yellow-300'}`}>
                Presentation Reminders
              </h3>
              <p className="text-sm text-gray-400">
                {highPriorityCount > 0 && `${highPriorityCount} urgent, `}
                {warnings.length} total presentation{warnings.length === 1 ? '' : 's'} requiring attention
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Quick summary badges */}
            <div className="flex gap-2">
              {urgencyOrder.map(urgency => {
                const count = groupedWarnings[urgency]?.length || 0;
                if (count === 0) return null;
                
                const warning = warnings.find(w => w.urgency === urgency);
                return (
                  <span 
                    key={urgency}
                    className={`px-2 py-1 rounded text-xs font-medium ${warning.urgencyColor} text-white`}
                  >
                    {count}
                  </span>
                );
              })}
            </div>
            
            <svg 
              className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded Warning Details */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {urgencyOrder.map(urgency => {
            const urgencyWarnings = groupedWarnings[urgency];
            if (!urgencyWarnings || urgencyWarnings.length === 0) return null;

            return (
              <div key={urgency} className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3 capitalize flex items-center gap-2">
                  <span>{getUrgencyIcon(urgency)}</span>
                  {urgency.replace('-', ' ')} ({urgencyWarnings.length})
                </h4>
                
                <div className="space-y-2">
                  {urgencyWarnings.map((warning) => {
                    const prepStatus = getPreparationStatusIcon(warning.preparationStatus);
                    
                    return (
                      <div key={`${warning.username}-${warning.id}`} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${warning.urgencyColor} text-white`}>
                              {warning.message}
                            </span>
                            <span className="text-sm font-medium text-white">
                              {warning.title}
                            </span>
                            <span className="text-xs text-gray-400">
                              by {warning.username}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span>📅 {format(parseISO(warning.date), 'MMM d, yyyy')}</span>
                            {warning.time && <span>🕐 {warning.time}</span>}
                            {warning.location && <span>📍 {warning.location}</span>}
                            <div className="flex items-center gap-1">
                              <span className={prepStatus.color}>{prepStatus.icon}</span>
                              <span className="capitalize">{warning.preparationStatus.replace('-', ' ')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {warning.priority === 'high' && (
                            <span className="px-2 py-1 bg-red-600 text-white text-xs rounded font-medium">
                              HIGH
                            </span>
                          )}
                          
                          {(warning.preparationStatus === 'not-started' && warning.daysUntil <= 7) && (
                            <span className="text-red-400 text-xs font-medium">
                              ⚠️ Not prepared
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          <div className="text-center pt-2">
            <p className="text-xs text-gray-500">
              💡 Click on individual presentations in the Presentations tab to update preparation status
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresentationWarnings;