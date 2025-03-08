import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { format as formatDate, parseISO, isAfter, isBefore, isValid } from 'date-fns';

const execAsync = promisify(exec);

/**
 * Check if a directory is a Git repository
 * @param {string} dirPath - Path to check
 * @returns {Promise<boolean>} - True if directory is a Git repository
 */
export async function isGitRepository(dirPath) {
  try {
    const gitDir = path.join(dirPath, '.git');
    await fs.access(gitDir);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Execute a Git command in a repository
 * @param {string} command - Git command to execute
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<string>} - Command output
 */
export async function executeGitCommand(command, repoPath) {
  try {
    const { stdout } = await execAsync(`git ${command}`, { cwd: repoPath });
    return stdout.trim();
  } catch (error) {
    if (error.stderr && error.stderr.includes('not a git repository')) {
      throw new Error(`${repoPath} is not a valid Git repository`);
    }
    throw error;
  }
}

/**
 * Get repository name from path
 * @param {string} repoPath - Path to the repository
 * @returns {string} - Repository name
 */
export function getRepositoryName(repoPath) {
  return path.basename(repoPath);
}

/**
 * Get total number of commits in a repository
 * @param {string} repoPath - Path to the repository
 * @param {Object} options - Filter options
 * @returns {Promise<number>} - Total number of commits
 */
export async function getTotalCommits(repoPath, options = {}) {
  let command = 'rev-list --count';
  
  // Add branch if specified
  if (options.branch) {
    command += ` ${options.branch}`;
  } else {
    command += ' HEAD';
  }
  
  if (options.author) {
    command += ` --author="${options.author}"`;
  }
  
  if (options.since && isValid(parseISO(options.since))) {
    command += ` --since="${options.since}"`;
  }
  
  if (options.until && isValid(parseISO(options.until))) {
    command += ` --until="${options.until}"`;
  }
  
  const count = await executeGitCommand(command, repoPath);
  return parseInt(count, 10);
}

/**
 * Get all branches in a repository
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Array<string>>} - List of branches
 */
export async function getBranches(repoPath) {
  const output = await executeGitCommand('branch', repoPath);
  return output
    .split('\n')
    .filter(Boolean)
    .map(branch => ({
      name: branch.replace('*', '').trim(),
      current: branch.includes('*')
    }));
}

/**
 * Get current branch name
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<string>} - Current branch name
 */
export async function getCurrentBranch(repoPath) {
  return executeGitCommand('rev-parse --abbrev-ref HEAD', repoPath);
}

/**
 * Get details of the last commit
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Object>} - Last commit details
 */
export async function getLastCommit(repoPath) {
  const formatStr = {
    hash: '%H',
    author: '%an',
    email: '%ae',
    date: '%aI',
    message: '%s'
  };
  
  const gitFormatStr = Object.values(formatStr).join('%n');
  const output = await executeGitCommand(`log -1 --pretty=format:"${gitFormatStr}"`, repoPath);
  const [hash, author, email, date, message] = output.split('\n');
  
  return {
    hash,
    author,
    email,
    date: formatDate(parseISO(date), 'yyyy-MM-dd HH:mm:ss'),
    message
  };
}

/**
 * Get status of unstaged and staged changes
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<Object>} - Status of changes
 */
export async function getChangesStatus(repoPath) {
  const output = await executeGitCommand('status --porcelain', repoPath);
  
  const changes = {
    staged: {
      added: 0,
      modified: 0,
      deleted: 0,
      files: []
    },
    unstaged: {
      added: 0,
      modified: 0,
      deleted: 0,
      files: []
    }
  };
  
  if (!output) {
    return changes;
  }
  
  const lines = output.split('\n').filter(Boolean);
  
  for (const line of lines) {
    const [status, file] = [line.substring(0, 2), line.substring(3)];
    const stagedStatus = status[0];
    const unstagedStatus = status[1];
    
    // Check staged changes
    if (stagedStatus !== ' ' && stagedStatus !== '?') {
      changes.staged.files.push({ status: stagedStatus, file });
      
      if (stagedStatus === 'A') changes.staged.added++;
      else if (stagedStatus === 'M') changes.staged.modified++;
      else if (stagedStatus === 'D') changes.staged.deleted++;
    }
    
    // Check unstaged changes
    if (unstagedStatus !== ' ') {
      changes.unstaged.files.push({ status: unstagedStatus, file });
      
      if (unstagedStatus === '?') changes.unstaged.added++;
      else if (unstagedStatus === 'M') changes.unstaged.modified++;
      else if (unstagedStatus === 'D') changes.unstaged.deleted++;
    }
  }
  
  return changes;
}

/**
 * Check if there are unpushed commits
 * @param {string} repoPath - Path to the repository
 * @returns {Promise<boolean>} - True if there are unpushed commits
 */
export async function hasUnpushedCommits(repoPath) {
  try {
    const output = await executeGitCommand('log @{u}..', repoPath);
    return output.length > 0;
  } catch (error) {
    // If there's no upstream branch, consider it as having unpushed commits
    if (error.message.includes('no upstream')) {
      return true;
    }
    throw error;
  }
}

/**
 * Get commit history with details
 * @param {string} repoPath - Path to the repository
 * @param {Object} options - Filter options
 * @returns {Promise<Array<Object>>} - Commit history
 */
export async function getCommitHistory(repoPath, options = {}) {
  let command = 'log';
  
  // Add branch if specified
  if (options.branch) {
    command += ` ${options.branch}`;
  }
  
  command += ' --pretty=format:"%H|%an|%ae|%aI|%s"';
  
  if (options.author) {
    command += ` --author="${options.author}"`;
  }
  
  if (options.since && isValid(parseISO(options.since))) {
    command += ` --since="${options.since}"`;
  }
  
  if (options.until && isValid(parseISO(options.until))) {
    command += ` --until="${options.until}"`;
  }
  
  if (options.limit) {
    command += ` -n ${options.limit}`;
  }
  
  const output = await executeGitCommand(command, repoPath);
  
  if (!output) {
    return [];
  }
  
  return output.split('\n').map(line => {
    const [hash, author, email, date, message] = line.split('|');
    return {
      hash,
      author,
      email,
      date: formatDate(parseISO(date), 'yyyy-MM-dd HH:mm:ss'),
      message
    };
  });
}

/**
 * Get repository statistics
 * @param {string} repoPath - Path to the repository
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} - Repository statistics
 */
export async function getRepositoryStats(repoPath, options = {}) {
  const [
    totalCommits,
    branches,
    currentBranch,
    lastCommit,
    changesStatus,
    unpushedCommits
  ] = await Promise.all([
    getTotalCommits(repoPath, options),
    getBranches(repoPath),
    getCurrentBranch(repoPath),
    getLastCommit(repoPath),
    getChangesStatus(repoPath),
    hasUnpushedCommits(repoPath)
  ]);
  
  return {
    name: getRepositoryName(repoPath),
    path: repoPath,
    totalCommits,
    branches,
    currentBranch,
    lastCommit,
    changesStatus,
    unpushedCommits
  };
}
