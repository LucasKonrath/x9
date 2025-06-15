const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static('public'));
app.use(express.static('dist'));

// API endpoint to save markdown file
app.post('/api/save-markdown', async (req, res) => {
  try {
    console.log('Headers:', req.headers);
    console.log('Raw body:', req.body);

    const { username, fileName, content } = req.body;

    console.log('Parsed request data:');
    console.log('- username:', username);
    console.log('- fileName:', fileName);
    console.log('- content length:', content ? content.length : 0);

    if (!username || !fileName || !content) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate filename format (must be yyyy-MM-dd.md)
    console.log('Testing filename format with regex');
    const filenameRegex = /^\d{4}-\d{2}-\d{2}\.md$/;
    const isValidFilename = filenameRegex.test(fileName);
    console.log('Regex test result:', isValidFilename);

    if (!isValidFilename) {
      console.log('Invalid filename format:', fileName);
      return res.status(400).json({ message: 'The string did not match the expected pattern. Filename must be in format yyyy-MM-dd.md' });
    }

    // Create directory for user if it doesn't exist
    const userDir = path.join(__dirname, 'public', username);
    try {
      await fs.mkdir(userDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
      console.log(`Directory creation for ${username}: ${err.message}`);
    }

    // Write the markdown file
    const filePath = path.join(userDir, fileName);
    await fs.writeFile(filePath, content, 'utf8');

    // Update the index.json file with the list of markdown files
    const files = await fs.readdir(userDir);
    const markdownFiles = files.filter(file => file.endsWith('.md'));
    await fs.writeFile(
      path.join(userDir, 'index.json'),
      JSON.stringify(markdownFiles),
      'utf8'
    );

    res.status(200).json({ message: 'Markdown saved successfully' });
  } catch (error) {
    console.error('Error saving markdown:', error);
    res.status(500).json({ message: 'Server error while saving markdown' });
  }
});

// Catch-all route to serve the SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});