import { db } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showTentModal, createPopupContent } from './tents.js';

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

// Custom marker icons using tent.png
const markerIcons = {
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
    }),
    removed: L.divIcon({
        className: 'custom-marker',
        html: '<div style="filter: grayscale(100%) brightness(0.7); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;"><img src="tent.png" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));"></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 40]
    })
};

// Add click handler to place new tent
let pendingLocation = null;

map.on('click', (e) => {
    // Check if click is within Seattle area
    if (!isWithinSeattle(e.latlng.lat, e.latlng.lng)) {
        alert('Please place tents within the greater Seattle area only.');
        return;
    }
    
    pendingLocation = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
    };
    showTentModal(pendingLocation);
});

// Listen to Firestore updates
function initializeTentListener() {
    const tentsRef = collection(db, 'tents');
    const q = query(tentsRef, orderBy('createdAt', 'desc'));
    
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const tent = { id: change.doc.id, ...change.doc.data() };
            
            if (change.type === 'added' || change.type === 'modified') {
                updateMarker(tent);
            } else if (change.type === 'removed') {
                removeMarker(tent.id);
            }
        });
        
        updateStats();
    }, (error) => {
        console.error('Error listening to tents:', error);
    });
}

// Update or create marker
function updateMarker(tent) {
    // Remove existing marker if it exists
    if (markers[tent.id]) {
        map.removeLayer(markers[tent.id]);
    }
    
    // Don't show removed tents
    if (tent.status === 'removed') {
        return;
    }
    
    // Create marker with appropriate icon
    const icon = markerIcons[tent.status] || markerIcons.pending;
    const marker = L.marker([tent.latitude, tent.longitude], { icon });
    
    // Add popup
    const popupContent = createPopupContent(tent);
    marker.bindPopup(popupContent);
    
    // Add to map
    marker.addTo(map);
    markers[tent.id] = marker;
}

// Remove marker
function removeMarker(tentId) {
    if (markers[tentId]) {
        map.removeLayer(markers[tentId]);
        delete markers[tentId];
    }
}

// Update statistics
function updateStats() {
    const count = Object.keys(markers).length;
    document.getElementById('tent-count').textContent = count;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeTentListener();
    console.log('Map initialized and listening for tent updates');
});

export { pendingLocation };

