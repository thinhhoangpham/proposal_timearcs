// StoryFlow Proposal Visualization
// True StoryFlow implementation with converging/diverging paths at collaboration nodes

(async function () {
    // ============ CONFIGURATION ============
    const config = {
        margin: { top: 50, right: 100, bottom: 50, left: 150 },
        sessionWidth: 150,
        authorSpacing: 20,
        bundleSpacing: 8,         // Tight spacing within a collaboration bundle
        bundleGap: 35,            // Gap between separate bundles/singles
        nodeRadius: 8,            // Fixed node size
        pathStrokeWidthMin: 1.5,
        pathStrokeWidthMax: 4,
        animationDuration: 1500,  // Slower, more dramatic animations
        animationDelay: 25        // More staggered entry between authors
    };

    const authorColors = [
        '#58a6ff', '#3fb950', '#f85149', '#a371f7', '#f0883e',
        '#56d4dd', '#db61a2', '#e3b341', '#79c0ff', '#ff7b72',
        '#7ee787', '#d2a8ff', '#ffa657', '#bc8cff', '#1f6feb',
        '#ec6547', '#39d353', '#f778ba', '#8957e5', '#54aeff',
        '#d29922', '#238636', '#2ea043', '#6e7681', '#484f58',
        '#8b949e', '#ff6b6b', '#1f6feb', '#a371f7', '#58a6ff'
    ];

    // ============ STATE MANAGEMENT ============
    let lockedAuthor = null;
    let activeThemes = new Set();
    let allThemesActive = true;

    // ============ DATA LOADING ============
    const [rawData, colorConfig] = await Promise.all([
        d3.tsv('data/proposal.tsv'),
        d3.json('../pubJavascripts/myscripts/sponsorsColors.json?' + new Date().getTime())
    ]);

    console.log('Loaded colorConfig:', colorConfig);

    // Process colors and legend
    const sponsorColors = colorConfig.sponsors || {};
    const legendConfig = colorConfig.legend || {};

    console.log('Legend Config Keys:', Object.keys(legendConfig));

    // Helper to normalize keys (matching TimeArcs logic)
    function normalizeKey(k) {
        if (!k) return "";
        return k
            .replace(/\s*&\s*/g, "/")
            .replace(/\s*\/\s*/g, "/")
            .replace(/\s{2,}/g, " ")
            .trim();
    }

    // Build color map using normalized keys
    const colorMap = new Map();
    Object.keys(sponsorColors).forEach(key => {
        colorMap.set(normalizeKey(key), sponsorColors[key]);
    });

    function getSponsorColor(sponsor) {
        if (!sponsor) return '#484f58';
        const key = normalizeKey(sponsor);
        return colorMap.get(key) || '#484f58';
    }

    // Update Legend
    // Update Legend
    drawColorLegend();

    function drawColorLegend() {
        const legendContainer = document.getElementById('legend-items');
        legendContainer.innerHTML = ''; // Clear existing

        if (Object.keys(legendConfig).length > 0) {
            // Create HTML structure for grouped legend with expand/collapse
            Object.keys(legendConfig).forEach(function (categoryName) {
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
                for (var sponsorName in sponsorColors) {
                    if (sponsorColors[sponsorName] === category.color) {
                        sponsorsInCategory.push(sponsorName);
                    }
                }
                sponsorsInCategory.sort(); // Alphabetical order

                // Create sponsors list container (initially hidden)
                var sponsorsList = document.createElement('div');
                sponsorsList.className = 'legend-sponsors-list';
                sponsorsList.style.cssText = 'display: none; padding-left: 20px;';

                // Add individual sponsors
                sponsorsInCategory.forEach(function (sponsorName) {
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
                    sponsorEntry.addEventListener('mouseover', function (e) {
                        e.stopPropagation(); // Prevent category hover
                        highlightArcsBySponsor(sponsorName);
                    });
                    sponsorEntry.addEventListener('mouseout', function (e) {
                        e.stopPropagation();
                        resetArcHighlight();
                    });

                    sponsorsList.appendChild(sponsorEntry);
                });

                // Add hover handlers to expand/collapse sponsors list
                groupContainer.addEventListener('mouseenter', function () {
                    sponsorsList.style.display = 'block';
                    arrow.style.transform = 'rotate(90deg)';
                    arrow.textContent = '▼';
                });

                groupContainer.addEventListener('mouseleave', function () {
                    sponsorsList.style.display = 'none';
                    arrow.style.transform = 'rotate(0deg)';
                    arrow.textContent = '▶';
                });

                // Add hover effects to highlight related arcs by category
                entry.addEventListener('mouseover', function (e) {
                    // Only trigger if not hovering over a sponsor
                    if (e.target.closest('.legend-sponsor')) return;
                    highlightArcsByCategory(categoryName, category.color);
                });
                entry.addEventListener('mouseout', function (e) {
                    if (e.target.closest('.legend-sponsor')) return;
                    resetArcHighlight();
                });

                groupContainer.appendChild(entry);
                groupContainer.appendChild(sponsorsList);
                legendContainer.appendChild(groupContainer);
            });
        }
    }

    function highlightArcsBySponsor(sponsorName) {
        const normalizedSponsor = normalizeKey(sponsorName);

        d3.selectAll('.proposal-band').classed('dimmed', true).classed('highlighted', false);
        d3.selectAll('.author-path').classed('dimmed', true).classed('highlighted', false);
        d3.selectAll('.author-start-label').classed('dimmed', true).classed('highlighted', false);

        // Find matching proposals
        const matchingProposals = proposals.filter(p => normalizeKey(p.sponsor) === normalizedSponsor);
        const matchingProposalIds = new Set(matchingProposals.map(p => p.id));
        const matchingAuthors = new Set();
        matchingProposals.forEach(p => p.authors.forEach(a => matchingAuthors.add(a)));

        // Highlight matching bands
        d3.selectAll('.proposal-band').each(function () {
            const id = d3.select(this).attr('data-proposal');
            if (matchingProposalIds.has(id)) {
                d3.select(this).classed('dimmed', false).classed('highlighted', true);
            }
        });

        // Highlight matching authors
        d3.selectAll('.author-path').each(function () {
            const author = d3.select(this).attr('data-author');
            if (matchingAuthors.has(author)) {
                d3.select(this).classed('dimmed', false).classed('highlighted', true);
            }
        });

        d3.selectAll('.author-start-label').each(function () {
            const author = d3.select(this).attr('data-author');
            if (matchingAuthors.has(author)) {
                d3.select(this).classed('dimmed', false).classed('highlighted', true);
            }
        });
    }

    function highlightArcsByCategory(categoryName, categoryColor) {
        // Find all sponsors in this category
        const matchingSponsors = new Set();
        Object.keys(sponsorColors).forEach(key => {
            if (sponsorColors[key] === categoryColor) {
                matchingSponsors.add(normalizeKey(key));
            }
        });

        d3.selectAll('.proposal-band').classed('dimmed', true).classed('highlighted', false);
        d3.selectAll('.author-path').classed('dimmed', true).classed('highlighted', false);
        d3.selectAll('.author-start-label').classed('dimmed', true).classed('highlighted', false);

        // Find matching proposals
        const matchingProposals = proposals.filter(p => matchingSponsors.has(normalizeKey(p.sponsor)));
        const matchingProposalIds = new Set(matchingProposals.map(p => p.id));
        const matchingAuthors = new Set();
        matchingProposals.forEach(p => p.authors.forEach(a => matchingAuthors.add(a)));

        // Highlight matching bands
        d3.selectAll('.proposal-band').each(function () {
            const id = d3.select(this).attr('data-proposal');
            if (matchingProposalIds.has(id)) {
                d3.select(this).classed('dimmed', false).classed('highlighted', true);
            }
        });

        // Highlight matching authors
        d3.selectAll('.author-path').each(function () {
            const author = d3.select(this).attr('data-author');
            if (matchingAuthors.has(author)) {
                d3.select(this).classed('dimmed', false).classed('highlighted', true);
            }
        });

        d3.selectAll('.author-start-label').each(function () {
            const author = d3.select(this).attr('data-author');
            if (matchingAuthors.has(author)) {
                d3.select(this).classed('dimmed', false).classed('highlighted', true);
            }
        });
    }

    function resetArcHighlight() {
        d3.selectAll('.proposal-band').classed('dimmed', false).classed('highlighted', false);
        d3.selectAll('.author-path').classed('dimmed', false).classed('highlighted', false);
        d3.selectAll('.author-start-label').classed('dimmed', false).classed('highlighted', false);
    }

    // Update Legend Title
    document.querySelector('.legend-title').textContent = 'Sponsors';

    const proposals = rawData.map(d => ({
        id: d.proposal_no,
        date: new Date(d.date_submitted),
        title: d.title.replace(/^"""|"""$/g, '').replace(/''/g, "'"),
        sponsor: d.sponsor,
        authors: d.Authors.split(',').map(a => a.trim()).filter(a => a.length > 0),
        credit: +d.credit || 0,
        total: +d.total || 0,
        theme: d.theme || ''
    })).filter(p => !isNaN(p.date.getTime()) && p.authors.length > 0);

    const authorProposalCount = new Map();
    proposals.forEach(p => {
        p.authors.forEach(a => {
            authorProposalCount.set(a, (authorProposalCount.get(a) || 0) + 1);
        });
    });

    const allAuthors = [...authorProposalCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(d => d[0]);

    const authorColorMap = new Map();
    allAuthors.forEach((author, i) => {
        authorColorMap.set(author, authorColors[i % authorColors.length]);
    });

    const maxProposals = d3.max([...authorProposalCount.values()]);
    const strokeWidthScale = d3.scaleLinear()
        .domain([1, maxProposals])
        .range([config.pathStrokeWidthMin, config.pathStrokeWidthMax]);

    console.log(`Proposals: ${proposals.length}, Authors: ${allAuthors.length}`);

    // ============ CREATE SESSIONS (by month) ============
    const proposalsByMonth = d3.group(proposals, d => d3.timeMonth(d.date).getTime());

    const proposalSessions = [...proposalsByMonth.entries()]
        .map(([timestamp, props]) => ({
            date: new Date(timestamp),
            proposals: props,
            groups: props.map(p => ({
                proposal: p,
                authors: p.authors.filter(a => allAuthors.includes(a))
            }))
        }))
        .sort((a, b) => a.date - b.date);

    // Add 3 padding sessions at the START for lead-in visibility
    const firstDate = proposalSessions[0]?.date || new Date();
    const paddingSessions = [];
    for (let i = 3; i >= 1; i--) {
        paddingSessions.push({
            date: d3.timeMonth.offset(firstDate, -i),
            proposals: [],
            groups: []
        });
    }

    // Combine padding + proposal sessions
    const sessions = [...paddingSessions, ...proposalSessions];

    // ============ AUTHOR LIFESPAN ============
    const authorStartSession = new Map();
    const authorEndSession = new Map();

    allAuthors.forEach(author => {
        const authorSessions = sessions.map((s, i) =>
            s.groups.some(g => g.authors.includes(author)) ? i : -1
        ).filter(i => i !== -1);

        if (authorSessions.length > 0) {
            authorStartSession.set(author, Math.max(0, authorSessions[0] - 3));
            authorEndSession.set(author, authorSessions[authorSessions.length - 1] + 12);
        } else {
            authorStartSession.set(author, 0);
            authorEndSession.set(author, sessions.length);
        }
    });

    // ============ TRUE STORYFLOW LAYOUT ============
    // Each author has a stable "home" Y position based on their rank
    // During lead-in (before first proposal), they stay at their home position
    // When collaborating, they converge to a shared Y position
    // After collaboration, they return toward their home positions

    // Assign each author a fixed "home" Y position based on their rank
    const authorHomeY = new Map();
    allAuthors.forEach((author, index) => {
        authorHomeY.set(author, index * config.authorSpacing);
    });

    function computeSessionLayout(session, sessionIndex, prevLayout) {
        const layout = new Map(); // author -> y position

        // 1. Identify which authors are active in this session (within their lifespan)
        const activeAuthorsThisSession = allAuthors.filter(author => {
            const start = authorStartSession.get(author);
            const end = authorEndSession.get(author);
            return sessionIndex >= start && sessionIndex <= end;
        });

        // 2. Build collaboration groups from proposals
        // Authors working on same proposal share the same Y
        const authorToCollabGroup = new Map(); // author -> group id
        const collabGroups = []; // [{authors: [], proposals: [], centerY: number}]
        let groupIdCounter = 0;

        session.groups.forEach(g => {
            if (g.authors.length === 0) return;

            // Check if any author is already in a group
            const existingGroupIds = g.authors
                .filter(a => authorToCollabGroup.has(a))
                .map(a => authorToCollabGroup.get(a));

            if (existingGroupIds.length > 0) {
                // Merge into existing group
                const groupId = existingGroupIds[0];
                const group = collabGroups[groupId];
                g.authors.forEach(author => {
                    if (!group.authors.includes(author)) {
                        group.authors.push(author);
                    }
                    authorToCollabGroup.set(author, groupId);
                });
                group.proposals.push(g.proposal);
            } else {
                // Create new group
                const groupId = groupIdCounter++;
                const group = {
                    authors: [...g.authors],
                    proposals: [g.proposal]
                };
                collabGroups.push(group);
                g.authors.forEach(author => authorToCollabGroup.set(author, groupId));
            }
        });

        // 3. Compute Y position for each collaboration group (average of authors' home positions)
        collabGroups.forEach(group => {
            // Use previous positions if available, otherwise home positions
            let sumY = 0;
            group.authors.forEach(author => {
                if (prevLayout && prevLayout.has(author)) {
                    sumY += prevLayout.get(author);
                } else {
                    sumY += authorHomeY.get(author);
                }
            });
            group.centerY = sumY / group.authors.length;
        });

        // 4. Assign Y positions
        // - Authors with proposals: position around group center WITH SEPARATION
        // - Authors without proposals: EASE BACK toward home position

        const returnToHomeRate = 0.3; // How fast to return to home
        const collabSpacing = 10; // Vertical separation between collaborating authors

        activeAuthorsThisSession.forEach(author => {
            if (authorToCollabGroup.has(author)) {
                // Author has a proposal this session
                const groupId = authorToCollabGroup.get(author);
                const group = collabGroups[groupId];

                if (group.authors.length === 1) {
                    // Solo author - just use center
                    layout.set(author, group.centerY);
                } else {
                    // Collaboration - position authors with vertical separation
                    // Sort authors by their home positions for consistent ordering
                    const sortedAuthors = [...group.authors].sort((a, b) =>
                        authorHomeY.get(a) - authorHomeY.get(b)
                    );
                    const authorIndex = sortedAuthors.indexOf(author);
                    const totalSpan = (group.authors.length - 1) * collabSpacing;
                    const startY = group.centerY - totalSpan / 2;
                    layout.set(author, startY + authorIndex * collabSpacing);
                }
            } else {
                // Author has no proposal this session - ease back toward home
                const homeY = authorHomeY.get(author);
                if (prevLayout && prevLayout.has(author)) {
                    const prevY = prevLayout.get(author);
                    const newY = prevY + (homeY - prevY) * returnToHomeRate;
                    layout.set(author, newY);
                } else {
                    layout.set(author, homeY);
                }
            }
        });

        // 5. Enforce minimum separation between non-collaborating authors
        const minSeparation = 15; // Minimum pixels between non-collaborating paths

        // Get list of authors and their Y positions, sorted by Y
        const authorYList = activeAuthorsThisSession
            .map(author => ({ author, y: layout.get(author) }))
            .sort((a, b) => a.y - b.y);

        // For each pair of adjacent authors, if they're not collaborating together,
        // push them apart if too close
        for (let i = 1; i < authorYList.length; i++) {
            const prev = authorYList[i - 1];
            const curr = authorYList[i];

            // Check if they're collaborating together this session
            const prevGroupId = authorToCollabGroup.get(prev.author);
            const currGroupId = authorToCollabGroup.get(curr.author);
            const sameCollab = prevGroupId !== undefined && prevGroupId === currGroupId;

            if (!sameCollab) {
                // They're not collaborating - enforce minimum separation
                const gap = curr.y - prev.y;
                if (gap < minSeparation) {
                    const needed = minSeparation - gap;
                    // Push apart equally
                    const pushEach = needed / 2;
                    authorYList[i - 1].y -= pushEach;
                    authorYList[i].y += pushEach;
                }
            }
        }

        // Apply the adjusted Y positions
        authorYList.forEach(({ author, y }) => layout.set(author, y));

        return { layout, collabGroups };
    }

    // Compute layouts for all sessions
    const sessionLayouts = [];
    let prevLayout = null;

    sessions.forEach((session, i) => {
        const result = computeSessionLayout(session, i, prevLayout);
        sessionLayouts.push({
            session,
            layout: result.layout,
            collabGroups: result.collabGroups
        });
        prevLayout = result.layout;
    });

    // ============ BUILD PATH DATA FOR EACH AUTHOR ============
    const authorPaths = new Map();

    allAuthors.forEach(author => {
        const pathPoints = [];

        sessionLayouts.forEach(({ session, layout, collabGroups }, sessionIndex) => {
            if (layout.has(author)) {
                // Find the group this author belongs to (if any)
                const group = collabGroups.find(g => g.authors.includes(author));

                pathPoints.push({
                    x: sessionIndex,
                    y: layout.get(author),
                    session: session,
                    group: group,
                    proposals: group ? group.proposals : []
                });
            }
        });

        if (pathPoints.length > 0) {
            authorPaths.set(author, pathPoints);
        }
    });

    // DEBUG: Check what we have
    console.log('sessionLayouts count:', sessionLayouts.length);
    console.log('First session layout entries:', sessionLayouts[0]?.layout?.size);
    console.log('authorPaths count:', authorPaths.size);
    console.log('First author path points:', authorPaths.get(allAuthors[0])?.length);

    // ============ DIMENSIONS ============
    const width = config.margin.left + config.margin.right + sessions.length * config.sessionWidth;
    const maxY = d3.max(sessionLayouts, sl => d3.max([...sl.layout.values()])) || 0;
    const height = config.margin.top + config.margin.bottom + maxY + 100;

    console.log('maxY:', maxY, 'height:', height, 'width:', width);

    // ============ SCALES ============
    const xScale = d3.scaleLinear()
        .domain([0, sessions.length - 1])
        .range([config.margin.left, width - config.margin.right]);

    const timeExtent = d3.extent(sessions, s => s.date);
    const timeScale = d3.scaleTime()
        .domain(timeExtent)
        .range([config.margin.left, width - config.margin.right]);

    const yOffset = config.margin.top + 20;

    // ============ CREATE SVG ============
    const svg = d3.select('#visualization')
        .attr('width', width)
        .attr('height', height);

    // ============ DRAW YEAR BACKGROUNDS ============
    const years = d3.timeYears(timeExtent[0], d3.timeYear.offset(timeExtent[1], 1));

    svg.append('g')
        .attr('class', 'year-backgrounds')
        .selectAll('rect')
        .data(years)
        .join('rect')
        .attr('class', 'year-band')
        .attr('x', d => timeScale(d))
        .attr('y', config.margin.top)
        .attr('width', d => Math.max(0, timeScale(d3.timeYear.offset(d, 1)) - timeScale(d)))
        .attr('height', height - config.margin.top - config.margin.bottom)
        .attr('fill', d => d.getFullYear() % 2 !== 0 ? 'rgba(0, 0, 0, 0.04)' : 'transparent');

    svg.append('g')
        .attr('class', 'year-labels')
        .selectAll('text')
        .data(years)
        .join('text')
        .attr('class', 'year-label')
        .attr('x', d => timeScale(d) + (timeScale(d3.timeYear.offset(d, 1)) - timeScale(d)) / 2)
        .attr('y', config.margin.top - 10)
        .attr('text-anchor', 'middle')
        .text(d => d.getFullYear());

    // ============ DRAW SESSION DIVIDERS ============
    svg.append('g')
        .attr('class', 'session-dividers')
        .selectAll('line')
        .data(sessions)
        .join('line')
        .attr('class', 'session-divider')
        .attr('x1', (d, i) => xScale(i))
        .attr('y1', config.margin.top - 20)
        .attr('x2', (d, i) => xScale(i))
        .attr('y2', height - config.margin.bottom);

    // ============ DRAW AUTHOR PATHS ============
    // Create bands group FIRST so bands appear BEHIND paths
    const bandsGroup = svg.append('g').attr('class', 'proposal-bands');

    const pathGenerator = d3.line()
        .x(d => xScale(d.x))
        .y(d => yOffset + d.y)
        .curve(d3.curveMonotoneX);  // Passes through all points - nodes will be on the path

    const pathsGroup = svg.append('g').attr('class', 'author-paths');

    // Store references to actual SVG path elements for sampling
    const authorPathElements = new Map();

    authorPaths.forEach((points, author) => {
        if (points.length < 1) return;

        const strokeWidth = strokeWidthScale(authorProposalCount.get(author) || 1);

        const path = pathsGroup.append('path')
            .datum(points)
            .attr('class', 'author-path')
            .attr('d', pathGenerator)
            .attr('fill', 'none')
            .attr('stroke', authorColorMap.get(author))
            .attr('stroke-width', strokeWidth)
            .attr('stroke-opacity', 0.8)
            .attr('data-author', author)
            .attr('data-stroke-width', strokeWidth)
            .style('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))')
            .on('mouseover', function (event) {
                if (!lockedAuthor) {
                    highlightAuthor(author, true);
                    showAuthorTooltip(event, author);
                }
            })
            .on('mouseout', function () {
                if (!lockedAuthor) {
                    highlightAuthor(author, false);
                    hideTooltip();
                }
            })
            .on('click', function (event) {
                event.stopPropagation();
                toggleLockedAuthor(author);
            });

        // Animate path drawing
        const totalLength = path.node().getTotalLength();
        path
            .attr('stroke-dasharray', totalLength)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(config.animationDuration * 2)
            .delay(allAuthors.indexOf(author) * config.animationDelay)
            .ease(d3.easeQuadOut)
            .attr('stroke-dashoffset', 0);

        // Store reference for sampling
        authorPathElements.set(author, path.node());
    });

    console.log('Paths drawn:', pathsGroup.selectAll('path').size());

    // ============ DRAW AUTHOR START LABELS ============
    const labelsGroup = svg.append('g').attr('class', 'author-labels');

    authorPaths.forEach((points, author) => {
        if (points.length === 0) return;

        const firstPoint = points[0];
        labelsGroup.append('text')
            .attr('class', 'author-start-label')
            .attr('x', xScale(firstPoint.x) - 8)
            .attr('y', yOffset + firstPoint.y)
            .attr('data-author', author)
            .text(author)
            .style('opacity', 0)
            .on('mouseover', function (event) {
                if (!lockedAuthor) highlightAuthor(author, true);
            })
            .on('mouseout', function () {
                if (!lockedAuthor) highlightAuthor(author, false);
            })
            .on('click', function (event) {
                event.stopPropagation();
                toggleLockedAuthor(author);
            })
            .transition()
            .duration(config.animationDuration)
            .delay(allAuthors.indexOf(author) * config.animationDelay + config.animationDuration)
            .style('opacity', 1);
    });

    // ============ DRAW PROPOSAL BANDS (nested - larger outside, smaller inside) ============
    // (bandsGroup was created earlier, before pathsGroup, so bands appear behind paths)
    const tooltip = d3.select('#tooltip');

    // Band dimensions - shorter width for cleaner look
    const bandWidth = config.sessionWidth * 0.35;
    const baseBandHeight = 12;
    const bandPadding = 6;

    // First, collect all band data
    const bandData = [];

    proposals.forEach((proposal, proposalIndex) => {
        const proposalDate = d3.timeMonth(proposal.date);
        const sessionIndex = sessions.findIndex(s =>
            s.date.getTime() === proposalDate.getTime()
        );

        if (sessionIndex === -1) return;

        const sessionData = sessionLayouts[sessionIndex];
        if (!sessionData) return;

        const { layout } = sessionData;

        const authorsInLayout = proposal.authors.filter(a => layout.has(a));
        if (authorsInLayout.length !== proposal.authors.length) return;

        const color = getSponsorColor(proposal.sponsor);
        const isCollaboration = proposal.authors.length > 1;

        // Calculate band center and height
        const authorYs = authorsInLayout.map(a => layout.get(a));
        const minY = Math.min(...authorYs);
        const maxY = Math.max(...authorYs);
        const centerY = yOffset + (minY + maxY) / 2;

        let bandHeight;
        if (isCollaboration) {
            bandHeight = (maxY - minY) + bandPadding * 2;
        } else {
            bandHeight = baseBandHeight;
        }

        bandData.push({
            proposal,
            proposalIndex,
            sessionIndex,
            centerY,
            bandHeight,
            color,
            isCollaboration,
            authorsInLayout
        });
    });

    // Sort by band height DESCENDING (largest first, so they draw in the back)
    bandData.sort((a, b) => b.bandHeight - a.bandHeight);

    // Cache path lengths for performance
    const pathLengthCache = new Map();
    authorPathElements.forEach((pathEl, author) => {
        pathLengthCache.set(author, pathEl.getTotalLength());
    });

    // Helper: Get Y from actual SVG path at a given screen X coordinate
    // Uses binary search on getPointAtLength to find the point on the curve
    function getAuthorYAtScreenX(author, targetX) {
        const pathEl = authorPathElements.get(author);
        if (!pathEl) return null;

        const totalLength = pathLengthCache.get(author);
        if (!totalLength || totalLength === 0) return null;

        // Binary search to find the point at targetX
        let low = 0, high = totalLength;
        let bestPoint = pathEl.getPointAtLength(0);

        for (let iter = 0; iter < 12; iter++) {  // Reduced from 20 to 12 for speed
            const mid = (low + high) / 2;
            const point = pathEl.getPointAtLength(mid);
            bestPoint = point;

            if (Math.abs(point.x - targetX) < 1) break;  // Relaxed precision

            if (point.x < targetX) {
                low = mid;
            } else {
                high = mid;
            }
        }

        return bestPoint.y;
    }

    // Create area generator with same curve as paths
    const bandAreaGenerator = d3.area()
        .x(d => d.x)
        .y0(d => d.y0)  // top edge
        .y1(d => d.y1)  // bottom edge
        .curve(d3.curveMonotoneX);

    // Draw bands (largest first, so smaller ones appear on top/inside)
    bandData.forEach((data, drawIndex) => {
        const { proposal, proposalIndex, sessionIndex, centerY, bandHeight, color, isCollaboration, authorsInLayout } = data;

        // Use exact date for X position (day precision)
        const bandCenterX = timeScale(proposal.date);
        const halfWidth = bandWidth / 2;

        // Sample fewer points - 5 samples is enough for smooth curved edges
        const numSamples = 5;
        const samplePoints = [];

        for (let i = 0; i <= numSamples; i++) {
            const t = i / numSamples;
            const screenX = bandCenterX - halfWidth + t * bandWidth;

            // Get Y values for all authors at this screen X from actual SVG paths
            const authorYs = authorsInLayout.map(a => {
                const y = getAuthorYAtScreenX(a, screenX);
                return y !== null ? y : centerY;
            });

            const topY = Math.min(...authorYs);
            const bottomY = Math.max(...authorYs);

            if (isCollaboration) {
                samplePoints.push({
                    x: screenX,
                    y0: topY - bandPadding,
                    y1: bottomY + bandPadding
                });
            } else {
                // Solo: fixed height centered on author
                samplePoints.push({
                    x: screenX,
                    y0: topY - baseBandHeight / 2,
                    y1: bottomY + baseBandHeight / 2
                });
            }
        }

        bandsGroup.append('path')
            .attr('class', 'proposal-band' + (isCollaboration ? ' collaboration-band' : ''))
            .attr('d', bandAreaGenerator(samplePoints))
            .attr('fill', color)
            .attr('fill-opacity', 0.2)
            .attr('stroke', color)
            .attr('stroke-width', isCollaboration ? 2 : 1.5)
            .attr('data-proposal', proposal.id)
            .attr('data-theme', proposal.theme)
            .attr('data-authors', proposal.authors.join(','))
            .style('opacity', 0)
            .on('mouseover', function (event) {
                d3.select(this).attr('fill-opacity', 0.45);
                showProposalTooltip(event, proposal, { authors: proposal.authors });
                highlightProposal(proposal.id, true);
            })
            .on('mouseout', function () {
                d3.select(this).attr('fill-opacity', 0.2);
                hideTooltip();
                highlightProposal(proposal.id, false);
            })
            .transition()
            .duration(config.animationDuration / 2)
            .delay(drawIndex * 3 + config.animationDuration)
            .style('opacity', 1);
    });

    // ============ TOOLTIP FUNCTIONS ============
    function showProposalTooltip(event, proposal, bundle) {
        const formatCurrency = d => '$' + d3.format(',.0f')(d);
        const formatPercent = d3.format('.0%');
        const formatDate = d3.timeFormat('%B %d, %Y');

        const isCollab = bundle && bundle.isCollaboration;

        tooltip.html(`
            <div class="tooltip-title">${proposal.title}</div>
            ${isCollab ? '<div class="tooltip-collab-badge">👥 Collaboration</div>' : ''}
            <div class="tooltip-row">
                <span>Date:</span>
                <span>${formatDate(proposal.date)}</span>
            </div>
            <div class="tooltip-row">
                <span>Funding:</span>
                <span>${formatCurrency(proposal.total)}</span>
            </div>
            <div class="tooltip-row">
                <span>Credit:</span>
                <span>${formatPercent(proposal.credit)}</span>
            </div>
            <div class="tooltip-row">
                <span>Sponsor:</span>
                <span>${proposal.sponsor}</span>
            </div>
            <div class="tooltip-authors">
                <strong>Authors:</strong> ${proposal.authors.join(', ')}
            </div>
            ${proposal.theme ? `<div class="tooltip-theme" style="background: ${getSponsorColor(proposal.sponsor)};">${proposal.theme}</div>` : ''}
        `)
            .style('left', Math.min(event.pageX + 15, window.innerWidth - 400) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .classed('visible', true);
    }

    function showAuthorTooltip(event, author) {
        const count = authorProposalCount.get(author) || 0;
        const authorProps = proposals.filter(p => p.authors.includes(author));
        const collabCount = authorProps.filter(p => p.authors.length > 1).length;
        const totalAttributedFunding = d3.sum(authorProps, p => p.total * p.credit);
        const themes = [...new Set(authorProps.map(p => p.theme).filter(t => t))];

        tooltip.html(`
            <div class="tooltip-title">${author}</div>
            <div class="tooltip-row">
                <span>Proposals:</span>
                <span>${count}</span>
            </div>
            <div class="tooltip-row">
                <span>Collaborations:</span>
                <span>${collabCount}</span>
            </div>
            <div class="tooltip-row">
                <span>Total Credit:</span>
                <span>$${d3.format(',.0f')(totalAttributedFunding)}</span>
            </div>
            <div class="tooltip-row">
                <span>Themes:</span>
                <span>${themes.length}</span>
            </div>
            <div class="tooltip-hint">Click to lock highlight</div>
        `)
            .style('left', Math.min(event.pageX + 15, window.innerWidth - 300) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .classed('visible', true);
    }

    function hideTooltip() {
        tooltip.classed('visible', false);
    }

    // ============ HIGHLIGHT FUNCTIONS ============
    function highlightAuthor(author, highlight) {
        if (highlight) {
            // Get all proposals this author is involved in
            const authorProposals = proposals.filter(p => p.authors.includes(author));
            const authorProposalIds = new Set(authorProposals.map(p => p.id));

            // Get all collaborators (authors who worked with this author)
            const collaborators = new Set([author]);
            authorProposals.forEach(p => {
                p.authors.forEach(a => collaborators.add(a));
            });

            // Dim/hide all author paths except selected author and collaborators
            d3.selectAll('.author-path').each(function () {
                const pathAuthor = d3.select(this).attr('data-author');
                if (collaborators.has(pathAuthor)) {
                    d3.select(this)
                        .classed('dimmed', false)
                        .classed('author-hidden', false)
                        .classed('highlighted', pathAuthor === author);
                } else {
                    d3.select(this)
                        .classed('dimmed', true)
                        .classed('author-hidden', true)
                        .classed('highlighted', false);
                }
            });

            // Hide all proposals except those involving this author
            d3.selectAll('.proposal-band').each(function () {
                const proposalId = d3.select(this).attr('data-proposal');
                if (authorProposalIds.has(proposalId)) {
                    d3.select(this)
                        .classed('dimmed', false)
                        .classed('proposal-hidden', false)
                        .classed('highlighted', true);
                } else {
                    d3.select(this)
                        .classed('dimmed', true)
                        .classed('proposal-hidden', true)
                        .classed('highlighted', false);
                }
            });

            // Dim/hide author labels
            d3.selectAll('.author-start-label').each(function () {
                const labelAuthor = d3.select(this).attr('data-author');
                if (collaborators.has(labelAuthor)) {
                    d3.select(this)
                        .classed('dimmed', false)
                        .classed('author-hidden', false)
                        .classed('highlighted', labelAuthor === author);
                } else {
                    d3.select(this)
                        .classed('dimmed', true)
                        .classed('author-hidden', true)
                        .classed('highlighted', false);
                }
            });
        } else {
            // Reset all visibility
            d3.selectAll('.author-path')
                .classed('dimmed', false)
                .classed('author-hidden', false)
                .classed('highlighted', false);
            d3.selectAll('.proposal-band')
                .classed('dimmed', false)
                .classed('proposal-hidden', false)
                .classed('highlighted', false);
            d3.selectAll('.author-start-label')
                .classed('dimmed', false)
                .classed('author-hidden', false)
                .classed('highlighted', false);
        }
    }

    function toggleLockedAuthor(author) {
        if (lockedAuthor === author) {
            lockedAuthor = null;
            highlightAuthor(author, false);
            hideTooltip();
            d3.select('body').classed('author-locked', false);
        } else {
            // If switching to a different author, first reset
            if (lockedAuthor) {
                highlightAuthor(lockedAuthor, false);
            }
            lockedAuthor = author;
            highlightAuthor(author, true);
            d3.select('body').classed('author-locked', true);
        }
    }

    function highlightProposal(proposalId, highlight) {
        d3.selectAll(`[data-proposal="${proposalId}"]`)
            .classed('proposal-highlighted', highlight);
    }

    svg.on('click', function () {
        if (lockedAuthor) {
            highlightAuthor(lockedAuthor, false);
            lockedAuthor = null;
            hideTooltip();
            d3.select('body').classed('author-locked', false);
        }
    });

    // ============ LEGEND (Handled at start) ============
    // Old theme filtering removed to match TimeArcs behavior

    console.log('StoryFlow visualization loaded with true convergence!');
    console.log(`Sessions: ${sessions.length}, Authors: ${allAuthors.length}, Proposals: ${proposals.length}`);

})();
