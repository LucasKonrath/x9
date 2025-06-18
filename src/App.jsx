import React, { useState, useEffect } from 'react';
import { fetchUserEvents, fetchMarkdownPosts } from './services/githubService';
import CommitTimeline from './components/CommitTimeline';
import GitHubContributionGraph from './components/GitHubContributionGraph';
import MarkdownEditor from './components/MarkdownEditor';
import MarkdownPosts from './components/MarkdownPosts';
import UserSelector from './components/UserSelector';
import TeamReport from './components/TeamReport';
import GitHubAnalytics from './components/GitHubAnalytics';
import ThemeToggle from './components/ThemeToggle';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import RecentActivityQuickView from './components/RecentActivityQuickView';
import SearchComponent from './components/SearchComponent';
import FavoriteRepositories from './components/FavoriteRepositories';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Get user arrays from environment variables
const getGitHubUsers = () => {
  const usersString = import.meta.env.VITE_GITHUB_USERS;
  if (!usersString) {
    console.warn('VITE_GITHUB_USERS not found in environment variables, using fallback');
    return ['LucasKonrath', 'xmacedo', 'marcelobnbck', 'lee22br', 'vfurinii', 'icarocaetano', 'andeerlb', 'karane', 'joaoguilhermedesa'];
  }
  return usersString.split(',').map(user => user.trim()).filter(user => user.length > 0);
};

const getCorporateUsers = () => {
  const usersString = import.meta.env.VITE_CORPORATE_USERS;
  if (!usersString) {
    console.warn('VITE_CORPORATE_USERS not found in environment variables, using fallback');
    return ['LucasKonrath', 'xmacedo', 'marcelobnbck', 'lee22br', 'vfurinii', 'icarocaetano', 'andeerlb', 'karane', 'joaoguilhermedesa'];
  }
  return usersString.split(',').map(user => user.trim()).filter(user => user.length > 0);
};

const GITHUB_USERS = getGitHubUsers();
const CORPORATE_USERS = getCorporateUsers();

const getCorporateUser = (githubUser) => {
  const idx = GITHUB_USERS.indexOf(githubUser);
  return idx !== -1 ? CORPORATE_USERS[idx] : null;
}

function AppContent() {
  const { theme } = useTheme();
  const [selectedUser, setSelectedUser] = useState(GITHUB_USERS[0]);
  const [events, setEvents] = useState([]);
  const [markdownPosts, setMarkdownPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ saving: false, error: null, success: false });
  const [editingPost, setEditingPost] = useState(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [showTeamReport, setShowTeamReport] = useState(false);

  // Function to get repositories worked on in the last week
  const getReposWorkedThisWeek = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Filter events from the last week
    const recentEvents = events.filter(event => {
      const eventDate = new Date(event.created_at);
      return eventDate >= oneWeekAgo && 
             event.type === 'PushEvent' && 
             event.payload && 
             event.payload.commits && 
             event.payload.commits.length > 0;
    });

    // Get unique repositories
    const reposSet = new Set();
    recentEvents.forEach(event => {
      if (event.repo && event.repo.name) {
        reposSet.add(event.repo.name);
      }
    });

    return Array.from(reposSet).sort();
  };

  const reposThisWeek = getReposWorkedThisWeek();

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
  };

  const handleSearchResult = (result) => {
    console.log('Search result selected:', result);
    // Handle different types of search results
    if (result.type === 'post') {
      // Scroll to the post or highlight it
      const postElement = document.querySelector(`[data-post-title="${result.data.post.title}"]`);
      if (postElement) {
        postElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
    // Add more result handling as needed
  };

  const handleNewPost = () => {
    setEditorVisible(true);
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
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-github-dark' : 'bg-white'}`}>
      <header className={`border-b transition-colors duration-300 ${theme === 'dark' ? 'bg-github-header border-github-border' : 'bg-gray-50 border-gray-200'}`}>
        <div className="container mx-auto px-4 h-16 flex items-center">
          <img src="/x9.png" alt="X9 Logo" className="h-8 mr-4" />
          <div className="flex-1">
            <h1 className={`text-xl font-semibold transition-colors duration-300 ${theme === 'dark' ? 'text-github-text' : 'text-gray-900'}`}>
              X9 Team Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <SearchComponent 
              events={events}
              markdownPosts={markdownPosts}
              onResultSelect={handleSearchResult}
            />
            <RecentActivityQuickView events={events} />
            <ThemeToggle />
            <KeyboardShortcuts 
              onUserSelect={setSelectedUser}
              users={GITHUB_USERS}
              selectedUser={selectedUser}
              onToggleTeamReport={() => setShowTeamReport(true)}
              onNewPost={handleNewPost}
            />
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
            
            {/* Favorite Repositories */}
            <FavoriteRepositories 
              events={events}
              onPin={(repo) => console.log('Pinned:', repo)}
              onUnpin={(repo) => console.log('Unpinned:', repo)}
            />
            
            {/* POCs worked this week section */}
            {reposThisWeek.length > 0 && (
              <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <svg className="w-5 h-5 text-[#4ade80] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="text-lg font-semibold text-white">POCs worked this week</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {reposThisWeek.map(repoName => (
                    <a
                      key={repoName}
                      href={`https://github.com/${repoName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 bg-[#0f172a] border border-[#334155] rounded-md text-sm text-[#4ade80] hover:text-[#86efac] hover:border-[#22c55e] transition-colors duration-200"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      {repoName.split('/')[1] || repoName}
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {/* Personal Commits Timeline */}
            <CommitTimeline events={events} isOrganizational={false} />
            
            {/* GitHub Analytics */}
            <GitHubAnalytics username={selectedUser} />
            
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

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;