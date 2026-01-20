import 'package:flutter/material.dart';
import 'dart:async';
import '../models/tent.dart';

class TentDetailsSheet extends StatefulWidget {
  final Tent tent;
  final Function(bool stillThere) onVote;

  const TentDetailsSheet({
    super.key,
    required this.tent,
    required this.onVote,
  });

  @override
  State<TentDetailsSheet> createState() => _TentDetailsSheetState();
}

class _TentDetailsSheetState extends State<TentDetailsSheet> {
  late Timer _timer;
  String _timeUntilMidnight = '';

  @override
  void initState() {
    super.initState();
    _updateTimeUntilMidnight();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _updateTimeUntilMidnight();
        });
      }
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  void _updateTimeUntilMidnight() {
    // Midnight PST is 8:00 AM UTC
    // More reliably, let's just calculate next 12:00 AM local if we don't care about timezone strictly
    // but the requirement said Midnight PST.
    // PST is UTC-8. So Midnight PST is 8:00 UTC.
    
    DateTime pstNow = DateTime.now().toUtc().subtract(const Duration(hours: 8));
    DateTime pstMidnight = DateTime(pstNow.year, pstNow.month, pstNow.day).add(const Duration(days: 1));
    
    Duration diff = pstMidnight.difference(pstNow);
    
    String hours = diff.inHours.toString().padLeft(2, '0');
    String minutes = (diff.inMinutes % 60).toString().padLeft(2, '0');
    String seconds = (diff.inSeconds % 60).toString().padLeft(2, '0');
    
    _timeUntilMidnight = '$hours:$minutes:$seconds';
  }

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
                  _TypeIcon(type: widget.tent.type),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.tent.typeLabel,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'ID: ${widget.tent.id.substring(0, 8)}...',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.white.withOpacity(0.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                  _StatusBadge(status: widget.tent.status),
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
                      value: _formatDate(widget.tent.createdAt),
                    ),
                    const Divider(color: Colors.white10, height: 24),
                    _InfoRow(
                      icon: Icons.location_on,
                      label: 'Location',
                      value: '${widget.tent.latitude.toStringAsFixed(4)}, ${widget.tent.longitude.toStringAsFixed(4)}',
                    ),
                    if (widget.tent.lastVerifiedAt != null) ...[
                      const Divider(color: Colors.white10, height: 24),
                      _InfoRow(
                        icon: Icons.update,
                        label: 'Last Verified',
                        value: _formatDate(widget.tent.lastVerifiedAt!),
                      ),
                    ],
                    // Type-specific info
                    if (widget.tent.sideOfStreet != null) ...[
                      const Divider(color: Colors.white10, height: 24),
                      _InfoRow(
                        icon: Icons.signpost,
                        label: 'Side of Street',
                        value: widget.tent.sideOfStreet!,
                      ),
                    ],
                    if (widget.tent.tentCount != null) ...[
                      const Divider(color: Colors.white10, height: 24),
                      _InfoRow(
                        icon: Icons.numbers,
                        label: 'Approx. Tents',
                        value: widget.tent.tentCount.toString(),
                      ),
                    ],
                  ],
                ),
              ),
              
              // Vote section (all types now have voting)
              if (true) ...[
                const SizedBox(height: 24),
                
                // Voting Header with Countdown
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Community Votes',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.white.withOpacity(0.5),
                        letterSpacing: 1.2,
                      ),
                    ),
                    Text(
                      _timeUntilMidnight,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFE85D04),
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                
                // Voting Bar
                _VotingBar(
                  votesYes: widget.tent.votesYes,
                  votesNo: widget.tent.votesNo,
                  status: widget.tent.status,
                ),
                
                const SizedBox(height: 20),
                
                // Vote counts
                Row(
                  children: [
                    Expanded(
                      child: _VoteCountCard(
                        count: widget.tent.votesYes,
                        label: 'Still There',
                        color: const Color(0xFF28A745),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _VoteCountCard(
                        count: widget.tent.votesNo,
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
                        onPressed: () => widget.onVote(true),
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
                        onPressed: () => widget.onVote(false),
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
              if (widget.tent.photoUrls.isNotEmpty) ...[
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
                  itemCount: widget.tent.photoUrls.length,
                  itemBuilder: (context, index) {
                    return ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        widget.tent.photoUrls[index],
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
  
}

class _VotingBar extends StatelessWidget {
  final int votesYes;
  final int votesNo;
  final String status;

  const _VotingBar({
    required this.votesYes,
    required this.votesNo,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    final total = votesYes + votesNo;
    final yesRatio = total > 0 ? votesYes / total : 0.5;
    
    String statusText = '';
    if (status == 'pending') {
      statusText = votesNo > votesYes 
          ? 'No votes leading: Tent will not be added' 
          : 'Yes votes leading: Tent will be added to map';
    } else {
      statusText = votesNo > votesYes 
          ? 'No votes leading: Tent will be removed' 
          : 'Yes votes leading: Tent will remain';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 10,
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.1),
            borderRadius: BorderRadius.circular(5),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(5),
            child: Row(
              children: [
                Expanded(
                  flex: (yesRatio * 100).toInt(),
                  child: Container(color: const Color(0xFF28A745)),
                ),
                Expanded(
                  flex: ((1 - yesRatio) * 100).toInt(),
                  child: Container(color: const Color(0xFFDC3545)),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          statusText,
          style: TextStyle(
            fontSize: 12,
            fontStyle: FontStyle.italic,
            color: Colors.white.withOpacity(0.5),
          ),
        ),
      ],
    );
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
      case 'structure':
        icon = Icons.business;
        color = const Color(0xFF787878);
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
