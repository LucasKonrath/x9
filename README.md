# X9 - GitHub Activity Tracker with AI Chat

A React application that displays GitHub activity, contributions, and meeting notes for team members, with an integrated AI chat assistant powered by Spring AI and Ollama.

## Features

- Track GitHub activity of team members
- View personal and corporate GitHub contribution graphs
- Interactive contribution heatmaps with tooltips
- Commits timeline grouped by date with detailed information
- Meeting notes system with markdown support
- **🤖 AI Chat Assistant** - Query team activities and insights using natural language
- Clean, modern UI with GitHub-inspired design
- Real-time contribution tracking for the current year
- Support for both public and enterprise GitHub instances
- Responsive design with Tailwind CSS animations

## Tech Stack

- **Frontend**: React 18 with TypeScript support
- **Styling**: Tailwind CSS with custom animations
- **Build**: Vite build system
- **Backend**: Express server + Spring AI (Java 21)
- **AI**: Ollama with llama3.2 and nomic-embed-text models
- **APIs**: GraphQL for GitHub API integration
- **Data**: React Markdown for note rendering, Vector store for AI context
- **HTTP**: Axios for API requests
- **Utils**: date-fns for date formatting

## Getting Started

### Prerequisites

1. **Node.js 18+** and **npm**
2. **Java 21+** and **Maven 3.6+**
3. **Ollama** - Install from [https://ollama.ai](https://ollama.ai)

### Setup

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

4. **Start everything** (React + Express + Spring AI + Ollama):
   ```
   npm run dev:all
   ```
   This will:
   - Start Ollama and download required AI models
   - Build and start the Spring AI service on port 8080
   - Start the Vite dev server on port 5173
   - Start the Express API server on port 3001
   - Open your browser to http://localhost:5173

### Alternative Commands

- **Start only the frontend:**
  ```
  npm run dev
  ```

- **Start only the AI service:**
  ```
  npm run dev:ai
  ```

- **Start frontend + Express API (without AI):**
  ```
  npm run dev && npm run dev:server
  ```

## 🤖 AI Chat Feature

The X9 app includes an intelligent chat assistant that can answer questions about team activities, progress, and insights based on markdown posts in the `/public/{username}/` directories.

### Using the Chat

1. Look for the floating chat button (🤖) in the bottom-right corner
2. Click to open the chat interface
3. Ask questions about your team's activities

### Example Questions

- "What has Lucas been working on lately?"
- "Show me recent team achievements" 
- "What challenges has the team been facing?"
- "What are the recent project updates?"
- "How is the team collaborating?"

### AI Architecture

- **Models**: llama3.2 (chat) + nomic-embed-text (embeddings)
- **Backend**: Spring AI with Ollama integration
- **Data Source**: Markdown files from `/public/{username}/` directories
- **Search**: Vector-based semantic search for relevant context
- **API**: RESTful endpoints with CORS support for React integration

### Troubleshooting AI Chat

- **Chat button shows disconnected**: The Spring AI service isn't running - use `npm run dev:all` or `npm run dev:ai`
- **Ollama errors**: Ensure Ollama is installed and models are downloaded
- **No relevant responses**: Add more markdown files to `/public/{username}/` directories

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
