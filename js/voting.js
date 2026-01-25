import { db, ensureAuthenticated } from './firebase-config.js';
import { doc, updateDoc, increment, collection, addDoc, query, where, getDocs, getDoc, writeBatch, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Check if user has already voted on this marker
async function hasUserVoted(markerId, userId) {
    const votesRef = collection(db, 'votes');
    const q = query(votesRef, 
        where('markerId', '==', markerId),
        where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
}

// Submit vote
async function submitVote(markerId, vote) {
    try {
        // Ensure user is authenticated
        const user = await ensureAuthenticated();
        if (!user) {
            alert('Authentication required. Please refresh the page and try again.');
            return false;
        }
        
        // Check if marker exists
        const markerRef = doc(db, 'markers', markerId);
        const markerSnap = await getDoc(markerRef);
        
        if (!markerSnap.exists()) {
            alert('Marker not found');
            return false;
        }
        
        // Check if already voted
        const alreadyVoted = await hasUserVoted(markerId, user.uid);
        if (alreadyVoted) {
            alert('You have already voted on this marker today');
            return false;
        }
        
        // Record vote
        await addDoc(collection(db, 'votes'), {
            markerId: markerId,
            userId: user.uid,
            vote: vote,
            timestamp: serverTimestamp()
        });
        
        // Update marker vote counts
        const updateField = vote === 'yes' ? 'votesYes' : 'votesNo';
        await updateDoc(markerRef, {
            [updateField]: increment(1),
            lastVerifiedAt: serverTimestamp()
        });
        
        alert('Vote recorded! Thank you for helping keep the map accurate.');
        return true;
        
    } catch (error) {
        console.error('Error submitting vote:', error);
        if (error.code === 'permission-denied') {
            alert('Permission denied. Please make sure you are authenticated.');
        } else {
            alert('Error submitting vote. Please try again.');
        }
        return false;
    }
}

// Handle vote button clicks
function handleVoteClick(e) {
    const button = e.target.closest('.vote-btn');
    if (!button) return;
    
    const markerId = button.dataset.markerId;
    const vote = button.dataset.vote;
    
    if (!markerId || !vote) return;
    
    // Disable buttons while processing
    const allButtons = document.querySelectorAll(`[data-marker-id="${markerId}"]`);
    allButtons.forEach(btn => btn.disabled = true);
    
    submitVote(markerId, vote).then(success => {
        if (!success) {
            // Re-enable buttons if vote failed
            allButtons.forEach(btn => btn.disabled = false);
        }
    });
}

// Initialize voting listeners
document.addEventListener('DOMContentLoaded', () => {
    // Use event delegation for dynamically created vote buttons
    document.addEventListener('click', handleVoteClick);
    
    console.log('Voting system initialized');
});

// Note: processTimedVotes has been moved to Cloud Functions
// This client-side version is kept temporarily for the dev button
// but will be replaced with an HTTP call to the Cloud Function

export { submitVote, hasUserVoted };
