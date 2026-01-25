const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Process daily voting to update marker statuses
 * Runs at midnight PST daily via Cloud Scheduler
 * Can also be manually triggered via HTTP
 */
exports.processVotes = functions.https.onRequest(async (req, res) => {
    console.log('Starting timed votes processing...');
    
    try {
        const db = admin.firestore();
        const markersRef = db.collection('markers');
        const votesRef = db.collection('votes');
        const newsRef = db.collection('news');
        
        // Get all markers
        const markersSnapshot = await markersRef.get();
        
        const batch = db.batch();
        let updatedCount = 0;
        let addedCount = 0;
        let removedCount = 0;
        
        // Process each marker
        for (const docSnap of markersSnapshot.docs) {
            const data = docSnap.data();
            const markerId = docSnap.id;
            
            // Skip already removed markers
            if (data.status === 'removed') continue;
            
            const yes = data.votesYes || 0;
            const no = data.votesNo || 0;
            let newStatus = data.status;
            
            // Apply voting rules
            if (data.status === 'pending') {
                // Pending: yes >= no means verified (ties mean added)
                if (yes >= no) {
                    newStatus = 'verified';
                    addedCount++;
                } else {
                    // no > yes means removed
                    newStatus = 'removed';
                }
            } else if (data.status === 'verified') {
                // Verified: no > yes means removed (ties mean stays)
                if (no > yes) {
                    newStatus = 'removed';
                    removedCount++;
                }
                // yes >= no means it remains verified
            }
            
            // Update marker status and reset votes
            const markerRef = markersRef.doc(markerId);
            batch.update(markerRef, {
                status: newStatus,
                votesYes: 0,
                votesNo: 0,
                lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            updatedCount++;
        }
        
        // Delete all votes
        const votesSnapshot = await votesRef.get();
        votesSnapshot.docs.forEach(voteDoc => {
            batch.delete(voteDoc.ref);
        });
        
        // Commit all updates
        await batch.commit();
        
        // Create news post with update summary
        const today = new Date();
        const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;
        await newsRef.add({
            title: `Updates ${dateStr}`,
            message: `+${addedCount} objects added, -${removedCount} objects removed`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            type: 'vote_update'
        });
        
        const result = {
            success: true,
            timestamp: new Date().toISOString(),
            processed: updatedCount,
            added: addedCount,
            removed: removedCount,
            votesCleared: votesSnapshot.size
        };
        
        console.log('Voting processing completed:', result);
        
        res.status(200).json(result);
        
    } catch (error) {
        console.error('Error processing votes:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Scheduled function that runs at midnight PST
 * This will be configured via Cloud Scheduler in the Firebase Console
 */
exports.scheduledVoteProcessing = functions.pubsub
    .schedule('0 0 * * *')  // Every day at midnight
    .timeZone('America/Los_Angeles')  // PST timezone
    .onRun(async (context) => {
        console.log('Scheduled vote processing triggered');
        
        try {
            const db = admin.firestore();
            const markersRef = db.collection('markers');
            const votesRef = db.collection('votes');
            const newsRef = db.collection('news');
            
            // Get all markers
            const markersSnapshot = await markersRef.get();
            
            const batch = db.batch();
            let updatedCount = 0;
            let addedCount = 0;
            let removedCount = 0;
            
            // Process each marker
            for (const docSnap of markersSnapshot.docs) {
                const data = docSnap.data();
                const markerId = docSnap.id;
                
                // Skip already removed markers
                if (data.status === 'removed') continue;
                
                const yes = data.votesYes || 0;
                const no = data.votesNo || 0;
                let newStatus = data.status;
                
                // Apply voting rules
                if (data.status === 'pending') {
                    // Pending: yes >= no means verified (ties mean added)
                    if (yes >= no) {
                        newStatus = 'verified';
                        addedCount++;
                    } else {
                        // no > yes means removed
                        newStatus = 'removed';
                    }
                } else if (data.status === 'verified') {
                    // Verified: no > yes means removed (ties mean stays)
                    if (no > yes) {
                        newStatus = 'removed';
                        removedCount++;
                    }
                    // yes >= no means it remains verified
                }
                
                // Update marker status and reset votes
                const markerRef = markersRef.doc(markerId);
                batch.update(markerRef, {
                    status: newStatus,
                    votesYes: 0,
                    votesNo: 0,
                    lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                updatedCount++;
            }
            
            // Delete all votes
            const votesSnapshot = await votesRef.get();
            votesSnapshot.docs.forEach(voteDoc => {
                batch.delete(voteDoc.ref);
            });
            
            // Commit all updates
            await batch.commit();
            
            // Create news post with update summary
            const today = new Date();
            const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;
            await newsRef.add({
                title: `Updates ${dateStr}`,
                message: `+${addedCount} objects added, -${removedCount} objects removed`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                type: 'vote_update'
            });
            
            console.log(`Scheduled processing completed: ${updatedCount} markers processed, ${addedCount} added, ${removedCount} removed`);
            
            return null;
            
        } catch (error) {
            console.error('Error in scheduled vote processing:', error);
            throw error;
        }
    });
