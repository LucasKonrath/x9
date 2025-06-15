import React, { useState, useEffect } from 'react';
import CommitTimeline from './components/CommitTimeline';
import UserSelector from './components/UserSelector';
import MarkdownPosts from './components/MarkdownPosts';
import MarkdownEditor from './components/MarkdownEditor';
import { fetchUserEvents, fetchMarkdownPosts } from './services/githubService';

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
  const [markdownPosts, setMarkdownPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ saving: false, error: null, success: false });

  // Function to save markdown post
  const saveMarkdownPost = async (username, fileName, content) => {
    try {
      console.log('Saving markdown post:');
      console.log('- username:', username);
      console.log('- fileName:', fileName);
      console.log('- content length:', content.length);

      setSaveStatus({ saving: true, error: null, success: false });

      // Prepare the request body
      const requestBody = {
        username,
        fileName,
        content
      };

      console.log('Request body:', requestBody);

      // Send the data to the server
      const response = await fetch('/api/save-markdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);

      // Try to parse the response as JSON
      let responseData;
      try {
        responseData = await response.json();
        console.log('Response data:', responseData);
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        // If we can't parse as JSON, get the text
        const textResponse = await response.text();
        console.log('Response text:', textResponse);
      }

      if (!response.ok) {
        throw new Error((responseData && responseData.message) || 'Failed to save markdown');
      }

      // Refresh markdown posts after saving
      const posts = await fetchMarkdownPosts(username);
      setMarkdownPosts(posts);

      // Show success message
      setSaveStatus({ saving: false, error: null, success: true });

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, success: false }));
      }, 3000);

      return true;
    } catch (err) {
      setSaveStatus({ saving: false, error: err.message, success: false });
      throw err;
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch GitHub events
        const userEvents = await fetchUserEvents(selectedUser);
        setEvents(userEvents);

        // Fetch markdown posts directly from the files in public folder
        const posts = await fetchMarkdownPosts(selectedUser);
        setMarkdownPosts(posts);
      } catch (err) {
        setError('Failed to load data. ' + err.message);
        setEvents([]);
        setMarkdownPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [selectedUser]);

  return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-8 flex items-center">
          <img src="/x9.png" alt="X9 Logo" className="h-16 mr-4" />
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">X9</h1>
            <p className="text-gray-400">Track GitHub activity of your team</p>
          </div>
        </header>

        <UserSelector
            users={GITHUB_USERS}
            selectedUser={selectedUser}
            onSelectUser={setSelectedUser}
        />

        {loading && (
            <div className="flex justify-center my-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#22c55e]"></div>
            </div>
        )}

        {error && (
            <div className="bg-red-900 border border-red-800 text-red-200 px-4 py-3 rounded my-4" role="alert">
              <p>{error}</p>
            </div>
        )}

        {!loading && !error && (
            <>
              <CommitTimeline events={events} />
              <MarkdownPosts posts={markdownPosts} />
              <MarkdownEditor username={selectedUser} onSave={saveMarkdownPost} />

              {saveStatus.success && (
                <div className="mt-4 bg-[#15803d] text-white px-4 py-2 rounded-md animate-pulse">
                  Notes saved successfully!
                </div>
              )}

              {saveStatus.error && (
                <div className="mt-4 bg-red-900 border border-red-800 text-red-200 px-4 py-3 rounded">
                  Error: {saveStatus.error}
                </div>
              )}
            </>
        )}
      </div>
  );
}

export default App;

