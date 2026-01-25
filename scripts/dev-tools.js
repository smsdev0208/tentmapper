#!/usr/bin/env node

const admin = require('firebase-admin');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'service-account-key.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('ERROR: service-account-key.json not found!');
    console.error('Please download your service account key from Firebase Console:');
    console.error('1. Go to Firebase Console > Project Settings > Service Accounts');
    console.error('2. Click "Generate New Private Key"');
    console.error('3. Save the file as "service-account-key.json" in the scripts/ directory');
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.appspot.com`
});

const db = admin.firestore();
const storage = admin.storage();

// Command handlers
const commands = {
    'reset-database': resetDatabase,
    'delete-after': deleteMarkersAfterDate,
    'clean-images': cleanOrphanedImages,
    'trigger-voting': triggerVotingUpdate,
    'stats': getStats,
    'help': showHelp
};

// Main execution
const command = process.argv[2];
const args = process.argv.slice(3);

if (!command || !commands[command]) {
    showHelp();
    process.exit(1);
}

commands[command](...args)
    .then(() => {
        console.log('\n✓ Operation completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n✗ Operation failed:', error.message);
        console.error(error);
        process.exit(1);
    });

// ===== Command Implementations =====

/**
 * Reset entire database - delete all markers, votes, and user submissions
 */
async function resetDatabase() {
    console.log('⚠️  WARNING: This will DELETE ALL DATA from the database!');
    console.log('Collections to be deleted: markers, votes, userSubmissions');
    
    // In a real scenario, you'd want a confirmation here
    // For automation purposes, we proceed directly
    
    console.log('\nDeleting markers collection...');
    await deleteCollection('markers');
    
    console.log('Deleting votes collection...');
    await deleteCollection('votes');
    
    console.log('Deleting userSubmissions collection...');
    await deleteCollection('userSubmissions');
    
    console.log('Deleting news collection...');
    await deleteCollection('news');
    
    console.log('\n✓ Database reset complete');
}

/**
 * Delete markers submitted after a specific date
 * Usage: node dev-tools.js delete-after 2026-01-20
 */
async function deleteMarkersAfterDate(dateStr) {
    if (!dateStr) {
        throw new Error('Date required. Usage: node dev-tools.js delete-after 2026-01-20');
    }
    
    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) {
        throw new Error('Invalid date format. Use YYYY-MM-DD format');
    }
    
    console.log(`Deleting markers created after ${targetDate.toISOString()}...`);
    
    const markersRef = db.collection('markers');
    const query = markersRef.where('createdAt', '>', admin.firestore.Timestamp.fromDate(targetDate));
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
        console.log('No markers found after this date');
        return;
    }
    
    console.log(`Found ${snapshot.size} markers to delete`);
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`✓ Deleted ${snapshot.size} markers`);
}

/**
 * Clean orphaned images from storage
 * Removes images that don't belong to any existing markers
 */
async function cleanOrphanedImages() {
    console.log('Scanning for orphaned images in storage...');
    
    // Get all marker IDs from database
    const markersSnapshot = await db.collection('markers').get();
    const validMarkerIds = new Set();
    const usedPhotoUrls = new Set();
    
    markersSnapshot.docs.forEach(doc => {
        validMarkerIds.add(doc.id);
        const data = doc.data();
        if (data.photoUrls && Array.isArray(data.photoUrls)) {
            data.photoUrls.forEach(url => usedPhotoUrls.add(url));
        }
    });
    
    console.log(`Found ${validMarkerIds.size} valid markers with ${usedPhotoUrls.size} photos`);
    
    // List all files in marker-photos directory
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ prefix: 'marker-photos/' });
    
    console.log(`Found ${files.length} total files in storage`);
    
    let deletedCount = 0;
    let deletedSize = 0;
    
    for (const file of files) {
        // Skip directory markers
        if (file.name.endsWith('/')) continue;
        
        // Extract marker ID from path: marker-photos/{markerId}/{filename}
        const parts = file.name.split('/');
        if (parts.length < 3) continue;
        
        const markerId = parts[1];
        
        // Check if marker exists
        if (!validMarkerIds.has(markerId)) {
            console.log(`Deleting orphaned image: ${file.name}`);
            const [metadata] = await file.getMetadata();
            deletedSize += parseInt(metadata.size || 0);
            await file.delete();
            deletedCount++;
        }
    }
    
    const sizeMB = (deletedSize / 1024 / 1024).toFixed(2);
    console.log(`\n✓ Deleted ${deletedCount} orphaned images (${sizeMB} MB freed)`);
}

/**
 * Trigger the voting update Cloud Function
 */
async function triggerVotingUpdate(functionUrl) {
    if (!functionUrl) {
        console.log('Cloud Function URL required.');
        console.log('Usage: node dev-tools.js trigger-voting <FUNCTION_URL>');
        console.log('\nYou can find the URL in Firebase Console > Functions > processVotes');
        return;
    }
    
    console.log('Triggering voting update Cloud Function...');
    console.log(`URL: ${functionUrl}`);
    
    const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('\nVoting update completed:');
    console.log(`  Markers processed: ${result.processed}`);
    console.log(`  Markers added: ${result.added}`);
    console.log(`  Markers removed: ${result.removed}`);
    console.log(`  Votes cleared: ${result.votesCleared}`);
    console.log(`  Timestamp: ${result.timestamp}`);
}

/**
 * Get database statistics
 */
async function getStats() {
    console.log('Gathering database statistics...\n');
    
    // Markers stats
    const markersSnapshot = await db.collection('markers').get();
    const markersByType = {};
    const markersByStatus = {};
    
    markersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Count by type
        const type = data.type || 'unknown';
        markersByType[type] = (markersByType[type] || 0) + 1;
        
        // Count by status
        const status = data.status || 'unknown';
        markersByStatus[status] = (markersByStatus[status] || 0) + 1;
    });
    
    console.log('MARKERS:');
    console.log(`  Total: ${markersSnapshot.size}`);
    console.log('  By Type:');
    Object.entries(markersByType).forEach(([type, count]) => {
        console.log(`    ${type}: ${count}`);
    });
    console.log('  By Status:');
    Object.entries(markersByStatus).forEach(([status, count]) => {
        console.log(`    ${status}: ${count}`);
    });
    
    // Votes stats
    const votesSnapshot = await db.collection('votes').get();
    console.log(`\nVOTES: ${votesSnapshot.size} total`);
    
    // User submissions stats
    const submissionsSnapshot = await db.collection('userSubmissions').get();
    console.log(`\nUSER SUBMISSIONS: ${submissionsSnapshot.size} records`);
    
    // Storage stats
    try {
        const bucket = storage.bucket();
        const [files] = await bucket.getFiles({ prefix: 'marker-photos/' });
        
        let totalSize = 0;
        for (const file of files) {
            if (!file.name.endsWith('/')) {
                const [metadata] = await file.getMetadata();
                totalSize += parseInt(metadata.size || 0);
            }
        }
        
        const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
        console.log(`\nSTORAGE: ${files.length} files (${sizeMB} MB)`);
    } catch (error) {
        console.log('\nSTORAGE: Unable to retrieve stats');
    }
    
    // News stats
    const newsSnapshot = await db.collection('news').get();
    console.log(`\nNEWS: ${newsSnapshot.size} posts`);
}

/**
 * Show help information
 */
async function showHelp() {
    console.log(`
Tent Mapper Dev Tools
=====================

Usage: node dev-tools.js <command> [args]

Commands:

  reset-database
    Delete all data from markers, votes, userSubmissions, and news collections
    WARNING: This cannot be undone!
    
  delete-after <date>
    Delete all markers created after the specified date
    Example: node dev-tools.js delete-after 2026-01-20
    
  clean-images
    Remove orphaned images from storage (images not associated with any marker)
    
  trigger-voting <function-url>
    Manually trigger the voting update Cloud Function
    Example: node dev-tools.js trigger-voting https://us-central1-tent-mapper.cloudfunctions.net/processVotes
    
  stats
    Display database statistics (marker counts, votes, storage usage)
    
  help
    Show this help message

Prerequisites:
  - service-account-key.json must be present in the scripts/ directory
  - Download from Firebase Console > Project Settings > Service Accounts
`);
}

// ===== Helper Functions =====

/**
 * Delete all documents in a collection in batches
 */
async function deleteCollection(collectionName) {
    const collectionRef = db.collection(collectionName);
    const batchSize = 500;
    
    let deleted = 0;
    
    while (true) {
        const snapshot = await collectionRef.limit(batchSize).get();
        
        if (snapshot.empty) {
            break;
        }
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        deleted += snapshot.size;
        
        console.log(`  Deleted ${deleted} documents...`);
    }
    
    console.log(`  ✓ Deleted ${deleted} total documents from ${collectionName}`);
}
