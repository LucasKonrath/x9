import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ReadingManager = ({ selectedUser, onReadingChange }) => {
  const { theme } = useTheme();
  const [readingData, setReadingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddBook, setShowAddBook] = useState(false);
  const [editingCurrent, setEditingCurrent] = useState(false);

  const categories = [
    'Software Engineering',
    'Programming Language',
    'System Design',
    'DevOps',
    'Career Development',
    'Personal Development',
    'Productivity',
    'Leadership',
    'Business',
    'Other'
  ];

  useEffect(() => {
    if (selectedUser) {
      fetchReadingData();
    }
  }, [selectedUser]);

  const fetchReadingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3001/api/users/${selectedUser}/reading`);
      if (response.ok) {
        const data = await response.json();
        setReadingData(data);
        if (onReadingChange) {
          onReadingChange(data);
        }
      } else {
        throw new Error('Failed to fetch reading data');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching reading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentReading = async (currentBook) => {
    try {
      const response = await fetch(`http://localhost:3001/api/users/${selectedUser}/reading/current`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentBook),
      });

      if (response.ok) {
        const data = await response.json();
        setReadingData(data);
        setEditingCurrent(false);
        if (onReadingChange) onReadingChange(data);
      } else {
        throw new Error('Failed to update current reading');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const addFinishedBook = async (book) => {
    try {
      const response = await fetch(`http://localhost:3001/api/users/${selectedUser}/reading/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book),
      });

      if (response.ok) {
        const data = await response.json();
        setReadingData(data);
        setShowAddBook(false);
        if (onReadingChange) onReadingChange(data);
      } else {
        throw new Error('Failed to add book');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const BookForm = ({ book, onSubmit, onCancel, isCurrentReading = false }) => {
    const [formData, setFormData] = useState({
      title: book?.title || '',
      author: book?.author || '',
      category: book?.category || 'Software Engineering',
      rating: book?.rating || 5,
      notes: book?.notes || '',
      recommendedBy: book?.recommendedBy || 'Self-selected',
      wouldRecommend: book?.wouldRecommend !== false,
      progress: book?.progress || 0,
      startDate: book?.startDate || new Date().toISOString().split('T')[0],
      completedDate: book?.completedDate || new Date().toISOString().split('T')[0],
      pageCount: book?.pageCount || 0,
      currentPage: book?.currentPage || 0,
      weeklyPages: {
        thisWeek: book?.weeklyPages?.thisWeek || 0,
        lastWeek: book?.weeklyPages?.lastWeek || 0
      }
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-600">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Author</label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Recommended By</label>
            <input
              type="text"
              value={formData.recommendedBy}
              onChange={(e) => setFormData({ ...formData, recommendedBy: e.target.value })}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>

        {isCurrentReading ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Progress (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Total Pages</label>
                <input
                  type="number"
                  min="0"
                  value={formData.pageCount}
                  onChange={(e) => setFormData({ ...formData, pageCount: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  placeholder="e.g., 432"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Page</label>
                <input
                  type="number"
                  min="0"
                  value={formData.currentPage}
                  onChange={(e) => setFormData({ ...formData, currentPage: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  placeholder="e.g., 280"
                />
              </div>
            </div>
            <div className="border-t pt-4 mt-4">
              <h5 className="text-sm font-medium mb-3">Weekly Pages Read</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">This Week</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.weeklyPages.thisWeek}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      weeklyPages: { ...formData.weeklyPages, thisWeek: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder="e.g., 45"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Week</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.weeklyPages.lastWeek}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      weeklyPages: { ...formData.weeklyPages, lastWeek: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder="e.g., 62"
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Rating (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) || 5 })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Completed Date</label>
                <input
                  type="date"
                  value={formData.completedDate}
                  onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total Pages</label>
              <input
                type="number"
                min="0"
                value={formData.pageCount}
                onChange={(e) => setFormData({ ...formData, pageCount: parseInt(e.target.value) || 0 })}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                placeholder="e.g., 464"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            rows="3"
          />
        </div>

        {!isCurrentReading && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="wouldRecommend"
              checked={formData.wouldRecommend}
              onChange={(e) => setFormData({ ...formData, wouldRecommend: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="wouldRecommend" className="text-sm">Would recommend to others</label>
          </div>
        )}

        <div className="flex space-x-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            {book ? 'Update' : 'Add'}
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
        <div className="animate-pulse">Loading reading data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border rounded-lg shadow-sm bg-white dark:bg-gray-800">
        <div className="text-red-600">Error: {error}</div>
        <button
          onClick={fetchReadingData}
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
        <h3 className="text-lg font-semibold">Reading Progress for {selectedUser}</h3>
        <button
          onClick={() => setShowAddBook(!showAddBook)}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          {showAddBook ? 'Cancel' : 'Add Finished Book'}
        </button>
      </div>

      {readingData && (
        <div className="space-y-6">
          {/* Reading Goals */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium mb-2">2025 Reading Goals</h4>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="font-medium">{readingData.readingGoals.completed}</span>
                <span className="text-gray-500">/{readingData.readingGoals.yearly} books</span>
              </div>
              <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((readingData.readingGoals.completed / readingData.readingGoals.yearly) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-500">
                {Math.round((readingData.readingGoals.completed / readingData.readingGoals.yearly) * 100)}%
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Focus: {readingData.readingGoals.target}
            </p>
          </div>

          {/* Currently Reading */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">Currently Reading</h4>
              <button
                onClick={() => setEditingCurrent(!editingCurrent)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {editingCurrent ? 'Cancel' : readingData.currentlyReading ? 'Edit' : 'Add Book'}
              </button>
            </div>

            {editingCurrent ? (
              <BookForm
                book={readingData.currentlyReading}
                onSubmit={updateCurrentReading}
                onCancel={() => setEditingCurrent(false)}
                isCurrentReading={true}
              />
            ) : readingData.currentlyReading ? (
              <div className="border rounded-lg p-4 dark:border-gray-600">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h5 className="font-medium">{readingData.currentlyReading.title}</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      by {readingData.currentlyReading.author}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{readingData.currentlyReading.progress}%</div>
                    <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-1">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${readingData.currentlyReading.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                {(readingData.currentlyReading.pageCount || readingData.currentlyReading.currentPage) && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {readingData.currentlyReading.currentPage && readingData.currentlyReading.pageCount ? (
                      <span>Page {readingData.currentlyReading.currentPage} of {readingData.currentlyReading.pageCount}</span>
                    ) : readingData.currentlyReading.pageCount ? (
                      <span>{readingData.currentlyReading.pageCount} pages</span>
                    ) : null}
                  </div>
                )}
                {readingData.currentlyReading.weeklyPages && (readingData.currentlyReading.weeklyPages.thisWeek > 0 || readingData.currentlyReading.weeklyPages.lastWeek > 0) && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 mb-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Weekly Pages</div>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">This week:</span>
                        <span className="font-medium ml-1">{readingData.currentlyReading.weeklyPages.thisWeek}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Last week:</span>
                        <span className="font-medium ml-1">{readingData.currentlyReading.weeklyPages.lastWeek}</span>
                      </div>
                    </div>
                  </div>
                )}
                {readingData.currentlyReading.notes && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                    {readingData.currentlyReading.notes}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Started: {readingData.currentlyReading.startDate}
                </p>
              </div>
            ) : (
              <p className="text-gray-500 italic">No book currently being read</p>
            )}
          </div>

          {/* Add Book Form */}
          {showAddBook && (
            <div>
              <h4 className="font-medium mb-3">Add Finished Book</h4>
              <BookForm
                onSubmit={addFinishedBook}
                onCancel={() => setShowAddBook(false)}
              />
            </div>
          )}

          {/* Books Read */}
          <div>
            <h4 className="font-medium mb-3">Books Read ({readingData.booksRead.length})</h4>
            {readingData.booksRead.length === 0 ? (
              <p className="text-gray-500 italic">No books recorded yet</p>
            ) : (
              <div className="space-y-3">
                {readingData.booksRead.map((book) => (
                  <div key={book.id} className="border rounded-lg p-4 dark:border-gray-600">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h5 className="font-medium">{book.title}</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          by {book.author}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {book.category}
                        </span>
                        <div className="flex items-center">
                          {'★'.repeat(book.rating)}
                          <span className="text-xs text-gray-500 ml-1">({book.rating}/5)</span>
                        </div>
                      </div>
                    </div>
                    {book.notes && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        {book.notes}
                      </p>
                    )}
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Completed: {book.completedDate}</span>
                      <div className="flex items-center space-x-2">
                        <span>Recommended by: {book.recommendedBy}</span>
                        {book.wouldRecommend && (
                          <span className="text-green-600">👍 Would recommend</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500">
            Last updated: {readingData.lastUpdated}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingManager;
