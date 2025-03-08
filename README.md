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

## License

MIT 