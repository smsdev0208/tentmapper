import { db } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showMarkerModal, createPopupContent } from './tents.js';

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
// Uncomment if you want users to see the boundary

L.rectangle(SEATTLE_BOUNDS, {
    color: '#667eea',
    weight: 2,
    fillOpacity: 0.02,
    dashArray: '5, 10'
}).addTo(map);


// Store markers
export const markers = {};

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
            html: '<div style="filter: hue-rotate(30deg) saturate(2); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;"><img src="tent.png" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));"></div>',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        }),
        verified: L.divIcon({
            className: 'custom-marker',
            html: '<div style="filter: hue-rotate(350deg) saturate(1.5); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;"><img src="tent.png" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));"></div>',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        })
    },
    rv: {
        pending: L.divIcon({
            className: 'custom-marker',
            html: '<div style="filter: hue-rotate(30deg) saturate(2); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;"><img src="rv.png" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));"></div>',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        }),
        verified: L.divIcon({
            className: 'custom-marker',
            html: '<div style="filter: hue-rotate(350deg) saturate(1.5); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;"><img src="rv.png" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));"></div>',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        })
    },
    encampment: {
        pending: L.divIcon({
            className: 'custom-marker',
            html: '<div style="filter: hue-rotate(30deg) saturate(2); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;"><img src="encampment.png" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));"></div>',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        }),
        verified: L.divIcon({
            className: 'custom-marker',
            html: '<div style="filter: hue-rotate(350deg) saturate(1.5); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;"><img src="encampment.png" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));"></div>',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        })
    },
    incident: {
        pending: L.divIcon({
            className: 'custom-marker',
            html: '<div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;"><img src="incident.png" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));"></div>',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        }),
        verified: L.divIcon({
            className: 'custom-marker',
            html: '<div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;"><img src="incident.png" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));"></div>',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        })
    }
};

// Add click handler to show radial menu
let pendingLocation = null;
let radialMenu = null;
let radialMenuActive = false;

map.on('click', (e) => {
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

// Close radial menu when zooming
map.on('zoomstart', () => {
    if (radialMenuActive) {
        hideRadialMenu();
    }
});

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
        
        // Add one-time click listener to close menu when clicking outside
        const closeMenuHandler = (e) => {
            if (!radialMenu.contains(e.target)) {
                hideRadialMenu();
                document.removeEventListener('click', closeMenuHandler);
            }
        };
        
        // Delay adding the listener so the current click doesn't trigger it
        setTimeout(() => {
            document.addEventListener('click', closeMenuHandler);
        }, 100);
    }, 10);
}

// Hide radial menu
function hideRadialMenu() {
    if (radialMenu) {
        radialMenu.classList.remove('active');
        setTimeout(() => {
            radialMenu.classList.add('hidden');
            radialMenuActive = false;
        }, 300);
    }
}

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
    
    // Add popup
    const popupContent = createPopupContent(markerData);
    marker.bindPopup(popupContent);
    
    // Add to map
    marker.addTo(map);
    markers[markerData.id] = marker;
}

// Remove marker
function removeMarker(markerId) {
    if (markers[markerId]) {
        map.removeLayer(markers[markerId]);
        delete markers[markerId];
    }
}

// Update statistics
function updateStats() {
    const count = Object.keys(markers).length;
    document.getElementById('tent-count').textContent = count;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeMarkerListener();
    console.log('Map initialized and listening for marker updates');
});

export { pendingLocation };

