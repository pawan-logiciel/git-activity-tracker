import path from 'path';
import { isGitRepository, getRepositoryStats, getCommitHistory } from '../utils/git.js';
import { findGitRepositories, exportDataToFile, getUniqueAuthors } from '../utils/file.js';
import { 
  createSpinner, 
  showSuccess, 
  showError, 
  showInfo, 
  selectRepository,
  selectDateRange,
  selectAuthor,
  selectExportOptions
} from '../utils/ui.js';

/**
 * Export Git statistics to a file
 * @param {Object} options - Command options
 */
export async function exportData(options) {
  try {
    let repoPath = options.repo;
    let format = options.format || 'json';
    let outputFile = options.output;
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
      
      // If no output file is provided, prompt user to select export options
      if (!outputFile) {
        const exportOptions = await selectExportOptions();
        format = exportOptions.format;
        outputFile = exportOptions.filename;
      }
      
      // Ensure output file has the correct extension
      if (!outputFile.endsWith(`.${format}`)) {
        outputFile = `${outputFile}.${format}`;
      }
      
      // Fetch repository stats with filters
      const statsSpinner = createSpinner('Fetching repository statistics...');
      statsSpinner.start();
      
      const stats = await getRepositoryStats(repoPath, { author, since, until });
      
      // Get additional commit history for export
      const commitHistory = await getCommitHistory(repoPath, { 
        author, 
        since, 
        until,
        limit: 1000 // Limit to 1000 commits for export
      });
      
      // Prepare export data
      const exportData = {
        repository: {
          name: stats.name,
          path: stats.path
        },
        stats: {
          totalCommits: stats.totalCommits,
          currentBranch: stats.currentBranch,
          branches: stats.branches,
          lastCommit: stats.lastCommit,
          unpushedCommits: stats.unpushedCommits
        },
        filters: {
          author: author || 'All',
          since: since || 'Beginning',
          until: until || 'Now'
        },
        commits: commitHistory
      };
      
      statsSpinner.succeed('Repository statistics fetched');
      
      // Export data to file
      const exportSpinner = createSpinner(`Exporting data to ${outputFile}...`);
      exportSpinner.start();
      
      await exportDataToFile(exportData, outputFile, format);
      
      exportSpinner.succeed(`Data exported to ${outputFile}`);
      showSuccess(`Repository statistics exported to ${outputFile}`);
    } catch (error) {
      historySpinner.fail(`Failed to fetch commit history: ${error.message}`);
      showError(error.message);
    }
  } catch (error) {
    showError(`Failed to export repository statistics: ${error.message}`);
  }
}
