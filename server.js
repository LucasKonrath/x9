const express = require('express');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const axios = require('axios'); // Add this at the top with other imports
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

// Add this before the catch-all route
app.get('/api/github-contributions/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const response = await axios.get(`https://ghchart.rshah.org/${username}`, {
      responseType: 'text'
    });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(response.data);
  } catch (error) {
    console.error('Error fetching GitHub contributions:', error);
    res.status(500).send('Error fetching GitHub contributions');
  }
});

// Add this before the catch-all route
app.get('/api/github-stats/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const response = await axios.get(`https://github-contributions-api.jogruber.de/v4/${username}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching GitHub stats:', error);
    res.status(500).json({ error: 'Error fetching GitHub stats' });
  }
});

// Add this before the catch-all route
app.get('/api/github-corporate/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const githubToken = process.env.GITHUB_TOKEN;

    const response = await axios.post('https://api.github.com/graphql',
      {
        query: `
          query($userName: String!) {
            user(login: $userName) {
              contributionsCollection(from:"2025-01-01T00:00:00Z") {
                contributionCalendar {
                  totalContributions
                  weeks {
                    contributionDays {
                      contributionCount
                      date
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          userName: username
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching GitHub corporate stats:', error);
    res.status(500).json({ error: 'Error fetching GitHub corporate stats' });
  }
});

// Reinforcement Management Endpoints

// Get all users (directories in public folder)
app.get('/api/users', (req, res) => {
  const publicDir = path.join(__dirname, 'public');
  
  try {
    const items = fs.readdirSync(publicDir);
    const users = items.filter(item => {
      const itemPath = path.join(publicDir, item);
      return fs.statSync(itemPath).isDirectory() && !item.startsWith('.');
    });
    
    res.json(users);
  } catch (error) {
    console.error('Error reading users:', error);
    res.status(500).json({ error: 'Error reading users' });
  }
});

// Get user reinforcements
app.get('/api/users/:username/reinforcements', (req, res) => {
  const username = req.params.username;
  const reinforcementFile = path.join(__dirname, 'public', username, 'reinforcements.json');

  try {
    if (!fs.existsSync(reinforcementFile)) {
      // Create default reinforcements file
      const defaultReinforcements = {
        version: "1.0",
        lastUpdated: new Date().toISOString().split('T')[0],
        reinforcements: []
      };
      
      const userDir = path.join(__dirname, 'public', username);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      
      fs.writeFileSync(reinforcementFile, JSON.stringify(defaultReinforcements, null, 2));
      return res.json(defaultReinforcements);
    }

    const reinforcements = JSON.parse(fs.readFileSync(reinforcementFile, 'utf8'));
    res.json(reinforcements);
  } catch (error) {
    console.error('Error reading reinforcements:', error);
    res.status(500).json({ error: 'Error reading reinforcements' });
  }
});

// Add new reinforcement
app.post('/api/users/:username/reinforcements', (req, res) => {
  const username = req.params.username;
  const reinforcementFile = path.join(__dirname, 'public', username, 'reinforcements.json');
  const newReinforcement = req.body;

  try {
    let reinforcements;
    
    if (fs.existsSync(reinforcementFile)) {
      reinforcements = JSON.parse(fs.readFileSync(reinforcementFile, 'utf8'));
    } else {
      reinforcements = {
        version: "1.0",
        lastUpdated: new Date().toISOString().split('T')[0],
        reinforcements: []
      };
      
      const userDir = path.join(__dirname, 'public', username);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
    }

    // Generate new ID
    const maxId = reinforcements.reinforcements.reduce((max, r) => Math.max(max, r.id || 0), 0);
    newReinforcement.id = maxId + 1;
    newReinforcement.dateAdded = new Date().toISOString().split('T')[0];

    reinforcements.reinforcements.push(newReinforcement);
    reinforcements.lastUpdated = new Date().toISOString().split('T')[0];

    fs.writeFileSync(reinforcementFile, JSON.stringify(reinforcements, null, 2));
    res.json(reinforcements);
  } catch (error) {
    console.error('Error adding reinforcement:', error);
    res.status(500).json({ error: 'Error adding reinforcement' });
  }
});

// Update reinforcement
app.put('/api/users/:username/reinforcements/:id', (req, res) => {
  const username = req.params.username;
  const reinforcementId = parseInt(req.params.id);
  const updatedReinforcement = req.body;
  const reinforcementFile = path.join(__dirname, 'public', username, 'reinforcements.json');

  try {
    if (!fs.existsSync(reinforcementFile)) {
      return res.status(404).json({ error: 'Reinforcements file not found' });
    }

    const reinforcements = JSON.parse(fs.readFileSync(reinforcementFile, 'utf8'));
    const index = reinforcements.reinforcements.findIndex(r => r.id === reinforcementId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Reinforcement not found' });
    }

    // Preserve id and dateAdded
    updatedReinforcement.id = reinforcementId;
    if (!updatedReinforcement.dateAdded) {
      updatedReinforcement.dateAdded = reinforcements.reinforcements[index].dateAdded;
    }

    reinforcements.reinforcements[index] = updatedReinforcement;
    reinforcements.lastUpdated = new Date().toISOString().split('T')[0];

    fs.writeFileSync(reinforcementFile, JSON.stringify(reinforcements, null, 2));
    res.json(reinforcements);
  } catch (error) {
    console.error('Error updating reinforcement:', error);
    res.status(500).json({ error: 'Error updating reinforcement' });
  }
});

// Delete reinforcement
app.delete('/api/users/:username/reinforcements/:id', (req, res) => {
  const username = req.params.username;
  const reinforcementId = parseInt(req.params.id);
  const reinforcementFile = path.join(__dirname, 'public', username, 'reinforcements.json');

  try {
    if (!fs.existsSync(reinforcementFile)) {
      return res.status(404).json({ error: 'Reinforcements file not found' });
    }

    const reinforcements = JSON.parse(fs.readFileSync(reinforcementFile, 'utf8'));
    reinforcements.reinforcements = reinforcements.reinforcements.filter(r => r.id !== reinforcementId);
    reinforcements.lastUpdated = new Date().toISOString().split('T')[0];

    fs.writeFileSync(reinforcementFile, JSON.stringify(reinforcements, null, 2));
    res.json(reinforcements);
  } catch (error) {
    console.error('Error deleting reinforcement:', error);
    res.status(500).json({ error: 'Error deleting reinforcement' });
  }
});

// Reading Management Endpoints

// Get user reading data
app.get('/api/users/:username/reading', (req, res) => {
  const username = req.params.username;
  const readingFile = path.join(__dirname, 'public', username, 'reading.json');

  try {
    if (!fs.existsSync(readingFile)) {
      // Create default reading file
      const defaultReading = {
        version: "1.0",
        lastUpdated: new Date().toISOString().split('T')[0],
        currentlyReading: null,
        booksRead: [],
        readingGoals: {
          yearly: 10,
          completed: 0,
          target: "General software development and personal growth"
        }
      };
      
      const userDir = path.join(__dirname, 'public', username);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      
      fs.writeFileSync(readingFile, JSON.stringify(defaultReading, null, 2));
      return res.json(defaultReading);
    }

    const reading = JSON.parse(fs.readFileSync(readingFile, 'utf8'));
    res.json(reading);
  } catch (error) {
    console.error('Error reading reading data:', error);
    res.status(500).json({ error: 'Error reading reading data' });
  }
});

// Update currently reading book
app.put('/api/users/:username/reading/current', (req, res) => {
  const username = req.params.username;
  const readingFile = path.join(__dirname, 'public', username, 'reading.json');
  const currentBook = req.body;

  try {
    let reading;
    
    if (fs.existsSync(readingFile)) {
      reading = JSON.parse(fs.readFileSync(readingFile, 'utf8'));
    } else {
      reading = {
        version: "1.0",
        lastUpdated: new Date().toISOString().split('T')[0],
        currentlyReading: null,
        booksRead: [],
        readingGoals: { yearly: 10, completed: 0, target: "General development" }
      };
      
      const userDir = path.join(__dirname, 'public', username);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
    }

    reading.currentlyReading = currentBook;
    reading.lastUpdated = new Date().toISOString().split('T')[0];

    fs.writeFileSync(readingFile, JSON.stringify(reading, null, 2));
    res.json(reading);
  } catch (error) {
    console.error('Error updating current book:', error);
    res.status(500).json({ error: 'Error updating current book' });
  }
});

// Add finished book
app.post('/api/users/:username/reading/books', (req, res) => {
  const username = req.params.username;
  const readingFile = path.join(__dirname, 'public', username, 'reading.json');
  const newBook = req.body;

  try {
    let reading;
    
    if (fs.existsSync(readingFile)) {
      reading = JSON.parse(fs.readFileSync(readingFile, 'utf8'));
    } else {
      reading = {
        version: "1.0",
        lastUpdated: new Date().toISOString().split('T')[0],
        currentlyReading: null,
        booksRead: [],
        readingGoals: { yearly: 10, completed: 0, target: "General development" }
      };
      
      const userDir = path.join(__dirname, 'public', username);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
    }

    // Generate new ID
    const maxId = reading.booksRead.reduce((max, book) => Math.max(max, book.id || 0), 0);
    newBook.id = maxId + 1;
    newBook.completedDate = newBook.completedDate || new Date().toISOString().split('T')[0];

    reading.booksRead.unshift(newBook); // Add to beginning for most recent first
    reading.readingGoals.completed = reading.booksRead.length;
    reading.lastUpdated = new Date().toISOString().split('T')[0];

    fs.writeFileSync(readingFile, JSON.stringify(reading, null, 2));
    res.json(reading);
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).json({ error: 'Error adding book' });
  }
});

// Update reading goals
app.put('/api/users/:username/reading/goals', (req, res) => {
  const username = req.params.username;
  const readingFile = path.join(__dirname, 'public', username, 'reading.json');
  const goals = req.body;

  try {
    if (!fs.existsSync(readingFile)) {
      return res.status(404).json({ error: 'Reading data not found' });
    }

    const reading = JSON.parse(fs.readFileSync(readingFile, 'utf8'));
    reading.readingGoals = { ...reading.readingGoals, ...goals };
    reading.lastUpdated = new Date().toISOString().split('T')[0];

    fs.writeFileSync(readingFile, JSON.stringify(reading, null, 2));
    res.json(reading);
  } catch (error) {
    console.error('Error updating reading goals:', error);
    res.status(500).json({ error: 'Error updating reading goals' });
  }
});

// Update book rating/review
app.put('/api/users/:username/reading/books/:id', (req, res) => {
  const username = req.params.username;
  const bookId = parseInt(req.params.id);
  const updatedBook = req.body;
  const readingFile = path.join(__dirname, 'public', username, 'reading.json');

  try {
    if (!fs.existsSync(readingFile)) {
      return res.status(404).json({ error: 'Reading data not found' });
    }

    const reading = JSON.parse(fs.readFileSync(readingFile, 'utf8'));
    const bookIndex = reading.booksRead.findIndex(book => book.id === bookId);
    
    if (bookIndex === -1) {
      return res.status(404).json({ error: 'Book not found' });
    }

    reading.booksRead[bookIndex] = { ...reading.booksRead[bookIndex], ...updatedBook };
    reading.lastUpdated = new Date().toISOString().split('T')[0];

    fs.writeFileSync(readingFile, JSON.stringify(reading, null, 2));
    res.json(reading);
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ error: 'Error updating book' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
