import { db } from './firebase-config.js';
import { doc, updateDoc, increment, collection, addDoc, query, where, getDocs, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Generate or retrieve session ID for vote tracking
function getSessionId() {
    let sessionId = localStorage.getItem('tent-mapper-session');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('tent-mapper-session', sessionId);
    }
    return sessionId;
}

// Check if user has already voted on this marker
async function hasUserVoted(markerId) {
    const sessionId = getSessionId();
    const votesRef = collection(db, 'votes');
    const q = query(votesRef, 
        where('markerId', '==', markerId),
        where('sessionId', '==', sessionId)
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
}

// Submit vote
async function submitVote(markerId, vote) {
    try {
        // First, check if this is an incident (incidents don't support voting)
        const markerRef = doc(db, 'markers', markerId);
        const markerSnap = await getDoc(markerRef);
        
        if (!markerSnap.exists()) {
            alert('Marker not found');
            return false;
        }
        
        const markerData = markerSnap.data();
        if (markerData.type === 'incident') {
            alert('Incidents do not support voting');
            return false;
        }
        
        // Check if already voted
        const alreadyVoted = await hasUserVoted(markerId);
        if (alreadyVoted) {
            alert('You have already voted on this marker today');
            return false;
        }
        
        const sessionId = getSessionId();
        
        // Record vote
        await addDoc(collection(db, 'votes'), {
            markerId: markerId,
            sessionId: sessionId,
            vote: vote,
            timestamp: new Date()
        });
        
        // Update marker vote counts
        const updateField = vote === 'yes' ? 'votesYes' : 'votesNo';
        await updateDoc(markerRef, {
            [updateField]: increment(1),
            lastVerifiedAt: new Date()
        });
        
        alert('Vote recorded! Thank you for helping keep the map accurate.');
        return true;
        
    } catch (error) {
        console.error('Error submitting vote:', error);
        alert('Error submitting vote. Please try again.');
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

export { submitVote, hasUserVoted };
