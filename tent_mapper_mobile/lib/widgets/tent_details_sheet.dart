import 'package:flutter/material.dart';
import '../models/tent.dart';

class TentDetailsSheet extends StatelessWidget {
  final Tent tent;
  final Function(bool stillThere) onVote;

  const TentDetailsSheet({
    super.key,
    required this.tent,
    required this.onVote,
  });

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.5,
      minChildSize: 0.3,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Color(0xFF16213E),
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(20),
            children: [
              // Handle bar
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              
              // Header with type and status
              Row(
                children: [
                  _TypeIcon(type: tent.type),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tent.typeLabel,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'ID: ${tent.id.substring(0, 8)}...',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.white.withOpacity(0.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                  _StatusBadge(status: tent.status),
                ],
              ),
              const SizedBox(height: 24),
              
              // Info section
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    _InfoRow(
                      icon: Icons.calendar_today,
                      label: 'Reported',
                      value: _formatDate(tent.createdAt),
                    ),
                    const Divider(color: Colors.white10, height: 24),
                    _InfoRow(
                      icon: Icons.location_on,
                      label: 'Location',
                      value: '${tent.latitude.toStringAsFixed(4)}, ${tent.longitude.toStringAsFixed(4)}',
                    ),
                    if (tent.lastVerifiedAt != null) ...[
                      const Divider(color: Colors.white10, height: 24),
                      _InfoRow(
                        icon: Icons.update,
                        label: 'Last Verified',
                        value: _formatDate(tent.lastVerifiedAt!),
                      ),
                    ],
                    // Type-specific info
                    if (tent.sideOfStreet != null) ...[
                      const Divider(color: Colors.white10, height: 24),
                      _InfoRow(
                        icon: Icons.signpost,
                        label: 'Side of Street',
                        value: tent.sideOfStreet!,
                      ),
                    ],
                    if (tent.tentCount != null) ...[
                      const Divider(color: Colors.white10, height: 24),
                      _InfoRow(
                        icon: Icons.numbers,
                        label: 'Approx. Tents',
                        value: tent.tentCount.toString(),
                      ),
                    ],
                    if (tent.incidentType != null) ...[
                      const Divider(color: Colors.white10, height: 24),
                      _InfoRow(
                        icon: Icons.warning,
                        label: 'Incident Type',
                        value: _formatIncidentType(tent.incidentType!),
                      ),
                    ],
                    if (tent.incidentDateTime != null) ...[
                      const Divider(color: Colors.white10, height: 24),
                      _InfoRow(
                        icon: Icons.access_time,
                        label: 'Incident Time',
                        value: _formatDate(tent.incidentDateTime!),
                      ),
                    ],
                  ],
                ),
              ),
              
              // Vote section (hide for incidents)
              if (!tent.isIncident) ...[
                const SizedBox(height: 24),
                
                // Vote counts
                Text(
                  'Community Votes',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.white.withOpacity(0.5),
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _VoteCountCard(
                        count: tent.votesYes,
                        label: 'Still There',
                        color: const Color(0xFF28A745),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _VoteCountCard(
                        count: tent.votesNo,
                        label: 'Not There',
                        color: const Color(0xFFDC3545),
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: 20),
                
                // Vote buttons
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => onVote(true),
                        icon: const Icon(Icons.check_circle, size: 20),
                        label: const Text('Still There'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF28A745),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => onVote(false),
                        icon: const Icon(Icons.cancel, size: 20),
                        label: const Text('Not There'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFDC3545),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
              
              // Photos section
              if (tent.photoUrls.isNotEmpty) ...[
                const SizedBox(height: 24),
                Text(
                  'Photos',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.white.withOpacity(0.5),
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 12),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: tent.photoUrls.length,
                  itemBuilder: (context, index) {
                    return ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        tent.photoUrls[index],
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            color: Colors.white.withOpacity(0.1),
                            child: Icon(
                              Icons.error,
                              color: Colors.white.withOpacity(0.3),
                            ),
                          );
                        },
                      ),
                    );
                  },
                ),
              ],
              
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inDays == 0) {
      if (difference.inHours == 0) {
        return '${difference.inMinutes} minutes ago';
      }
      return '${difference.inHours} hours ago';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    }
    
    return '${date.month}/${date.day}/${date.year}';
  }
  
  String _formatIncidentType(String type) {
    switch (type) {
      case 'public-intoxication':
        return 'Public Intoxication';
      case 'public-illicit-substance-use':
        return 'Public Illicit Substance Use';
      case 'noise-disturbance':
        return 'Noise Disturbance';
      case 'altercation':
        return 'Altercation';
      case 'theft':
        return 'Theft';
      default:
        return type;
    }
  }
}

class _TypeIcon extends StatelessWidget {
  final String type;

  const _TypeIcon({required this.type});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;
    
    switch (type) {
      case 'rv':
        icon = Icons.directions_car;
        color = const Color(0xFF2D5A7B);
        break;
      case 'encampment':
        icon = Icons.holiday_village;
        color = const Color(0xFF9B59B6);
        break;
      case 'incident':
        icon = Icons.warning;
        color = const Color(0xFFDC3545);
        break;
      default:
        icon = Icons.home;
        color = const Color(0xFFE85D04);
    }
    
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: color, size: 24),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    Color textColor;
    String label;
    
    switch (status) {
      case 'verified':
        color = const Color(0xFFDC3545);
        textColor = Colors.white;
        label = 'VERIFIED';
        break;
      case 'removed':
        color = Colors.grey;
        textColor = Colors.white;
        label = 'REMOVED';
        break;
      default:
        color = const Color(0xFFFFC107);
        textColor = Colors.black;
        label = 'PENDING';
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: textColor,
          fontWeight: FontWeight.bold,
          fontSize: 11,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Colors.white.withOpacity(0.4)),
        const SizedBox(width: 12),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withOpacity(0.5),
            fontSize: 13,
          ),
        ),
        const Spacer(),
        Flexible(
          child: Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }
}

class _VoteCountCard extends StatelessWidget {
  final int count;
  final String label;
  final Color color;

  const _VoteCountCard({
    required this.count,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Text(
            count.toString(),
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: color.withOpacity(0.8),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
