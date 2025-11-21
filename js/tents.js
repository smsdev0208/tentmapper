import { db, storage, RECAPTCHA_SITE_KEY } from './firebase-config.js';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

let currentPendingLocation = null;
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

// Show tent submission modal
export function showTentModal(location) {
    currentPendingLocation = location;
    const modal = document.getElementById('tent-modal');
    const locationDisplay = document.getElementById('tent-location-display');
    
    locationDisplay.textContent = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
    modal.classList.remove('hidden');
}

// Hide tent modal
function hideTentModal() {
    const modal = document.getElementById('tent-modal');
    modal.classList.add('hidden');
    currentPendingLocation = null;
    selectedPhoto = null;
    document.getElementById('tent-form').reset();
    document.getElementById('photo-preview').innerHTML = '';
}

// Upload photo to Firebase Storage
async function uploadPhoto(file, tentId) {
    const storageRef = ref(storage, `tent-photos/${tentId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
}

// Get reCAPTCHA token
async function getRecaptchaToken() {
    return new Promise((resolve, reject) => {
        grecaptcha.ready(() => {
            grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'submit_tent' })
                .then(resolve)
                .catch(reject);
        });
    });
}

// Submit new tent
async function submitTent(e) {
    e.preventDefault();
    
    if (!currentPendingLocation) {
        alert('No location selected');
        return;
    }
    
    showLoading(true);
    
    try {
        // Get reCAPTCHA token
        console.log('Getting reCAPTCHA token...');
        const recaptchaToken = await getRecaptchaToken();
        console.log('reCAPTCHA token obtained');
        
        // Calculate voting end time (24 hours from now)
        const votingEndsAt = new Date();
        votingEndsAt.setHours(votingEndsAt.getHours() + 24);
        
        // Create tent document
        const tentData = {
            latitude: currentPendingLocation.lat,
            longitude: currentPendingLocation.lng,
            createdAt: serverTimestamp(),
            lastVerifiedAt: serverTimestamp(),
            status: 'pending',
            votesYes: 0,
            votesNo: 0,
            photoUrls: [],
            votingEndsAt: votingEndsAt,
            recaptchaToken: recaptchaToken
        };
        
        console.log('Submitting tent to Firestore...', tentData);
        
        // Add tent to Firestore
        const docRef = await addDoc(collection(db, 'tents'), tentData);
        console.log('Tent added successfully with ID:', docRef.id);
        
        // Upload photo if selected
        if (selectedPhoto) {
            console.log('Uploading photo...');
            const photoURL = await uploadPhoto(selectedPhoto, docRef.id);
            console.log('Photo uploaded:', photoURL);
        }
        
        hideTentModal();
        alert('Tent reported successfully!');
        
    } catch (error) {
        console.error('Error submitting tent:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // More helpful error messages
        if (error.code === 'permission-denied') {
            alert('Permission denied. Please make sure Firestore rules are deployed in Firebase Console.');
        } else if (error.message && error.message.includes('recaptcha')) {
            alert('reCAPTCHA error. Please refresh the page and try again.');
        } else {
            alert('Error submitting tent: ' + error.message);
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
export function createPopupContent(tent) {
    const container = document.createElement('div');
    
    // Status badge
    const statusBadge = `<span class="popup-status ${tent.status}">${tent.status}</span>`;
    
    // Format date
    let dateStr = 'Just now';
    if (tent.createdAt && tent.createdAt.toDate) {
        const date = tent.createdAt.toDate();
        dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
    
    // Vote counts
    const votesYes = tent.votesYes || 0;
    const votesNo = tent.votesNo || 0;
    
    container.innerHTML = `
        <div class="popup-header">
            ${statusBadge}
        </div>
        <div class="popup-meta">
            <strong>Reported:</strong> ${dateStr}<br>
            <strong>Votes:</strong> ✅ ${votesYes} | ❌ ${votesNo}
        </div>
        <div class="popup-votes">
            <button class="vote-btn yes" data-tent-id="${tent.id}" data-vote="yes">
                Still There
            </button>
            <button class="vote-btn no" data-tent-id="${tent.id}" data-vote="no">
                Not There
            </button>
        </div>
    `;
    
    return container;
}

// Show tent details modal
export async function showTentDetails(tentId) {
    showLoading(true);
    
    try {
        const tentDoc = await getDoc(doc(db, 'tents', tentId));
        if (!tentDoc.exists()) {
            alert('Tent not found');
            return;
        }
        
        const tent = { id: tentDoc.id, ...tentDoc.data() };
        const modal = document.getElementById('detail-modal');
        const detailsDiv = document.getElementById('tent-details');
        
        // Format date
        let dateStr = 'Just now';
        if (tent.createdAt && tent.createdAt.toDate) {
            const date = tent.createdAt.toDate();
            dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
        
        detailsDiv.innerHTML = `
            <div class="detail-section">
                <h3>Status: <span class="popup-status ${tent.status}">${tent.status}</span></h3>
                <p><strong>Reported:</strong> ${dateStr}</p>
                <p><strong>Location:</strong> ${tent.latitude.toFixed(6)}, ${tent.longitude.toFixed(6)}</p>
            </div>
            
            <div class="detail-section">
                <h3>Votes</h3>
                <div class="vote-count">
                    <div class="vote-count-item yes">
                        <div class="number">${tent.votesYes || 0}</div>
                        <div class="label">Still There</div>
                    </div>
                    <div class="vote-count-item no">
                        <div class="number">${tent.votesNo || 0}</div>
                        <div class="label">Not There</div>
                    </div>
                </div>
            </div>
            
            ${tent.photoUrls && tent.photoUrls.length > 0 ? `
                <div class="detail-section">
                    <h3>Photos</h3>
                    <div class="detail-photos">
                        ${tent.photoUrls.map(url => `<img src="${url}" alt="Tent photo">`).join('')}
                    </div>
                </div>
            ` : ''}
        `;
        
        modal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading tent details:', error);
        alert('Error loading tent details');
    } finally {
        showLoading(false);
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Tent form submission
    const tentForm = document.getElementById('tent-form');
    tentForm.addEventListener('submit', submitTent);
    
    // Cancel button
    const cancelBtn = document.getElementById('cancel-btn');
    cancelBtn.addEventListener('click', hideTentModal);
    
    // Photo selection
    const photoInput = document.getElementById('tent-photo');
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

