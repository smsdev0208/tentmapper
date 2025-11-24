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

  @override
  void initState() {
    super.initState();
    _loadTents();
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
    // Check if within Seattle
    if (!_locationService.isWithinSeattle(point.latitude, point.longitude)) {
      _showError('Please place tents within the greater Seattle area only.');
      return;
    }

    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Report Tent'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Report a tent at this location?'),
            const SizedBox(height: 16),
            Text(
              'Lat: ${point.latitude.toStringAsFixed(6)}\nLng: ${point.longitude.toStringAsFixed(6)}',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Add Photo (Optional)'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
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
    setState(() => _isLoading = true);

    try {
      // Ask if user wants to add photo
      if (photoPath == null) {
        final addPhoto = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Add Photo?'),
            content: const Text('Would you like to add a photo of this tent?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Skip'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Add Photo'),
              ),
            ],
          ),
        );

        if (addPhoto == true) {
          final picker = ImagePicker();
          final image = await picker.pickImage(
            source: ImageSource.camera,
            maxWidth: 1920,
            maxHeight: 1080,
            imageQuality: 85,
          );
          photoPath = image?.path;
        }
      }

      await _firebaseService.addTent(
        latitude: point.latitude,
        longitude: point.longitude,
        photoPath: photoPath,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tent reported successfully!')),
        );
      }
    } catch (e) {
      _showError('Failed to add tent: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showTentDetails(Tent tent) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
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
          const SnackBar(content: Text('Vote recorded!')),
        );
      }
    } catch (e) {
      _showError(e.toString());
    }
  }

  void _showError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: Colors.red),
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

  Color _getTentColor(String status) {
    switch (status) {
      case 'verified':
        return Colors.red;
      case 'removed':
        return Colors.grey;
      default:
        return Colors.amber;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Seattle Tent Mapper'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () => _showInfoDialog(),
          ),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _seattleCenter,
              initialZoom: 12,
              minZoom: 10,
              maxZoom: 18,
              // Bounds for Seattle area
              maxBounds: LatLngBounds(
                const LatLng(47.1, -122.6),  // Southwest
                const LatLng(47.95, -121.9), // Northeast
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
                    color: Colors.blue.withOpacity(0.02),
                    borderColor: const Color(0xFF667EEA),
                    borderStrokeWidth: 2,
                    isDotted: true,
                  ),
                ],
              ),
              // Tent markers
              MarkerLayer(
                markers: _tents.map((tent) {
                  return Marker(
                    point: LatLng(tent.latitude, tent.longitude),
                    width: 40,
                    height: 40,
                    child: GestureDetector(
                      onTap: () => _showTentDetails(tent),
                      child: ColorFiltered(
                        colorFilter: _getTentColorFilter(tent.status),
                        child: Image.asset(
                          'assets/images/tent.png',
                          width: 40,
                          height: 40,
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          // Legend
          Positioned(
            top: 16,
            right: 16,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _LegendItem(color: Colors.amber, label: 'Pending'),
                    _LegendItem(color: Colors.red, label: 'Verified'),
                    _LegendItem(color: Colors.grey, label: 'Removed'),
                  ],
                ),
              ),
            ),
          ),
          // Loading indicator
          if (_isLoading)
            Container(
              color: Colors.black26,
              child: const Center(
                child: CircularProgressIndicator(),
              ),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _getCurrentLocation,
        tooltip: 'My Location',
        child: const Icon(Icons.my_location),
      ),
    );
  }

  void _showInfoDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('How to Use'),
        content: const SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('📍 Tap anywhere on the map to report a tent'),
              SizedBox(height: 8),
              Text('✅ Tap markers to vote if tents are still present'),
              SizedBox(height: 8),
              Text('📸 Add photo evidence when reporting'),
              SizedBox(height: 8),
              Text('🗺️ Use location button to see your position'),
              SizedBox(height: 16),
              Text('Legend:', style: TextStyle(fontWeight: FontWeight.bold)),
              Text('🟡 Yellow = Pending verification'),
              Text('🔴 Red = Verified present'),
              Text('⚫ Gray = Reported removed'),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.0),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 16,
            height: 16,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }
}

