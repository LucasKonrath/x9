
import React, { useState } from 'react';
import { format } from 'date-fns';

function MarkdownEditor({ username, onSave }) {
  const [isOpen, setIsOpen] = useState(false);
  const [markdown, setMarkdown] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!markdown.trim()) {
      setError('Markdown content cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Generate a filename with current date (using the required format yyyy-MM-dd.md)
      const today = new Date();
      const fileName = `${format(today, 'yyyy-MM-dd')}.md`;

      console.log('Saving file with name:', fileName);
      console.log('Format pattern used:', 'yyyy-MM-dd');

      // Call the onSave callback with the markdown content and filename
      await onSave(username, fileName, markdown);

      // Clear the editor and close it
      setMarkdown('');
      setIsOpen(false);
    } catch (err) {
      setError(`Failed to save markdown: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
      <div className="mt-6">
        {!isOpen ? (
            <button
                onClick={() => setIsOpen(true)}
                className="px-4 py-2 bg-[#1e293b] text-[#4ade80] border border-[#22c55e] rounded-md hover:bg-[#334155] transition-colors duration-200"
            >
              Add Meeting Notes
            </button>
        ) : (
            <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-4">
              <h3 className="text-lg font-medium text-white mb-3">Add Notes for {username}</h3>

              <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  placeholder="# Meeting Notes\n\nEnter your markdown content here..."
                  className="w-full h-64 p-3 bg-[#0f172a] text-gray-100 border border-[#334155] rounded-md focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent font-mono"
              />

              {error && (
                  <div className="mt-2 text-red-400 text-sm">
                    {error}
                  </div>
              )}

              <div className="mt-4 flex justify-end space-x-3">
                <button
                    onClick={() => {
                      setIsOpen(false);
                      setMarkdown('');
                      setError(null);
                    }}
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
                        Saving...
                      </>
                  ) : 'Save Notes'}
                </button>
              </div>
            </div>
        )}
      </div>
  );
}

export default MarkdownEditor;