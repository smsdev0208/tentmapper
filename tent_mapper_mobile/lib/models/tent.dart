import 'package:cloud_firestore/cloud_firestore.dart';

class Tent {
  final String id;
  final String type; // 'tent', 'rv', 'encampment', 'incident'
  final double latitude;
  final double longitude;
  final DateTime createdAt;
  final DateTime? lastVerifiedAt;
  final String status; // 'pending', 'verified', 'removed'
  final int votesYes;
  final int votesNo;
  final List<String> photoUrls;
  final DateTime votingEndsAt;
  
  // Type-specific fields
  final String? sideOfStreet; // For RVs
  final int? tentCount; // For encampments
  final String? incidentType; // For incidents
  final DateTime? incidentDateTime; // For incidents

  Tent({
    required this.id,
    this.type = 'tent',
    required this.latitude,
    required this.longitude,
    required this.createdAt,
    this.lastVerifiedAt,
    required this.status,
    required this.votesYes,
    required this.votesNo,
    required this.photoUrls,
    required this.votingEndsAt,
    this.sideOfStreet,
    this.tentCount,
    this.incidentType,
    this.incidentDateTime,
  });

  // Create from Firestore document
  factory Tent.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    
    // Handle createdAt - it might be null for new documents
    DateTime createdAt;
    if (data['createdAt'] != null && data['createdAt'] is Timestamp) {
      createdAt = (data['createdAt'] as Timestamp).toDate();
    } else {
      createdAt = DateTime.now();
    }
    
    // Handle lastVerifiedAt
    DateTime? lastVerifiedAt;
    if (data['lastVerifiedAt'] != null && data['lastVerifiedAt'] is Timestamp) {
      lastVerifiedAt = (data['lastVerifiedAt'] as Timestamp).toDate();
    }
    
    // Handle votingEndsAt - could be Timestamp or String
    DateTime votingEndsAt;
    if (data['votingEndsAt'] is Timestamp) {
      votingEndsAt = (data['votingEndsAt'] as Timestamp).toDate();
    } else if (data['votingEndsAt'] is String) {
      votingEndsAt = DateTime.parse(data['votingEndsAt'] as String);
    } else {
      votingEndsAt = DateTime.now().add(const Duration(hours: 24));
    }
    
    // Handle incidentDateTime
    DateTime? incidentDateTime;
    if (data['incidentDateTime'] != null) {
      if (data['incidentDateTime'] is Timestamp) {
        incidentDateTime = (data['incidentDateTime'] as Timestamp).toDate();
      } else if (data['incidentDateTime'] is String) {
        incidentDateTime = DateTime.tryParse(data['incidentDateTime'] as String);
      }
    }
    
    return Tent(
      id: doc.id,
      type: data['type'] as String? ?? 'tent',
      latitude: (data['latitude'] as num).toDouble(),
      longitude: (data['longitude'] as num).toDouble(),
      createdAt: createdAt,
      lastVerifiedAt: lastVerifiedAt,
      status: data['status'] as String? ?? 'pending',
      votesYes: data['votesYes'] as int? ?? 0,
      votesNo: data['votesNo'] as int? ?? 0,
      photoUrls: List<String>.from(data['photoUrls'] ?? []),
      votingEndsAt: votingEndsAt,
      sideOfStreet: data['sideOfStreet'] as String?,
      tentCount: data['tentCount'] as int?,
      incidentType: data['incidentType'] as String?,
      incidentDateTime: incidentDateTime,
    );
  }

  // Convert to Firestore document
  Map<String, dynamic> toFirestore() {
    return {
      'type': type,
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
      if (sideOfStreet != null) 'sideOfStreet': sideOfStreet,
      if (tentCount != null) 'tentCount': tentCount,
      if (incidentType != null) 'incidentType': incidentType,
      if (incidentDateTime != null) 'incidentDateTime': Timestamp.fromDate(incidentDateTime!),
    };
  }
  
  // Get display name for type
  String get typeLabel {
    switch (type) {
      case 'rv':
        return 'RV';
      case 'encampment':
        return 'Encampment';
      case 'structure':
        return 'Structure';
      default:
        return 'Tent';
    }
  }
}
