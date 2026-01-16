import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'dart:io';
import '../models/tent.dart';

class FirebaseService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseStorage _storage = FirebaseStorage.instance;

  // Get markers collection reference (changed from 'tents' to 'markers' to match web app)
  CollectionReference get _markersCollection => _firestore.collection('markers');
  CollectionReference get _votesCollection => _firestore.collection('votes');

  // Stream of all markers (tents)
  Stream<List<Tent>> getTentsStream() {
    return _markersCollection
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => Tent.fromFirestore(doc))
          .where((tent) => tent.status != 'removed')
          .toList();
    });
  }

  // Add a new tent/marker
  Future<String> addTent({
    required double latitude,
    required double longitude,
    String? photoPath,
  }) async {
    try {
      print('FirebaseService: Starting addTent process...');
      
      // Create marker data (matching web app structure)
      final markerData = {
        'type': 'tent',  // Default to tent type
        'latitude': latitude,
        'longitude': longitude,
        'createdAt': FieldValue.serverTimestamp(),
        'lastVerifiedAt': FieldValue.serverTimestamp(),
        'status': 'pending',
        'votesYes': 0,
        'votesNo': 0,
        'photoUrls': [],
        'votingEndsAt': Timestamp.fromDate(DateTime.now().add(const Duration(hours: 24))),
        'recaptchaToken': 'mobile-app', // Mobile bypass for now
      };

      print('FirebaseService: Adding marker to Firestore...');
      // Add to Firestore
      final docRef = await _markersCollection.add(markerData);
      print('FirebaseService: Marker added with ID: ${docRef.id}');

      // Upload photo if provided
      if (photoPath != null) {
        print('FirebaseService: Photo path provided, starting upload: $photoPath');
        final photoUrl = await _uploadPhoto(docRef.id, photoPath);
        print('FirebaseService: Photo uploaded successfully, URL: $photoUrl');
        
        print('FirebaseService: Updating marker with photo URL...');
        await docRef.update({
          'photoUrls': FieldValue.arrayUnion([photoUrl])
        });
        print('FirebaseService: Marker updated with photo URL.');
      }

      print('FirebaseService: addTent process completed.');
      return docRef.id;
    } catch (e) {
      print('FirebaseService Error: $e');
      throw Exception('Failed to add tent: $e');
    }
  }

  // Upload photo to Storage
  Future<String> _uploadPhoto(String markerId, String filePath) async {
    try {
      print('FirebaseService: Preparing file for upload...');
      final file = File(filePath);
      if (!await file.exists()) {
        throw Exception('File does not exist: $filePath');
      }
      
      final fileName = '${DateTime.now().millisecondsSinceEpoch}.jpg';
      final ref = _storage.ref().child('marker-photos/$markerId/$fileName');

      print('FirebaseService: Uploading file to storage path: marker-photos/$markerId/$fileName');
      final uploadTask = await ref.putFile(
        file,
        SettableMetadata(contentType: 'image/jpeg'),
      );
      
      if (uploadTask.state == TaskState.success) {
        print('FirebaseService: Upload successful, getting download URL...');
        return await ref.getDownloadURL();
      } else {
        throw Exception('Upload failed with state: ${uploadTask.state}');
      }
    } catch (e) {
      print('FirebaseService _uploadPhoto Error: $e');
      throw Exception('Failed to upload photo: $e');
    }
  }

  // Submit a vote
  Future<void> submitVote({
    required String tentId,
    required String sessionId,
    required bool stillThere,
  }) async {
    try {
      // Check if already voted
      final existingVote = await _votesCollection
          .where('markerId', isEqualTo: tentId)  // Changed to match web app
          .where('sessionId', isEqualTo: sessionId)
          .limit(1)
          .get();

      if (existingVote.docs.isNotEmpty) {
        throw Exception('You have already voted on this marker');
      }

      // Record vote (matching web app structure)
      await _votesCollection.add({
        'markerId': tentId,  // Changed to match web app
        'sessionId': sessionId,
        'vote': stillThere ? 'yes' : 'no',
        'timestamp': FieldValue.serverTimestamp(),
      });

      // Update marker vote counts
      final markerRef = _markersCollection.doc(tentId);
      await markerRef.update({
        stillThere ? 'votesYes' : 'votesNo': FieldValue.increment(1),
        'lastVerifiedAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      rethrow;
    }
  }

  // Check if user has voted on a marker
  Future<bool> hasVoted(String tentId, String sessionId) async {
    final vote = await _votesCollection
        .where('markerId', isEqualTo: tentId)  // Changed to match web app
        .where('sessionId', isEqualTo: sessionId)
        .limit(1)
        .get();

    return vote.docs.isNotEmpty;
  }

  // Process timed votes (end of day update) - DEV TRIGGER
  Future<Map<String, dynamic>> processTimedVotes() async {
    try {
      print('FirebaseService: Starting timed votes processing...');
      final snapshot = await _markersCollection.get();
      
      final batch = _firestore.batch();
      int updatedCount = 0;

      for (final doc in snapshot.docs) {
        final data = doc.data() as Map<String, dynamic>;
        
        // Skip incidents and already removed markers
        if (data['type'] == 'incident' || data['status'] == 'removed') continue;

        final yes = data['votesYes'] as int? ?? 0;
        final no = data['votesNo'] as int? ?? 0;
        String newStatus = data['status'] as String? ?? 'pending';

        if (newStatus == 'pending') {
          if (no > yes) {
            newStatus = 'removed';
          } else {
            // ties (yes == no) or yes > no mean confirmed
            newStatus = 'verified';
          }
        } else if (newStatus == 'verified') {
          if (no > yes) {
            newStatus = 'removed';
          }
          // ties or yes > no mean it remains verified
        }

        // Update marker status and reset votes
        batch.update(doc.reference, {
          'status': newStatus,
          'votesYes': 0,
          'votesNo': 0,
          'lastVerifiedAt': FieldValue.serverTimestamp(),
        });
        updatedCount++;
      }

      // Wipe all votes from the 'votes' collection
      final votesSnapshot = await _votesCollection.get();
      for (final voteDoc in votesSnapshot.docs) {
        batch.delete(voteDoc.reference);
      }

      await batch.commit();
      print('FirebaseService: Processed $updatedCount markers and cleared all votes.');
      return {'success': true, 'count': updatedCount};
    } catch (e) {
      print('FirebaseService processTimedVotes Error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }
}
