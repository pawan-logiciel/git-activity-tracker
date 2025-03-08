# Git Activity Tracker Web App

A web interface for the Git Activity Tracker CLI tool, allowing users to scan for Git repositories and view detailed statistics through a user-friendly web interface.

## Features

- Scan for Git repositories in any directory
- View detailed Git activity for any repository:
  - Total commits
  - Branches and current branch
  - Last commit details
  - Unstaged/staged changes
  - Remote status (unpushed commits)
- Filter by date range or author
- Interactive and responsive UI

## Installation

### Prerequisites

- Node.js 14.16 or higher
- Git installed and accessible from the command line

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. For development with auto-restart:
```bash
npm run dev
```

4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. Enter a directory path to scan for Git repositories
2. Select a repository from the list to view its statistics
3. Use the filters to narrow down the results by author or date range

## API Endpoints

- `GET /api/scan` - Scan for Git repositories
  - Query parameters:
    - `directory` - Directory to scan (default: current directory)
    - `recursive` - Scan recursively (default: true)
    - `maxDepth` - Maximum depth for recursive scanning (default: 5)

- `GET /api/stats` - Get repository statistics
  - Query parameters:
    - `repo` - Repository path (required)
    - `author` - Filter by author name (optional)
    - `since` - Show stats since date (YYYY-MM-DD) (optional)
    - `until` - Show stats until date (YYYY-MM-DD) (optional)

- `GET /api/authors` - Get unique authors in a repository
  - Query parameters:
    - `repo` - Repository path (required)

## License

MIT 