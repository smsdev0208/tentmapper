# Radial Menu Multi-Marker Update

## Summary
This update transforms the Seattle Tent Mapper from a single-purpose tent tracker to a comprehensive homeless services mapping tool with four distinct marker types, each with specific data fields.

## New Features

### 1. Radial Donut Menu
- **UI**: Beautiful animated circular menu that appears on map click
- **Layout**: 4 quadrants arranged as donut slices:
  - Top Left: Tent
  - Top Right: RV
  - Bottom Left: Encampment
  - Bottom Right: Incident
- **Icons**: Each option displays its respective PNG icon
- **Animation**: Smooth fade-in with staggered timing for each quadrant

### 2. Marker Types

#### Tent
- **Icon**: tent.png
- **Additional Fields**: None
- **Voting**: Yes
- **Photo Upload**: Yes

#### RV
- **Icon**: rv.png
- **Additional Fields**: 
  - Side of Street (dropdown: North, South, East, West)
- **Voting**: Yes
- **Photo Upload**: Yes

#### Encampment
- **Icon**: encampment.png
- **Additional Fields**:
  - Approximate Number of Tents (integer, 1-1000)
- **Voting**: Yes
- **Photo Upload**: Yes

#### Incident
- **Icon**: incident.png
- **Additional Fields**:
  - Incident Type (dropdown):
    - Public Intoxication
    - Public Illicit Substance Use
    - Noise Disturbance
    - Altercation
    - Theft
  - Incident Date & Time (datetime picker)
- **Voting**: No (incidents are point-in-time events)
- **Photo Upload**: Yes

## Technical Changes

### Database Structure
- **Collection**: Changed from `tents` to `markers` (legacy `tents` still supported)
- **New Fields**:
  - `type`: String (tent | rv | encampment | incident)
  - `sideOfStreet`: String (for RVs only)
  - `tentCount`: Number (for encampments only)
  - `incidentType`: String (for incidents only)
  - `incidentDateTime`: Timestamp (for incidents only)
- **Voting Fields**: Not present on incident markers

### Files Modified
1. **index.html**
   - Added radial menu HTML structure
   - Updated modal to support multiple marker types
   - Added type-specific form fields
   - Updated header and instructions

2. **css/style.css**
   - Added radial menu styling with animations
   - Quadrant positioning with curved borders
   - Hover effects and transitions
   - Responsive design for mobile

3. **js/map.js**
   - Updated click handler to show radial menu
   - Added marker type icons for all 4 types
   - Changed collection from `tents` to `markers`
   - Added radial menu show/hide functions

4. **js/tents.js** (handles all marker types)
   - Renamed functions from tent-specific to marker-generic
   - Added type-specific field handling
   - Updated form validation based on marker type
   - Modified popup content generation for each type
   - Excluded incidents from voting UI

5. **js/voting.js**
   - Updated references from `tents` to `markers`
   - Added incident exclusion check before voting
   - Updated field names (tentId → markerId)

6. **firestore.rules**
   - Added `markers` collection rules
   - Flexible validation for different marker types
   - Incidents don't require voting fields
   - Kept legacy `tents` rules for backwards compatibility

7. **storage.rules**
   - Added `marker-photos` path
   - Kept legacy `tent-photos` path

8. **README.md**
   - Updated documentation for all features
   - Added marker type descriptions
   - Updated setup instructions

## Testing Checklist

### Radial Menu
- [ ] Click map shows radial menu at cursor position
- [ ] Menu animates in smoothly with staggered timing
- [ ] All 4 quadrants are visible with correct icons
- [ ] Hover effect works on each quadrant
- [ ] Click outside menu dismisses it
- [ ] Menu works on mobile (touch events)

### Tent Marker
- [ ] Selecting "Tent" opens modal with correct title
- [ ] Location displays correctly
- [ ] No additional fields shown
- [ ] Photo upload works
- [ ] Submit creates marker with type: "tent"
- [ ] Tent marker appears on map with tent icon
- [ ] Popup shows voting buttons
- [ ] Voting works correctly

### RV Marker
- [ ] Selecting "RV" opens modal with correct title
- [ ] "Side of Street" dropdown appears
- [ ] All 4 directions available (N/S/E/W)
- [ ] Field is required
- [ ] Photo upload works
- [ ] Submit creates marker with type: "rv" and sideOfStreet
- [ ] RV marker appears on map with RV icon
- [ ] Popup shows side of street info
- [ ] Voting buttons work

### Encampment Marker
- [ ] Selecting "Encampment" opens modal
- [ ] "Approximate Number of Tents" field appears
- [ ] Field accepts only numbers
- [ ] Min value is 1, max is 1000
- [ ] Field is required
- [ ] Photo upload works
- [ ] Submit creates marker with type: "encampment" and tentCount
- [ ] Encampment marker appears with encampment icon
- [ ] Popup shows tent count
- [ ] Voting buttons work

### Incident Marker
- [ ] Selecting "Incident" opens modal
- [ ] Incident type dropdown appears with 5 options
- [ ] Date/time picker appears with current time default
- [ ] Both fields are required
- [ ] Photo upload is hidden (incidents don't support photos)
- [ ] Submit creates marker with type: "incident", incidentType, and incidentDateTime
- [ ] Incident marker appears with incident icon
- [ ] Popup shows incident details
- [ ] NO voting buttons appear
- [ ] Attempting to vote shows error message

### Cross-Browser Testing
- [ ] Chrome (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Chrome (mobile)
- [ ] Safari (iOS)

### Firebase Integration
- [ ] Markers save to Firestore `markers` collection
- [ ] Real-time updates work for all marker types
- [ ] Photos upload to `marker-photos/` path
- [ ] Votes save with markerId field
- [ ] Security rules allow marker creation
- [ ] Security rules prevent incident voting

## Migration Notes

### For Existing Deployments
1. Deploy new `firestore.rules` (supports both collections)
2. Deploy new `storage.rules` (supports both paths)
3. Update web app files
4. Legacy tent markers will continue to work
5. New markers use `markers` collection

### Breaking Changes
- None - legacy `tents` collection still works
- Voting.js updated field names but checks both

## Future Enhancements
- [ ] Filter map by marker type
- [ ] Export data by type
- [ ] Incident heat map
- [ ] RV clustering by street side
- [ ] Encampment size visualization
- [ ] Mobile app support for all marker types

