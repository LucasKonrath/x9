import React, { useState, useEffect } from 'react';
import CommitTimeline from './components/CommitTimeline';
import UserSelector from './components/UserSelector';
import { fetchUserEvents } from './services/githubService';

const GITHUB_USERS = [
  'LucasKonrath',
  'xmacedo',
  'marcelobnbck',
  'lee22br',
  'vfurinii',
  'icarocaetano',
  'andeerlb',
  'karane',
  'joaoguilhermedesa'
];

function App() {
  const [selectedUser, setSelectedUser] = useState(GITHUB_USERS[0]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUserEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const userEvents = await fetchUserEvents(selectedUser);
        setEvents(userEvents);
      } catch (err) {
        setError('Failed to load user events. ' + err.message);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadUserEvents();
  }, [selectedUser]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-8 flex items-center">
        <img src="/x9.png" alt="X9 Logo" className="h-16 mr-4" />
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">X9</h1>
          <p className="text-gray-600">Track GitHub activity of your team</p>
        </div>
      </header>

      <UserSelector 
        users={GITHUB_USERS} 
        selectedUser={selectedUser} 
        onSelectUser={setSelectedUser} 
      />

      {loading && (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded my-4" role="alert">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <CommitTimeline events={events} />
      )}
    </div>
  );
}

export default App;
