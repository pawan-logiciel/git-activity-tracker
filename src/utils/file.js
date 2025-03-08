import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { isGitRepository } from './git.js';

/**
 * Find all Git repositories in a directory
 * @param {string} rootDir - Root directory to scan
 * @param {Object} options - Scan options
 * @returns {Promise<Array<string>>} - List of repository paths
 */
export async function findGitRepositories(rootDir, options = {}) {
  const { recursive = true, maxDepth = 5 } = options;
  
  try {
    // Check if the root directory itself is a Git repository
    if (await isGitRepository(rootDir)) {
      return [rootDir];
    }
    
    if (!recursive) {
      // If not recursive, only check immediate subdirectories
      const entries = await fs.readdir(rootDir, { withFileTypes: true });
      const subdirs = entries
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(rootDir, entry.name));
      
      const repositories = [];
      
      for (const dir of subdirs) {
        if (await isGitRepository(dir)) {
          repositories.push(dir);
        }
      }
      
      return repositories;
    } else {
      // Use glob to find all .git directories recursively
      const pattern = path.join(rootDir, `${'**/'.repeat(maxDepth)}`, '.git');
      const gitDirs = await glob(pattern, { 
        ignore: ['**/node_modules/**', '**/.git/modules/**'],
        dot: true
      });
      
      // Convert .git directory paths to repository paths
      return gitDirs.map(gitDir => path.dirname(gitDir));
    }
  } catch (error) {
    throw new Error(`Failed to scan for Git repositories: ${error.message}`);
  }
}

/**
 * Export data to a file
 * @param {Object} data - Data to export
 * @param {string} filePath - Path to save the file
 * @param {string} format - Export format (json or csv)
 * @returns {Promise<void>}
 */
export async function exportDataToFile(data, filePath, format = 'json') {
  try {
    let content;
    
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      content = convertToCSV(data);
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
    
    await fs.writeFile(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(`Failed to export data: ${error.message}`);
  }
}

/**
 * Convert data to CSV format
 * @param {Object} data - Data to convert
 * @returns {string} - CSV content
 */
function convertToCSV(data) {
  if (!data || typeof data !== 'object') {
    return '';
  }
  
  // Handle array of objects
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return '';
    }
    
    const headers = Object.keys(data[0]);
    const headerRow = headers.join(',');
    
    const rows = data.map(item => {
      return headers.map(header => {
        const value = item[header];
        // Handle nested objects and arrays
        const cellValue = typeof value === 'object' ? JSON.stringify(value) : value;
        // Escape quotes and wrap in quotes if needed
        return `"${String(cellValue).replace(/"/g, '""')}"`;
      }).join(',');
    });
    
    return [headerRow, ...rows].join('\n');
  }
  
  // Handle single object
  const headers = Object.keys(data);
  const values = Object.values(data).map(value => {
    const cellValue = typeof value === 'object' ? JSON.stringify(value) : value;
    return `"${String(cellValue).replace(/"/g, '""')}"`;
  });
  
  return [headers.join(','), values.join(',')].join('\n');
}

/**
 * Get unique authors from commit history
 * @param {Array<Object>} commits - Commit history
 * @returns {Array<string>} - List of unique authors
 */
export function getUniqueAuthors(commits) {
  if (!commits || !Array.isArray(commits)) {
    return [];
  }
  
  const authors = new Set();
  
  for (const commit of commits) {
    if (commit.author) {
      authors.add(commit.author);
    }
  }
  
  return [...authors];
}
