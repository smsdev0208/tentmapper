import 'package:cloud_firestore/cloud_firestore.dart';

class Tent {
  final String id;
  final double latitude;
  final double longitude;
  final DateTime createdAt;
  final DateTime? lastVerifiedAt;
  final String status; // 'pending', 'verified', 'removed'
  final int votesYes;
  final int votesNo;
  final List<String> photoUrls;
  final DateTime votingEndsAt;

  Tent({
    required this.id,
    required this.latitude,
    required this.longitude,
    required this.createdAt,
    this.lastVerifiedAt,
    required this.status,
    required this.votesYes,
    required this.votesNo,
    required this.photoUrls,
    required this.votingEndsAt,
  });

  // Create from Firestore document
  factory Tent.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Tent(
      id: doc.id,
      latitude: (data['latitude'] as num).toDouble(),
      longitude: (data['longitude'] as num).toDouble(),
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      lastVerifiedAt: data['lastVerifiedAt'] != null
          ? (data['lastVerifiedAt'] as Timestamp).toDate()
          : null,
      status: data['status'] as String,
      votesYes: data['votesYes'] as int? ?? 0,
      votesNo: data['votesNo'] as int? ?? 0,
      photoUrls: List<String>.from(data['photoUrls'] ?? []),
      votingEndsAt: data['votingEndsAt'] is Timestamp
          ? (data['votingEndsAt'] as Timestamp).toDate()
          : DateTime.parse(data['votingEndsAt'] as String),
    );
  }

  // Convert to Firestore document
  Map<String, dynamic> toFirestore() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'createdAt': Timestamp.fromDate(createdAt),
      'lastVerifiedAt': lastVerifiedAt != null
          ? Timestamp.fromDate(lastVerifiedAt!)
          : null,
      'status': status,
      'votesYes': votesYes,
      'votesNo': votesNo,
      'photoUrls': photoUrls,
      'votingEndsAt': votingEndsAt,
    };
  }
}

