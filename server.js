const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3001; // Using 3001 to avoid conflict with Vite

// Determine if we're in development or production
const isDevelopment = process.env.NODE_ENV !== 'production';

// CORS setup for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

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

    // Filter for markdown files with yyyy-MM-dd naming pattern
    const markdownFiles = files.filter(file => /^\d{4}-\d{2}-\d{2}\.md$/.test(file));

    res.json(markdownFiles);
  } catch (error) {
    console.error(`Error reading directory for user ${username}:`, error);
    res.status(500).json({ error: 'Failed to read user directory' });
  }
});

// Serve the index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
