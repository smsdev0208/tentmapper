import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'dart:io';
import '../models/tent.dart';

class FirebaseService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Get markers collection reference (changed from 'tents' to 'markers' to match web app)
  CollectionReference get _markersCollection => _firestore.collection('markers');
  CollectionReference get _votesCollection => _firestore.collection('votes');
  CollectionReference get _userSubmissionsCollection => _firestore.collection('userSubmissions');
  
  // Ensure user is authenticated anonymously
  Future<User> ensureAuthenticated() async {
    User? user = _auth.currentUser;
    
    if (user != null) {
      return user;
    }
    
    // Sign in anonymously
    final userCredential = await _auth.signInAnonymously();
    return userCredential.user!;
  }
  
  // Check user's submission count for today
  Future<Map<String, dynamic>> checkSubmissionLimit(String userId) async {
    try {
      // Get today's date at midnight
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      
      final snapshot = await _userSubmissionsCollection
          .where('userId', isEqualTo: userId)
          .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(today))
          .get();
      
      if (snapshot.docs.isEmpty) {
        return {'allowed': true, 'count': 0};
      }
      
      // Sum up all submission counts for today
      int totalCount = 0;
      for (final doc in snapshot.docs) {
        totalCount += (doc.data() as Map<String, dynamic>)['count'] as int? ?? 0;
      }
      
      return {
        'allowed': totalCount < 10,
        'count': totalCount,
      };
    } catch (e) {
      print('Error checking submission limit: $e');
      // On error, allow the submission (fail open)
      return {'allowed': true, 'count': 0};
    }
  }
  
  // Increment user's submission count for today
  Future<void> incrementSubmissionCount(String userId) async {
    try {
      // Get today's date at midnight
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      
      final snapshot = await _userSubmissionsCollection
          .where('userId', isEqualTo: userId)
          .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(today))
          .get();
      
      if (snapshot.docs.isEmpty) {
        // Create new submission record for today
        await _userSubmissionsCollection.add({
          'userId': userId,
          'date': Timestamp.fromDate(today),
          'count': 1,
          'createdAt': FieldValue.serverTimestamp(),
        });
      } else {
        // Update existing record
        final doc = snapshot.docs.first;
        final currentCount = (doc.data() as Map<String, dynamic>)['count'] as int? ?? 0;
        await doc.reference.update({
          'count': currentCount + 1,
        });
      }
    } catch (e) {
      print('Error incrementing submission count: $e');
      // Don't throw - allow submission to continue even if tracking fails
    }
  }

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
      
      // Ensure user is authenticated
      final user = await ensureAuthenticated();
      print('FirebaseService: User authenticated: ${user.uid}');
      
      // Check submission limit
      final submissionCheck = await checkSubmissionLimit(user.uid);
      if (!submissionCheck['allowed']) {
        throw Exception(
          'You have reached the daily limit of 10 submissions. '
          'You have submitted ${submissionCheck['count']} markers today. '
          'Please try again tomorrow.'
        );
      }
      
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
        'submittedBy': user.uid,
      };

      print('FirebaseService: Adding marker to Firestore...');
      // Add to Firestore
      final docRef = await _markersCollection.add(markerData);
      print('FirebaseService: Marker added with ID: ${docRef.id}');
      
      // Increment user's submission count
      await incrementSubmissionCount(user.uid);

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

      final remainingSubmissions = 10 - (submissionCheck['count'] as int + 1);
      print('FirebaseService: addTent process completed. Remaining submissions: $remainingSubmissions');
      return docRef.id;
    } catch (e) {
      print('FirebaseService Error: $e');
      rethrow;
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
    required bool stillThere,
  }) async {
    try {
      // Ensure user is authenticated
      final user = await ensureAuthenticated();
      
      // Check if already voted
      final existingVote = await _votesCollection
          .where('markerId', isEqualTo: tentId)
          .where('userId', isEqualTo: user.uid)
          .limit(1)
          .get();

      if (existingVote.docs.isNotEmpty) {
        throw Exception('You have already voted on this marker today');
      }

      // Record vote (matching web app structure)
      await _votesCollection.add({
        'markerId': tentId,
        'userId': user.uid,
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
  Future<bool> hasVoted(String tentId) async {
    final user = await ensureAuthenticated();
    
    final vote = await _votesCollection
        .where('markerId', isEqualTo: tentId)
        .where('userId', isEqualTo: user.uid)
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
