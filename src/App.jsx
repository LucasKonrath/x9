import React, { useState, useEffect } from 'react';
import { fetchUserEvents, fetchMarkdownPosts } from './services/githubService';
import CommitTimeline from './components/CommitTimeline';
import GitHubContributionGraph from './components/GitHubContributionGraph';
import CorporateContributionHeatmap from './components/CorporateContributionHeatmap';
import MarkdownEditor from './components/MarkdownEditor';
import MarkdownPosts from './components/MarkdownPosts';
import UserSelector from './components/UserSelector';
import TeamReport from './components/TeamReport';
import GitHubAnalytics from './components/GitHubAnalytics';
import ThemeToggle from './components/ThemeToggle';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import RecentActivityQuickView from './components/RecentActivityQuickView';
import SearchComponent from './components/SearchComponent';
import X9ChatComponent from './components/X9ChatComponent';
import ReinforcementManager from './components/ReinforcementManager';
import ReadingManager from './components/ReadingManager';
import GitHubRanking from './components/GitHubRanking';
import NavBar from './components/NavBar';
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
  const [showRankings, setShowRankings] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('github');

  // Function to get repositories worked on in the last week
  const getReposWorkedThisWeek = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Filter events from the last week - include more event types
    const recentEvents = events.filter(event => {
      const eventDate = new Date(event.created_at);
      return eventDate >= oneWeekAgo && 
             (event.type === 'PushEvent' || 
              event.type === 'CreateEvent');
    });

    // Debug logging
    console.log('Debug - POCs this week:', {
      totalEvents: events.length,
      recentEvents: recentEvents.length,
      oneWeekAgo: oneWeekAgo.toISOString(),
      eventTypes: [...new Set(recentEvents.map(e => e.type))],
      sampleEvents: recentEvents.slice(0, 5).map(e => ({
        type: e.type,
        repo: e.repo?.name,
        date: e.created_at
      }))
    });

    // Get unique repositories
    const reposSet = new Set();
    recentEvents.forEach(event => {
      if (event.repo && event.repo.name) {
        reposSet.add(event.repo.name);
      }
    });

    const repos = Array.from(reposSet).sort();
    console.log('Repositories worked on this week:', repos);
    
    return repos;
  };

  const reposThisWeek = getReposWorkedThisWeek();

  // Tab configuration
  const tabs = [
    {
      id: 'github',
      label: 'GitHub',
      icon: '💻',
      badge: reposThisWeek.length > 0 ? reposThisWeek.length : null
    },
    {
      id: 'corporate',
      label: 'Corporate',
      icon: '🏢'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: '📊'
    },
    {
      id: 'meetings',
      label: 'Meetings',
      icon: '📝',
      badge: markdownPosts.length > 0 ? markdownPosts.length : null
    },
    {
      id: 'reinforcements',
      label: 'Reinforcements',
      icon: '🎯'
    },
    {
      id: 'reading',
      label: 'Reading',
      icon: '📚'
    }
  ];

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
              onToggleRankings={() => setShowRankings(true)}
              onNewPost={handleNewPost}
            />
            <button
              onClick={() => setShowTeamReport(true)}
              className="px-4 py-2 bg-[#1e293b] text-[#4ade80] border border-[#22c55e] rounded-md hover:bg-[#334155] transition-colors duration-200"
            >
              Team Report
            </button>
            <button
              onClick={() => setShowRankings(true)}
              className="px-4 py-2 bg-[#1e293b] text-[#fbbf24] border border-[#f59e0b] rounded-md hover:bg-[#334155] transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Rankings</span>
            </button>
            <UserSelector
              users={GITHUB_USERS}
              selectedUser={selectedUser}
              onSelectUser={setSelectedUser}
            />
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <NavBar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
      />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
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
          <div className="space-y-6">
            {/* GitHub Tab */}
            {activeTab === 'github' && (
              <>
                <GitHubContributionGraph 
                  username={selectedUser}
                />
                
                {/* POCs worked this week section */}
                {reposThisWeek.length > 0 && (
                  <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-[#4ade80] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <h3 className="text-lg font-semibold text-white">POCs worked this week</h3>
                      </div>
                      <span className="text-sm text-gray-400">({reposThisWeek.length} repositories)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-none">
                      {reposThisWeek.map(repoName => (
                        <a
                          key={repoName}
                          href={`https://github.com/${repoName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-md text-sm text-[#4ade80] hover:text-[#86efac] hover:border-[#22c55e] transition-colors duration-200 w-full"
                        >
                          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <span className="truncate">{repoName.split('/')[1] || repoName}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Personal Commits Timeline */}
                <CommitTimeline events={events} isOrganizational={false} />
              </>
            )}

            {/* Corporate Tab */}
            {activeTab === 'corporate' && (
              <>
                {getCorporateUser(selectedUser) ? (
                  <CorporateContributionHeatmap 
                    corporateUser={getCorporateUser(selectedUser)}
                    minimal={false} 
                  />
                ) : (
                  <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-8 text-center">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h.01M7 3h.01" />
                      </svg>
                      <h3 className="text-lg font-semibold text-white mb-2">No Corporate Account Configured</h3>
                      <p className="text-gray-400">
                        No corporate GitHub account is configured for {selectedUser}.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <>
                <GitHubAnalytics username={selectedUser} />
              </>
            )}

            {/* Meetings Tab */}
            {activeTab === 'meetings' && (
              <>
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

            {/* Reinforcements Tab */}
            {activeTab === 'reinforcements' && (
              <ReinforcementManager 
                selectedUser={selectedUser}
                onReinforcementsChange={(reinforcements) => {
                  console.log('Reinforcements updated for', selectedUser, reinforcements);
                }}
              />
            )}

            {/* Reading Tab */}
            {activeTab === 'reading' && (
              <ReadingManager 
                selectedUser={selectedUser}
                onReadingChange={(reading) => {
                  console.log('Reading data updated for', selectedUser, reading);
                }}
              />
            )}
          </div>
        )}
      </main>

      {showTeamReport && (
        <TeamReport 
          users={GITHUB_USERS}
          corporateUsers={CORPORATE_USERS}
          onClose={() => setShowTeamReport(false)}
        />
      )}

      {showRankings && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">GitHub Contributions Rankings</h2>
              <button
                onClick={() => setShowRankings(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <GitHubRanking 
              users={GITHUB_USERS}
              corporateUsers={CORPORATE_USERS}
            />
          </div>
        </div>
      )}

      {/* X9 Chat Component */}
      <X9ChatComponent 
        isOpen={isChatOpen} 
        onToggle={() => setIsChatOpen(!isChatOpen)} 
      />
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