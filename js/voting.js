import { db } from './firebase-config.js';
import { doc, updateDoc, increment, collection, addDoc, query, where, getDocs, getDoc, writeBatch, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// Process timed votes (end of day update)
async function processTimedVotes() {
    console.log('Starting timed votes processing...');
    try {
        const markersRef = collection(db, 'markers');
        const snapshot = await getDocs(markersRef);
        
        const batch = writeBatch(db);
        let updatedCount = 0;

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const markerId = docSnap.id;
            
            // Skip incidents and already removed markers
            if (data.type === 'incident' || data.status === 'removed') continue;

            const yes = data.votesYes || 0;
            const no = data.votesNo || 0;
            let newStatus = data.status;

            if (data.status === 'pending') {
                if (no > yes) {
                    newStatus = 'removed';
                } else {
                    // ties (yes == no) or yes > no mean confirmed
                    newStatus = 'verified';
                }
            } else if (data.status === 'verified') {
                if (no > yes) {
                    newStatus = 'removed';
                }
                // ties or yes > no mean it remains verified
            }

            // Update marker status and reset votes
            const markerRef = doc(db, 'markers', markerId);
            batch.update(markerRef, {
                status: newStatus,
                votesYes: 0,
                votesNo: 0,
                lastVerifiedAt: new Date()
            });
            updatedCount++;
        }

        // Wipe all votes from the 'votes' collection
        const votesRef = collection(db, 'votes');
        const votesSnapshot = await getDocs(votesRef);
        votesSnapshot.docs.forEach(voteDoc => {
            batch.delete(voteDoc.ref);
        });

        await batch.commit();
        console.log(`Processed ${updatedCount} markers and cleared all votes.`);
        return { success: true, count: updatedCount };
    } catch (error) {
        console.error('Error processing timed votes:', error);
        return { success: false, error: error.message };
    }
}

export { submitVote, hasUserVoted, processTimedVotes };
