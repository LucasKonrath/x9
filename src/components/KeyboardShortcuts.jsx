import React, { useEffect, useState } from 'react';

function KeyboardShortcuts({ onUserSelect, users, selectedUser, onToggleTeamReport, onToggleRankings, onNewPost }) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger shortcuts when typing in inputs
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key) {
        case '?':
          setShowHelp(prev => !prev);
          break;
        case 'j':
        case 'ArrowDown':
          event.preventDefault();
          navigateUser(1);
          break;
        case 'k':
        case 'ArrowUp':
          event.preventDefault();
          navigateUser(-1);
          break;
        case 'n':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onNewPost?.();
          }
          break;
        case 't':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onToggleTeamReport?.();
          }
          break;
        case 'r':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onToggleRankings?.();
          }
          break;
        case 'Escape':
          setShowHelp(false);
          break;
        default:
          // Number keys for direct user selection
          const num = parseInt(event.key);
          if (num >= 1 && num <= users.length) {
            event.preventDefault();
            onUserSelect(users[num - 1]);
          }
          break;
      }
    };

    const navigateUser = (direction) => {
      const currentIndex = users.indexOf(selectedUser);
      const newIndex = (currentIndex + direction + users.length) % users.length;
      onUserSelect(users[newIndex]);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedUser, users, onUserSelect, onToggleTeamReport, onToggleRankings, onNewPost]);

  return (
    <>
      {/* Help button */}
      <button
        onClick={() => setShowHelp(true)}
        className="p-2 rounded-lg border border-[#334155] bg-[#1e293b] hover:bg-[#334155] 
                   transition-colors duration-200"
        title="Keyboard shortcuts (?)"
      >
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Help modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6 max-w-md w-full mx-4 animate-slideIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-400 mb-2 font-medium">Navigation</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-300">j / ↓</span>
                      <span className="text-gray-500">Next user</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">k / ↑</span>
                      <span className="text-gray-500">Previous user</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">1-{users.length}</span>
                      <span className="text-gray-500">Select user</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-400 mb-2 font-medium">Actions</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Ctrl+N</span>
                      <span className="text-gray-500">New post</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Ctrl+T</span>
                      <span className="text-gray-500">Team report</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Ctrl+R</span>
                      <span className="text-gray-500">Rankings</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">?</span>
                      <span className="text-gray-500">Show help</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Esc</span>
                      <span className="text-gray-500">Close dialog</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default KeyboardShortcuts;
