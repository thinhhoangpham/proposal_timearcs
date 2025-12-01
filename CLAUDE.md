# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a D3.js-based visualization application called "TimeArcs" that displays research proposals and collaborations over time. The visualization shows:
- Authors as horizontal timelines with arcs connecting collaborators
- Time-based arcs showing when authors collaborated on proposals
- Color-coded proposals by sponsor/funding source
- Interactive filtering and exploration of publication data

## Data Pipeline

### Data Processing
The project uses Python scripts to convert raw Excel data into the TSV format used by the visualization:

```bash
# Convert Excel to TSV (aggregates by proposal_no)
python convert.py

# Extract unique themes/sponsors from publication data
python extract_unique_themes.py --file data/publication.tsv
python extract_unique_themes.py --normalize --json  # with normalization and JSON output
python extract_unique_themes.py --map-lines          # output for themeColors.json mapping
```

**Important**: The `convert.py` script:
- Reads from `all 2.xlsx` (source Excel file)
- Aggregates rows by `proposal_no` (combining multiple PIs into single Authors field)
- Outputs to `data/publication.tsv`
- Author names are formatted as "FirstName LastName" (comma-separated, no spaces after commas)

### Data Schema
The `data/publication.tsv` file has these columns:
- `proposal_no`: Unique proposal identifier
- `date_submitted`: Format YYYY-MM-DD (used for timeline positioning)
- `title`: Proposal title
- `sponsor`: Funding agency (used for coloring)
- `prime_sponsor`: Primary sponsor if subcontract
- `Authors`: Comma-separated list of authors (no spaces after commas)
- `credit`, `first`, `total`: Financial data
- `theme`: Research theme/category

## Code Architecture

### Main Visualization Files

**index.html** - Single-page application structure with:
- `#chart` div: SVG container for the TimeArcs visualization
- `#pub-panel` aside: Publications panel (right side) with author details
- `#legend-container`: Color legend for sponsors/themes

**Main JavaScript Components** (execution order):
1. `pubJavascripts/myscripts/util.js` - Color management and legend utilities
2. `pubJavascripts/myscripts/sliderRelationship.js` - Collaboration strength slider
3. `pubJavascripts/myscripts/sliderRadius.js` - Node radius slider
4. `pubJavascripts/myscripts/streamGraph.js` - Stream graph rendering (legacy)
5. `pubJavascripts/myscripts/main.js` - Core visualization logic

### Key Data Structures in main.js

**Global Variables**:
- `nodes`: Author nodes positioned by force layout
- `links`: Arcs connecting collaborating authors at specific time points
- `terms`: Object mapping author names to publication counts by month
- `relationship`: Object tracking co-authorship relationships by month (key format: "author1__author2")
- `authorPubs`: Map of author name → array of publication objects (used by right panel)
- `data`: Raw TSV data loaded from `data/publication.tsv`

**Time Representation**:
- Years are stored as month offsets from `minYear-minMonth` (default: January 2018)
- Each time unit represents one month (2018-2025 = ~84 months)
- Arc positions use `l.m` to indicate which month a collaboration occurred

**Node Types**:
- Parent nodes: Main author positions (top N authors by connectivity)
- Child nodes: Created dynamically for authors at different time points when they have multiple collaborations across different months

### Force Layout

The D3 force layout (`force`) is used to position author nodes:
- Nodes are attracted to center horizontally
- Parent-child relationships enforce vertical alignment
- After stabilization, nodes are sorted by Y-position and evenly spaced
- `detactTimeSeries()` runs when force.alpha() drops to zero, finalizing positions

### Arc Rendering

Arcs are drawn as SVG paths using `linkArc(d)` function:
- Arc thickness represents collaboration count (relationship strength)
- Arc color represents sponsor (single sponsor) or group color (multiple sponsors in same group) or black (mixed groups)
- `linkScale` uses square root scaling to prevent overly thick arcs
- Arc count=1 always renders thin (1.2px), regardless of value
- Arcs are clipped to SVG bounds using clipPath

### Color Management (util.js)

**Color Assignment**:
- Colors are loaded from `pubJavascripts/myscripts/sponsorsColors.json`
- `getColor(sponsor)` returns the assigned color for a sponsor
- `getGroupColor(sponsor)` returns the group color if the sponsor belongs to a category
- Fallback: Uses deterministic hashing if palette exhausted

**Legend Configuration**:
- `legendConfig`: If present in sponsorsColors.json, uses grouped legend
- Groups multiple sponsors under category names with shared colors
- Individual sponsor entries used as fallback

**Normalization**:
- `normalizeThemeKey()`: Standardizes sponsor/theme names (removes extra spaces, normalizes separators)
- `themeAliasMap`: Maps legacy names to new hierarchical format

### Publications Panel

**Panel Modes**:
- `panelMode = 'all'`: Shows all authors with their publications (sorted alphabetically)
- `panelMode = 'person'`: Shows single author's publications on mouseover

**Key Functions**:
- `renderPanelAll()`: Renders all authors and publications
- `renderPanelForPerson(name)`: Renders single author view
- `getPublicationsForAuthor(name)`: Returns de-duplicated publications for author

**Interaction**:
- Hovering over author name on visualization shows their publications
- Hovering over legend entry highlights matching authors and arcs
- Scroll position preserved when switching between modes

### Interactive Features

**Legend Hover** (`util.js`):
- `highlightArcsBySponsor(sponsorName)`: Highlights arcs/authors with matching sponsor
- `highlightArcsByCategory(categoryName, categoryColor)`: Highlights entire group
- `resetArcHighlight()`: Restores default state

**Node Hover** (`main.js`):
- `mouseoveredNode(d)`: Highlights connected authors and arcs, renders person panel
- `mouseoutedNode(d)`: Resets to default, renders all-authors panel
- Nodes transition to collaboration time points

**Arc Hover** (`main.js`):
- `mouseoveredLink(l)`: Shows publication titles that created the collaboration
- Tooltip positioned dynamically to avoid overflow
- Publications listed with proposal_no (colored by sponsor) + title

## Development Workflow

### Running the Visualization

```bash
# Serve locally (Python 3)
python -m http.server 8000

# Serve locally (Python 2)
python -m SimpleHTTPServer 8000

# Then visit: http://localhost:8000/index.html
```

### Updating Data

1. Update the source Excel file (`all 2.xlsx`)
2. Run conversion: `python convert.py`
3. Verify output in `data/publication.tsv`
4. Extract themes: `python extract_unique_themes.py --normalize --json`
5. Update `pubJavascripts/myscripts/sponsorsColors.json` with new colors if needed
6. Refresh visualization in browser

### Adding New Sponsors/Colors

Edit `pubJavascripts/myscripts/sponsorsColors.json`:
```json
{
  "legend": {
    "Federal Agencies": {
      "color": "#1f77b4",
      "count": 150
    }
  },
  "sponsors": {
    "National Science Foundation": "#1f77b4",
    "Department of Defense": "#ff7f0e"
  },
  "palette": ["#1f77b4", "#ff7f0e", "#2ca02c"]
}
```

### Key Configuration Constants (main.js)

```javascript
var minYear = 2018;
var minMonth = 1;
var maxYear = 2025;
var maxMonth = 12;
var numNode = Math.min(50, termArray.length);  // Max authors shown
var PANEL_MAX_ITEMS = 30;  // Max publications shown per author in hover view
```

## Important Implementation Notes

### Author Relationship Calculation
- Relationships use consistent key ordering: `term1 < term2 ? term1+"__"+term2 : term2+"__"+term1`
- This prevents counting A→B and B→A as separate relationships
- Self-connections are excluded (loop starts at `j=i+1`)
- De-duplication by `proposal_no + theme` prevents duplicate entries

### Arc Thickness Logic
- `linkScale()` function ensures count=1 always renders as 1.2px
- Square root scale for count > 1 to compress high values
- Special handling for small datasets (maxCount ≤ 2)
- Stroke width is forced to 1.2 in rendering even if d.value differs

### Time Scale
- Monthly granularity (not yearly) for finer temporal resolution
- `xScale` maps month offsets to pixel positions
- Timeline markers drawn at year boundaries (January of each year)

### Memory and Performance
- Top 200 authors considered for connectivity analysis
- Top 50 most connected authors displayed
- Force layout stops after alpha drops below threshold
- Child nodes created on-demand for authors with multi-time collaborations

## File Structure

```
publication_timearcs/
├── index.html                              # Main HTML entry point
├── data/
│   └── publication.tsv                     # Processed publication data
├── pubJavascripts/
│   ├── myscripts/
│   │   ├── main.js                         # Core visualization logic
│   │   ├── util.js                         # Color/legend utilities
│   │   ├── streamGraph.js                  # Stream graph (legacy)
│   │   ├── sliderRelationship.js           # Collaboration slider
│   │   ├── sliderRadius.js                 # Radius slider
│   │   ├── themeColors.json                # (deprecated) Use sponsorsColors.json
│   │   └── sponsorsColors.json             # Sponsor color mappings + legend config
│   ├── styles/
│   │   └── timeArcs.css                    # Main styles
│   └── javascripts/
│       └── fisheye.js                      # Fisheye distortion utility
├── convert.py                              # Excel → TSV converter
├── extract_unique_themes.py                # Theme extraction utility
├── all 2.xlsx                              # Source Excel data
└── d3.v3.min.js, d3.tip.v0.6.3.js         # D3 dependencies
```

## Common Tasks

### Debugging Arc Thickness Issues
Check console logs for "Arc with count > 1" and "Arc with count=1 but value > 1.5". The linkScale function should always return 1.2 for count=1.

### Adding New Time Range
Update constants in main.js:
```javascript
var minYear = 2018;  // Start year
var maxYear = 2025;  // End year
var minMonth = 1;    // Start month
var maxMonth = 12;   // End month
```

### Changing Visual Layout
- Node spacing: Modify `step` variable in `detactTimeSeries()` (default: 20px)
- Arc curve: Modify `linkArc()` function path generation
- Color palette: Update `palette` array in sponsorsColors.json

### Panel Customization
- Max items per author: Change `PANEL_MAX_ITEMS` constant
- Styling: Edit `.pub-*` classes in `pubJavascripts/styles/timeArcs.css`
