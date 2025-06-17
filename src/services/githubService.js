import axios from 'axios';

/**
 * Fetches GitHub user events
 * @param {string} username - GitHub username
 * @returns {Promise<Array>} - Array of user events
 */
export const fetchUserEvents = async (username) => {
  try {
    const response = await axios.get(`https://api.github.com/users/${username}/events`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching events for user ${username}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch user events');
  }
};

/**
 * Fetches organizational GitHub events
 * @param {string} username - GitHub username
 * @returns {Promise<Array>} - Array of organizational events
 */
export const fetchOrganizationalEvents = async (username) => {
  try {
    const orgDomain = import.meta.env.VITE_ORG;
    if (!orgDomain) {
      throw new Error('VITE_ORG environment variable not set');
    }

    const token = import.meta.env.VITE_GITHUB_TOKEN;
    if (!token) {
      throw new Error('VITE_GITHUB_TOKEN environment variable not set');
    }

    const response = await axios.get(`https://github.${orgDomain}.com/api/v3/events`, {
      headers: {
        'Authorization': `bearer ${token}`
      }
    });

    // Filter events by the specific user
    const userEvents = response.data.filter(event => 
      event.actor && event.actor.login === username
    );

    return userEvents;
  } catch (error) {
    console.error(`Error fetching organizational events for user ${username}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch organizational events');
  }
};

import { getKnownFilesForUser, getApiBaseUrl } from '../utils/fileUtils';

/**
 * Fetches markdown posts for a user from the public folder
 * @param {string} username - Username
 * @returns {Promise<Array>} - Array of markdown posts
 */
export const fetchMarkdownPosts = async (username) => {
  try {
    // Get list of files - try API endpoint first, fall back to hardcoded list
    let files = [];
    const apiBaseUrl = getApiBaseUrl();
  
    console.log('Fetching markdown posts for user:', username);
    console.log('Using API base URL:', apiBaseUrl);

    try {
      // Try to get list from API
      const indexResponse = await fetch(`${apiBaseUrl}/api/posts/${username}`);
      console.log('API response status:', indexResponse.status);

      if (indexResponse.ok) {
        files = await indexResponse.json();
        console.log('Files returned from API:', files);
      }
    } catch (apiError) {
      console.log('API endpoint not available, using hardcoded file paths');
      console.error('API error:', apiError);
    }

    // If no files from API, use hardcoded list (for development)
    if (files.length === 0) {
      files = getKnownFilesForUser(username);
    }

    if (files.length === 0) {
      console.log(`No files found for user ${username}`);
      return [];
    }

    // Fetch each file
    const posts = await Promise.all(
      files.map(async (filename) => {
        try {
          const url = `${apiBaseUrl}/public/${username}/${filename}`;
          console.log(`Fetching file from: ${url}`);

          const response = await fetch(url);
          console.log(`Response status for ${filename}: ${response.status}`);

          if (!response.ok) {
            console.error(`Failed to fetch ${filename}: ${response.status}`);
            return null;
          }

          const content = await response.text();
          console.log(`Successfully loaded ${filename}, content length: ${content.length}`);

          // Make sure content is not null or undefined
          const safeContent = content || '';

          return {
            title: filename,
            content: safeContent,
            date: filename.slice(0, 10)
          };
        } catch (fileError) {
          console.error(`Error fetching ${filename}:`, fileError);
          return null;
        }
      })
    );

    // Filter out nulls and sort by date (newest first)
    return posts
      .filter(post => post !== null)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

  } catch (error) {
    console.error(`Error fetching markdown posts for user ${username}:`, error);
    // Return empty array instead of throwing to handle case where user has no posts
    return [];
  }
};
