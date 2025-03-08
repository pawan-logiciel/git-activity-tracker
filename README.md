# Git Activity Tracker

A command-line tool (CLI) that helps users track their Git activity by scanning their local system for Git repositories and displaying key stats interactively.

## Features

- Scan your system for Git repositories
- View detailed Git activity for any repository:
  - Total commits
  - Branches and current branch
  - Last commit details
  - Unstaged/staged changes
  - Remote status (unpushed commits)
- Filter by date range or author
- Export data to JSON or CSV

## Installation

### Prerequisites

- Node.js 14.16 or higher
- Git installed and accessible from the command line

### Install from Source

1. Clone the repository:
```bash
git clone https://github.com/yourusername/git-activity-tracker.git
cd git-activity-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Link the CLI tool globally:
```bash
npm link
```

## Usage

### Scan for Git Repositories

```bash
git-tracker scan [options]
```

Options:
- `-d, --directory <path>`: Root directory to scan for Git repositories (default: current directory)
- `-r, --recursive`: Scan directories recursively (default: true)
- `-m, --max-depth <depth>`: Maximum depth for recursive scanning (default: 5)

### Show Repository Statistics

```bash
git-tracker stats [options]
```

Options:
- `-r, --repo <path>`: Path to the Git repository
- `-a, --author <name>`: Filter by author name
- `-s, --since <date>`: Show stats since date (YYYY-MM-DD)
- `-u, --until <date>`: Show stats until date (YYYY-MM-DD)

### Export Repository Statistics

```bash
git-tracker export [options]
```

Options:
- `-r, --repo <path>`: Path to the Git repository
- `-f, --format <format>`: Export format (json or csv) (default: json)
- `-o, --output <file>`: Output file path
- `-a, --author <name>`: Filter by author name
- `-s, --since <date>`: Export stats since date (YYYY-MM-DD)
- `-u, --until <date>`: Export stats until date (YYYY-MM-DD)

### Help

```bash
git-tracker --help
```

## Examples

Scan the current directory for Git repositories:
```bash
git-tracker scan
```

Scan a specific directory recursively:
```bash
git-tracker scan -d ~/projects
```

Show statistics for a specific repository:
```bash
git-tracker stats -r ~/projects/my-repo
```

Show statistics for a specific author and date range:
```bash
git-tracker stats -r ~/projects/my-repo -a "John Doe" -s 2023-01-01 -u 2023-12-31
```

Export repository statistics to a JSON file:
```bash
git-tracker export -r ~/projects/my-repo -f json -o my-repo-stats
```

## Web App

Git Activity Tracker also includes a web application that provides a user-friendly interface for tracking Git activity.

### Starting the Web App

1. Navigate to the web-app directory:
```bash
cd web-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

### Using the Web App

1. **Scan for Repositories**: Enter a directory path to scan for Git repositories
2. **View Repository Details**: Select a repository from the list to view its statistics
3. **Filter Results**: Use the filters to narrow down the results by author or date range
4. **Interactive Dashboard**: View commit history, branch information, and other Git statistics in an interactive dashboard

### Web App Features

- User-friendly interface for scanning and viewing Git repositories
- Detailed statistics and visualizations for each repository
- Filter options by author and date range
- Responsive design that works on desktop and mobile devices

For more details about the web app, see the [web-app README](/web-app/README.md).

## License

MIT 