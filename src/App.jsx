import React, { useState, useEffect } from 'react';
import CommitTimeline from './components/CommitTimeline';
import UserSelector from './components/UserSelector';
import MarkdownPosts from './components/MarkdownPosts';
import MarkdownEditor from './components/MarkdownEditor';
import GitHubContributionGraph from './components/GitHubContributionGraph';
import TeamReport from './components/TeamReport';
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

const CORPORATE_USERS = [
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

const getCorporateUser = (githubUser) => {
  const idx = GITHUB_USERS.indexOf(githubUser);
  return idx !== -1 ? CORPORATE_USERS[idx] : null;
}

function App() {
  const [selectedUser, setSelectedUser] = useState(GITHUB_USERS[0]);
  const [events, setEvents] = useState([]);
  const [markdownPosts, setMarkdownPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ saving: false, error: null, success: false });
  const [editingPost, setEditingPost] = useState(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [showTeamReport, setShowTeamReport] = useState(false);

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

      // Import the API base URL helper
      const { getApiBaseUrl } = await import('./utils/fileUtils');
      const apiBaseUrl = getApiBaseUrl();

      // Send the data to the server (use full URL with correct port)
      const response = await fetch(`${apiBaseUrl}/api/save-markdown`, {
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

  // Function to handle editing a post
  const handleEditPost = (post) => {
    console.log('handleEditPost called with:', post);
    // Force state update with a new object reference
    setEditingPost({...post});
    console.log('editingPost state set to:', {...post});

    // Explicitly set editor to visible
    setEditorVisible(true);
    console.log('Editor visibility set to true');

    // Double-check that the state is correctly set after a short delay
    setTimeout(() => {
      console.log('editingPost state after timeout:', editingPost);
      console.log('editorVisible state after timeout:', editorVisible);
    }, 100);
  };

  // Function to cancel editing
  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditorVisible(false);
    console.log('Editor visibility set to false in handleCancelEdit');
  };

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('Loading data for user:', selectedUser);

        // Fetch GitHub events
        const userEvents = await fetchUserEvents(selectedUser);
        setEvents(userEvents);
        console.log('GitHub events loaded:', userEvents.length);

        // Fetch markdown posts directly from the files in public folder
        console.log('Fetching markdown posts...');
        const posts = await fetchMarkdownPosts(selectedUser);
        console.log('Markdown posts loaded:', posts.length);

        // Detailed log of post structure
        if (posts.length > 0) {
          console.log('First post structure:', JSON.stringify(posts[0], null, 2));
        }

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
    // Reset editing state when user changes
    setEditingPost(null);
  }, [selectedUser]);

  return (
    <div className="min-h-screen bg-github-dark">
      <header className="bg-github-header border-b border-github-border">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <img src="/x9.png" alt="X9 Logo" className="h-8 mr-4" />
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-github-text">X9 Team Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowTeamReport(true)}
              className="px-4 py-2 bg-[#1e293b] text-[#4ade80] border border-[#22c55e] rounded-md hover:bg-[#334155] transition-colors duration-200"
            >
              Team Report
            </button>
            <UserSelector
              users={GITHUB_USERS}
              selectedUser={selectedUser}
              onSelectUser={setSelectedUser}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-github-green border-t-transparent"></div>
          </div>
        )}

        {error && (
          <div className="bg-[#ff000010] border border-[#ff000020] text-red-400 px-4 py-3 rounded-md" role="alert">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <GitHubContributionGraph username={selectedUser}
            corporateUser={ getCorporateUser(selectedUser) } />
            <CommitTimeline events={events} />
            <MarkdownPosts
              posts={markdownPosts}
              onEdit={handleEditPost}
            />
            
            <div className="mt-8 flex justify-end">
              <MarkdownEditor
                key={editingPost ? `edit-${editingPost.title}` : 'create-new'}
                username={selectedUser}
                onSave={saveMarkdownPost}
                editingPost={editingPost}
                onCancelEdit={handleCancelEdit}
                forceOpen={editorVisible}
              />
            </div>
          </>
        )}
      </main>

      {showTeamReport && (
        <TeamReport 
          users={GITHUB_USERS}
          corporateUsers={CORPORATE_USERS}
          onClose={() => setShowTeamReport(false)}
        />
      )}
    </div>
  );
}

export default App;