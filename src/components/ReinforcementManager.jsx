import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ReinforcementManager = ({ selectedUser, onReinforcementsChange }) => {
  const { theme } = useTheme();
  const [reinforcements, setReinforcements] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingReinforcement, setEditingReinforcement] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState(null);

  const categories = [
    'Study Frequency',
    'Corporate Contribution',
    'Technical Skills',
    'Communication',
    'Leadership',
    'Time Management',
    'Code Quality',
    'Collaboration'
  ];

  const priorities = ['low', 'medium', 'high'];
  const statuses = ['ongoing', 'needs_improvement', 'strength', 'completed'];

  const statusColors = {
    ongoing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    needs_improvement: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    strength: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
  };

  useEffect(() => {
    if (selectedUser) {
      fetchReinforcements();
    }
  }, [selectedUser]);

  const fetchReinforcements = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3001/api/users/${selectedUser}/reinforcements`);
      if (response.ok) {
        const data = await response.json();
        setReinforcements(data);
        if (onReinforcementsChange) {
          onReinforcementsChange(data);
        }
      } else {
        throw new Error('Failed to fetch reinforcements');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching reinforcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReinforcement = async (reinforcement) => {
    try {
      const response = await fetch(`http://localhost:3001/api/users/${selectedUser}/reinforcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reinforcement),
      });

      if (response.ok) {
        const data = await response.json();
        setReinforcements(data);
        setShowAddForm(false);
        if (onReinforcementsChange) {
          onReinforcementsChange(data);
        }
      } else {
        throw new Error('Failed to add reinforcement');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error adding reinforcement:', err);
    }
  };

  const handleUpdateReinforcement = async (id, updatedReinforcement) => {
    try {
      const response = await fetch(`http://localhost:3001/api/users/${selectedUser}/reinforcements/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedReinforcement),
      });

      if (response.ok) {
        const data = await response.json();
        setReinforcements(data);
        setEditingReinforcement(null);
        if (onReinforcementsChange) {
          onReinforcementsChange(data);
        }
      } else {
        throw new Error('Failed to update reinforcement');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error updating reinforcement:', err);
    }
  };

  const handleDeleteReinforcement = async (id) => {
    if (window.confirm('Are you sure you want to delete this reinforcement?')) {
      try {
        const response = await fetch(`http://localhost:3001/api/users/${selectedUser}/reinforcements/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          const data = await response.json();
          setReinforcements(data);
          if (onReinforcementsChange) {
            onReinforcementsChange(data);
          }
        } else {
          throw new Error('Failed to delete reinforcement');
        }
      } catch (err) {
        setError(err.message);
        console.error('Error deleting reinforcement:', err);
      }
    }
  };

  const ReinforcementForm = ({ reinforcement, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
      category: reinforcement?.category || '',
      description: reinforcement?.description || '',
      priority: reinforcement?.priority || 'medium',
      status: reinforcement?.status || 'ongoing',
      notes: reinforcement?.notes || ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-600">
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            required
          >
            <option value="">Select category</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            rows="3"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              {priorities.map(priority => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status.replace('_', ' ').split(' ').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            rows="2"
          />
        </div>

        <div className="flex space-x-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            {reinforcement ? 'Update' : 'Add'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  };

  if (loading) {
    return (
      <div className="p-6 border rounded-lg shadow-sm bg-white dark:bg-gray-800">
        <div className="animate-pulse">Loading reinforcements...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border rounded-lg shadow-sm bg-white dark:bg-gray-800">
        <div className="text-red-600">Error: {error}</div>
        <button
          onClick={fetchReinforcements}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg shadow-sm bg-white dark:bg-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Reinforcements for {selectedUser}</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          {showAddForm ? 'Cancel' : 'Add Reinforcement'}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6">
          <ReinforcementForm
            onSubmit={handleAddReinforcement}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {reinforcements && reinforcements.reinforcements && (
        <div className="space-y-4">
          {reinforcements.reinforcements.length === 0 ? (
            <p className="text-gray-500">No reinforcements yet.</p>
          ) : (
            reinforcements.reinforcements.map((reinforcement) => (
              <div key={reinforcement.id} className="border rounded-lg p-4 dark:border-gray-600">
                {editingReinforcement === reinforcement.id ? (
                  <ReinforcementForm
                    reinforcement={reinforcement}
                    onSubmit={(updatedData) => handleUpdateReinforcement(reinforcement.id, updatedData)}
                    onCancel={() => setEditingReinforcement(null)}
                  />
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium">{reinforcement.category}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[reinforcement.priority]}`}>
                            {reinforcement.priority}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[reinforcement.status]}`}>
                            {reinforcement.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm mb-2">{reinforcement.description}</p>
                        {reinforcement.notes && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">{reinforcement.notes}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">Added: {reinforcement.dateAdded}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingReinforcement(reinforcement.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteReinforcement(reinforcement.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {reinforcements && (
        <div className="mt-4 text-xs text-gray-500">
          Last updated: {reinforcements.lastUpdated}
        </div>
      )}
    </div>
  );
};

export default ReinforcementManager;
