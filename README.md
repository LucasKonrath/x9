# GitHub Commits Viewer

A React application that displays commit data for a preset list of GitHub users.

## Features

- View recent commits from 8 preset GitHub users
- Commits are displayed in a timeline format grouped by date
- Shows commit message, author, repository, and other details
- Responsive design with Tailwind CSS

## Tech Stack

- React 18
- Tailwind CSS
- Vite
- Axios for API requests
- date-fns for date formatting

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Open your browser and navigate to the local server (usually http://localhost:5173)

## API Usage

This application fetches GitHub events using the GitHub API:
```
https://api.github.com/users/{username}/events
```

Note: GitHub API has rate limits. Unauthenticated requests are limited to 60 requests per hour.

## License

MIT
