var diameter = 1000,
    radius = diameter / 2,
    innerRadius = radius - 120;

var typeList = ["Field A","Field B"]  

// Cache keeps theme-to-color assignments stable during a session
var themeColorCache = {};
// Base palette used before falling back to deterministic hashing
var defaultThemePalette = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
  "#393b79", "#637939", "#8c6d31", "#843c39", "#7b4173"
];
var themePalette = defaultThemePalette.slice(0);
var themeColorAssignmentCount = 0;
var legendConfig = null;

function normalizeThemeKey(k) {
  if (!k) return "";
  return k
    .replace(/\s*&\s*/g, "/")      // replace ampersand-separated with slash
    .replace(/\s*\/\s*/g, "/")    // remove spaces around slashes
    .replace(/\s{2,}/g, " ")        // collapse multiple spaces
    .trim();
}

// Explicit aliases for cases where hierarchy rewrite introduced new slashes
var themeAliasMap = {
  "Quantum Education": "Quantum/Education"
};

var themeColorsPromise = typeof Promise !== "undefined" ? new Promise(function(resolve) {
  if (typeof d3 === "undefined" || !d3.json) {
    resolve();
    return;
  }
  d3.json("pubJavascripts/myscripts/sponsorsColors.json", function(error, config) {
    if (!error && config) {
      // Store legend config if available
      if (config.legend) {
        legendConfig = config.legend;
        window.legendConfig = legendConfig; // Make globally accessible
      }
      // Load sponsors instead of themeColors
      if (config.sponsors) {
        themeColorCache = {};
        Object.keys(config.sponsors).forEach(function(key) {
          var normKey = normalizeThemeKey(key);
          themeColorCache[normKey] = config.sponsors[key];
        });
        themeColorAssignmentCount = Object.keys(themeColorCache).length;
      }
      // Fallback to themeColors for backward compatibility
      else if (config.themeColors) {
        themeColorCache = {};
        Object.keys(config.themeColors).forEach(function(key) {
          var normKey = normalizeThemeKey(key);
          themeColorCache[normKey] = config.themeColors[key];
        });
        themeColorAssignmentCount = Object.keys(themeColorCache).length;
      }
      if (config.palette && config.palette.length) {
        themePalette = config.palette.slice(0);
      }
    }
    resolve();
  });
}) : null;

if (typeof window !== "undefined") {
  window.themeColorsPromise = themeColorsPromise || { then: function(cb){ cb(); } };
}
function drawColorLegend() {
  removeColorLegend();

  // Get the legend container div (not SVG)
  var legendContainerDiv = document.getElementById('legend-container');
  if (!legendContainerDiv) return;

  // Clear any existing content
  legendContainerDiv.innerHTML = '';

  // Use grouped legend if available, otherwise use individual sponsors
  if (legendConfig) {
    // Create HTML structure for grouped legend with expand/collapse
    Object.keys(legendConfig).forEach(function(categoryName) {
      var category = legendConfig[categoryName];

      // Create group container
      var groupContainer = document.createElement('div');
      groupContainer.className = 'legend-group';

      // Create category entry (header)
      var entry = document.createElement('div');
      entry.className = 'themeLegendEntry legend-category';
      entry.style.cssText = 'display: flex; align-items: center; padding: 2px 0; cursor: pointer;';

      // Expand/collapse arrow
      var arrow = document.createElement('span');
      arrow.className = 'legend-arrow';
      arrow.textContent = '▶';
      arrow.style.cssText = 'font-size: 8px; margin-right: 4px; flex-shrink: 0; transition: transform 0.2s;';
      entry.appendChild(arrow);

      // Color swatch
      var swatch = document.createElement('div');
      swatch.style.cssText = 'width: 11px; height: 11px; background: ' + category.color + '; border-radius: 2px; margin-right: 5px; flex-shrink: 0;';
      entry.appendChild(swatch);

      // Text label (without count)
      var label = document.createElement('span');
      label.textContent = categoryName;
      label.style.cssText = 'font-family: sans-serif; font-size: 11px; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
      label.title = categoryName;  // Tooltip for full text
      entry.appendChild(label);

      // Find all sponsors that belong to this category (by matching color)
      var sponsorsInCategory = [];
      for (var sponsorName in themeColorCache) {
        if (themeColorCache[sponsorName] === category.color) {
          sponsorsInCategory.push(sponsorName);
        }
      }
      sponsorsInCategory.sort(); // Alphabetical order

      // Create sponsors list container (initially hidden)
      var sponsorsList = document.createElement('div');
      sponsorsList.className = 'legend-sponsors-list';
      sponsorsList.style.cssText = 'display: none; padding-left: 20px;';

      // Add individual sponsors
      sponsorsInCategory.forEach(function(sponsorName) {
        var sponsorEntry = document.createElement('div');
        sponsorEntry.className = 'themeLegendEntry legend-sponsor';
        sponsorEntry.style.cssText = 'display: flex; align-items: center; padding: 2px 0; cursor: pointer; padding-left: 10px;';

        // Small color dot
        var sponsorSwatch = document.createElement('div');
        sponsorSwatch.style.cssText = 'width: 6px; height: 6px; background: ' + category.color + '; border-radius: 50%; margin-right: 5px; flex-shrink: 0;';
        sponsorEntry.appendChild(sponsorSwatch);

        // Sponsor name
        var sponsorLabel = document.createElement('span');
        sponsorLabel.textContent = sponsorName;
        sponsorLabel.style.cssText = 'font-family: sans-serif; font-size: 10px; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        sponsorLabel.title = sponsorName;
        sponsorEntry.appendChild(sponsorLabel);

        // Add hover effects to highlight related arcs by individual sponsor
        sponsorEntry.addEventListener('mouseover', function(e) {
          e.stopPropagation(); // Prevent category hover
          highlightArcsBySponsor(sponsorName);
        });
        sponsorEntry.addEventListener('mouseout', function(e) {
          e.stopPropagation();
          resetArcHighlight();
        });

        sponsorsList.appendChild(sponsorEntry);
      });

      // Add click handler to expand/collapse sponsors list
      var isExpanded = false;
      entry.addEventListener('click', function(e) {
        isExpanded = !isExpanded;
        if (isExpanded) {
          sponsorsList.style.display = 'block';
          arrow.style.transform = 'rotate(90deg)';
          arrow.textContent = '▼';
        } else {
          sponsorsList.style.display = 'none';
          arrow.style.transform = 'rotate(0deg)';
          arrow.textContent = '▶';
        }
      });

      // Add hover effects to highlight related arcs by category
      entry.addEventListener('mouseover', function(e) {
        // Only trigger if not hovering over a sponsor
        if (e.target.closest('.legend-sponsor')) return;
        highlightArcsByCategory(categoryName, category.color);
      });
      entry.addEventListener('mouseout', function(e) {
        if (e.target.closest('.legend-sponsor')) return;
        resetArcHighlight();
      });

      groupContainer.appendChild(entry);
      groupContainer.appendChild(sponsorsList);
      legendContainerDiv.appendChild(groupContainer);
    });
  } else {
    // Fallback to individual sponsors
    var themes = Object.keys(themeColorCache);
    if (!themes.length) return;

    // Create HTML structure for legend
    themes.forEach(function(theme, i) {
      var entry = document.createElement('div');
      entry.className = 'themeLegendEntry';
      entry.style.cssText = 'display: flex; align-items: center; padding: 2px 0; cursor: pointer;';
      
      // Color swatch
      var swatch = document.createElement('div');
      swatch.style.cssText = 'width: 11px; height: 11px; background: ' + getColor(theme) + '; border-radius: 2px; margin-right: 5px; flex-shrink: 0;';
      entry.appendChild(swatch);
      
      // Text label
      var label = document.createElement('span');
      label.textContent = theme;
      label.style.cssText = 'font-family: sans-serif; font-size: 11px; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
      label.title = theme;  // Tooltip for full text
      entry.appendChild(label);
      
      // Add hover effects to highlight related arcs
      entry.addEventListener('mouseover', function() {
        highlightArcsBySponsor(theme);
      });
      entry.addEventListener('mouseout', function() {
        resetArcHighlight();
      });
      
      legendContainerDiv.appendChild(entry);
    });
  }
}

function highlightArcsBySponsor(sponsorName) {
  // Normalize sponsor name for comparison
  var normalizedSponsor = normalizeThemeKey(sponsorName);
  
  // Fade all arcs first
  svg.selectAll(".linkArc")
    .style("stroke-opacity", function(d) {
      // Check if this arc's sponsor matches
      if (d.type && d.type.length > 0) {
        for (var i = 0; i < d.type.length; i++) {
          if (d.type[i] && d.type[i].sponsor) {
            var arcSponsor = normalizeThemeKey(d.type[i].sponsor);
            if (arcSponsor === normalizedSponsor) {
              return 1;  // Full opacity for matching sponsor
            }
          }
        }
      }
      return 0.05;  // Fade non-matching arcs
    })
    .style("stroke-width", function(d) {
      if (d.type && d.type.length > 0) {
        for (var i = 0; i < d.type.length; i++) {
          if (d.type[i] && d.type[i].sponsor) {
            var arcSponsor = normalizeThemeKey(d.type[i].sponsor);
            if (arcSponsor === normalizedSponsor) {
              return d.value * 1.5;  // Make matching arcs thicker
            }
          }
        }
      }
      return d.value;
    });

  // Fade other elements
  svg.selectAll(".linePNodes").style("stroke-opacity", 0.1);
  
  // Highlight author names on the timearcs visualization first to get the list
  // We'll set nodeG fill-opacity after highlighting
  highlightAuthorNamesOnVisualization(sponsorName, normalizedSponsor);
  
  // Now set nodeG fill-opacity, keeping matching authors at full opacity
  if (window.authorPubs && typeof window.authorPubs === 'object') {
    var authorsWithSponsor = {};
    for (var authorName in window.authorPubs) {
      var pubs = window.authorPubs[authorName];
      for (var i = 0; i < pubs.length; i++) {
        if (pubs[i].sponsor) {
          var pubSponsor = normalizeThemeKey(pubs[i].sponsor);
          if (pubSponsor === normalizedSponsor) {
            authorsWithSponsor[authorName] = true;
            break;
          }
        }
      }
    }
    
    svg.selectAll(".nodeG").style("fill-opacity", function() {
      var nodeData = d3.select(this).datum();
      if (nodeData && authorsWithSponsor[nodeData.name]) {
        return 1; // Full opacity for matching authors
      }
      return 0.3; // Fade non-matching authors
    });
  } else {
    svg.selectAll(".nodeG").style("fill-opacity", 0.3);
  }
  
  // Highlight author names in the publications panel
  highlightAuthorsWithSponsor(sponsorName, normalizedSponsor);
}

function highlightArcsByCategory(categoryName, categoryColor) {
  // Find all sponsors that belong to this category (by matching color)
  var matchingSponsors = [];
  for (var sponsorName in themeColorCache) {
    if (themeColorCache[sponsorName] === categoryColor) {
      matchingSponsors.push(sponsorName);
    }
  }
  
  if (matchingSponsors.length === 0) return;
  
  // Normalize all matching sponsors
  var normalizedSponsors = {};
  matchingSponsors.forEach(function(sponsor) {
    normalizedSponsors[normalizeThemeKey(sponsor)] = true;
  });
  
  // Fade all arcs first
  svg.selectAll(".linkArc")
    .style("stroke-opacity", function(d) {
      // Check if this arc's sponsor matches any in the category
      if (d.type && d.type.length > 0) {
        for (var i = 0; i < d.type.length; i++) {
          if (d.type[i] && d.type[i].sponsor) {
            var arcSponsor = normalizeThemeKey(d.type[i].sponsor);
            if (normalizedSponsors[arcSponsor]) {
              return 1;  // Full opacity for matching sponsor
            }
          }
        }
      }
      return 0.05;  // Fade non-matching arcs
    })
    .style("stroke-width", function(d) {
      if (d.type && d.type.length > 0) {
        for (var i = 0; i < d.type.length; i++) {
          if (d.type[i] && d.type[i].sponsor) {
            var arcSponsor = normalizeThemeKey(d.type[i].sponsor);
            if (normalizedSponsors[arcSponsor]) {
              return d.value * 1.5;  // Make matching arcs thicker
            }
          }
        }
      }
      return d.value;
    });

  // Fade other elements
  svg.selectAll(".linePNodes").style("stroke-opacity", 0.1);
  
  // Highlight author names that have publications from any sponsor in this category
  if (window.authorPubs && typeof window.authorPubs === 'object') {
    var authorsWithCategory = {};
    for (var authorName in window.authorPubs) {
      var pubs = window.authorPubs[authorName];
      for (var i = 0; i < pubs.length; i++) {
        if (pubs[i].sponsor) {
          var pubSponsor = normalizeThemeKey(pubs[i].sponsor);
          if (normalizedSponsors[pubSponsor]) {
            authorsWithCategory[authorName] = true;
            break;
          }
        }
      }
    }
    
    // Update nodeG fill-opacity
    svg.selectAll(".nodeG")
      .style("fill-opacity", function(d) {
        return authorsWithCategory[d.name] ? 1 : 0.1;
      });
  }
  
  // Highlight author names in the publications panel
  // Highlight all matching sponsors
  matchingSponsors.forEach(function(sponsor) {
    var normalizedSponsor = normalizeThemeKey(sponsor);
    highlightAuthorsWithSponsor(sponsor, normalizedSponsor);
  });
}

function highlightAuthorNamesOnVisualization(sponsorName, normalizedSponsor) {
  // Check if authorPubs is available
  if (!window.authorPubs || typeof window.authorPubs !== 'object') {
    return;
  }
  
  // Find which authors have publications from this sponsor
  var authorsWithSponsor = {};
  for (var authorName in window.authorPubs) {
    var pubs = window.authorPubs[authorName];
    for (var i = 0; i < pubs.length; i++) {
      if (pubs[i].sponsor) {
        var pubSponsor = normalizeThemeKey(pubs[i].sponsor);
        if (pubSponsor === normalizedSponsor) {
          authorsWithSponsor[authorName] = true;
          break;
        }
      }
    }
  }
  
  // Highlight author name text elements on the visualization
  svg.selectAll(".nodeText")
    .each(function() {
      var textEl = d3.select(this);
      var nodeG = d3.select(this.parentNode);
      var nodeData = nodeG.datum();
      var isMatch = nodeData && authorsWithSponsor[nodeData.name];
      
      if (isMatch) {
        // For matching authors: bold, black, full opacity
        textEl
          .style("opacity", 1)
          .style("font-weight", "bold")
          .attr("fill", "#000000")
          .style("fill", "#000000")
          .style("color", "#000000");
      } else {
        // For non-matching authors: normal weight, black (will be faded by opacity)
        textEl
          .style("opacity", 0.2)
          .style("font-weight", "normal")
          .attr("fill", "#000000")
          .style("fill", "#000000")
          .style("color", "#000000");
      }
    });
}

function highlightAuthorsWithSponsor(sponsorName, normalizedSponsor) {
  // Check if authorPubs is available (defined in main.js)
  if (!window.authorPubs || typeof window.authorPubs !== 'object') {
    console.warn('authorPubs not available yet');
    return;
  }
  
  // Find which authors have publications from this sponsor
  var authorsWithSponsor = {};
  for (var authorName in window.authorPubs) {
    var pubs = window.authorPubs[authorName];
    for (var i = 0; i < pubs.length; i++) {
      if (pubs[i].sponsor) {
        var pubSponsor = normalizeThemeKey(pubs[i].sponsor);
        if (pubSponsor === normalizedSponsor) {
          authorsWithSponsor[authorName] = true;
          break;
        }
      }
    }
  }
  
  // Apply highlighting to author names in the panel
  var authorTitles = document.querySelectorAll('.pub-group__title');
  authorTitles.forEach(function(titleEl) {
    var titleText = titleEl.textContent;
    // Extract author name (format is "Name (count)" or "Name - Publications (count)")
    var authorName = titleText.split('(')[0].trim();
    authorName = authorName.replace(' - Publications', '').trim();
    
    if (authorsWithSponsor[authorName]) {
      titleEl.classList.add('highlighted');
      titleEl.classList.remove('faded');
    } else {
      titleEl.classList.add('faded');
      titleEl.classList.remove('highlighted');
    }
  });
}

function resetArcHighlight() {
  svg.selectAll(".linkArc")
    .style("stroke-opacity", 1)
    .style("stroke-width", function(d) { return d.value; });
  
  svg.selectAll(".linePNodes").style("stroke-opacity", 1);
  svg.selectAll(".nodeG").style("fill-opacity", 1);
  
  // Reset author name text styles on the visualization
  svg.selectAll(".nodeText")
    .style("opacity", 1)
    .style("font-weight", function(d) {
      // Check if this was a search term
      var nodeG = d3.select(this.parentNode);
      var nodeData = nodeG.datum();
      return (nodeData && nodeData.isSearchTerm) ? "bold" : "normal";
    })
    .attr("fill", "#000000") // Reset to black
    .style("fill", "#000000"); // Reset to black
  
  // Reset author name highlighting in the panel
  var authorTitles = document.querySelectorAll('.pub-group__title');
  authorTitles.forEach(function(titleEl) {
    titleEl.classList.remove('highlighted');
    titleEl.classList.remove('faded');
  });
}


function removeColorLegend() {
 svg.selectAll(".nodeLegend").remove();
 svg.selectAll(".themeLegend").remove();
 svg.selectAll(".themeLegendContainer").remove();
 svg.select("#legend-clip").remove();
 // Also clear the HTML legend container
 var legendContainerDiv = document.getElementById('legend-container');
 if (legendContainerDiv) {
   legendContainerDiv.innerHTML = '';
 }
}
function drawTimeLegend() {
  // Display timeline markers for each year (at January 1st of each year)
  for (var yearIdx = minYear; yearIdx <= maxYear; yearIdx++) {
    // Calculate day offset from minDate to January 1st of this year
    var yearDate = new Date(yearIdx, 0, 1);  // January 1st
    var dayOffset = Math.floor((yearDate - minDate) / (1000 * 60 * 60 * 24));
    var xx = xStep + xScale(dayOffset);

    svg.append("line")
      .style("stroke", "#00a")
      .style("stroke-dasharray", ("1, 2"))
      .style("stroke-opacity", 1)
      .style("stroke-width", 0.2)
      .attr("x1", function(d){ return xx; })
      .attr("x2", function(d){ return xx; })
      .attr("y1", function(d){ return 0; })
      .attr("y2", function(d){ return height; });

    svg.append("text")
      .attr("class", "timeLegend")
      .style("fill", "#000")
      .style("text-anchor","start")
      .style("text-shadow", "1px 1px 0 rgba(255, 255, 255, 0.6")
      .attr("x", xx)
      .attr("y", height-5)
      .attr("dy", ".21em")
      .attr("font-family", "sans-serif")
      .attr("font-size", "12px")
      .style("font-weight", "bold")
      .text(yearIdx);
  }
}  

function getColor(category) {
  if (!category) return "#666666";

  var cat = normalizeThemeKey(category.toString().trim());
  if (themeAliasMap[cat]) {
    cat = themeAliasMap[cat];
  }
  if (!cat) return "#666666";

  if (themeColorCache[cat]) {
    return themeColorCache[cat];
  }

  var assignedColor = assignThemeColor(cat);
  themeColorCache[cat] = assignedColor;
  return assignedColor;
}

// Get the group color for a sponsor
// Returns the color of the group this sponsor belongs to, or the sponsor's color if no group match
function getGroupColor(sponsor) {
  if (!sponsor) return "#666666";
  
  // Get the sponsor's color
  var sponsorColor = getColor(sponsor);
  
  // If legendConfig is available, find which group has this color
  if (legendConfig) {
    for (var groupName in legendConfig) {
      if (legendConfig[groupName].color === sponsorColor) {
        return sponsorColor; // Return the group color
      }
    }
  }
  
  // If no group match, return the sponsor's color
  return sponsorColor;
}

function assignThemeColor(cat) {
  var color;
  if (themeColorAssignmentCount < themePalette.length) {
    color = themePalette[themeColorAssignmentCount];
  }
  else {
    color = colorFromHash(cat + themeColorAssignmentCount);
  }
  themeColorAssignmentCount++;
  return color;
}

function colorFromHash(value) {
  var hash = 0;
  for (var i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0; // convert to 32bit int
  }
  var hue = Math.abs(hash) % 360;
  return "hsl(" + hue + ",65%,50%)";
}

function colorFaded(d) {
  var minSat = 80;
  var maxSat = 200;
  var step = (maxSat-minSat)/maxDepth;
  var sat = Math.round(maxSat-d.depth*step);
 
  //console.log("maxDepth = "+maxDepth+"  sat="+sat+" d.depth = "+d.depth+" step="+step);
  return d._children ? "rgb("+sat+", "+sat+", "+sat+")"  // collapsed package
    : d.children ? "rgb("+sat+", "+sat+", "+sat+")" // expanded package
    : "#aaaacc"; // leaf node
}


function getBranchingAngle1(radius3, numChild) {
  if (numChild<=2){
    return Math.pow(radius3,2);
  }  
  else
    return Math.pow(radius3,1);
 } 

function getRadius(d) {
 // console.log("scaleCircle = "+scaleCircle +" scaleRadius="+scaleRadius);
return d._children ? scaleCircle*Math.pow(d.childCount1, scaleRadius)// collapsed package
      : d.children ? scaleCircle*Math.pow(d.childCount1, scaleRadius) // expanded package
      : scaleCircle;
     // : 1; // leaf node
}


function childCount1(level, n) {
    count = 0;
    if(n.children && n.children.length > 0) {
      count += n.children.length;
      n.children.forEach(function(d) {
        count += childCount1(level + 1, d);
      });
      n.childCount1 = count;
    }
    else{
       n.childCount1 = 0;
    }
    return count;
};

function childCount2(level, n) {
    var arr = [];
    if(n.children && n.children.length > 0) {
      n.children.forEach(function(d) {
        arr.push(d);
      });
    }
    arr.sort(function(a,b) { return parseFloat(a.childCount1) - parseFloat(b.childCount1) } );
    var arr2 = [];
    arr.forEach(function(d, i) {
        d.order1 = i;
        arr2.splice(arr2.length/2,0, d);
    });
    arr2.forEach(function(d, i) {
        d.order2 = i;
        childCount2(level + 1, d);
        d.idDFS = nodeDFSCount++;   // this set DFS id for nodes
    });

};

d3.select(self.frameElement).style("height", diameter + "px");




// Toggle children on click.
function click(d) {
/*  if (d3.event.defaultPrevented) return; // ignore drag
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
  console.log("Clicking on = "+d.name+ " d.depth = "+d.depth);
  
 update();*/
}

/*
function collide(alpha) {
  var quadtree = d3.geom.quadtree(tree_nodes);
  return function(d) {
    quadtree.visit(function(quad, x1, y1, x2, y2) {
    if (quad.point && (quad.point !== d) && (quad.point !== d.parent) && (quad.point.parent !== d)) {
         var rb = getRadius(d) + getRadius(quad.point),
        nx1 = d.x - rb,
        nx2 = d.x + rb,
        ny1 = d.y - rb,
        ny2 = d.y + rb;

        var x = d.x - quad.point.x,
            y = d.y - quad.point.y,
            l = Math.sqrt(x * x + y * y);
          if (l < rb) {
          l = (l - rb) / l * alpha;
          d.x -= x *= l;
          d.y -= y *= l;
          quad.point.x += x;
          quad.point.y += y;
        }
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    });
  };
}
*/
