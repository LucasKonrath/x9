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
