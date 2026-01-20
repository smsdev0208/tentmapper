import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:image_picker/image_picker.dart';
import '../models/tent.dart';
import '../services/firebase_service.dart';
import '../services/location_service.dart';
import '../services/session_service.dart';
import '../widgets/tent_details_sheet.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  final FirebaseService _firebaseService = FirebaseService();
  final LocationService _locationService = LocationService();
  final SessionService _sessionService = SessionService();
  
  // Seattle center
  final LatLng _seattleCenter = const LatLng(47.6062, -122.3321);
  
  List<Tent> _tents = [];
  bool _isLoading = false;
  bool _showHelpPopup = false;
  bool _showFiltersDropdown = false;
  
  // Filter states
  bool _showConfirmed = true;
  bool _showPending = true;
  bool _showStructures = true;

  Future<void> _triggerVotingUpdate() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF16213E),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('DEBUG: Trigger Update?', style: TextStyle(color: Colors.white)),
        content: const Text(
          'Are you sure you want to trigger the midnight voting update now? This will update all statuses and WIPE current votes.',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel', style: TextStyle(color: Colors.white.withOpacity(0.5))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Trigger Now'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isLoading = true);
      final result = await _firebaseService.processTimedVotes();
      setState(() => _isLoading = false);

      if (mounted) {
        if (result['success']) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Update successful! Processed ${result['count']} markers.'),
              backgroundColor: const Color(0xFF28A745),
            ),
          );
        } else {
          _showError('Update failed: ${result['error']}');
        }
      }
    }
  }

  @override
  void initState() {
    super.initState();
    _loadTents();
    
    // Listen for map zoom changes to update marker sizes
    _mapController.mapEventStream.listen((event) {
      if (mounted) {
        setState(() {
          // Trigger rebuild to update marker sizes
        });
      }
    });
  }

  void _loadTents() {
    _firebaseService.getTentsStream().listen((tents) {
      if (mounted) {
        setState(() {
          _tents = tents;
        });
      }
    });
  }

  List<Tent> get _filteredTents {
    return _tents.where((tent) {
      if (tent.type == 'structure') {
        return _showStructures;
      }
      if (tent.status == 'verified' && !_showConfirmed) return false;
      if (tent.status == 'pending' && !_showPending) return false;
      return true;
    }).toList();
  }

  Future<void> _getCurrentLocation() async {
    try {
      final position = await _locationService.getCurrentLocation();
      if (position != null) {
        _mapController.move(
          LatLng(position.latitude, position.longitude),
          15,
        );
      }
    } catch (e) {
      _showError('Failed to get location: $e');
    }
  }

  Future<void> _handleMapTap(TapPosition tapPosition, LatLng point) async {
    // Close any open popups
    setState(() {
      _showHelpPopup = false;
      _showFiltersDropdown = false;
    });

    // Check if within Seattle
    if (!_locationService.isWithinSeattle(point.latitude, point.longitude)) {
      _showError('Please place tents within the greater Seattle area only.');
      return;
    }

    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF16213E),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Report Tent',
          style: TextStyle(color: Colors.white),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Report a tent at this location?',
              style: TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 16),
            Text(
              'Lat: ${point.latitude.toStringAsFixed(6)}\nLng: ${point.longitude.toStringAsFixed(6)}',
              style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.5)),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel', style: TextStyle(color: Colors.white.withOpacity(0.5))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE85D04),
            ),
            child: const Text('Submit'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _addTent(point);
    }
  }

  Future<void> _addTent(LatLng point, {String? photoPath}) async {
    try {
      // Ask if user wants to add photo
      if (photoPath == null) {
        final addPhoto = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: const Color(0xFF16213E),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Text('Add Photo?', style: TextStyle(color: Colors.white)),
            content: const Text(
              'Would you like to add a photo of this tent?',
              style: TextStyle(color: Colors.white70),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text('Skip', style: TextStyle(color: Colors.white.withOpacity(0.5))),
              ),
              ElevatedButton(
                onPressed: () => Navigator.pop(context, true),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE85D04)),
                child: const Text('Add Photo'),
              ),
            ],
          ),
        );

        if (addPhoto == true) {
          // Show options to take photo or choose from gallery
          final imageSource = await showDialog<ImageSource>(
            context: context,
            builder: (context) => AlertDialog(
              backgroundColor: const Color(0xFF16213E),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Text('Choose Photo Source', style: TextStyle(color: Colors.white)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ListTile(
                    leading: const Icon(Icons.camera_alt, color: Color(0xFFE85D04)),
                    title: const Text('Take Photo', style: TextStyle(color: Colors.white)),
                    onTap: () => Navigator.pop(context, ImageSource.camera),
                  ),
                  ListTile(
                    leading: const Icon(Icons.photo_library, color: Color(0xFFE85D04)),
                    title: const Text('Choose from Gallery', style: TextStyle(color: Colors.white)),
                    onTap: () => Navigator.pop(context, ImageSource.gallery),
                  ),
                ],
              ),
            ),
          );

          if (imageSource != null) {
            final picker = ImagePicker();
            final image = await picker.pickImage(
              source: imageSource,
              maxWidth: 1920,
              maxHeight: 1080,
              imageQuality: 85,
            );
            photoPath = image?.path;
          }
        }
      }

      // Now start loading only for the actual Firebase operations
      setState(() => _isLoading = true);

      await _firebaseService.addTent(
        latitude: point.latitude,
        longitude: point.longitude,
        photoPath: photoPath,
      ).timeout(const Duration(seconds: 30), onTimeout: () {
        throw Exception('Operation timed out. Please check your connection.');
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Tent reported successfully!'),
            backgroundColor: const Color(0xFF28A745),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
        );
      }
    } catch (e) {
      _showError('Failed to add tent: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showTentDetails(Tent tent) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => TentDetailsSheet(
        tent: tent,
        onVote: (stillThere) => _handleVote(tent, stillThere),
      ),
    );
  }

  Future<void> _handleVote(Tent tent, bool stillThere) async {
    try {
      final sessionId = _sessionService.getSessionId();
      
      // Check if already voted
      final hasVoted = await _firebaseService.hasVoted(tent.id, sessionId);
      if (hasVoted) {
        _showError('You have already voted on this tent');
        return;
      }

      await _firebaseService.submitVote(
        tentId: tent.id,
        sessionId: sessionId,
        stillThere: stillThere,
      );

      if (mounted) {
        Navigator.pop(context); // Close bottom sheet
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Vote recorded!'),
            backgroundColor: const Color(0xFF28A745),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
        );
      }
    } catch (e) {
      _showError(e.toString());
    }
  }

  void _showError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      );
    }
  }

  ColorFilter _getTentColorFilter(String status) {
    switch (status) {
      case 'verified':
        // Red/verified - hue rotate to red
        return const ColorFilter.mode(
          Color(0xFFDC3545),
          BlendMode.modulate,
        );
      case 'removed':
        // Grayscale for removed tents
        return const ColorFilter.matrix([
          0.33, 0.33, 0.33, 0, 0,
          0.33, 0.33, 0.33, 0, 0,
          0.33, 0.33, 0.33, 0, 0,
          0, 0, 0, 1, 0,
        ]);
      default:
        // Pending - yellow/amber
        return const ColorFilter.mode(
          Color(0xFFFFC107),
          BlendMode.modulate,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Map
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _seattleCenter,
              initialZoom: 12,
              minZoom: 10,
              maxZoom: 18,
              maxBounds: LatLngBounds(
                const LatLng(47.1, -122.6),
                const LatLng(47.95, -121.9),
              ),
              onTap: _handleMapTap,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.tentmapper.app',
              ),
              // Boundary rectangle
              PolygonLayer(
                polygons: [
                  Polygon(
                    points: [
                      const LatLng(47.1, -122.6),
                      const LatLng(47.1, -121.9),
                      const LatLng(47.95, -121.9),
                      const LatLng(47.95, -122.6),
                    ],
                    color: const Color(0xFF2D5A7B).withOpacity(0.02),
                    borderColor: const Color(0xFFE85D04),
                    borderStrokeWidth: 2,
                    isDotted: true,
                  ),
                ],
              ),
              // Tent markers - dynamically sized based on zoom
              MarkerLayer(
                markers: _filteredTents.map((tent) {
                  // Get the correct image based on type
                  String imagePath;
                  switch (tent.type) {
                    case 'rv':
                      imagePath = 'assets/images/rv.png';
                      break;
                    case 'encampment':
                      imagePath = 'assets/images/encampment.png';
                      break;
                    case 'structure':
                      imagePath = 'assets/images/structure.png';
                      break;
                    default:
                      imagePath = 'assets/images/tent.png';
                  }
                  
                  // Calculate size based on zoom - stop growing past zoom 13
                  final zoom = _mapController.camera.zoom;
                  final baseSize = 30.0; // Smaller base size
                  final maxZoom = 13.0;  // Stop growing at this zoom
                  final minZoom = 10.0;
                  
                  double size;
                  if (zoom >= maxZoom) {
                    size = baseSize;
                  } else if (zoom <= minZoom) {
                    size = baseSize * 0.6;
                  } else {
                    // Scale between 0.6 and 1.0
                    final scale = 0.6 + (0.4 * (zoom - minZoom) / (maxZoom - minZoom));
                    size = baseSize * scale;
                  }
                  
                  return Marker(
                    point: LatLng(tent.latitude, tent.longitude),
                    width: size,
                    height: size,
                    child: GestureDetector(
                      onTap: () => _showTentDetails(tent),
                      child: ColorFiltered(
                        colorFilter: _getTentColorFilter(tent.status),
                        child: Image.asset(
                          imagePath,
                          width: size,
                          height: size,
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),

          // Top controls overlay
          Positioned(
            top: MediaQuery.of(context).padding.top + 16,
            left: 16,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Help button
                GestureDetector(
                  onTap: () {
                    setState(() {
                      _showHelpPopup = !_showHelpPopup;
                      _showFiltersDropdown = false;
                    });
                  },
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFF16213E),
                      borderRadius: BorderRadius.circular(22),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Center(
                      child: Text(
                        '?',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                
                // Features dropdown button
                GestureDetector(
                  onTap: () {
                    setState(() {
                      _showFiltersDropdown = !_showFiltersDropdown;
                      _showHelpPopup = false;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF16213E),
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.tune, color: Colors.white70, size: 18),
                        const SizedBox(width: 6),
                        const Text(
                          'Filters',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          _showFiltersDropdown ? Icons.expand_less : Icons.expand_more,
                          color: Colors.white70,
                          size: 18,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Help popup
          if (_showHelpPopup)
            Positioned(
              top: MediaQuery.of(context).padding.top + 16,
              left: 70,
              child: Container(
                width: 280,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF16213E),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.4),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'How to Use',
                      style: TextStyle(
                        color: Color(0xFFE85D04),
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _HelpItem(icon: '📍', text: 'Tap on the map to report a tent'),
                    _HelpItem(icon: '✅', text: 'Tap markers to vote if still present'),
                    _HelpItem(icon: '📸', text: 'Add photo evidence when reporting'),
                    _HelpItem(icon: '🗺️', text: 'Use location button for your position'),
                    const SizedBox(height: 12),
                    const Text(
                      'Legend:',
                      style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Container(
                          width: 16,
                          height: 16,
                          decoration: const BoxDecoration(
                            color: Color(0xFFFFC107),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text('Pending', style: TextStyle(color: Colors.white70, fontSize: 13)),
                        const SizedBox(width: 16),
                        Container(
                          width: 16,
                          height: 16,
                          decoration: const BoxDecoration(
                            color: Color(0xFFDC3545),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text('Verified', style: TextStyle(color: Colors.white70, fontSize: 13)),
                      ],
                    ),
                  ],
                ),
              ),
            ),

          // Filters dropdown
          if (_showFiltersDropdown)
            Positioned(
              top: MediaQuery.of(context).padding.top + 76,
              left: 16,
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF16213E),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.4),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _FilterCheckbox(
                      label: 'Confirmed',
                      color: const Color(0xFFDC3545),
                      value: _showConfirmed,
                      onChanged: (v) => setState(() => _showConfirmed = v),
                    ),
                    _FilterCheckbox(
                      label: 'Pending',
                      color: const Color(0xFFFFC107),
                      value: _showPending,
                      onChanged: (v) => setState(() => _showPending = v),
                    ),
                    _FilterCheckbox(
                      label: 'Structures',
                      color: const Color(0xFF787878),
                      value: _showStructures,
                      onChanged: (v) => setState(() => _showStructures = v),
                    ),
                    const Divider(color: Colors.white10),
                    // Dev Trigger Button
                    TextButton.icon(
                      onPressed: _triggerVotingUpdate,
                      icon: const Icon(Icons.bug_report, size: 18, color: Colors.orange),
                      label: const Text(
                        'Dev: Trigger Update',
                        style: TextStyle(color: Colors.orange, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Loading indicator
          if (_isLoading)
            Container(
              color: Colors.black.withOpacity(0.5),
              child: const Center(
                child: CircularProgressIndicator(color: Color(0xFFE85D04)),
              ),
            ),

          // Location button
          Positioned(
            bottom: 20,
            right: 16,
            child: FloatingActionButton(
              onPressed: _getCurrentLocation,
              backgroundColor: const Color(0xFF16213E),
              child: const Icon(Icons.my_location, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

class _HelpItem extends StatelessWidget {
  final String icon;
  final String text;

  const _HelpItem({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(icon, style: const TextStyle(fontSize: 14)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(color: Colors.white70, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterCheckbox extends StatelessWidget {
  final String label;
  final Color color;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _FilterCheckbox({
    required this.label,
    required this.color,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: value ? color : Colors.transparent,
                border: Border.all(color: color, width: 2),
                borderRadius: BorderRadius.circular(4),
              ),
              child: value
                  ? Icon(
                      Icons.check,
                      size: 14,
                      color: color == const Color(0xFFFFC107) ? Colors.black : Colors.white,
                    )
                  : null,
            ),
            const SizedBox(width: 10),
            Text(
              label,
              style: const TextStyle(color: Colors.white70, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }
}
