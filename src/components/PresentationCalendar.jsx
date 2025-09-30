import React, { useState, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  parseISO, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns';

const PresentationCalendar = ({ presentations = [], onDateClick, onPresentationClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  // Generate calendar days
  const calendarDays = [];
  let day = calendarStart;
  
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  // Group presentations by date
  const presentationsByDate = presentations.reduce((acc, presentation) => {
    const dateKey = format(parseISO(presentation.date), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(presentation);
    return acc;
  }, {});

  const getPresentationsForDate = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return presentationsByDate[dateKey] || [];
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600';
      case 'cancelled':
        return 'bg-gray-600';
      case 'postponed':
        return 'bg-orange-600';
      default:
        return 'bg-blue-600';
    }
  };

  const renderCalendarDay = (day) => {
    const dayPresentations = getPresentationsForDate(day);
    const isCurrentMonth = isSameMonth(day, currentDate);
    const isDayToday = isToday(day);
    const isHovered = hoveredDate && isSameDay(day, hoveredDate);

    return (
      <div
        key={day.toISOString()}
        className={`
          min-h-[120px] border border-gray-700 p-2 cursor-pointer transition-colors
          ${!isCurrentMonth ? 'bg-gray-900 text-gray-600' : 'bg-gray-800 text-white'}
          ${isDayToday ? 'ring-2 ring-blue-500' : ''}
          ${isHovered ? 'bg-gray-700' : ''}
        `}
        onClick={() => onDateClick && onDateClick(day)}
        onMouseEnter={() => setHoveredDate(day)}
        onMouseLeave={() => setHoveredDate(null)}
      >
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-medium ${isDayToday ? 'text-blue-300' : ''}`}>
            {format(day, 'd')}
          </span>
          {dayPresentations.length > 0 && (
            <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
              {dayPresentations.length}
            </span>
          )}
        </div>

        <div className="space-y-1">
          {dayPresentations.slice(0, 3).map((presentation, index) => (
            <div
              key={presentation.id}
              className={`
                text-xs p-1.5 rounded cursor-pointer truncate transition-opacity hover:opacity-80
                ${getStatusColor(presentation.status)} text-white
              `}
              onClick={(e) => {
                e.stopPropagation();
                onPresentationClick && onPresentationClick(presentation);
              }}
              title={`${presentation.title} - ${presentation.time || 'No time set'}`}
            >
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${getPriorityColor(presentation.priority)}`}></div>
                <span className="truncate">
                  {presentation.time && (
                    <span className="opacity-75">{presentation.time.substring(0, 5)} </span>
                  )}
                  {presentation.title}
                </span>
              </div>
            </div>
          ))}
          
          {dayPresentations.length > 3 && (
            <div className="text-xs text-gray-400 text-center py-1">
              +{dayPresentations.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Previous month"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Today
          </button>
          
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Next month"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Priority:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-300">High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-300">Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-300">Low</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Status:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <span className="text-gray-300">Scheduled</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-600 rounded"></div>
            <span className="text-gray-300">Completed</span>
          </div>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-400 border-b border-gray-600">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0">
        {calendarDays.map(renderCalendarDay)}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-semibold text-white">
              {presentations.length}
            </div>
            <div className="text-gray-400">Total</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-yellow-400">
              {presentations.filter(p => p.status === 'scheduled').length}
            </div>
            <div className="text-gray-400">Scheduled</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-green-400">
              {presentations.filter(p => p.status === 'completed').length}
            </div>
            <div className="text-gray-400">Completed</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-red-400">
              {presentations.filter(p => p.priority === 'high').length}
            </div>
            <div className="text-gray-400">High Priority</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresentationCalendar;