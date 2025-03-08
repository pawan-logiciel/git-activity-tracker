import path from 'path';
import { findGitRepositories } from '../utils/file.js';
import { getRepositoryName, getRepositoryStats } from '../utils/git.js';
import { 
  createSpinner, 
  showSuccess, 
  showError, 
  showInfo, 
  selectRepository,
  displayRepositoryStats
} from '../utils/ui.js';

/**
 * Scan for Git repositories and display them
 * @param {Object} options - Command options
 */
export async function scanRepositories(options) {
  const { directory, recursive, maxDepth } = options;
  const rootDir = path.resolve(directory);
  
  const spinner = createSpinner(`Scanning for Git repositories in ${rootDir}...`);
  spinner.start();
  
  try {
    // Find Git repositories
    const repoPaths = await findGitRepositories(rootDir, {
      recursive: recursive === true || recursive === 'true',
      maxDepth: parseInt(maxDepth, 10)
    });
    
    spinner.succeed(`Found ${repoPaths.length} Git repositories`);
    
    if (repoPaths.length === 0) {
      showInfo(`No Git repositories found in ${rootDir}`);
      return;
    }
    
    // Create repository objects with basic info
    const repositories = repoPaths.map(repoPath => ({
      name: getRepositoryName(repoPath),
      path: repoPath
    }));
    
    // Display repositories
    showInfo('Repositories found:');
    repositories.forEach((repo, index) => {
      console.log(`${index + 1}. ${repo.name} (${repo.path})`);
    });
    
    // Prompt user to select a repository
    const selectedRepoPath = await selectRepository(repositories);
    
    // Show detailed stats for the selected repository
    const detailsSpinner = createSpinner('Fetching repository details...');
    detailsSpinner.start();
    
    try {
      const stats = await getRepositoryStats(selectedRepoPath);
      detailsSpinner.succeed('Repository details fetched');
      
      displayRepositoryStats(stats);
    } catch (error) {
      detailsSpinner.fail(`Failed to fetch repository details: ${error.message}`);
    }
  } catch (error) {
    spinner.fail(`Scan failed: ${error.message}`);
    showError(error.message);
  }
}
