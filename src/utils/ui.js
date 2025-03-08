import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import boxen from 'boxen';

/**
 * Create a spinner with the given text
 * @param {string} text - Spinner text
 * @returns {Object} - Ora spinner instance
 */
export function createSpinner(text) {
  return ora({
    text,
    color: 'cyan',
    spinner: 'dots'
  });
}

/**
 * Display a success message
 * @param {string} message - Success message
 */
export function showSuccess(message) {
  console.log(chalk.green('✓ ') + message);
}

/**
 * Display an error message
 * @param {string} message - Error message
 */
export function showError(message) {
  console.error(chalk.red('✗ ') + message);
}

/**
 * Display a warning message
 * @param {string} message - Warning message
 */
export function showWarning(message) {
  console.warn(chalk.yellow('⚠ ') + message);
}

/**
 * Display an info message
 * @param {string} message - Info message
 */
export function showInfo(message) {
  console.info(chalk.blue('ℹ ') + message);
}

/**
 * Create a boxed message
 * @param {string} message - Message to display in box
 * @param {string} title - Box title
 * @param {string} color - Box color
 * @returns {string} - Boxed message
 */
export function createBox(message, title = '', color = 'cyan') {
  return boxen(message, {
    title,
    titleAlignment: 'center',
    padding: 1,
    margin: 1,
    borderColor: color,
    borderStyle: 'round'
  });
}

/**
 * Prompt user to select a repository from a list
 * @param {Array<Object>} repositories - List of repositories
 * @returns {Promise<string>} - Selected repository path
 */
export async function selectRepository(repositories) {
  if (repositories.length === 0) {
    throw new Error('No repositories found');
  }
  
  const choices = repositories.map(repo => ({
    name: `${chalk.bold(repo.name)} (${chalk.dim(repo.path)})`,
    value: repo.path
  }));
  
  const { selectedRepo } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedRepo',
      message: 'Select a repository:',
      choices,
      pageSize: 10
    }
  ]);
  
  return selectedRepo;
}

/**
 * Prompt user to select a date range
 * @returns {Promise<Object>} - Selected date range
 */
export async function selectDateRange() {
  const { useDateRange } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useDateRange',
      message: 'Do you want to filter by date range?',
      default: false
    }
  ]);
  
  if (!useDateRange) {
    return { since: null, until: null };
  }
  
  const { since, until } = await inquirer.prompt([
    {
      type: 'input',
      name: 'since',
      message: 'Start date (YYYY-MM-DD):',
      validate: value => {
        if (!value) return true;
        const date = new Date(value);
        return !isNaN(date.getTime()) ? true : 'Please enter a valid date in YYYY-MM-DD format';
      }
    },
    {
      type: 'input',
      name: 'until',
      message: 'End date (YYYY-MM-DD):',
      validate: value => {
        if (!value) return true;
        const date = new Date(value);
        return !isNaN(date.getTime()) ? true : 'Please enter a valid date in YYYY-MM-DD format';
      }
    }
  ]);
  
  return {
    since: since || null,
    until: until || null
  };
}

/**
 * Prompt user to select an author
 * @param {Array<string>} authors - List of authors
 * @returns {Promise<string>} - Selected author
 */
export async function selectAuthor(authors) {
  const { useAuthorFilter } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useAuthorFilter',
      message: 'Do you want to filter by author?',
      default: false
    }
  ]);
  
  if (!useAuthorFilter) {
    return null;
  }
  
  const choices = [
    { name: 'All authors', value: null },
    ...authors.map(author => ({ name: author, value: author }))
  ];
  
  const { selectedAuthor } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedAuthor',
      message: 'Select an author:',
      choices,
      pageSize: 10
    }
  ]);
  
  return selectedAuthor;
}

/**
 * Prompt user to select an export format
 * @returns {Promise<Object>} - Export options
 */
export async function selectExportOptions() {
  const { format, filename } = await inquirer.prompt([
    {
      type: 'list',
      name: 'format',
      message: 'Select export format:',
      choices: [
        { name: 'JSON', value: 'json' },
        { name: 'CSV', value: 'csv' }
      ],
      default: 'json'
    },
    {
      type: 'input',
      name: 'filename',
      message: 'Enter filename:',
      default: 'git-stats-export',
      validate: value => value ? true : 'Filename is required'
    }
  ]);
  
  return {
    format,
    filename: `${filename}.${format}`
  };
}

/**
 * Display repository statistics in a formatted way
 * @param {Object} stats - Repository statistics
 */
export function displayRepositoryStats(stats) {
  // Repository info
  const repoInfo = [
    `${chalk.bold('Repository:')} ${stats.name}`,
    `${chalk.bold('Path:')} ${stats.path}`,
    `${chalk.bold('Total Commits:')} ${stats.totalCommits}`,
    `${chalk.bold('Current Branch:')} ${stats.currentBranch}`,
    `${chalk.bold('Unpushed Commits:')} ${stats.unpushedCommits ? chalk.yellow('Yes') : chalk.green('No')}`
  ].join('\n');
  
  console.log(createBox(repoInfo, 'Repository Info', 'blue'));
  
  // Last commit info
  const lastCommitInfo = [
    `${chalk.bold('Author:')} ${stats.lastCommit.author} <${stats.lastCommit.email}>`,
    `${chalk.bold('Date:')} ${stats.lastCommit.date}`,
    `${chalk.bold('Message:')} ${stats.lastCommit.message}`,
    `${chalk.bold('Hash:')} ${stats.lastCommit.hash.substring(0, 8)}`
  ].join('\n');
  
  console.log(createBox(lastCommitInfo, 'Last Commit', 'green'));
  
  // Branches
  const branchesInfo = stats.branches
    .map(branch => `${branch.current ? chalk.green('* ') : '  '}${branch.name}`)
    .join('\n');
  
  console.log(createBox(branchesInfo, 'Branches', 'yellow'));
  
  // Changes status
  const stagedChanges = stats.changesStatus.staged;
  const unstagedChanges = stats.changesStatus.unstaged;
  
  const changesInfo = [
    chalk.bold('Staged Changes:'),
    `  Added: ${stagedChanges.added}`,
    `  Modified: ${stagedChanges.modified}`,
    `  Deleted: ${stagedChanges.deleted}`,
    '',
    chalk.bold('Unstaged Changes:'),
    `  Added: ${unstagedChanges.added}`,
    `  Modified: ${unstagedChanges.modified}`,
    `  Deleted: ${unstagedChanges.deleted}`
  ].join('\n');
  
  console.log(createBox(changesInfo, 'Changes', 'magenta'));
  
  // Files with changes
  if (stagedChanges.files.length > 0 || unstagedChanges.files.length > 0) {
    const filesWithChanges = [
      ...stagedChanges.files.map(f => `${chalk.green('[Staged]')} ${getStatusSymbol(f.status)} ${f.file}`),
      ...unstagedChanges.files.map(f => `${chalk.red('[Unstaged]')} ${getStatusSymbol(f.status)} ${f.file}`)
    ].join('\n');
    
    console.log(createBox(filesWithChanges, 'Changed Files', 'cyan'));
  }
}

/**
 * Get symbol for file status
 * @param {string} status - File status
 * @returns {string} - Status symbol
 */
function getStatusSymbol(status) {
  switch (status) {
    case 'A': return chalk.green('+ ');
    case 'M': return chalk.yellow('~ ');
    case 'D': return chalk.red('- ');
    case '?': return chalk.blue('? ');
    default: return status + ' ';
  }
}
