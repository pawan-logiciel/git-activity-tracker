import path from 'path';
import { isGitRepository, getRepositoryStats, getCommitHistory } from '../utils/git.js';
import { getUniqueAuthors } from '../utils/file.js';
import { 
  createSpinner, 
  showError, 
  showInfo, 
  selectRepository,
  selectDateRange,
  selectAuthor,
  displayRepositoryStats
} from '../utils/ui.js';
import { findGitRepositories } from '../utils/file.js';

/**
 * Show detailed Git statistics for a repository
 * @param {Object} options - Command options
 */
export async function showRepositoryStats(options) {
  try {
    let repoPath = options.repo;
    let author = options.author;
    let since = options.since;
    let until = options.until;
    
    // If no repository path is provided, scan for repositories
    if (!repoPath) {
      const spinner = createSpinner('Scanning for Git repositories...');
      spinner.start();
      
      const repoPaths = await findGitRepositories(process.cwd(), { recursive: true });
      
      spinner.succeed(`Found ${repoPaths.length} Git repositories`);
      
      if (repoPaths.length === 0) {
        showInfo('No Git repositories found');
        return;
      }
      
      // Create repository objects with basic info
      const repositories = repoPaths.map(path => ({
        name: path.split('/').pop(),
        path
      }));
      
      // Prompt user to select a repository
      repoPath = await selectRepository(repositories);
    } else {
      repoPath = path.resolve(repoPath);
      
      // Verify that the path is a Git repository
      if (!(await isGitRepository(repoPath))) {
        showError(`${repoPath} is not a valid Git repository`);
        return;
      }
    }
    
    // Fetch commit history for author selection
    const historySpinner = createSpinner('Fetching commit history...');
    historySpinner.start();
    
    try {
      const commits = await getCommitHistory(repoPath, { limit: 100 });
      historySpinner.succeed('Commit history fetched');
      
      // If no author is provided, prompt user to select one
      if (!author) {
        const authors = getUniqueAuthors(commits);
        author = await selectAuthor(authors);
      }
      
      // If no date range is provided, prompt user to select one
      if (!since && !until) {
        const dateRange = await selectDateRange();
        since = dateRange.since;
        until = dateRange.until;
      }
      
      // Fetch repository stats with filters
      const statsSpinner = createSpinner('Fetching repository statistics...');
      statsSpinner.start();
      
      const stats = await getRepositoryStats(repoPath, { author, since, until });
      
      statsSpinner.succeed('Repository statistics fetched');
      
      // Display repository stats
      displayRepositoryStats(stats);
    } catch (error) {
      historySpinner.fail(`Failed to fetch commit history: ${error.message}`);
      showError(error.message);
    }
  } catch (error) {
    showError(`Failed to show repository statistics: ${error.message}`);
  }
}
