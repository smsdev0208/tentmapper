import { db } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showMarkerModal } from './tents.js';
import { showMarkerDetailsSidebar, hideMarkerDetailsSidebar, filters } from './ui.js';

// Seattle coordinates and boundaries
const SEATTLE_CENTER = [47.6062, -122.3321];
const SEATTLE_ZOOM = 12;

// Define greater Seattle area bounds
// Southwest: South of Tacoma
// Northeast: North of Everett
const SEATTLE_BOUNDS = [
    [47.475, -122.45],  // Southwest corner
    [47.75, -122.2]   // Northeast corner
];

// Initialize map with restrictions
export const map = L.map('map', {
    center: SEATTLE_CENTER,
    zoom: SEATTLE_ZOOM,
    maxBounds: SEATTLE_BOUNDS,
    maxBoundsViscosity: 1.0,  // How strongly to enforce bounds (1.0 = hard boundary)
    minZoom: 10,              // Prevent zooming out too far
    maxZoom: 18               // Allow zooming in to street level
}).setView(SEATTLE_CENTER, SEATTLE_ZOOM);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
}).addTo(map);

// Optional: Draw a subtle boundary rectangle to show the allowed area
L.rectangle(SEATTLE_BOUNDS, {
    color: '#e85d04',
    weight: 2,
    fillOpacity: 0.02,
    dashArray: '5, 10'
}).addTo(map);

// Store markers and their data
export const markers = {};
let markersData = {};
let mapPopupElement = null;

// Current filter state
let currentFilters = {
    confirmed: true,
    pending: true,
    structures: true
};

// Helper function to check if coordinates are within Seattle bounds
function isWithinSeattle(lat, lng) {
    return lat >= SEATTLE_BOUNDS[0][0] && lat <= SEATTLE_BOUNDS[1][0] &&
           lng >= SEATTLE_BOUNDS[0][1] && lng <= SEATTLE_BOUNDS[1][1];
}

// Custom marker icons for different types
const markerIcons = {
    tent: {
        pending: L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-icon-wrapper" style="filter: hue-rotate(30deg) saturate(2);"><img src="tent.png"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        }),
        verified: L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-icon-wrapper" style="filter: hue-rotate(350deg) saturate(1.5);"><img src="tent.png"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        })
    },
    rv: {
        pending: L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-icon-wrapper" style="filter: hue-rotate(30deg) saturate(2);"><img src="rv.png"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        }),
        verified: L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-icon-wrapper" style="filter: hue-rotate(350deg) saturate(1.5);"><img src="rv.png"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        })
    },
    encampment: {
        pending: L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-icon-wrapper" style="filter: hue-rotate(30deg) saturate(2);"><img src="encampment.png"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        }),
        verified: L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-icon-wrapper" style="filter: hue-rotate(350deg) saturate(1.5);"><img src="encampment.png"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        })
    },
    structure: {
        pending: L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-icon-wrapper" style="filter: hue-rotate(30deg) saturate(2);"><img src="structure.png"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        }),
        verified: L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-icon-wrapper" style="filter: hue-rotate(350deg) saturate(1.5);"><img src="structure.png"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        })
    }
};

// Add click handler to show radial menu
let pendingLocation = null;
let radialMenu = null;
let radialMenuActive = false;
let currentCloseMenuHandler = null; // Track the current close handler

map.on('click', (e) => {
    // If the click was on the map background (not a marker)
    // Close any popups and sidebar
    hideMapPopup();
    hideMarkerDetailsSidebar();
    
    // Don't show menu if one is already active
    if (radialMenuActive) {
        return;
    }
    
    // Check if click is within Seattle area
    if (!isWithinSeattle(e.latlng.lat, e.latlng.lng)) {
        alert('Please place markers within the greater Seattle area only.');
        return;
    }
    
    pendingLocation = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
    };
    showRadialMenu(e.originalEvent.clientX, e.originalEvent.clientY);
});

// Close radial menu when zooming (but keep sidebar open)
map.on('zoomstart', () => {
    if (radialMenuActive) {
        hideRadialMenu();
    }
});

// Close popup on map move
map.on('movestart', hideMapPopup);

// Update marker scale on zoom - stop growing earlier (at zoom 13 instead of 15)
function updateMarkerScale() {
    const zoom = map.getZoom();
    const baseZoom = 13;  // Changed from 15 to stop growing earlier
    
    // Scale factor: 1.0 at zoom 13+, shrinks as you zoom out
    // At zoom 10 (min), scale will be approx 0.77
    let scale = 1.0;
    if (zoom < baseZoom) {
        scale = Math.max(0.5, zoom / baseZoom);
    }
    
    document.documentElement.style.setProperty('--marker-scale', scale);
}

map.on('zoomend', updateMarkerScale);
// Initial call
updateMarkerScale();

// Show radial menu at click position
function showRadialMenu(x, y) {
    if (!radialMenu) {
        radialMenu = document.getElementById('radial-menu');
        
        // Add click handlers to menu items
        radialMenu.querySelectorAll('.radial-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling to document
                const type = e.currentTarget.getAttribute('data-type');
                hideRadialMenu();
                // Small delay before showing modal
                setTimeout(() => {
                    showMarkerModal(pendingLocation, type);
                }, 100);
            });
        });
    }
    
    // Position menu centered on click point (240px / 2 = 120px offset)
    radialMenu.style.left = (x - 120) + 'px';
    radialMenu.style.top = (y - 120) + 'px';
    radialMenu.classList.remove('hidden');
    radialMenuActive = true;
    
    // Small delay to trigger animation
    setTimeout(() => {
        radialMenu.classList.add('active');
        
        // Create close handler for clicking outside
        currentCloseMenuHandler = (e) => {
            if (!radialMenu.contains(e.target)) {
                hideRadialMenu();
            }
        };
        
        // Delay adding the listener so the current click doesn't trigger it
        setTimeout(() => {
            document.addEventListener('click', currentCloseMenuHandler);
        }, 100);
    }, 10);
}

// Hide radial menu
function hideRadialMenu() {
    if (radialMenu) {
        radialMenu.classList.remove('active');
        
        // Remove the document click listener if it exists
        if (currentCloseMenuHandler) {
            document.removeEventListener('click', currentCloseMenuHandler);
            currentCloseMenuHandler = null;
        }
        
        setTimeout(() => {
            radialMenu.classList.add('hidden');
            radialMenuActive = false;
        }, 300);
    }
}

// Check if marker should be visible based on filters
function shouldShowMarker(markerData) {
    const type = markerData.type || 'tent';
    const status = markerData.status || 'pending';
    
    // Check structures filter
    if (type === 'structure') {
        return currentFilters.structures;
    }
    
    // Check status filters
    if (status === 'verified') {
        return currentFilters.confirmed;
    }
    
    if (status === 'pending') {
        return currentFilters.pending;
    }
    
    return true;
}

function toMarkerDate(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') {
        return value.toDate();
    }
    return new Date(value);
}

function formatDurationAgo(date) {
    if (!date) return 'Unknown';
    const now = new Date();
    let diff = now - date;
    if (diff <= 0) return 'Just now';

    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(diff / 86400000);
    if (days < 30) return `${days}d ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;

    const years = Math.floor(months / 12);
    return `${years}y ago`;
}

function buildMarkerPopupContent(markerData) {
    const type = markerData.type || 'tent';
    const typeLabel = type === 'rv' ? 'RV' : type.charAt(0).toUpperCase() + type.slice(1);
    const status = markerData.status || 'pending';
    const statusText = status === 'verified' ? 'Confirmed' : 'Pending';
    const statusClass = status === 'verified' ? 'confirmed' : 'pending';
    
    const createdDate = toMarkerDate(markerData.createdAt);
    const createdDetails = createdDate
        ? `${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString()}`
        : 'Unknown';
    const durationText = createdDate ? formatDurationAgo(createdDate) : 'Unknown';

    const photos = Array.isArray(markerData.photoUrls) ? markerData.photoUrls : [];
    const firstPhoto = photos.length ? photos[0] : null;
    const photoSection = firstPhoto ? `
        <div class="marker-popup-photo">
            <img src="${firstPhoto}" alt="${typeLabel} photo">
        </div>
    ` : '';

    return `
        <div class="marker-popup-content">
            <div class="marker-popup-header">
                <span class="marker-popup-type">${typeLabel}</span>
                <span class="marker-popup-status ${statusClass}">${statusText}</span>
            </div>
            <div class="marker-popup-row">
                <span class="marker-popup-label">Reported</span>
                <span>${createdDetails}</span>
            </div>
            <div class="marker-popup-row">
                <span class="marker-popup-label">Time on site</span>
                <span>${durationText}</span>
            </div>
            ${photoSection}
        </div>
    `;
}

function ensureMapPopupElement() {
    if (!mapPopupElement) {
        mapPopupElement = document.getElementById('map-popup');
    }
}

function showMapPopup(markerData, latlng) {
    ensureMapPopupElement();
    if (!mapPopupElement || !latlng) return;

    mapPopupElement.innerHTML = buildMarkerPopupContent(markerData);
    const point = map.latLngToContainerPoint(latlng);
    const size = map.getSize();
    const clampedX = Math.max(16, Math.min(point.x, size.x - 16));
    const clampedY = Math.max(16, Math.min(point.y, size.y - 16));
    mapPopupElement.style.left = `${clampedX}px`;
    mapPopupElement.style.top = `${clampedY}px`;
    mapPopupElement.classList.remove('hidden');
}

function hideMapPopup() {
    ensureMapPopupElement();
    if (!mapPopupElement) return;
    mapPopupElement.classList.add('hidden');
}

// Apply filters to all markers
function applyFilters() {
    Object.keys(markersData).forEach(id => {
        const markerData = markersData[id];
        const marker = markers[id];
        
        if (!marker) return;
        
        if (shouldShowMarker(markerData)) {
            if (!map.hasLayer(marker)) {
                marker.addTo(map);
            }
        } else {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        }
    });
}

// Listen for filter changes
window.addEventListener('filtersChanged', (e) => {
    currentFilters = e.detail;
    applyFilters();
});

// Listen to Firestore updates
function initializeMarkerListener() {
    const markersRef = collection(db, 'markers');
    const q = query(markersRef, orderBy('createdAt', 'desc'));
    
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const marker = { id: change.doc.id, ...change.doc.data() };
            
            if (change.type === 'added' || change.type === 'modified') {
                updateMarker(marker);
            } else if (change.type === 'removed') {
                removeMarker(marker.id);
            }
        });
        
        updateStats();
    }, (error) => {
        console.error('Error listening to markers:', error);
    });
}

// Update or create marker
function updateMarker(markerData) {
    // Remove existing marker if it exists
    if (markers[markerData.id]) {
        map.removeLayer(markers[markerData.id]);
    }
    
    // Store marker data
    markersData[markerData.id] = markerData;
    
    // Don't show removed markers
    if (markerData.status === 'removed') {
        return;
    }
    
    // Get marker type (default to tent for backwards compatibility)
    const type = markerData.type || 'tent';
    const status = markerData.status || 'pending';
    
    // Create marker with appropriate icon
    const iconSet = markerIcons[type] || markerIcons.tent;
    const icon = iconSet[status] || iconSet.pending;
    const marker = L.marker([markerData.latitude, markerData.longitude], { icon });

    // Add click handler to show details in sidebar and popup overlay
    marker.on('click', (e) => {
        // Prevent map click handler from firing
        if (e.originalEvent) {
            e.originalEvent.stopPropagation();
        }
        showMapPopup(markerData, e.latlng);
        showMarkerDetailsSidebar(markerData);
    });
    
    // Store marker reference
    markers[markerData.id] = marker;
    
    // Add to map if should be visible
    if (shouldShowMarker(markerData)) {
        marker.addTo(map);
    }
}

// Remove marker
function removeMarker(markerId) {
    if (markers[markerId]) {
        map.removeLayer(markers[markerId]);
        delete markers[markerId];
    }
    delete markersData[markerId];
}

// Update statistics (for backward compatibility)
function updateStats() {
    const count = Object.keys(markers).length;
    const tentCountEl = document.getElementById('tent-count');
    if (tentCountEl) {
        tentCountEl.textContent = count;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ensureMapPopupElement();
    initializeMarkerListener();
    console.log('Map initialized and listening for marker updates');
});

export { pendingLocation };
