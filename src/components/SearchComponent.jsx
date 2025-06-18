import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';

function SearchComponent({ events, markdownPosts, onResultSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Global keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTerm = query.toLowerCase();
    const searchResults = [];

    // Search in commits
    events.forEach(event => {
      if (event.type === 'PushEvent' && event.payload?.commits) {
        event.payload.commits.forEach(commit => {
          if (commit.message.toLowerCase().includes(searchTerm)) {
            searchResults.push({
              type: 'commit',
              title: commit.message,
              subtitle: `${event.repo.name} • ${format(new Date(event.created_at), 'MMM d')}`,
              data: { event, commit },
              score: commit.message.toLowerCase().indexOf(searchTerm)
            });
          }
        });
      }

      // Search in repository names
      if (event.repo.name.toLowerCase().includes(searchTerm)) {
        searchResults.push({
          type: 'repository',
          title: event.repo.name,
          subtitle: `Repository • ${event.type.replace('Event', '')}`,
          data: { event },
          score: event.repo.name.toLowerCase().indexOf(searchTerm)
        });
      }
    });

    // Search in markdown posts
    markdownPosts.forEach(post => {
      if (post.title.toLowerCase().includes(searchTerm) || 
          post.content.toLowerCase().includes(searchTerm)) {
        const preview = post.content.slice(0, 100) + '...';
        searchResults.push({
          type: 'post',
          title: post.title,
          subtitle: preview,
          data: { post },
          score: post.title.toLowerCase().includes(searchTerm) ? 0 : 50
        });
      }
    });

    // Sort by relevance (lower score = better match)
    const sortedResults = searchResults
      .sort((a, b) => a.score - b.score)
      .slice(0, 10); // Limit to 10 results

    setResults(sortedResults);
    setSelectedIndex(0);
  }, [query, events, markdownPosts]);

  // Handle keyboard navigation in results
  const handleKeyDown = (event) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        event.preventDefault();
        if (results[selectedIndex]) {
          handleResultSelect(results[selectedIndex]);
        }
        break;
    }
  };

  const handleResultSelect = (result) => {
    onResultSelect?.(result);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  const getResultIcon = (type) => {
    switch (type) {
      case 'commit':
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        );
      case 'repository':
        return (
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
        );
      case 'post':
        return (
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg border border-[#334155] bg-[#1e293b] hover:bg-[#334155] 
                   transition-colors duration-200 flex items-center gap-2"
        title="Search (Ctrl+K)"
      >
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm text-gray-400 hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline-block px-2 py-1 text-xs bg-[#334155] rounded border border-[#475569]">
          ⌘K
        </kbd>
      </button>

      {/* Search modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50 animate-fadeIn">
          <div className="bg-[#1e293b] border border-[#334155] rounded-lg w-full max-w-2xl mx-4 animate-slideIn">
            {/* Search input */}
            <div className="p-4 border-b border-[#334155]">
              <div className="relative">
                <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search commits, repositories, and posts..."
                  className="w-full pl-10 pr-4 py-3 bg-[#0f172a] border border-[#334155] rounded-lg 
                           text-white placeholder-gray-400 focus:border-[#4ade80] focus:ring-1 
                           focus:ring-[#4ade80] focus:outline-none"
                />
              </div>
            </div>

            {/* Search results */}
            <div ref={resultsRef} className="max-h-96 overflow-y-auto">
              {results.length > 0 ? (
                <div className="p-2">
                  {results.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleResultSelect(result)}
                      className={`w-full text-left p-3 rounded-lg transition-colors duration-150 
                                 flex items-start gap-3 ${
                                   index === selectedIndex 
                                     ? 'bg-[#334155] border border-[#4ade80]' 
                                     : 'hover:bg-[#334155] border border-transparent'
                                 }`}
                    >
                      <div className="mt-1">
                        {getResultIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {result.title}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-1">
                          {result.subtitle}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {result.type}
                      </div>
                    </button>
                  ))}
                </div>
              ) : query.trim() ? (
                <div className="p-8 text-center text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p>No results found for "{query}"</p>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <p className="text-sm">Start typing to search commits, repositories, and posts</p>
                  <div className="mt-3 text-xs space-y-1">
                    <p>Use ↑↓ to navigate, Enter to select, Esc to close</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SearchComponent;
