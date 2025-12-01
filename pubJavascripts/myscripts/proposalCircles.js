// Proposal Circles Visualization
// Displays proposal counts as circles, sized by count and colored by sponsor group
// Larger circles are drawn below to prevent covering smaller ones

// Global variables for circle visualization
var circleRadiusScale;
var proposalCirclesGroup;

/**
 * Render circles for all proposals, grouped by sponsor and month
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

                // For each month
                for (var month = 0; month < numYear; month++) {
                    if (!groupData[month] || !groupData[month].value || groupData[month].value === 0) {
                        continue;
                    }

                    var count = groupData[month].value;

                    allCircles.push({
                        author: node.name,
                        authorNode: node,
                        group: groupName,
                        month: month,
                        count: count,
                        color: groupColor,
                        x: xStep + xScale(month),
                        y: node.y
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
            })
            .on("mouseout", function(d) {
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
        
        // Add title elements
        circles.append("title")
            .text(function(d) {
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
