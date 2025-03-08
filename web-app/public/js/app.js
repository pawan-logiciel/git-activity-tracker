document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const scanForm = document.getElementById('scanForm');
  const filtersForm = document.getElementById('filtersForm');
  const repoListCard = document.getElementById('repoListCard');
  const repoList = document.getElementById('repoList');
  const filtersCard = document.getElementById('filtersCard');
  const authorSelect = document.getElementById('author');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const statsContainer = document.getElementById('statsContainer');
  const multiRepoDashboard = document.getElementById('multiRepoDashboard');
  const viewModeToggle = document.getElementById('viewModeToggle');
  const multiViewControls = document.querySelector('.multi-view-controls');
  const selectAllReposBtn = document.getElementById('selectAllRepos');
  const compareReposBtn = document.getElementById('compareReposBtn');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const applyDateRangeBtn = document.getElementById('applyDateRange');
  const userSearchInput = document.getElementById('userSearch');
  const clearSearchBtn = document.getElementById('clearSearch');
  
  // Current repository path and view mode
  let currentRepoPath = '';
  let isMultiViewMode = false;
  let repositories = [];
  let selectedRepos = new Set();
  let combinedStatsData = null; // Store the combined stats data for filtering
  let allUserActivity = []; // Store all user activity data for filtering
  
  // Set default date range (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  startDateInput.valueAsDate = thirtyDaysAgo;
  endDateInput.valueAsDate = today;
  
  // Event Listeners
  scanForm.addEventListener('submit', handleScan);
  filtersForm.addEventListener('submit', handleApplyFilters);
  viewModeToggle.addEventListener('click', toggleViewMode);
  selectAllReposBtn.addEventListener('click', toggleSelectAllRepos);
  compareReposBtn.addEventListener('click', compareSelectedRepos);
  applyDateRangeBtn?.addEventListener('click', handleDateRangeFilter);
  userSearchInput?.addEventListener('input', handleUserSearch);
  clearSearchBtn?.addEventListener('click', clearUserSearch);
  
  /**
   * Handle date range filter
   */
  function handleDateRangeFilter() {
    if (!allUserActivity || allUserActivity.length === 0) return;
    
    const startDate = startDateInput.valueAsDate;
    const endDate = endDateInput.valueAsDate;
    
    if (!startDate || !endDate) {
      showError('Please select both start and end dates');
      return;
    }
    
    if (startDate > endDate) {
      showError('Start date cannot be after end date');
      return;
    }
    
    filterUserActivityByDateRange(startDate, endDate);
  }
  
  /**
   * Filter user activity data by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  function filterUserActivityByDateRange(startDate, endDate) {
    if (!allUserActivity || allUserActivity.length === 0) return;
    
    // Set time to end of day for end date for inclusive comparison
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Filter activity data by date
    const filteredUserActivity = allUserActivity.map(user => {
      // Clone the user object to avoid modifying the original data
      const filteredUser = { ...user };
      
      // Filter activities by date range
      if (filteredUser.activities && filteredUser.activities.length > 0) {
        const activitiesInRange = filteredUser.activities.filter(activity => {
          const activityDate = new Date(activity.date);
          return activityDate >= startDate && activityDate <= endOfDay;
        });
        
        // Mark user as in range if they have activities in the date range
        filteredUser.inRange = activitiesInRange.length > 0;
        
        // Count commits in range
        const commitsInRange = activitiesInRange.filter(a => a.type === 'commit').length;
        filteredUser.commitsInRange = commitsInRange;
      } else {
        // If no activities data, fall back to last activity date
        if (filteredUser.lastActivity) {
          const activityDate = new Date(filteredUser.lastActivity);
          filteredUser.inRange = activityDate >= startDate && activityDate <= endOfDay;
        } else {
          filteredUser.inRange = false;
        }
        filteredUser.commitsInRange = filteredUser.inRange ? filteredUser.commits : 0;
      }
      
      return filteredUser;
    });
    
    // Filter out users with no activity in range if search is not active
    const searchTerm = userSearchInput.value.trim().toLowerCase();
    const finalFilteredActivity = searchTerm 
      ? filteredUserActivity.filter(user => user.author.toLowerCase().includes(searchTerm))
      : filteredUserActivity.filter(user => user.inRange);
    
    // Display the filtered data
    displayUserActivityTable(finalFilteredActivity);
  }
  
  /**
   * Handle user search
   */
  function handleUserSearch() {
    if (!allUserActivity || allUserActivity.length === 0) return;
    
    const searchTerm = userSearchInput.value.trim().toLowerCase();
    
    if (searchTerm === '') {
      // If search is cleared, reapply date filter
      handleDateRangeFilter();
      return;
    }
    
    // Filter users by search term
    const filteredUsers = allUserActivity.filter(user => 
      user.author.toLowerCase().includes(searchTerm)
    );
    
    displayUserActivityTable(filteredUsers, searchTerm);
  }
  
  /**
   * Clear user search
   */
  function clearUserSearch() {
    userSearchInput.value = '';
    handleDateRangeFilter();
  }
  
  /**
   * Toggle between single and multi-repository view modes
   */
  function toggleViewMode() {
    isMultiViewMode = !isMultiViewMode;
    
    // Update UI
    document.querySelector('.single-view-text').style.display = isMultiViewMode ? 'none' : 'inline';
    document.querySelector('.multi-view-text').style.display = isMultiViewMode ? 'inline' : 'none';
    multiViewControls.style.display = isMultiViewMode ? 'block' : 'none';
    
    // Update repository list display
    displayRepositories(repositories);
    
    // Hide stats containers when switching modes
    statsContainer.style.display = 'none';
    multiRepoDashboard.style.display = 'none';
    filtersCard.style.display = 'none';
  }
  
  /**
   * Toggle selection of all repositories
   */
  function toggleSelectAllRepos() {
    const checkboxes = document.querySelectorAll('.repo-item-checkbox');
    const allSelected = selectedRepos.size === repositories.length;
    
    if (allSelected) {
      // Deselect all
      selectedRepos.clear();
      checkboxes.forEach(checkbox => {
        checkbox.checked = false;
      });
    } else {
      // Select all
      repositories.forEach(repo => {
        selectedRepos.add(repo.path);
      });
      checkboxes.forEach(checkbox => {
        checkbox.checked = true;
      });
    }
  }
  
  /**
   * Compare selected repositories
   */
  async function compareSelectedRepos() {
    if (selectedRepos.size === 0) {
      showError('Please select at least one repository to compare');
      return;
    }
    
    showLoading();
    statsContainer.style.display = 'none';
    multiRepoDashboard.style.display = 'none';
    
    try {
      const author = document.getElementById('author').value;
      
      const response = await fetch('/api/multi-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repos: Array.from(selectedRepos),
          author
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      // Store the combined stats data for filtering
      combinedStatsData = data.combinedStats;
      allUserActivity = data.combinedStats.userActivity;
      
      // Populate author select with all authors from all repositories
      if (data.allAuthors && data.allAuthors.length > 0) {
        populateAuthorsSelect(data.allAuthors);
      }
      
      displayMultiRepoStats(data.combinedStats);
      
      // Apply initial date range filter
      handleDateRangeFilter();
      
      // Show filters card
      filtersCard.style.display = 'block';
    } catch (error) {
      showError(`Failed to compare repositories: ${error.message}`);
    } finally {
      hideLoading();
    }
  }
  
  /**
   * Display multi-repository statistics
   * @param {Object} combinedStats - Combined repository statistics
   */
  function displayMultiRepoStats(combinedStats) {
    // Update summary stats
    document.getElementById('combinedCommits').textContent = combinedStats.totalCommits;
    document.getElementById('combinedPRs').textContent = combinedStats.totalPRs;
    document.getElementById('combinedBranches').textContent = combinedStats.totalBranches;
    
    // Update repository comparison table
    const repoComparisonTable = document.getElementById('repoComparisonTable');
    repoComparisonTable.innerHTML = '';
    
    if (combinedStats.repositories.length === 0) {
      repoComparisonTable.innerHTML = '<tr><td colspan="5">No repositories found</td></tr>';
    } else {
      combinedStats.repositories.forEach(repo => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${repo.name}</td>
          <td>${repo.totalCommits}</td>
          <td>N/A</td>
          <td>${repo.branches.length}</td>
          <td>${repo.lastCommit.date}</td>
        `;
        repoComparisonTable.appendChild(row);
      });
    }
    
    // Update combined activity table
    const combinedActivityTable = document.getElementById('combinedActivityTable');
    combinedActivityTable.innerHTML = '';
    
    if (combinedStats.recentActivity.length === 0) {
      combinedActivityTable.innerHTML = '<tr><td colspan="5">No recent activity found</td></tr>';
    } else {
      combinedStats.recentActivity.forEach(activity => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${activity.repo}</td>
          <td>${activity.type}</td>
          <td>${activity.details}</td>
          <td>${activity.author}</td>
          <td>${activity.date}</td>
        `;
        combinedActivityTable.appendChild(row);
      });
    }
    
    // Show multi-repo dashboard
    multiRepoDashboard.style.display = 'block';
  }
  
  /**
   * Display user activity table
   * @param {Array} userActivity - User activity data
   * @param {string} searchTerm - Search term for highlighting
   */
  function displayUserActivityTable(userActivity, searchTerm = '') {
    const userActivityTable = document.getElementById('userActivityTable');
    userActivityTable.innerHTML = '';
    
    if (!userActivity || userActivity.length === 0) {
      userActivityTable.innerHTML = '<tr><td colspan="5">No user activity found</td></tr>';
      return;
    }
    
    userActivity.forEach(user => {
      const row = document.createElement('tr');
      row.className = 'user-row';
      row.style.cursor = 'pointer';
      
      // Add highlight class if search term matches
      if (searchTerm && user.author.toLowerCase().includes(searchTerm.toLowerCase())) {
        row.classList.add('highlight');
      }
      
      // Add faded class if user activity is outside date range
      if (user.hasOwnProperty('inRange') && !user.inRange) {
        row.style.opacity = '0.6';
      }
      
      // Use filtered commit count if available
      const commitCount = user.hasOwnProperty('commitsInRange') ? user.commitsInRange : user.commits;
      
      row.innerHTML = `
        <td>${user.author}</td>
        <td>${commitCount}</td>
        <td>${user.prs}</td>
        <td>${user.branches}</td>
        <td>${user.lastActivity || 'N/A'}</td>
      `;

      // Add click event listener to show user details
      row.addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('userActivityModal'));
        const modalTitle = document.getElementById('modalUserName');
        const modalStats = document.getElementById('modalUserStats');
        const activityTable = document.getElementById('userActivityDetails');
        
        // Set user name and stats
        modalTitle.textContent = user.author;
        modalStats.textContent = `Commits: ${commitCount} | PRs: ${user.prs} | Branches: ${user.branches}`;
        
        // Get user's detailed activities from the stored data
        const activities = combinedStatsData?.userActivityDetails[user.author] || [];
        
        // Clear existing table content
        activityTable.innerHTML = '';
        
        // Add activities to the table
        activities.forEach(activity => {
          const activityRow = document.createElement('tr');
          activityRow.innerHTML = `
            <td>${activity.date ? new Date(activity.date).toLocaleDateString() : 'N/A'}</td>
            <td>${activity.repository}</td>
            <td>${activity.type}</td>
            <td>${activity.details}</td>
          `;
          activityTable.appendChild(activityRow);
        });
        
        modal.show();
      });
      
      userActivityTable.appendChild(row);
    });
  }
  
  /**
   * Handle scan form submission
   * @param {Event} e - Form submit event
   */
  async function handleScan(e) {
    e.preventDefault();
    
    const directory = document.getElementById('directory').value || process.cwd();
    const recursive = document.getElementById('recursive').checked;
    const maxDepth = document.getElementById('maxDepth').value;
    
    showLoading();
    
    try {
      const response = await fetch(`/api/scan?directory=${encodeURIComponent(directory)}&recursive=${recursive}&maxDepth=${maxDepth}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      repositories = data.repositories;
      selectedRepos.clear();
      displayRepositories(repositories);
    } catch (error) {
      showError(`Failed to scan repositories: ${error.message}`);
    } finally {
      hideLoading();
    }
  }
  
  /**
   * Display repositories in the list
   * @param {Array} repositories - List of repositories
   */
  function displayRepositories(repositories) {
    repoList.innerHTML = '';
    
    if (repositories.length === 0) {
      repoList.innerHTML = '<div class="list-group-item">No repositories found</div>';
      repoListCard.style.display = 'block';
      return;
    }
    
    repositories.forEach(repo => {
      if (isMultiViewMode) {
        // Multi-view mode with checkboxes
        const item = document.createElement('div');
        item.className = 'repo-item';
        
        const isSelected = selectedRepos.has(repo.path);
        if (isSelected) {
          item.classList.add('active');
        }
        
        item.innerHTML = `
          <input type="checkbox" class="repo-item-checkbox" ${isSelected ? 'checked' : ''}>
          <div class="repo-item-content">
            <div class="repo-item-name">${repo.name}</div>
            <div class="repo-item-path">${repo.path}</div>
          </div>
        `;
        
        const checkbox = item.querySelector('.repo-item-checkbox');
        
        checkbox.addEventListener('change', (e) => {
          if (e.target.checked) {
            selectedRepos.add(repo.path);
            item.classList.add('active');
          } else {
            selectedRepos.delete(repo.path);
            item.classList.remove('active');
          }
        });
        
        item.addEventListener('click', (e) => {
          if (e.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
          }
        });
        
        repoList.appendChild(item);
      } else {
        // Single-view mode with selectable items
        const item = document.createElement('button');
        item.className = 'list-group-item list-group-item-action';
        item.innerHTML = `
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${repo.name}</h6>
          </div>
          <small class="text-muted">${repo.path}</small>
        `;
        
        item.addEventListener('click', () => {
          // Remove active class from all items
          document.querySelectorAll('.list-group-item').forEach(el => {
            el.classList.remove('active');
          });
          
          // Add active class to clicked item
          item.classList.add('active');
          
          // Load repository stats
          loadRepositoryStats(repo.path);
        });
        
        repoList.appendChild(item);
      }
    });
    
    repoListCard.style.display = 'block';
  }
  
  /**
   * Load repository statistics
   * @param {string} repoPath - Repository path
   */
  async function loadRepositoryStats(repoPath) {
    currentRepoPath = repoPath;
    
    showLoading();
    statsContainer.style.display = 'none';
    multiRepoDashboard.style.display = 'none';
    
    try {
      // Fetch repository stats
      const response = await fetch(`/api/stats?repo=${encodeURIComponent(repoPath)}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      // Display repository stats
      displayRepositoryStats(data.stats, data.commits);
      
      // Fetch authors for filtering
      const authorsResponse = await fetch(`/api/authors?repo=${encodeURIComponent(repoPath)}`);
      const authorsData = await authorsResponse.json();
      
      if (authorsData.success) {
        populateAuthorsSelect(authorsData.authors);
      }
      
      // Show filters card
      filtersCard.style.display = 'block';
    } catch (error) {
      showError(`Failed to load repository stats: ${error.message}`);
    } finally {
      hideLoading();
    }
  }
  
  /**
   * Display repository statistics
   * @param {Object} stats - Repository statistics
   * @param {Array} commits - Commit history
   */
  function displayRepositoryStats(stats, commits) {
    // Repository info
    document.getElementById('repoName').textContent = stats.name;
    document.getElementById('repoPath').textContent = stats.path;
    document.getElementById('currentBranch').textContent = stats.currentBranch;
    document.getElementById('totalCommits').textContent = stats.totalCommits;
    document.getElementById('unpushedCommits').textContent = stats.unpushedCommits ? 'Yes' : 'No';
    
    // Last commit
    document.getElementById('lastCommitAuthor').textContent = `${stats.lastCommit.author} <${stats.lastCommit.email}>`;
    document.getElementById('lastCommitDate').textContent = stats.lastCommit.date;
    document.getElementById('lastCommitMessage').textContent = stats.lastCommit.message;
    document.getElementById('lastCommitHash').textContent = stats.lastCommit.hash.substring(0, 8);
    
    // Branches
    const branchesList = document.getElementById('branchesList');
    branchesList.innerHTML = '';
    
    stats.branches.forEach(branch => {
      const item = document.createElement('li');
      item.className = 'list-group-item';
      
      if (branch.current) {
        item.classList.add('current-branch');
        item.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${branch.name}`;
      } else {
        item.textContent = branch.name;
      }
      
      branchesList.appendChild(item);
    });
    
    // Changes
    document.getElementById('stagedAdded').textContent = stats.changesStatus.staged.added;
    document.getElementById('stagedModified').textContent = stats.changesStatus.staged.modified;
    document.getElementById('stagedDeleted').textContent = stats.changesStatus.staged.deleted;
    document.getElementById('unstagedAdded').textContent = stats.changesStatus.unstaged.added;
    document.getElementById('unstagedModified').textContent = stats.changesStatus.unstaged.modified;
    document.getElementById('unstagedDeleted').textContent = stats.changesStatus.unstaged.deleted;
    
    // Commits table
    const commitsTable = document.getElementById('commitsTable');
    commitsTable.innerHTML = '';
    
    if (commits.length === 0) {
      commitsTable.innerHTML = '<tr><td colspan="4">No commits found</td></tr>';
    } else {
      commits.forEach(commit => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><span class="commit-hash">${commit.hash.substring(0, 7)}</span></td>
          <td>${commit.author}</td>
          <td>${commit.date}</td>
          <td>${commit.message}</td>
        `;
        commitsTable.appendChild(row);
      });
    }
    
    // Show stats container
    statsContainer.style.display = 'block';
  }
  
  /**
   * Populate authors select dropdown
   * @param {Array} authors - List of authors
   */
  function populateAuthorsSelect(authors) {
    authorSelect.innerHTML = '<option value="">All Authors</option>';
    
    authors.forEach(author => {
      const option = document.createElement('option');
      option.value = author;
      option.textContent = author;
      authorSelect.appendChild(option);
    });
  }
  
  /**
   * Handle apply filters form submission
   * @param {Event} e - Form submit event
   */
  async function handleApplyFilters(e) {
    e.preventDefault();
    
    const author = document.getElementById('author').value;
    
    showLoading();
    
    try {
      if (isMultiViewMode && selectedRepos.size > 0) {
        // Apply filters to multiple repositories
        const response = await fetch('/api/multi-stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            repos: Array.from(selectedRepos),
            author
          }),
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error);
        }
        
        // Store the combined stats data for filtering
        combinedStatsData = data.combinedStats;
        allUserActivity = data.combinedStats.userActivity;
        
        displayMultiRepoStats(data.combinedStats);
        
        // Apply initial date range filter
        handleDateRangeFilter();
      } else if (!isMultiViewMode && currentRepoPath) {
        // Apply filters to single repository
        let url = `/api/stats?repo=${encodeURIComponent(currentRepoPath)}`;
        
        if (author) {
          url += `&author=${encodeURIComponent(author)}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error);
        }
        
        displayRepositoryStats(data.stats, data.commits);
      } else {
        showError('Please select a repository first');
      }
    } catch (error) {
      showError(`Failed to apply filters: ${error.message}`);
    } finally {
      hideLoading();
    }
  }
  
  /**
   * Show loading spinner
   */
  function showLoading() {
    loadingSpinner.style.display = 'block';
  }
  
  /**
   * Hide loading spinner
   */
  function hideLoading() {
    loadingSpinner.style.display = 'none';
  }
  
  /**
   * Show error message
   * @param {string} message - Error message
   */
  function showError(message) {
    alert(message);
  }
}); 