const express = require('express');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const app = express();
const PORT = process.env.PORT || 3001; // Using 3001 to avoid conflict with Vite

// Determine if we're in development or production
const isDevelopment = process.env.NODE_ENV !== 'production';

// CORS setup for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Parse JSON bodies
app.use(express.json());

// Serve static files
if (isDevelopment) {
  // In development, just serve the public folder
  app.use('/public', express.static(path.join(__dirname, 'public')));
} else {
  // In production, serve the built app
  app.use(express.static(path.join(__dirname, 'dist')));
}

// API endpoint to get available markdown posts for a user
app.get('/api/posts/:username', (req, res) => {
  const username = req.params.username;
  const userDir = path.join(__dirname, 'public', username);

  // Check if user directory exists
  if (!fs.existsSync(userDir)) {
    return res.status(404).json({ error: `User ${username} not found` });
  }

  try {
    // Get all files in the user directory
    const files = fs.readdirSync(userDir);

    // Filter for markdown files with yyyy-MM-dd.md or yyyy-MM-dd-*.md naming pattern
    const markdownFiles = files.filter(file => /^\d{4}-\d{2}-\d{2}(\.md|-.*\.md)$/.test(file));

    res.json(markdownFiles);
  } catch (error) {
    console.error(`Error reading directory for user ${username}:`, error);
    res.status(500).json({ error: 'Failed to read user directory' });
  }
});

// Serve the index.html for all other routes (SPA support)
// API endpoint to save markdown file
app.post('/api/save-markdown', async (req, res) => {
  try {
    const { username, fileName, content } = req.body;

    if (!username || !fileName || !content) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate filename format (must be yyyy-MM-dd.md)
    if (!/^\d{4}-\d{2}-\d{2}\.md$/.test(fileName)) {
      console.log('Invalid filename format:', fileName);
      return res.status(400).json({ message: 'The string did not match the expected pattern. Filename must be in format yyyy-MM-dd.md' });
    }

    // Create directory for user if it doesn't exist
    const userDir = path.join(__dirname, 'public', username);
    try {
      await fsPromises.mkdir(userDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
      console.log(`Directory creation for ${username}: ${err.message}`);
    }

    // Write the markdown file
    const filePath = path.join(userDir, fileName);
    await fsPromises.writeFile(filePath, content, 'utf8');

    res.status(200).json({ message: 'Markdown saved successfully' });
  } catch (error) {
    console.error('Error saving markdown:', error);
    res.status(500).json({ message: 'Server error while saving markdown' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
