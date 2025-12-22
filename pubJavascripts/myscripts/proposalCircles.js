// Proposal Circles Visualization
// Displays proposal counts as circles, sized by count and colored by sponsor group
// Larger circles are drawn below to prevent covering smaller ones

// Global variables for circle visualization
var circleRadiusScale;
var proposalCirclesGroup;

/**
 * Find all proposals matching author, sponsor group, and day offset
 */
function findProposalsForCircle(authorName, groupName, dayOffset) {
    var matchingProposals = [];
    
    if (!data || !data.length) {
        return matchingProposals;
    }
    
    // Iterate through all proposals
    for (var i = 0; i < data.length; i++) {
        var proposal = data[i];
        
        // Skip rows with missing or invalid date_submitted
        if (!proposal.date_submitted || proposal.date_submitted.length < 10) {
            continue;
        }
        
        // Calculate day offset for this proposal (same method as in main.js)
        var yearValue = parseInt(proposal.date_submitted.substring(0, 4));
        var monthValue = parseInt(proposal.date_submitted.substring(5, 7));
        var dayValue = parseInt(proposal.date_submitted.substring(8, 10));
        var pubDate = new Date(yearValue, monthValue - 1, dayValue);
        var proposalDayOffset = Math.floor((pubDate - minDate) / (1000 * 60 * 60 * 24));
        
        // Check if day offset matches
        if (proposalDayOffset !== dayOffset) {
            continue;
        }
        
        // Check if author is in the proposal
        if (!proposal.Authors) {
            continue;
        }
        var authors = proposal.Authors.split(",").map(function(a) { return a.trim(); });
        if (authors.indexOf(authorName) < 0) {
            continue;
        }
        
        // Check if sponsor belongs to the group
        var proposalSponsor = proposal.sponsor || "";
        var proposalGroup = getSponsorGroup(proposalSponsor);
        if (proposalGroup !== groupName) {
            continue;
        }
        
        // Add this proposal
        matchingProposals.push({
            proposal_no: proposal.proposal_no || "",
            title: proposal.title || "",
            date_submitted: proposal.date_submitted || "",
            sponsor: proposalSponsor,
            theme: proposal.theme || ""
        });
    }
    
    return matchingProposals;
}

/**
 * Create and show tooltip with proposal details
 */
function showProposalTooltip(d, proposals) {
    // Remove any existing tooltip
    d3.selectAll(".proposal-tooltip").remove();
    
    if (!proposals || proposals.length === 0) {
        return;
    }
    
    // Create tooltip container
    var tooltip = d3.select("body").append("div")
        .attr("class", "proposal-tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("padding", "10px")
        .style("box-shadow", "0 2px 8px rgba(0,0,0,0.2)")
        .style("z-index", "1000")
        .style("max-width", "500px")
        .style("max-height", "400px")
        .style("overflow-y", "auto")
        .style("font-family", "sans-serif")
        .style("font-size", "12px");
    
    // Add header
    var header = tooltip.append("div")
        .style("font-weight", "bold")
        .style("margin-bottom", "8px")
        .style("border-bottom", "1px solid #eee")
        .style("padding-bottom", "5px");
    
    header.append("span")
        .text(d.group + " - " + d.author);
    header.append("span")
        .style("margin-left", "10px")
        .style("color", "#666")
        .style("font-weight", "normal")
        .text("(" + proposals.length + " proposal" + (proposals.length > 1 ? "s" : "") + ")");
    
    // Add date
    if (proposals.length > 0 && proposals[0].date_submitted) {
        var dateStr = proposals[0].date_submitted;
        tooltip.append("div")
            .style("color", "#666")
            .style("font-size", "11px")
            .style("margin-bottom", "8px")
            .text(dateStr);
    }
    
    // Add proposal list
    var list = tooltip.append("div");
    
    proposals.forEach(function(p, i) {
        var item = list.append("div")
            .style("margin-bottom", "8px")
            .style("padding-bottom", "8px")
            .style("border-bottom", i < proposals.length - 1 ? "1px solid #f0f0f0" : "none");
        
        // Proposal number with sponsor color
        if (p.proposal_no) {
            item.append("span")
                .style("font-weight", "bold")
                .style("color", getColor(p.sponsor))
                .style("margin-right", "5px")
                .text(p.proposal_no);
        }
        
        // Title
        if (p.title) {
            item.append("span")
                .style("color", "#000")
                .text(p.title);
        }
    });
    
    // Position tooltip near the circle
    var tooltipWidth = 500;
    
    // Get SVG element and its position
    var svgElement = document.getElementById('chart');
    if (!svgElement) return;
    
    var svgRect = svgElement.getBoundingClientRect();
    
    // Convert circle position (SVG coordinates) to page coordinates
    var circleX = d.x;
    var circleY = d.y;
    
    // Get mouse position in page coordinates
    var mouseX = d3.event ? d3.event.pageX : (svgRect.left + circleX);
    var mouseY = d3.event ? d3.event.pageY : (svgRect.top + circleY);
    
    // Calculate tooltip height after it's been added to DOM
    var tooltipHeight = Math.min(400, tooltip.node().getBoundingClientRect().height);
    
    // Position tooltip to the right of the mouse/circle, or left if too close to edge
    var xPos = mouseX + 15;
    var yPos = mouseY - tooltipHeight / 2;
    
    // Adjust if tooltip would go off screen
    if (xPos + tooltipWidth > window.innerWidth) {
        xPos = mouseX - tooltipWidth - 15;
    }
    if (yPos < 0) {
        yPos = 10;
    }
    if (yPos + tooltipHeight > window.innerHeight) {
        yPos = window.innerHeight - tooltipHeight - 10;
    }
    
    tooltip.style("left", xPos + "px")
        .style("top", yPos + "px");
}

/**
 * Hide proposal tooltip
 */
function hideProposalTooltip() {
    d3.selectAll(".proposal-tooltip").remove();
}

/**
 * Render circles for all proposals, grouped by sponsor and day
 * Larger circles (more proposals) are drawn first to prevent covering smaller circles
 */
function renderProposalCircles() {
    try {
        // Remove existing circles
        if (svg) {
            svg.selectAll(".proposal-circle").remove();
            svg.selectAll(".proposal-circles-group").remove();
        }

        if (!sponsorGroups || sponsorGroups.length === 0 || !pNodes || pNodes.length === 0) {
            console.log("Skipping circle rendering: no sponsor groups or nodes");
            return;
        }

        // Create a group for circles (below arcs, above timeline markers)
        proposalCirclesGroup = svg.insert("g", ".linkArcGroup")
            .attr("class", "proposal-circles-group");

        // Collect all circle data points
        var allCircles = [];

        pNodes.forEach(function(node) {
            if (!node.sponsorGroupsData) {
                console.warn("Node missing sponsorGroupsData:", node.name);
                return;
            }

            // For each sponsor group
            sponsorGroups.forEach(function(groupName) {
                if (!node.sponsorGroupsData[groupName]) {
                    return;
                }

                var groupData = node.sponsorGroupsData[groupName];
                var groupColor = sponsorGroupColors[groupName] || "#999";

                // For each day (numYear now represents total days)
                for (var dayOffset = 0; dayOffset < numYear; dayOffset++) {
                    if (!groupData[dayOffset] || !groupData[dayOffset].value || groupData[dayOffset].value === 0) {
                        continue;
                    }

                    var count = groupData[dayOffset].value;
                    
                    // Find matching proposals for this circle
                    var proposals = findProposalsForCircle(node.name, groupName, dayOffset);

                    allCircles.push({
                        author: node.name,
                        authorNode: node,
                        group: groupName,
                        dayOffset: dayOffset,
                        count: count,
                        color: groupColor,
                        x: xStep + xScale(dayOffset),
                        y: node.y,
                        proposals: proposals  // Store proposals with circle data
                    });
                }
            });
        });

        // Create radius scale (larger circles for more proposals)
        // Use sqrt scale for area proportionality: radius = baseRadius * sqrt(count)
        // This ensures circle area is proportional to count without arbitrary max
        var baseRadius = 2.5; // Base radius in pixels
        circleRadiusScale = function(count) {
            return baseRadius * Math.sqrt(count);
        };

        // Sort circles by count descending (larger circles drawn first, appear below)
        allCircles.sort(function(a, b) {
            return b.count - a.count; // Descending order
        });

        console.log("Rendering", allCircles.length, "proposal circles");

        // Render circles with animation
        var circles = proposalCirclesGroup.selectAll(".proposal-circle")
            .data(allCircles)
            .enter()
            .append("circle")
            .attr("class", "proposal-circle")
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .attr("r", 0)  // Start with radius 0 for animation
            .attr("data-author", function(d) { return d.author; })
            .attr("data-group", function(d) { return d.group; })
            .attr("data-count", function(d) { return d.count; })
            .style("fill", function(d) { return d.color; })
            .style("fill-opacity", 0)  // Start invisible
            .style("stroke", "none")
            .style("stroke-width", 0)
            .on("mouseover", function(d) {
                d3.select(this)
                    .style("fill-opacity", 0.95)
                    .style("stroke", d.color)
                    .style("stroke-width", 1.5);
                
                // Show tooltip with all proposals
                if (d.proposals && d.proposals.length > 0) {
                    showProposalTooltip(d, d.proposals);
                }
            })
            .on("mouseout", function(d) {
                // Hide tooltip
                hideProposalTooltip();
                
                // Check if this circle belongs to a currently hovered author
                var currentAuthor = d3.select(this).attr("data-author");
                var isHighlighted = false;

                // Check if any nodeG is currently being hovered
                svg.selectAll(".nodeText").each(function() {
                    var textNode = d3.select(this.parentNode).datum();
                    if (textNode && textNode.name === currentAuthor) {
                        var nodeOpacity = d3.select(this.parentNode).style("fill-opacity");
                        if (parseFloat(nodeOpacity) > 0.5) {
                            isHighlighted = true;
                        }
                    }
                });

                if (!isHighlighted) {
                    d3.select(this)
                        .style("fill-opacity", 0.7)
                        .style("stroke", "none")
                        .style("stroke-width", 0);
                }
            });
        
        // Add title elements (fallback for browsers that don't support custom tooltip)
        circles.append("title")
            .text(function(d) {
                if (d.proposals && d.proposals.length > 0) {
                    var titles = d.proposals.map(function(p) {
                        return (p.proposal_no || "") + ": " + (p.title || "");
                    }).join("\n");
                    return d.group + " - " + d.author + "\n" + d.count + " proposal" + (d.count > 1 ? "s" : "") + "\n\n" + titles;
                }
                return d.group + " - " + d.author + "\n" + d.count + " proposal" + (d.count > 1 ? "s" : "");
            });
        
        // Animate circles growing to final size and fading in
        // Use a delay to start animation after the arcs begin animating
        circles.transition()
            .delay(300)  // Small delay so arcs start first
            .duration(800)  // Smooth animation over 800ms
            .attr("r", function(d) { return circleRadiusScale(d.count); })
            .style("fill-opacity", 0.7);

        console.log("Rendered", svg.selectAll(".proposal-circle").size(), "proposal circles");
    } catch (e) {
        console.error("Error rendering proposal circles:", e);
    }
}

/**
 * Update circle positions during node transitions
 * Called when nodes move (force layout, manual positioning, etc.)
 */
function updateProposalCircles(durationTime) {
    if (!pNodes || pNodes.length === 0 || !sponsorGroups || sponsorGroups.length === 0) {
        return;
    }

    try {
        // Update each circle's Y position based on its author's current position
        svg.selectAll(".proposal-circle")
            .transition()
            .duration(durationTime || 0)
            .attr("cy", function(d) {
                // Find the author's current Y position
                var authorName = d3.select(this).attr("data-author");
                for (var i = 0; i < pNodes.length; i++) {
                    if (pNodes[i].name === authorName) {
                        return pNodes[i].y;
                    }
                }
                return d.y; // Fallback to stored Y
            });
    } catch (e) {
        console.error("Error updating proposal circles:", e);
    }
}

/**
 * Highlight circles for a specific author (called on mouseover)
 */
function highlightAuthorCircles(authorName, connectedAuthors) {
    svg.selectAll(".proposal-circle")
        .style("fill-opacity", function() {
            var circleAuthor = d3.select(this).attr("data-author");

            // Hovered author's circles
            if (circleAuthor === authorName) {
                return 0.95;
            }

            // Connected authors' circles
            if (connectedAuthors && connectedAuthors[circleAuthor]) {
                return 0.6;
            }

            // Other circles
            return 0.15;
        })
        .style("stroke", function() {
            var circleAuthor = d3.select(this).attr("data-author");

            if (circleAuthor === authorName) {
                return d3.select(this).style("fill");
            }
            return "none";
        })
        .style("stroke-width", function() {
            var circleAuthor = d3.select(this).attr("data-author");

            if (circleAuthor === authorName) {
                return 1.5;
            }
            return 0;
        });
}

/**
 * Reset circle highlighting (called on mouseout)
 */
function resetCircleHighlight() {
    svg.selectAll(".proposal-circle")
        .style("fill-opacity", 0.7)
        .style("stroke", "none")
        .style("stroke-width", 0);
}
