import 'package:flutter/foundation.dart';
import 'dart:math';

class SessionService {
  static final SessionService _instance = SessionService._internal();
  factory SessionService() => _instance;
  SessionService._internal();

  String? _sessionId;

  // Get or create session ID
  String getSessionId() {
    _sessionId ??= _generateSessionId();
    return _sessionId!;
  }

  // Generate a unique session ID
  String _generateSessionId() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = Random().nextInt(1000000);
    return 'mobile_${timestamp}_$random';
  }
}

