import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { findGitRepositories } from '../src/utils/file.js';
import { 
  getRepositoryName, 
  getRepositoryStats, 
  getCommitHistory,
  executeGitCommand
} from '../src/utils/git.js';
import { getUniqueAuthors } from '../src/utils/file.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Git Activity Tracker' });
});

// API: Scan for repositories
app.get('/api/scan', async (req, res) => {
  try {
    const directory = req.query.directory || process.cwd();
    const recursive = req.query.recursive !== 'false';
    const maxDepth = parseInt(req.query.maxDepth || '5', 10);
    
    const repoPaths = await findGitRepositories(directory, { recursive, maxDepth });
    
    const repositories = repoPaths.map(repoPath => ({
      name: getRepositoryName(repoPath),
      path: repoPath
    }));
    
    res.json({ success: true, repositories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get repository stats
app.get('/api/stats', async (req, res) => {
  try {
    const { repo, author, branch } = req.query;
    
    if (!repo) {
      return res.status(400).json({ success: false, error: 'Repository path is required' });
    }
    
    // Check if the specified branch exists, otherwise fallback to main or master
    let useBranch = branch;
    if (branch) {
      try {
        const branches = await executeGitCommand('branch', repo);
        const branchList = branches.split('\n').map(b => b.replace('*', '').trim());
        
        if (!branchList.includes(branch)) {
          // Fallback to main or master if specified branch doesn't exist
          if (branchList.includes('main')) {
            useBranch = 'main';
          } else if (branchList.includes('master')) {
            useBranch = 'master';
          } else {
            // Use current branch if neither main nor master exists
            useBranch = '';
          }
        }
      } catch (error) {
        console.error(`Error checking branches: ${error.message}`);
        useBranch = '';
      }
    }
    
    const stats = await getRepositoryStats(repo, { author, branch: useBranch });
    
    // Get additional commit history
    const commits = await getCommitHistory(repo, { 
      author, 
      branch: useBranch,
      limit: 50 // Limit to 50 commits for the UI
    });
    
    res.json({ 
      success: true, 
      stats,
      commits
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get authors
app.get('/api/authors', async (req, res) => {
  try {
    const { repo, branch } = req.query;
    
    if (!repo) {
      return res.status(400).json({ success: false, error: 'Repository path is required' });
    }
    
    // Check if the specified branch exists, otherwise fallback to main or master
    let useBranch = branch;
    if (branch) {
      try {
        const branches = await executeGitCommand('branch', repo);
        const branchList = branches.split('\n').map(b => b.replace('*', '').trim());
        
        if (!branchList.includes(branch)) {
          // Fallback to main or master if specified branch doesn't exist
          if (branchList.includes('main')) {
            useBranch = 'main';
          } else if (branchList.includes('master')) {
            useBranch = 'master';
          } else {
            // Use current branch if neither main nor master exists
            useBranch = '';
          }
        }
      } catch (error) {
        console.error(`Error checking branches: ${error.message}`);
        useBranch = '';
      }
    }
    
    const commits = await getCommitHistory(repo, { 
      branch: useBranch,
      limit: 500 // Get more commits to analyze authors
    });
    
    const authors = getUniqueAuthors(commits);
    
    res.json({ success: true, authors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get multiple repositories stats
app.post('/api/multi-stats', async (req, res) => {
  try {
    const { repos, author, branchPreferences = 'main, master' } = req.body;
    
    if (!repos || !Array.isArray(repos) || repos.length === 0) {
      return res.status(400).json({ success: false, error: 'Repository paths are required' });
    }
    
    // Parse branch preferences
    const branchPriorities = branchPreferences
      .split(',')
      .map(branch => branch.trim())
      .filter(Boolean);
    
    // Process each repository in parallel
    const repoPromises = repos.map(async (repoPath) => {
      try {
        // Determine which branch to use based on preferences
        let defaultBranch = '';
        try {
          const branches = await executeGitCommand('branch', repoPath);
          const branchList = branches.split('\n').map(b => b.replace('*', '').trim()).filter(Boolean);
          
          // Find the first branch from preferences that exists in the repo
          for (const branch of branchPriorities) {
            if (branchList.includes(branch)) {
              defaultBranch = branch;
              break;
            }
          }
          
          // If no preferred branch found, use current branch
          if (!defaultBranch) {
            console.log(`No preferred branch found for ${repoPath}, using current branch`);
          }
        } catch (error) {
          console.log(`Warning: Could not determine default branch for ${repoPath}, using current branch`);
        }
        
        // Get repository stats
        let stats;
        try {
          stats = await getRepositoryStats(repoPath, { author });
        } catch (error) {
          console.error(`Error getting repository stats for ${repoPath}: ${error.message}`);
          return {
            name: getRepositoryName(repoPath),
            path: repoPath,
            error: `Failed to get repository stats: ${error.message}`
          };
        }
        
        // Get commits for the default branch
        let commits = [];
        try {
          commits = await getCommitHistory(repoPath, { 
            author,
            branch: defaultBranch,
            limit: 20 // Limit to 20 recent commits per repo for the combined view
          });
        } catch (error) {
          console.error(`Error getting commit history for ${repoPath}: ${error.message}`);
          // Continue with empty commits array
        }
        
        // Get all authors for this repo
        let allCommits = [];
        try {
          allCommits = await getCommitHistory(repoPath, { 
            branch: defaultBranch,
            limit: 500 // Get more commits to analyze user activity
          });
        } catch (error) {
          console.error(`Error getting all commits for ${repoPath}: ${error.message}`);
          // Continue with empty allCommits array
        }
        
        // Get branch authors (this is an approximation as Git doesn't track branch creators directly)
        const branchAuthors = new Map();
        if (stats.branches) {
          for (const branch of stats.branches) {
            try {
              // Get the first commit of the branch to determine who likely created it
              const branchCommits = await executeGitCommand(`log ${branch.name} --not --remotes --max-count=1 --format="%an"`, repoPath);
              if (branchCommits.trim()) {
                branchAuthors.set(branch.name, branchCommits.trim());
              }
            } catch (error) {
              console.log(`Skipping branch author for ${branch.name}: ${error.message}`);
              // Skip this branch and continue with others
            }
          }
        }
        
        return {
          name: stats.name,
          path: stats.path,
          totalCommits: stats.totalCommits,
          branches: stats.branches || [],
          branchAuthors: Object.fromEntries(branchAuthors),
          currentBranch: stats.currentBranch,
          defaultBranch: defaultBranch || stats.currentBranch,
          lastCommit: stats.lastCommit,
          commits: commits,
          allCommits: allCommits
        };
      } catch (error) {
        console.error(`Error processing repository ${repoPath}:`, error);
        return {
          name: getRepositoryName(repoPath),
          path: repoPath,
          error: error.message
        };
      }
    });
    
    const repoResults = await Promise.all(repoPromises);
    
    // Calculate combined stats
    const combinedStats = {
      totalCommits: 0,
      totalBranches: 0,
      totalPRs: 0, // This would require additional API calls to GitHub
      repositories: repoResults.filter(repo => !repo.error),
      recentActivity: [],
      userActivity: new Map(), // User-wise activity tracking
      userActivityDetails: new Map() // Detailed user activity for modal
    };
    
    // Process each repository's data
    repoResults.forEach(repo => {
      if (repo.error) return;
      
      // Add to totals
      combinedStats.totalCommits += repo.totalCommits;
      combinedStats.totalBranches += repo.branches.length;
      
      // Process all commits for user activity
      if (repo.allCommits && repo.allCommits.length > 0) {
        repo.allCommits.forEach(commit => {
          const author = commit.author;
          
          // Initialize user data if not exists
          if (!combinedStats.userActivity.has(author)) {
            combinedStats.userActivity.set(author, {
              commits: 0,
              prs: 0,
              branches: 0,
              lastActivity: null,
              activities: [] // Store actual activity dates for filtering
            });
            
            // Initialize user activity details
            combinedStats.userActivityDetails.set(author, []);
          }
          
          const userData = combinedStats.userActivity.get(author);
          userData.commits++;
          
          // Store activity date for filtering
          if (commit.date) {
            userData.activities.push({
              type: 'commit',
              date: commit.date
            });
          }
          
          // Add to detailed activity for modal
          combinedStats.userActivityDetails.get(author).push({
            type: 'commit',
            date: commit.date,
            repository: repo.name,
            details: commit.message,
            hash: commit.hash
          });
          
          // Update last activity date if newer
          const commitDate = new Date(commit.date);
          if (!userData.lastActivity || commitDate > new Date(userData.lastActivity)) {
            userData.lastActivity = commit.date;
          }
        });
      }
      
      // Count branches per user
      if (repo.branches && repo.branchAuthors) {
        Object.entries(repo.branchAuthors).forEach(([branchName, author]) => {
          if (!combinedStats.userActivity.has(author)) {
            combinedStats.userActivity.set(author, {
              commits: 0,
              prs: 0,
              branches: 0,
              lastActivity: null,
              activities: []
            });
            
            // Initialize user activity details
            combinedStats.userActivityDetails.set(author, []);
          }
          
          const userData = combinedStats.userActivity.get(author);
          userData.branches++;
          
          // Add to detailed activity for modal
          combinedStats.userActivityDetails.get(author).push({
            type: 'branch',
            date: null, // We don't have the exact date for branch creation
            repository: repo.name,
            details: `Created branch: ${branchName}`
          });
        });
      }
      
      // Add recent commits to activity feed
      if (repo.commits && repo.commits.length > 0) {
        repo.commits.forEach(commit => {
          combinedStats.recentActivity.push({
            repo: repo.name,
            type: 'commit',
            details: commit.message,
            author: commit.author,
            date: commit.date,
            hash: commit.hash
          });
        });
      }
    });
    
    // Convert userActivity Map to array for JSON response
    combinedStats.userActivity = Array.from(combinedStats.userActivity.entries()).map(([author, data]) => ({
      author,
      ...data
    }));
    
    // Convert userActivityDetails Map to object for JSON response
    combinedStats.userActivityDetails = Object.fromEntries(
      Array.from(combinedStats.userActivityDetails.entries()).map(([author, activities]) => [
        author,
        activities.sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        })
      ])
    );
    
    // Sort users by commit count (descending)
    combinedStats.userActivity.sort((a, b) => b.commits - a.commits);
    
    // Sort recent activity by date (newest first)
    combinedStats.recentActivity.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    // Limit to most recent 50 activities
    combinedStats.recentActivity = combinedStats.recentActivity.slice(0, 50);
    
    // Get all authors from all repositories for the author filter
    const allAuthors = new Set();
    combinedStats.userActivity.forEach(user => {
      allAuthors.add(user.author);
    });
    
    res.json({ 
      success: true, 
      combinedStats,
      allAuthors: Array.from(allAuthors)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 