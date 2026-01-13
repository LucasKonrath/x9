import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

function MarkdownEditor({ username, onSave, editingPost, onCancelEdit, forceOpen }) {
  const [isOpen, setIsOpen] = useState(false);
  const [markdown, setMarkdown] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [weeklyData, setWeeklyData] = useState({
    pagesRead: '',
    pocsCompleted: '',
    bulletPoints: ['', '', '']
  });

  // Effect to handle editing mode
  useEffect(() => {
    console.log('MarkdownEditor useEffect triggered with editingPost:', editingPost);
    if (editingPost) {
      console.log('Setting markdown content:', editingPost.content);
      setMarkdown(editingPost.content);
      console.log('Opening editor (setIsOpen(true))');
      setIsOpen(true);
    }
  }, [editingPost]);

  // Effect to handle forceOpen prop
  useEffect(() => {
    console.log('forceOpen prop changed to:', forceOpen);
    if (forceOpen !== undefined) {
      console.log('Setting isOpen to:', forceOpen);
      setIsOpen(forceOpen);
    }
  }, [forceOpen]);

  // Add keyboard event listener for ESC key
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        console.log('ESC key pressed, closing modal');
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [isOpen]);

  // Add a separate useEffect to log state changes for debugging
  useEffect(() => {
    console.log('isOpen state changed to:', isOpen);
  }, [isOpen]);

  const handleSave = async () => {
    if (!markdown.trim()) {
      setError('Markdown content cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let fileName;

      if (editingPost) {
        // Use the existing filename when editing
        fileName = editingPost.title;
      } else {
        // Generate a filename with current date for new posts
        const today = new Date();
        fileName = `${format(today, 'yyyy-MM-dd')}.md`;
      }

      console.log('Saving file with name:', fileName);

      // Prepend weekly summary to markdown content if any data is filled
      let finalMarkdown = markdown;
      const hasWeeklyData = weeklyData.pagesRead || weeklyData.pocsCompleted || weeklyData.bulletPoints.some(bp => bp);
      
      if (hasWeeklyData) {
        let weeklySummary = '## Weekly Summary\n\n';
        
        if (weeklyData.pagesRead || weeklyData.pocsCompleted) {
          if (weeklyData.pagesRead) {
            weeklySummary += `- **Pages Read:** ${weeklyData.pagesRead}\n`;
          }
          if (weeklyData.pocsCompleted) {
            weeklySummary += `- **POCs Completed:** ${weeklyData.pocsCompleted}\n`;
          }
          weeklySummary += '\n';
        }
        
        const filledBulletPoints = weeklyData.bulletPoints.filter(bp => bp);
        if (filledBulletPoints.length > 0) {
          weeklySummary += '**Key Points:**\n';
          filledBulletPoints.forEach(point => {
            weeklySummary += `- ${point}\n`;
          });
          weeklySummary += '\n';
        }
        
        weeklySummary += '---\n\n';
        finalMarkdown = weeklySummary + markdown;
      }

      // Call the onSave callback with the markdown content and filename
      await onSave(username, fileName, finalMarkdown);

      // Clear the editor and close it
      setMarkdown('');
      setWeeklyData({
        pagesRead: '',
        pocsCompleted: '',
        bulletPoints: ['', '', '']
      });
      setIsOpen(false);

      // If we were editing, call the cancel edit callback
      if (editingPost && onCancelEdit) {
        onCancelEdit();
      }
    } catch (err) {
      setError(`Failed to save markdown: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    console.log('Cancel button clicked');
    setIsOpen(false);
    setMarkdown('');
    setWeeklyData({
      pagesRead: '',
      pocsCompleted: '',
      bulletPoints: ['', '', '']
    });
    setError(null);

    // If we were editing, call the cancel edit callback
    if (editingPost && onCancelEdit) {
      console.log('Calling onCancelEdit to reset editing state');
      onCancelEdit();
    }
  };

  const isEditing = !!editingPost;

  return (
      <div className="mt-6">
        {/* Always log what we're about to render */}
        {console.log('Rendering MarkdownEditor with isOpen:', isOpen, 'editingPost:', !!editingPost)}

        {/* Add Meeting Notes button - only show if editor is closed */}
        <button
            onClick={() => {
              console.log('Add Meeting Notes button clicked');
              setIsOpen(true);
            }}
            className="px-4 py-2 bg-[#1e293b] text-[#4ade80] border border-[#22c55e] rounded-md hover:bg-[#334155] transition-colors duration-200"
        >
          Add Meeting Notes
        </button>

        {/* Modal overlay - only show if isOpen is true */}
        {isOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fadeIn"
              onClick={(e) => {
                // Close modal when clicking on the backdrop (not on the content)
                if (e.target === e.currentTarget) {
                  handleCancel();
                }
              }}
            >
              <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-slideIn shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-medium text-white">
                    {isEditing ? `Edit Notes: ${editingPost.title}` : `Add Notes for ${username}`}
                  </h3>
                  <button 
                    onClick={handleCancel}
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Close"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Weekly Summary Form */}
                <div className="mb-6 bg-[#0f172a] border border-[#334155] rounded-lg p-4">
                  <h4 className="text-lg font-medium text-white mb-4">📊 Weekly Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Pages Read This Week
                      </label>
                      <input
                        type="number"
                        value={weeklyData.pagesRead}
                        onChange={(e) => setWeeklyData({...weeklyData, pagesRead: e.target.value})}
                        className="w-full px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                        placeholder="e.g., 45"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        POCs Completed This Week
                      </label>
                      <input
                        type="number"
                        value={weeklyData.pocsCompleted}
                        onChange={(e) => setWeeklyData({...weeklyData, pocsCompleted: e.target.value})}
                        className="w-full px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                        placeholder="e.g., 2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      3 Key Points
                    </label>
                    <div className="space-y-2">
                      {[0, 1, 2].map(index => (
                        <input
                          key={index}
                          type="text"
                          value={weeklyData.bulletPoints[index]}
                          onChange={(e) => {
                            const newBulletPoints = [...weeklyData.bulletPoints];
                            newBulletPoints[index] = e.target.value;
                            setWeeklyData({...weeklyData, bulletPoints: newBulletPoints});
                          }}
                          className="w-full px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-white focus:outline-none focus:border-[#4ade80]"
                          placeholder={`Key point ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

              <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  placeholder="# Meeting Notes\n\nEnter your markdown content here..."
                  className="w-full h-80 p-4 bg-[#0f172a] text-gray-100 border border-[#334155] rounded-md focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent font-mono"
              />

              {error && (
                  <div className="mt-2 text-red-400 text-sm">
                    {error}
                  </div>
              )}

              <div className="mt-4 flex justify-end space-x-3">
                <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-transparent text-gray-400 border border-[#475569] rounded-md hover:bg-[#334155]"
                    disabled={isSaving}
                >
                  Cancel
                </button>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-[#15803d] text-white rounded-md hover:bg-[#166534] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {isEditing ? 'Updating...' : 'Saving...'}
                      </>
                  ) : (isEditing ? 'Update Notes' : 'Save Notes')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}

export default MarkdownEditor;