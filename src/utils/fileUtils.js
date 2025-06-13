/**
 * Helper utility to get available files for a user in development mode
 * This is a workaround since browsers can't list directory contents directly
 */

/**
 * Get API base URL based on environment
 */
export const getApiBaseUrl = () => {
  // In development mode, use the Express server on port 3001
  // In production, use the same origin
  return import.meta.env.DEV ? 'http://localhost:3001' : '';
};

/**
 * Returns known filenames for a user based on a hardcoded mapping
 * @param {string} username - The username to get files for
 * @returns {string[]} - Array of filenames (yyyy-MM-dd.md format)
 */
export const getKnownFilesForUser = (username) => {
  // Mapping of known users to their markdown files
  const knownFiles = {
    'LucasKonrath': ['2025-06-10.md', '2025-05-27.md'],
    'xmacedo': ['2025-06-13.md']
    // Add more users as needed
  };

  return knownFiles[username] || [];
};
