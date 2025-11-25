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
        'votingEndsAt': DateTime.now().add(const Duration(hours: 24)),
        'recaptchaToken': 'mobile-app', // Mobile bypass for now
      };

      // Add to Firestore
      final docRef = await _markersCollection.add(markerData);

      // Upload photo if provided
      if (photoPath != null) {
        final photoUrl = await _uploadPhoto(docRef.id, photoPath);
        await docRef.update({
          'photoUrls': FieldValue.arrayUnion([photoUrl])
        });
      }

      return docRef.id;
    } catch (e) {
      throw Exception('Failed to add tent: $e');
    }
  }

  // Upload photo to Storage
  Future<String> _uploadPhoto(String markerId, String filePath) async {
    try {
      final file = File(filePath);
      final fileName = '${DateTime.now().millisecondsSinceEpoch}.jpg';
      final ref = _storage.ref().child('marker-photos/$markerId/$fileName');

      await ref.putFile(file);
      return await ref.getDownloadURL();
    } catch (e) {
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
}
