import React, { useState, useEffect } from 'react';
import { format, parseISO, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import PresentationCalendar from './PresentationCalendar';

const PresentationManager = ({ selectedUser, onUserChange }) => {
  const [presentations, setPresentations] = useState([]);
  const [newPresentation, setNewPresentation] = useState({
    title: '',
    description: '',
    presenter: selectedUser,
    date: '',
    time: '',
    location: '',
    status: 'scheduled',
    priority: 'medium',
    audience: '',
    duration: '',
    preparationStatus: 'not-started',
    notes: '',
    tags: ''
  });
  const [editingPresentation, setEditingPresentation] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'overdue'
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (selectedUser) {
      fetchPresentations();
    }
  }, [selectedUser]);

  const fetchPresentations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/users/${selectedUser}/presentations`);
      if (response.ok) {
        const data = await response.json();
        setPresentations(data.presentations || []);
      }
    } catch (error) {
      console.error('Error fetching presentations:', error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const presentationData = {
        ...newPresentation,
        audience: newPresentation.audience.split(',').map(a => a.trim()).filter(a => a),
        tags: newPresentation.tags.split(',').map(t => t.trim()).filter(t => t),
        presenter: selectedUser
      };

      const url = editingPresentation 
        ? `http://localhost:3001/api/users/${selectedUser}/presentations/${editingPresentation.id}`
        : `http://localhost:3001/api/users/${selectedUser}/presentations`;
      
      const method = editingPresentation ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(presentationData),
      });

      if (response.ok) {
        await fetchPresentations();
        resetForm();
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error saving presentation:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this presentation?')) {
      try {
        const response = await fetch(`http://localhost:3001/api/users/${selectedUser}/presentations/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          await fetchPresentations();
        }
      } catch (error) {
        console.error('Error deleting presentation:', error);
      }
    }
  };

  const handleEdit = (presentation) => {
    setEditingPresentation(presentation);
    setNewPresentation({
      ...presentation,
      audience: Array.isArray(presentation.audience) ? presentation.audience.join(', ') : presentation.audience,
      tags: Array.isArray(presentation.tags) ? presentation.tags.join(', ') : presentation.tags
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setNewPresentation({
      title: '',
      description: '',
      presenter: selectedUser,
      date: '',
      time: '',
      location: '',
      status: 'scheduled',
      priority: 'medium',
      audience: '',
      duration: '',
      preparationStatus: 'not-started',
      notes: '',
      tags: ''
    });
    setEditingPresentation(null);
  };

  const getFilteredPresentations = () => {
    const today = startOfDay(new Date());
    return presentations.filter(presentation => {
      if (filter === 'upcoming') {
        return isAfter(parseISO(presentation.date), today) || parseISO(presentation.date).getTime() === today.getTime();
      }
      if (filter === 'overdue') {
        return isBefore(parseISO(presentation.date), today) && presentation.status !== 'completed';
      }
      return true;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getPresentationStatus = (presentation) => {
    const today = startOfDay(new Date());
    const presentationDate = parseISO(presentation.date);
    const thirtyDaysFromNow = addDays(today, 30);

    if (isBefore(presentationDate, today) && presentation.status !== 'completed') {
      return { status: 'overdue', color: 'bg-red-500', textColor: 'text-red-100' };
    }
    if (isBefore(presentationDate, thirtyDaysFromNow)) {
      return { status: 'warning', color: 'bg-yellow-500', textColor: 'text-yellow-100' };
    }
    return { status: 'normal', color: 'bg-green-500', textColor: 'text-green-100' };
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  const getPreparationStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <span className="text-green-400">✅</span>;
      case 'in-progress':
        return <span className="text-yellow-400">🔄</span>;
      default:
        return <span className="text-gray-400">⏳</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-400">Loading presentations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Presentations</h2>
        
        <div className="flex flex-wrap gap-2">
          {/* View Mode Toggle */}
          <div className="flex border border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Calendar
            </button>
          </div>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-700 text-white px-3 py-1.5 rounded-lg border border-gray-600"
          >
            <option value="all">All Presentations</option>
            <option value="upcoming">Upcoming</option>
            <option value="overdue">Overdue</option>
          </select>

          {/* Add Button */}
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Presentation
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">
              {editingPresentation ? 'Edit Presentation' : 'Add New Presentation'}
            </h3>
            <button
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="text-gray-400 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
              <input
                type="text"
                required
                value={newPresentation.title}
                onChange={(e) => setNewPresentation({ ...newPresentation, title: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Enter presentation title"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={newPresentation.description}
                onChange={(e) => setNewPresentation({ ...newPresentation, description: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                rows="3"
                placeholder="Describe the presentation content and objectives"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date *</label>
              <input
                type="date"
                required
                value={newPresentation.date}
                onChange={(e) => setNewPresentation({ ...newPresentation, date: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Time</label>
              <input
                type="time"
                value={newPresentation.time}
                onChange={(e) => setNewPresentation({ ...newPresentation, time: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
              <input
                type="text"
                value={newPresentation.location}
                onChange={(e) => setNewPresentation({ ...newPresentation, location: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Conference room, Zoom link, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
              <input
                type="text"
                value={newPresentation.duration}
                onChange={(e) => setNewPresentation({ ...newPresentation, duration: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., 30 minutes, 1 hour"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
              <select
                value={newPresentation.priority}
                onChange={(e) => setNewPresentation({ ...newPresentation, priority: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={newPresentation.status}
                onChange={(e) => setNewPresentation({ ...newPresentation, status: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="scheduled">Scheduled</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
                <option value="postponed">Postponed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Preparation Status</label>
              <select
                value={newPresentation.preparationStatus}
                onChange={(e) => setNewPresentation({ ...newPresentation, preparationStatus: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Audience (comma-separated)</label>
              <input
                type="text"
                value={newPresentation.audience}
                onChange={(e) => setNewPresentation({ ...newPresentation, audience: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Tech Team, Management, All Hands"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma-separated)</label>
              <input
                type="text"
                value={newPresentation.tags}
                onChange={(e) => setNewPresentation({ ...newPresentation, tags: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., technical, quarterly, training"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
              <textarea
                value={newPresentation.notes}
                onChange={(e) => setNewPresentation({ ...newPresentation, notes: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                rows="3"
                placeholder="Preparation notes, key points to cover, etc."
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingPresentation ? 'Update' : 'Add'} Presentation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Presentations List */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {getFilteredPresentations().length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">No presentations found</div>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="text-blue-400 hover:text-blue-300"
              >
                Add your first presentation
              </button>
            </div>
          ) : (
            getFilteredPresentations().map((presentation) => {
              const statusInfo = getPresentationStatus(presentation);
              return (
                <div key={presentation.id} className={`bg-gray-800 rounded-lg p-4 border-l-4 ${getPriorityColor(presentation.priority)}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{presentation.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusInfo.color} ${statusInfo.textColor}`}>
                          {statusInfo.status === 'warning' ? 'Due Soon' : statusInfo.status === 'overdue' ? 'Overdue' : 'Scheduled'}
                        </span>
                        <span className="text-sm text-gray-400 capitalize">{presentation.priority} priority</span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Date:</span>
                          <span className="text-white ml-2">{format(parseISO(presentation.date), 'MMM d, yyyy')}</span>
                        </div>
                        {presentation.time && (
                          <div>
                            <span className="text-gray-400">Time:</span>
                            <span className="text-white ml-2">{presentation.time}</span>
                          </div>
                        )}
                        {presentation.duration && (
                          <div>
                            <span className="text-gray-400">Duration:</span>
                            <span className="text-white ml-2">{presentation.duration}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <span className="text-gray-400">Prep:</span>
                          <span className="ml-2">{getPreparationStatusIcon(presentation.preparationStatus)}</span>
                          <span className="text-white ml-1 capitalize">{presentation.preparationStatus.replace('-', ' ')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(presentation)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(presentation.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {presentation.description && (
                    <p className="text-gray-300 mb-2">{presentation.description}</p>
                  )}

                  {(presentation.location || presentation.audience?.length > 0) && (
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-2">
                      {presentation.location && (
                        <span>📍 {presentation.location}</span>
                      )}
                      {presentation.audience?.length > 0 && (
                        <span>👥 {Array.isArray(presentation.audience) ? presentation.audience.join(', ') : presentation.audience}</span>
                      )}
                    </div>
                  )}

                  {presentation.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(Array.isArray(presentation.tags) ? presentation.tags : []).map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {presentation.notes && (
                    <div className="mt-2 p-3 bg-gray-700 rounded text-sm">
                      <span className="text-gray-400">Notes: </span>
                      <span className="text-gray-200">{presentation.notes}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <PresentationCalendar 
          presentations={getFilteredPresentations()}
          onDateClick={(date) => {
            // You could add functionality to add a new presentation on this date
            console.log('Date clicked:', format(date, 'yyyy-MM-dd'));
          }}
          onPresentationClick={(presentation) => {
            handleEdit(presentation);
          }}
        />
      )}
    </div>
  );
};

export default PresentationManager;