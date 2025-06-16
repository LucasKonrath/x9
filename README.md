# X9 - GitHub Activity Tracker

A React application that displays GitHub activity, contributions, and meeting notes for team members, with support for both public and corporate GitHub instances.

## Features

- Track GitHub activity of team members
- View personal and corporate GitHub contribution graphs
- Interactive contribution heatmaps with tooltips
- Commits timeline grouped by date with detailed information
- Meeting notes system with markdown support
- Clean, modern UI with GitHub-inspired design
- Real-time contribution tracking for 2025
- Support for both public and enterprise GitHub instances
- Responsive design with Tailwind CSS animations

## Tech Stack

- React 18 with TypeScript support
- Tailwind CSS with custom animations
- Vite build system
- Express backend server
- GraphQL for GitHub API integration
- React Markdown for note rendering
- Axios for API requests
- date-fns for date formatting

## Getting Started

1. Clone the repository

2. Create a `.env` file in the root directory with your GitHub tokens:
   ```
   VITE_GITHUB_TOKEN=your_github_token
   VITE_PERSONAL_GITHUB_TOKEN=your_personal_token
   # Optional: For enterprise GitHub
   #VITE_ORG=your_company
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Start both the Vite development server and the Express API server:
   ```
   npm run dev:all
   ```
   This will start Vite on port 5173 and the Express server on port 3001.

5. Open your browser and navigate to http://localhost:5173

### Alternative Start Options

- Run just the Vite development server:
  ```
  npm run dev
  ```

- Run just the Express API server:
  ```
  npm run dev:server
  ```

- For production:
  ```
  npm run build
  npm start
  ```

## API Integration

The application integrates with multiple GitHub APIs:

- GitHub REST API for events and user data
- GitHub GraphQL API for detailed contribution data
- Support for GitHub Enterprise through configurable endpoints

Features include:
- Personal and corporate contribution graphs
- Meeting notes storage and retrieval
- Real-time contribution tracking
- Markdown file management

Note: GitHub API has rate limits. Authenticated requests are required and rate limits vary by authentication type.

## Project Structure

- `/src` - React application source code
  - `/components` - React components including contribution graphs and markdown editor
  - `/services` - API service integrations
  - `/utils` - Utility functions and GraphQL queries
- `/public` - Static files and markdown notes storage
  - `/{username}` - User-specific markdown notes directories
- `server.js` - Express server for API endpoints and file operations

## Meeting Notes

Meeting notes are stored as markdown files in the `/public/{username}` directory, following the format:
```
/public/username/YYYY-MM-DD.md
```

Features:
- Create and edit meeting notes with markdown support
- Notes are organized by date and user
- Real-time preview with syntax highlighting
- Collapsible note sections
- Automatic file naming and organization

## License

MIT
