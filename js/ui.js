import { db } from './firebase-config.js';
import { collection, query, orderBy, onSnapshot, where, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// UI State
let currentTab = 'map';
let markerCountChart = null;
let statusChart = null;
let markerStats = {
    total: 0,
    tents: 0,
    rvs: 0,
    encampments: 0,
    incidents: 0,
    pending: 0,
    verified: 0
};

// Filter state
export let filters = {
    confirmed: true,
    pending: true,
    incidents: true
};

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initSidebars();
    initHelpPopup();
    initFilters();
    initCharts();
    initNewsFeed();
});

// Tab Navigation
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            const targetContent = document.getElementById(`${tab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            currentTab = tab;
            
            // Refresh charts when trends tab is shown
            if (tab === 'trends') {
                updateCharts();
            }
        });
    });
}

// Sidebars
function initSidebars() {
    // Left sidebar toggle
    const leftToggle = document.getElementById('left-sidebar-toggle');
    const leftSidebar = document.getElementById('left-sidebar');
    
    if (leftToggle && leftSidebar) {
        leftToggle.addEventListener('click', () => {
            leftSidebar.classList.toggle('collapsed');
        });
    }
    
    // Right sidebar close
    const rightClose = document.getElementById('close-right-sidebar');
    const rightSidebar = document.getElementById('right-sidebar');
    
    if (rightClose && rightSidebar) {
        rightClose.addEventListener('click', () => {
            rightSidebar.classList.add('hidden');
        });
    }
}

// Help Popup
function initHelpPopup() {
    const helpBtn = document.getElementById('help-btn');
    const helpPopup = document.getElementById('help-popup');
    
    if (helpBtn && helpPopup) {
        helpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            helpPopup.classList.toggle('hidden');
        });
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!helpBtn.contains(e.target) && !helpPopup.contains(e.target)) {
                helpPopup.classList.add('hidden');
            }
        });
    }
}

// Filters
function initFilters() {
    const filterConfirmed = document.getElementById('filter-confirmed');
    const filterPending = document.getElementById('filter-pending');
    const filterIncidents = document.getElementById('filter-incidents');
    
    if (filterConfirmed) {
        filterConfirmed.addEventListener('change', () => {
            filters.confirmed = filterConfirmed.checked;
            window.dispatchEvent(new CustomEvent('filtersChanged', { detail: filters }));
        });
    }
    
    if (filterPending) {
        filterPending.addEventListener('change', () => {
            filters.pending = filterPending.checked;
            window.dispatchEvent(new CustomEvent('filtersChanged', { detail: filters }));
        });
    }
    
    if (filterIncidents) {
        filterIncidents.addEventListener('change', () => {
            filters.incidents = filterIncidents.checked;
            window.dispatchEvent(new CustomEvent('filtersChanged', { detail: filters }));
        });
    }
}

// Charts
function initCharts() {
    const markerCountCtx = document.getElementById('markerCountChart');
    const statusCtx = document.getElementById('statusChart');
    
    if (markerCountCtx) {
        markerCountChart = new Chart(markerCountCtx, {
            type: 'bar',
            data: {
                labels: ['Tents', 'RVs', 'Encampments', 'Incidents'],
                datasets: [{
                    label: 'Count',
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        'rgba(232, 93, 4, 0.8)',
                        'rgba(45, 90, 123, 0.8)',
                        'rgba(155, 89, 182, 0.8)',
                        'rgba(220, 53, 69, 0.8)'
                    ],
                    borderColor: [
                        'rgb(232, 93, 4)',
                        'rgb(45, 90, 123)',
                        'rgb(155, 89, 182)',
                        'rgb(220, 53, 69)'
                    ],
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255,255,255,0.1)'
                        },
                        ticks: {
                            color: 'rgba(255,255,255,0.7)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'rgba(255,255,255,0.7)'
                        }
                    }
                }
            }
        });
    }
    
    if (statusCtx) {
        statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Verified'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: [
                        'rgba(255, 193, 7, 0.8)',
                        'rgba(220, 53, 69, 0.8)'
                    ],
                    borderColor: [
                        'rgb(255, 193, 7)',
                        'rgb(220, 53, 69)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'rgba(255,255,255,0.7)',
                            padding: 20
                        }
                    }
                }
            }
        });
    }
}

function updateCharts() {
    if (markerCountChart) {
        markerCountChart.data.datasets[0].data = [
            markerStats.tents,
            markerStats.rvs,
            markerStats.encampments,
            markerStats.incidents
        ];
        markerCountChart.update();
    }
    
    if (statusChart) {
        statusChart.data.datasets[0].data = [
            markerStats.pending,
            markerStats.verified
        ];
        statusChart.update();
    }
    
    // Update stat cards
    document.getElementById('total-markers').textContent = markerStats.total;
    document.getElementById('total-tents-stat').textContent = markerStats.tents;
    document.getElementById('total-rvs-stat').textContent = markerStats.rvs;
    document.getElementById('total-encampments-stat').textContent = markerStats.encampments;
}

// News Feed
function initNewsFeed() {
    const markersRef = collection(db, 'markers');
    const q = query(markersRef, orderBy('createdAt', 'desc'));
    
    // Calculate today's start
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    onSnapshot(q, (snapshot) => {
        let todayTents = 0;
        let todayRvs = 0;
        let todayEncampments = 0;
        let todayIncidents = 0;
        let totalTents = 0;
        let totalRvs = 0;
        let totalEncampments = 0;
        let totalIncidents = 0;
        let totalPending = 0;
        let totalVerified = 0;
        
        const recentActivities = [];
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            const type = data.type || 'tent';
            const status = data.status || 'pending';
            
            // Count totals by type
            switch(type) {
                case 'tent':
                    totalTents++;
                    break;
                case 'rv':
                    totalRvs++;
                    break;
                case 'encampment':
                    totalEncampments++;
                    break;
                case 'incident':
                    totalIncidents++;
                    break;
            }
            
            // Count by status (exclude removed)
            if (status === 'pending') totalPending++;
            if (status === 'verified') totalVerified++;
            
            // Check if created today
            if (data.createdAt && data.createdAt.toDate) {
                const createdDate = data.createdAt.toDate();
                if (createdDate >= today) {
                    switch(type) {
                        case 'tent':
                            todayTents++;
                            break;
                        case 'rv':
                            todayRvs++;
                            break;
                        case 'encampment':
                            todayEncampments++;
                            break;
                        case 'incident':
                            todayIncidents++;
                            break;
                    }
                }
                
                // Add to recent activities (last 10)
                if (recentActivities.length < 10) {
                    recentActivities.push({
                        type,
                        time: createdDate,
                        status
                    });
                }
            }
        });
        
        // Update daily tally
        document.getElementById('today-tents').textContent = todayTents;
        document.getElementById('today-rvs').textContent = todayRvs;
        document.getElementById('today-encampments').textContent = todayEncampments;
        document.getElementById('today-incidents').textContent = todayIncidents;
        
        // Update recent activity list
        const activityList = document.getElementById('activity-list');
        if (recentActivities.length > 0) {
            activityList.innerHTML = recentActivities.map(activity => {
                const timeStr = formatTimeAgo(activity.time);
                const typeLabel = activity.type.charAt(0).toUpperCase() + activity.type.slice(1);
                return `
                    <div class="activity-item">
                        <span class="time">${timeStr}</span>
                        <div class="desc">New ${typeLabel} reported</div>
                    </div>
                `;
            }).join('');
        } else {
            activityList.innerHTML = '<p class="empty-state">No recent activity</p>';
        }
        
        // Update stats for charts
        markerStats = {
            total: totalTents + totalRvs + totalEncampments + totalIncidents,
            tents: totalTents,
            rvs: totalRvs,
            encampments: totalEncampments,
            incidents: totalIncidents,
            pending: totalPending,
            verified: totalVerified
        };
        
        // Update charts if on trends tab
        if (currentTab === 'trends') {
            updateCharts();
        }
    });
}

function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
}

// Show marker details in right sidebar
export function showMarkerDetailsSidebar(marker) {
    const sidebar = document.getElementById('right-sidebar');
    const detailsDiv = document.getElementById('marker-details');
    const titleEl = document.getElementById('detail-title');
    
    if (!sidebar || !detailsDiv) return;
    
    // Type label
    const typeLabel = marker.type ? marker.type.charAt(0).toUpperCase() + marker.type.slice(1) : 'Tent';
    titleEl.textContent = typeLabel;
    
    // Format date
    let dateStr = 'Just now';
    if (marker.createdAt && marker.createdAt.toDate) {
        const date = marker.createdAt.toDate();
        dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
    
    // Type-specific details
    let typeDetails = '';
    switch(marker.type) {
        case 'rv':
            typeDetails = `
                <div class="detail-row">
                    <span class="detail-label">Side of Street</span>
                    <span class="detail-value">${marker.sideOfStreet || 'N/A'}</span>
                </div>
            `;
            break;
        case 'encampment':
            typeDetails = `
                <div class="detail-row">
                    <span class="detail-label">Approx. Tents</span>
                    <span class="detail-value">${marker.tentCount || 'N/A'}</span>
                </div>
            `;
            break;
        case 'incident':
            const incidentTypes = {
                'public-intoxication': 'Public Intoxication',
                'public-illicit-substance-use': 'Public Illicit Substance Use',
                'noise-disturbance': 'Noise Disturbance',
                'altercation': 'Altercation',
                'theft': 'Theft'
            };
            typeDetails = `
                <div class="detail-row">
                    <span class="detail-label">Incident Type</span>
                    <span class="detail-value">${incidentTypes[marker.incidentType] || marker.incidentType}</span>
                </div>
            `;
            if (marker.incidentDateTime) {
                const incidentDate = marker.incidentDateTime.toDate ? marker.incidentDateTime.toDate() : new Date(marker.incidentDateTime);
                typeDetails += `
                    <div class="detail-row">
                        <span class="detail-label">Incident Time</span>
                        <span class="detail-value">${incidentDate.toLocaleDateString()} ${incidentDate.toLocaleTimeString()}</span>
                    </div>
                `;
            }
            break;
    }
    
    // Vote section (only for non-incidents)
    let voteSection = '';
    if (marker.type !== 'incident') {
        const votesYes = marker.votesYes || 0;
        const votesNo = marker.votesNo || 0;
        voteSection = `
            <div class="detail-section">
                <h4>Voting</h4>
                <div class="vote-section">
                    <div class="vote-counts">
                        <div class="vote-count yes">
                            <span class="vote-number">${votesYes}</span>
                            <span class="vote-label">Still There</span>
                        </div>
                        <div class="vote-count no">
                            <span class="vote-number">${votesNo}</span>
                            <span class="vote-label">Not There</span>
                        </div>
                    </div>
                    <div class="vote-buttons">
                        <button class="vote-btn yes" data-marker-id="${marker.id}" data-vote="yes">
                            ✓ Still There
                        </button>
                        <button class="vote-btn no" data-marker-id="${marker.id}" data-vote="no">
                            ✗ Not There
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Photos section
    let photosSection = '';
    if (marker.photoUrls && marker.photoUrls.length > 0) {
        photosSection = `
            <div class="detail-section">
                <h4>Photos</h4>
                <div class="photos-grid">
                    ${marker.photoUrls.map(url => `<img src="${url}" alt="Marker photo">`).join('')}
                </div>
            </div>
        `;
    }
    
    // Status badge
    const statusBadge = marker.type !== 'incident' 
        ? `<span class="status-badge ${marker.status}">${marker.status}</span>` 
        : '';
    
    detailsDiv.innerHTML = `
        <div class="detail-section">
            <h4>Information</h4>
            <div class="detail-info">
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">${statusBadge || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Reported</span>
                    <span class="detail-value">${dateStr}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Location</span>
                    <span class="detail-value">${marker.latitude.toFixed(4)}, ${marker.longitude.toFixed(4)}</span>
                </div>
                ${typeDetails}
            </div>
        </div>
        
        ${voteSection}
        ${photosSection}
    `;
    
    sidebar.classList.remove('hidden');
}

// Hide right sidebar
export function hideMarkerDetailsSidebar() {
    const sidebar = document.getElementById('right-sidebar');
    if (sidebar) {
        sidebar.classList.add('hidden');
    }
}

// Export for use in other modules
export { markerStats };

