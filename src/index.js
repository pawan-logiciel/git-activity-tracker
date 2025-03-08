#!/usr/bin/env node

import { Command } from 'commander';
import figlet from 'figlet';
import chalk from 'chalk';
import { scanRepositories } from './commands/scan.js';
import { showRepositoryStats } from './commands/stats.js';
import { exportData } from './commands/export.js';

// Display ASCII art banner
console.log(
  chalk.cyan(
    figlet.textSync('Git Activity Tracker', {
      font: 'Standard',
      horizontalLayout: 'default',
      verticalLayout: 'default',
    })
  )
);

const program = new Command();

program
  .name('git-tracker')
  .description('A CLI tool to track Git activity across local repositories')
  .version('1.0.0');

program
  .command('scan')
  .description('Scan your system for Git repositories')
  .option('-d, --directory <path>', 'Root directory to scan for Git repositories', process.cwd())
  .option('-r, --recursive', 'Scan directories recursively', true)
  .option('-m, --max-depth <depth>', 'Maximum depth for recursive scanning', '5')
  .action(scanRepositories);

program
  .command('stats')
  .description('Show detailed Git statistics for a repository')
  .option('-r, --repo <path>', 'Path to the Git repository')
  .option('-a, --author <name>', 'Filter by author name')
  .option('-s, --since <date>', 'Show stats since date (YYYY-MM-DD)')
  .option('-u, --until <date>', 'Show stats until date (YYYY-MM-DD)')
  .action(showRepositoryStats);

program
  .command('export')
  .description('Export Git statistics to a file')
  .option('-r, --repo <path>', 'Path to the Git repository')
  .option('-f, --format <format>', 'Export format (json or csv)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .option('-a, --author <name>', 'Filter by author name')
  .option('-s, --since <date>', 'Export stats since date (YYYY-MM-DD)')
  .option('-u, --until <date>', 'Export stats until date (YYYY-MM-DD)')
  .action(exportData);

// Default command when no command is specified
program
  .action(() => {
    program.help();
  });

program.parse(process.argv);
