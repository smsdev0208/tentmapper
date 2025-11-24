import { db, storage, RECAPTCHA_SITE_KEY } from './firebase-config.js';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

let currentPendingLocation = null;
let currentMarkerType = null;
let selectedPhoto = null;

// Show loading indicator
function showLoading(show = true) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

// Show marker submission modal
export function showMarkerModal(location, type) {
    currentPendingLocation = location;
    currentMarkerType = type;
    const modal = document.getElementById('marker-modal');
    const locationDisplay = document.getElementById('marker-location-display');
    const modalTitle = document.getElementById('modal-title');
    
    // Update title based on type
    const titles = {
        tent: 'Report a Tent',
        rv: 'Report an RV',
        encampment: 'Report an Encampment',
        incident: 'Report an Incident'
    };
    modalTitle.textContent = titles[type] || 'Report a Marker';
    
    locationDisplay.textContent = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
    
    // Hide all type-specific fields
    document.querySelectorAll('.type-specific-fields').forEach(field => {
        field.classList.add('hidden');
        // Clear required attributes
        field.querySelectorAll('input, select').forEach(input => {
            input.removeAttribute('required');
        });
    });
    
    // Show relevant type-specific fields
    const typeFields = document.getElementById(`${type}-fields`);
    if (typeFields) {
        typeFields.classList.remove('hidden');
        // Add required attributes back
        typeFields.querySelectorAll('input[data-required], select[data-required]').forEach(input => {
            input.setAttribute('required', 'required');
        });
    }
    
    // Hide photo upload for incidents (they still have it but we'll make it optional)
    const photoGroup = document.getElementById('photo-group');
    if (type === 'incident') {
        photoGroup.classList.add('hidden');
    } else {
        photoGroup.classList.remove('hidden');
    }
    
    // Set default datetime for incident
    if (type === 'incident') {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('incident-datetime').value = now.toISOString().slice(0, 16);
    }
    
    modal.classList.remove('hidden');
}

// Hide marker modal
function hideMarkerModal() {
    const modal = document.getElementById('marker-modal');
    modal.classList.add('hidden');
    currentPendingLocation = null;
    currentMarkerType = null;
    selectedPhoto = null;
    document.getElementById('marker-form').reset();
    document.getElementById('photo-preview').innerHTML = '';
}

// Upload photo to Firebase Storage
async function uploadPhoto(file, markerId) {
    const storageRef = ref(storage, `marker-photos/${markerId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
}

// Get reCAPTCHA token
async function getRecaptchaToken() {
    return new Promise((resolve, reject) => {
        grecaptcha.ready(() => {
            grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'submit_marker' })
                .then(resolve)
                .catch(reject);
        });
    });
}

// Submit new marker
async function submitMarker(e) {
    e.preventDefault();
    
    if (!currentPendingLocation || !currentMarkerType) {
        alert('No location or type selected');
        return;
    }
    
    showLoading(true);
    
    try {
        // Get reCAPTCHA token
        console.log('Getting reCAPTCHA token...');
        const recaptchaToken = await getRecaptchaToken();
        console.log('reCAPTCHA token obtained:', recaptchaToken.substring(0, 50) + '...');
        
        // Base marker data
        const markerData = {
            type: currentMarkerType,
            latitude: currentPendingLocation.lat,
            longitude: currentPendingLocation.lng,
            createdAt: serverTimestamp(),
            lastVerifiedAt: serverTimestamp(),
            status: 'pending',
            photoUrls: [],
            recaptchaToken: recaptchaToken
        };
        
        // Add voting fields for all except incidents
        if (currentMarkerType !== 'incident') {
            const votingEndsAt = new Date();
            votingEndsAt.setHours(votingEndsAt.getHours() + 24);
            markerData.votesYes = 0;
            markerData.votesNo = 0;
            markerData.votingEndsAt = votingEndsAt;
        }
        
        // Add type-specific data
        switch(currentMarkerType) {
            case 'tent':
                // No additional fields
                break;
            case 'rv':
                markerData.sideOfStreet = document.getElementById('rv-side').value;
                break;
            case 'encampment':
                markerData.tentCount = parseInt(document.getElementById('encampment-count').value);
                break;
            case 'incident':
                markerData.incidentType = document.getElementById('incident-type').value;
                markerData.incidentDateTime = new Date(document.getElementById('incident-datetime').value);
                break;
        }
        
        console.log('Submitting marker to Firestore...', markerData);
        
        // Add marker to Firestore
        const docRef = await addDoc(collection(db, 'markers'), markerData);
        console.log('Marker added successfully with ID:', docRef.id);
        
        // Upload photo if selected
        if (selectedPhoto) {
            console.log('Uploading photo...');
            const photoURL = await uploadPhoto(selectedPhoto, docRef.id);
            console.log('Photo uploaded:', photoURL);
        }
        
        hideMarkerModal();
        alert(`${currentMarkerType.charAt(0).toUpperCase() + currentMarkerType.slice(1)} reported successfully!`);
        
    } catch (error) {
        console.error('Error submitting marker:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // More helpful error messages
        if (error.code === 'permission-denied') {
            alert('Permission denied. Please make sure Firestore rules are deployed in Firebase Console.');
        } else if (error.message && error.message.includes('recaptcha')) {
            alert('reCAPTCHA error. Please refresh the page and try again.');
        } else {
            alert('Error submitting marker: ' + error.message);
        }
    } finally {
        showLoading(false);
    }
}

// Handle photo selection
function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
    }
    
    selectedPhoto = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('photo-preview');
        preview.innerHTML = `<img src="${e.target.result}" alt="Photo preview">`;
    };
    reader.readAsDataURL(file);
}

// Create popup content for marker
export function createPopupContent(marker) {
    const container = document.createElement('div');
    
    // Type label
    const typeLabel = marker.type ? marker.type.charAt(0).toUpperCase() + marker.type.slice(1) : 'Tent';
    
    // Status badge (not for incidents)
    let statusBadge = '';
    if (marker.type !== 'incident') {
        statusBadge = `<span class="popup-status ${marker.status}">${marker.status}</span>`;
    }
    
    // Format date
    let dateStr = 'Just now';
    if (marker.createdAt && marker.createdAt.toDate) {
        const date = marker.createdAt.toDate();
        dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
    
    // Type-specific info
    let typeInfo = '';
    switch(marker.type) {
        case 'rv':
            typeInfo = `<strong>Side of Street:</strong> ${marker.sideOfStreet || 'N/A'}<br>`;
            break;
        case 'encampment':
            typeInfo = `<strong>Approx. Tents:</strong> ${marker.tentCount || 'N/A'}<br>`;
            break;
        case 'incident':
            const incidentTypes = {
                'public-intoxication': 'Public Intoxication',
                'public-illicit-substance-use': 'Public Illicit Substance Use',
                'noise-disturbance': 'Noise Disturbance',
                'altercation': 'Altercation',
                'theft': 'Theft'
            };
            typeInfo = `<strong>Type:</strong> ${incidentTypes[marker.incidentType] || marker.incidentType}<br>`;
            if (marker.incidentDateTime) {
                const incidentDate = marker.incidentDateTime.toDate ? marker.incidentDateTime.toDate() : new Date(marker.incidentDateTime);
                typeInfo += `<strong>Incident Time:</strong> ${incidentDate.toLocaleDateString()} ${incidentDate.toLocaleTimeString()}<br>`;
            }
            break;
    }
    
    // Vote counts (only for non-incidents)
    let votesSection = '';
    if (marker.type !== 'incident') {
        const votesYes = marker.votesYes || 0;
        const votesNo = marker.votesNo || 0;
        votesSection = `
            <div class="popup-meta">
                <strong>Votes:</strong> ✅ ${votesYes} | ❌ ${votesNo}
            </div>
            <div class="popup-votes">
                <button class="vote-btn yes" data-marker-id="${marker.id}" data-vote="yes">
                    Still There
                </button>
                <button class="vote-btn no" data-marker-id="${marker.id}" data-vote="no">
                    Not There
                </button>
            </div>
        `;
    }
    
    container.innerHTML = `
        <div class="popup-header">
            <strong>${typeLabel}</strong>
            ${statusBadge}
        </div>
        <div class="popup-meta">
            <strong>Reported:</strong> ${dateStr}<br>
            ${typeInfo}
        </div>
        ${votesSection}
    `;
    
    return container;
}

// Show marker details modal
export async function showMarkerDetails(markerId) {
    showLoading(true);
    
    try {
        const markerDoc = await getDoc(doc(db, 'markers', markerId));
        if (!markerDoc.exists()) {
            alert('Marker not found');
            return;
        }
        
        const marker = { id: markerDoc.id, ...markerDoc.data() };
        const modal = document.getElementById('detail-modal');
        const detailsDiv = document.getElementById('tent-details');
        
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
                typeDetails = `<p><strong>Side of Street:</strong> ${marker.sideOfStreet || 'N/A'}</p>`;
                break;
            case 'encampment':
                typeDetails = `<p><strong>Approximate Number of Tents:</strong> ${marker.tentCount || 'N/A'}</p>`;
                break;
            case 'incident':
                const incidentTypes = {
                    'public-intoxication': 'Public Intoxication',
                    'public-illicit-substance-use': 'Public Illicit Substance Use',
                    'noise-disturbance': 'Noise Disturbance',
                    'altercation': 'Altercation',
                    'theft': 'Theft'
                };
                typeDetails = `<p><strong>Incident Type:</strong> ${incidentTypes[marker.incidentType] || marker.incidentType}</p>`;
                if (marker.incidentDateTime) {
                    const incidentDate = marker.incidentDateTime.toDate ? marker.incidentDateTime.toDate() : new Date(marker.incidentDateTime);
                    typeDetails += `<p><strong>Incident Date & Time:</strong> ${incidentDate.toLocaleDateString()} ${incidentDate.toLocaleTimeString()}</p>`;
                }
                break;
        }
        
        // Votes section (only for non-incidents)
        let votesSection = '';
        if (marker.type !== 'incident') {
            votesSection = `
                <div class="detail-section">
                    <h3>Votes</h3>
                    <div class="vote-count">
                        <div class="vote-count-item yes">
                            <div class="number">${marker.votesYes || 0}</div>
                            <div class="label">Still There</div>
                        </div>
                        <div class="vote-count-item no">
                            <div class="number">${marker.votesNo || 0}</div>
                            <div class="label">Not There</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        const typeLabel = marker.type ? marker.type.charAt(0).toUpperCase() + marker.type.slice(1) : 'Tent';
        const statusBadge = marker.type !== 'incident' ? `<span class="popup-status ${marker.status}">${marker.status}</span>` : '';
        
        detailsDiv.innerHTML = `
            <div class="detail-section">
                <h3>${typeLabel} ${statusBadge}</h3>
                <p><strong>Reported:</strong> ${dateStr}</p>
                <p><strong>Location:</strong> ${marker.latitude.toFixed(6)}, ${marker.longitude.toFixed(6)}</p>
                ${typeDetails}
            </div>
            
            ${votesSection}
            
            ${marker.photoUrls && marker.photoUrls.length > 0 ? `
                <div class="detail-section">
                    <h3>Photos</h3>
                    <div class="detail-photos">
                        ${marker.photoUrls.map(url => `<img src="${url}" alt="Marker photo">`).join('')}
                    </div>
                </div>
            ` : ''}
        `;
        
        modal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading marker details:', error);
        alert('Error loading marker details');
    } finally {
        showLoading(false);
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Marker form submission
    const markerForm = document.getElementById('marker-form');
    markerForm.addEventListener('submit', submitMarker);
    
    // Cancel button
    const cancelBtn = document.getElementById('cancel-btn');
    cancelBtn.addEventListener('click', hideMarkerModal);
    
    // Photo selection
    const photoInput = document.getElementById('marker-photo');
    photoInput.addEventListener('change', handlePhotoSelect);
    
    // Close buttons for modals
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.add('hidden');
        });
    });
    
    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
});
