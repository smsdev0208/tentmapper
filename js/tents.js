import { db, storage, RECAPTCHA_SITE_KEY, ensureAuthenticated } from './firebase-config.js';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, arrayUnion, query, where, getDocs, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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
        structure: 'Report a Structure'
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
    
    // Show photo upload for all types
    const photoGroup = document.getElementById('photo-group');
    photoGroup.classList.remove('hidden');
    
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

// Check user's submission count for today
async function checkSubmissionLimit(userId) {
    try {
        // Get today's date at midnight
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const userSubmissionsRef = collection(db, 'userSubmissions');
        const q = query(userSubmissionsRef,
            where('userId', '==', userId),
            where('date', '>=', Timestamp.fromDate(today))
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return { allowed: true, count: 0 };
        }
        
        // Sum up all submission counts for today
        let totalCount = 0;
        snapshot.docs.forEach(docSnap => {
            totalCount += docSnap.data().count || 0;
        });
        
        return {
            allowed: totalCount < 10,
            count: totalCount
        };
    } catch (error) {
        console.error('Error checking submission limit:', error);
        // On error, allow the submission (fail open)
        return { allowed: true, count: 0 };
    }
}

// Increment user's submission count for today
async function incrementSubmissionCount(userId) {
    try {
        console.log('Incrementing submission count for user:', userId);
        // Get today's date at midnight for consistent grouping
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const userSubmissionsRef = collection(db, 'userSubmissions');
        const q = query(userSubmissionsRef,
            where('userId', '==', userId),
            where('date', '>=', Timestamp.fromDate(today))
        );
        
        console.log('Querying for existing submissions...');
        const snapshot = await getDocs(q);
        console.log('Query complete. Empty:', snapshot.empty);
        
        if (snapshot.empty) {
            // Create new submission record for today
            console.log('Creating new submission record...');
            const docRef = await addDoc(userSubmissionsRef, {
                userId: userId,
                date: Timestamp.fromDate(today),
                count: 1,
                createdAt: serverTimestamp()
            });
            console.log('New submission record created:', docRef.id);
        } else {
            // Update existing record
            console.log('Updating existing submission record...');
            const docRef = snapshot.docs[0].ref;
            const currentCount = snapshot.docs[0].data().count || 0;
            await updateDoc(docRef, {
                count: currentCount + 1
            });
            console.log('Submission count updated to:', currentCount + 1);
        }
    } catch (error) {
        console.error('Error incrementing submission count:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        // Don't throw - allow submission to continue even if tracking fails
    }
}

// Submit new marker
async function submitMarker(e) {
    e.preventDefault();
    
    // Verify location and type are set (they should be set by showMarkerModal)
    if (!currentPendingLocation || !currentMarkerType) {
        console.error('No location or type selected - this should not happen');
        return;
    }
    
    showLoading(true);
    
    try {
        // Ensure user is authenticated
        const user = await ensureAuthenticated();
        if (!user) {
            alert('Authentication required. Please refresh the page and try again.');
            showLoading(false);
            return;
        }
        
        // Check submission limit
        const submissionCheck = await checkSubmissionLimit(user.uid);
        if (!submissionCheck.allowed) {
            alert(`You have reached the daily limit of 10 submissions. You have submitted ${submissionCheck.count} markers today. Please try again tomorrow.`);
            showLoading(false);
            return;
        }
        
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
            recaptchaToken: recaptchaToken,
            submittedBy: user.uid
        };
        
        // Add voting fields for all types (structures now have voting too)
        const votingEndsAt = new Date();
        votingEndsAt.setHours(votingEndsAt.getHours() + 24);
        markerData.votesYes = 0;
        markerData.votesNo = 0;
        markerData.votingEndsAt = votingEndsAt;
        
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
            case 'structure':
                // No additional fields
                break;
        }
        
        console.log('Submitting marker to Firestore...', markerData);
        
        // Add marker to Firestore
        const docRef = await addDoc(collection(db, 'markers'), markerData);
        console.log('Marker added successfully with ID:', docRef.id);
        
        // Increment user's submission count
        await incrementSubmissionCount(user.uid);
        
        // Upload photo if selected and save URL to document
        if (selectedPhoto) {
            console.log('Uploading photo...');
            const photoURL = await uploadPhoto(selectedPhoto, docRef.id);
            console.log('Photo uploaded:', photoURL);
            
            // Update the document with the photo URL
            await updateDoc(docRef, {
                photoUrls: arrayUnion(photoURL)
            });
            console.log('Photo URL saved to document');
        }
        
        // Save the type before hiding modal (which clears it)
        const typeLabel = currentMarkerType.charAt(0).toUpperCase() + currentMarkerType.slice(1);
        const remainingSubmissions = 10 - (submissionCheck.count + 1);
        hideMarkerModal();
        alert(`${typeLabel} reported successfully! You have ${remainingSubmissions} submissions remaining today.`);
        
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
