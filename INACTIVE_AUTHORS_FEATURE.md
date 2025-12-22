# Inactive Authors Filter Feature

## Overview
Added functionality to mark certain authors as inactive and provide a checkbox control to exclude them from the visualization.

## Inactive Authors List
The following authors have been marked as inactive:
- Jiang Zhou
- Fang Jin
- Michael Gelfond
- Rattikorn Hewett
- Zhenkai Zhang
- Lin Chen
- Sumaiya Shomaji

## Implementation Details

### 1. Data Structure (main.js)
Added a new object to store inactive authors:
```javascript
var inactiveAuthors = {
    "Jiang Zhou": true,
    "Fang Jin": true,
    "Michael Gelfond": true,
    "Rattikorn Hewett": true,
    "Zhenkai Zhang": true,
    "Lin Chen": true,
    "Sumaiya Shomaji": true
};
var excludeInactiveAuthors = false; // Default: show all authors
```

### 2. Filtering Logic
Modified `readTermsAndRelationships()` function to:
- Filter out publications involving inactive authors when the checkbox is enabled
- Add inactive authors to the remove list so they don't appear in the visualization

### 3. Toggle Function
Created `toggleInactiveAuthorsFilter()` function that:
- Reads the checkbox state
- Recomputes the entire visualization with the new filter applied
- Rebuilds nodes, links, and restarts the force-directed layout

### 4. User Interface (index.html)
Added checkbox control in the clustering controls section:
```html
<label class="filter-label" style="margin-left: 20px;">
    <input type="checkbox" id="exclude-inactive-checkbox" onchange="toggleInactiveAuthorsFilter()" />
    Exclude Inactive Authors
</label>
```

### 5. Styling (timeArcs.css)
Added CSS styles for the filter label and checkbox:
- Consistent font styling with other controls
- Hover effects for better UX
- Proper cursor and spacing

## Usage
1. Load the visualization normally - all authors are shown by default
2. Check the "Exclude Inactive Authors" checkbox to hide inactive authors
3. The visualization automatically recomputes to show only active authors
4. Uncheck the box to show all authors again

## Technical Notes
- The filter is applied at the data processing level, not just visual hiding
- When inactive authors are excluded, their publications are removed from the dataset
- The force-directed layout recalculates to properly position remaining authors
- The filter state is stored in the `excludeInactiveAuthors` boolean variable
- The feature integrates seamlessly with existing search and clustering features

