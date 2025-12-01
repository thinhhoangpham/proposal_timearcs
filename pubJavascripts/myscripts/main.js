//Constants for the SVG (full width, no left margin for legend)
var margin = {top: 0, right: 15, bottom: 5, left: 15};  // minimal margins
var chartEl = document.getElementById('chart');
var containerWidth = chartEl ? chartEl.clientWidth : document.body.clientWidth;
var width = containerWidth - margin.left - margin.right;
var height = 600 - margin.top - margin.bottom;
var fullWidth = containerWidth;  // SVG width matches container to prevent overflow

//---End Insert------

//Append a SVG to the chart container instead of body
var svg = d3.select("#chart").append("svg")
    .attr("width", fullWidth)  // Use container width to prevent overflow
    .attr("height", height)
    .attr("style", "overflow: hidden;");  // Ensure overflow is hidden

// Add clipping path to ensure arcs don't overflow beyond SVG bounds
var defs = svg.append("defs");
var clipPath = defs.append("clipPath")
    .attr("id", "chart-clip");
clipPath.append("rect")
    .attr("width", fullWidth)
    .attr("height", height);

var svg2 = d3.select("#chart").append("svg")
    .attr("width", width)
    .attr("height", 0);

var topTermMode = 0;

//Set up the force layout
//Set up the force layout
var force = d3.layout.force()
    .charge(-40)
    .linkDistance(40)
    .gravity(0.02)
    //.friction(0.5)
    .alpha(0.1)
    .size([width, height]);

/*
 var force = cola.d3adaptor()
    .linkDistance(30)
    .size([width, height]);
*/

var force2 = d3.layout.force()
    .charge(-80)
    .linkDistance(80)
    .gravity(0.08)
    .alpha(0.12)
    .size([width, height]);    

var node_drag = d3.behavior.drag()
        .on("dragstart", dragstart)
        .on("drag", dragmove)
        .on("dragend", dragend);

    function dragstart(d, i) {
        force.stop() // stops the force auto positioning before you start dragging
    }

    function dragmove(d, i) {
        d.px += d3.event.dx;
        d.py += d3.event.dy;
        d.x += d3.event.dx;
        d.y += d3.event.dy; 
    }

    function dragend(d, i) {
        d.fixed = true; // of course set the node to fixed so the force doesn't include the node in its auto positioning stuff
        force.resume();
    }

    function releasenode(d) {
        d.fixed = false; // of course set the node to fixed so the force doesn't include the node in its auto positioning stuff
        //force.resume();
    }


var data, data2;

// Using months instead of years for finer granularity
var minYear = 2018;
var minMonth = 1;  // January 2018
var maxYear = 2025;
var maxMonth = 12; // December 2025
var numYear = ((maxYear - minYear) * 12) + (maxMonth - minMonth) + 1; // Total months

var sourceList = {};
var numSource = {};
var maxCount = {}; // contain the max frequency for 4 categories

var nodes;
var numNode, numNode2;
var pNodes;  // Parent nodes array (top N authors)

var link;
var links;
var linkArcs;
var termArray, termArray, termArray;
var relationship;
var termMaxMax, termMaxMax2, termMaxMax3;
var terms;
var NodeG;
var nodeG;  // SVG group for node rendering
// Horizontal offset for time series start (minimal offset, timearcs span full width)
var xStep = 50;  // Small offset for labels/positioning on left
var xEndPadding = 150;  // Padding on right to prevent arc cutoff (increased for long arcs)
var xScale = d3.time.scale().range([0, (width - xStep - xEndPadding)/numYear]);
var yScale;
var linkScale;
var searchTerm ="";


 var nodes2 = [];
 var links2 = [];
var nodes2List = {};
var links2List = {};
var linePNodes ={};
    

// Base area for total proposals (optional, can be removed if only showing stacked groups)
var area = d3.svg.area()
        .interpolate("cardinal")
        .x(function(d) { return xStep+xScale(d.yearId); })
        .y0(function(d) { return d.yNode-yScale(d.value); })
        .y1(function(d) {  return d.yNode +yScale(d.value); });

// Dynamic area generators for sponsor groups (will be created in createSponsorGroupAreas)
     
var tip = d3.tip()
  .attr('class', 'd3-tip')
  .style('top', "200px")
  .style('left', function(d) { return "200px";  })
  .offset(function(d) {
    var a =[-10,0];
    a[0] =-10;
    a[1] = 0;
    return a;
  })
  .html(function(d) {
    return "<strong>Frequency:</strong> <span style='color:red'>" + d + "</span>";
  })
svg.call(tip);

var optArray = [];   // FOR search box

var numberInputTerms =0;
var listYear = [];
var authorPubs = {}; // author -> list of publication objects
window.authorPubs = authorPubs; // Make globally accessible for legend hover
var PANEL_MAX_ITEMS = 30; // cap N for hover view
var panelMode = 'all'; // 'all' | 'person'
var savedAllPanelScrollTop = 0; // remember scroll position of the all-authors view

// Clustering mode: 'connectivity' or 'theme'
var clusteringMode = 'connectivity';
var nodeThemes = {}; // Store theme information for each node

// Sponsor groups for streamgraph
var sponsorGroups = []; // Array of sponsor group names
var sponsorGroupColors = {}; // Map of group name to color

// Helper function to get sponsor group name from sponsor
function getSponsorGroup(sponsor) {
    if (!sponsor) return "Unknown";

    try {
        // Get the sponsor's color
        var sponsorColor = getColor(sponsor);

        // If legendConfig is available, find which group has this color
        if (typeof window !== 'undefined' && window.legendConfig) {
            for (var groupName in window.legendConfig) {
                if (window.legendConfig.hasOwnProperty(groupName) &&
                    window.legendConfig[groupName].color === sponsorColor) {
                    return groupName;
                }
            }
        }
    } catch (e) {
        console.warn("Error getting sponsor group for:", sponsor, e);
    }

    // If no group match, return "Other"
    return "Other";
}

// Initialize sponsor groups from legend config
function initializeSponsorGroups() {
    sponsorGroups = [];
    sponsorGroupColors = {};

    try {
        if (typeof window !== 'undefined' && window.legendConfig) {
            for (var groupName in window.legendConfig) {
                if (window.legendConfig.hasOwnProperty(groupName)) {
                    sponsorGroups.push(groupName);
                    sponsorGroupColors[groupName] = window.legendConfig[groupName].color;
                }
            }
        }

        // Fallback to default groups if no legend config or empty
        if (sponsorGroups.length === 0) {
            sponsorGroups = ["Unknown"];
            sponsorGroupColors["Unknown"] = "#999999";
        }
    } catch (e) {
        console.error("Error initializing sponsor groups:", e);
        // Fallback to default
        sponsorGroups = ["Unknown"];
        sponsorGroupColors["Unknown"] = "#999999";
    }
}

if (window.themeColorsPromise && typeof window.themeColorsPromise.then === "function") {
    window.themeColorsPromise.then(loadPublicationData);
}
else {
    loadPublicationData();
}

function loadPublicationData() {
    // Initialize sponsor groups
    initializeSponsorGroups();
    console.log("Initialized sponsor groups:", sponsorGroups.length, "groups");
    console.log("Sponsor group colors:", sponsorGroupColors);

d3.tsv("data/publication.tsv", function(error, data_) {
    if (error) throw error;
    data = data_;
    authorPubs = {}; // reset
    window.authorPubs = authorPubs; // Keep window reference in sync
    
    terms = new Object();
    termMaxMax = 1;
    var cccc = 0;
    data.forEach(function(d) {
        // Skip rows with missing or invalid date_submitted
        if (!d["date_submitted"] || d["date_submitted"].length < 10) {
            console.warn("Skipping row with invalid date_submitted:", d);
            return;
        }

        // Extract year and month from date_submitted (format: YYYY-MM-DD)
        var yearValue = parseInt(d["date_submitted"].substring(0, 4));
        var monthValue = parseInt(d["date_submitted"].substring(5, 7));
        // Calculate month offset from start date (minYear-minMonth)
        var year = ((yearValue - minYear) * 12) + (monthValue - minMonth);
        console.log("Time="+year + " (" + yearValue + "-" + monthValue + ")");

        // Use sponsor for color assignment
        if (d.sponsor) {
            getColor(d.sponsor);
        }

        d.year = year;
        //if (d.year<20) return; 
            
        numberInputTerms++;
             
        var list = d["Authors"].split(",");
        cccc++;
        for (var i=0; i<list.length;i++){
            var term = list[i];
            d[term] = 1;

            // Build per-author publication index (used by right panel)
            if (!authorPubs[term]) authorPubs[term] = [];
            authorPubs[term].push({
                proposal_no: d["proposal_no"],
                title: d.title,
                theme: d.theme,
                sponsor: d.sponsor,
                year: yearValue,
                authors: d["Authors"]
            });

            if (!terms[term]){
                terms[term] = new Object();
                terms[term].count = 1;
                terms[term].max = 0;
                terms[term].maxYear = -100;   // initialized negative
                terms[term].category = d.theme;

                // Initialize sponsor group tracking for streamgraph
                terms[term].sponsorGroups = {};
                sponsorGroups.forEach(function(groupName) {
                    terms[term].sponsorGroups[groupName] = {};
                });
            }
            else
                terms[term].count++;


            if (!terms[term][year]){
                terms[term][year] = 1;
            }
            else{
                terms[term][year] ++;
                if (terms[term][year]>terms[term].max){
                    terms[term].max = terms[term][year];
                    terms[term].maxYear = year;
                    if (terms[term].max>termMaxMax)
                        termMaxMax = terms[term].max;
                }
            }

            // Track proposals by sponsor group for streamgraph
            if (sponsorGroups && sponsorGroups.length > 0) {
                var sponsorGroup = getSponsorGroup(d.sponsor);
                if (!terms[term].sponsorGroups) {
                    terms[term].sponsorGroups = {};
                }
                if (!terms[term].sponsorGroups[sponsorGroup]) {
                    terms[term].sponsorGroups[sponsorGroup] = {};
                }
                if (!terms[term].sponsorGroups[sponsorGroup][year]) {
                    terms[term].sponsorGroups[sponsorGroup][year] = 1;
                } else {
                    terms[term].sponsorGroups[sponsorGroup][year]++;
                }
            }   
        }        
    });
    console.log("DONE reading the input file = "+data.length)
      
    readTermsAndRelationships();
    computeNodes();
    computeLinks();
 
   //force.linkStrength(function(l) {
   //     return 0.1;       
   // });
    
    force.linkDistance(function(l) {
        return (10*(l.m-1));  
    });
    
    /// The second force directed layout ***********
    for (var i=0;i<nodes.length;i++){
        var nod = nodes[i];
        if (!nodes2List[nod.name] && nodes2List[nod.name]!=0){
            var newNod = {};
            newNod.name = nod.name;
            newNod.id = nodes2.length;
            nodes2List[newNod.name] = newNod.id;
            nodes2.push(newNod);
        }
    }

    var selectedTime= {};
    var linksList = {}; list5={};
        selectedTime[20] = 1; linksList[20] = []; list5[20] ={};
        selectedTime[21] = 1; linksList[21] = []; list5[21] ={};
        selectedTime[22] = 1; linksList[22] = []; list5[22] ={};
        selectedTime[23] = 1; linksList[23] = []; list5[23] ={};
        selectedTime[24] = 1; linksList[24] = []; list5[24] ={};

    for (var i=0;i<links.length;i++){
        var l = links[i];
        var name1 = nodes[l.source].name;
        var name2 = nodes[l.target].name;
        var node1 = nodes2List[name1];
        var node2 = nodes2List[name2];
        if (!links2List[name1+"_"+name2] && links2List[name1+"_"+name2]!=0){
            var newl = {};
            newl.source = node1;
            newl.target = node2;
            newl.count = l.count;
            if (!newl[l.m]) 
                newl[l.m] = l.count;
            else
                newl[l.m] += l.count;
            
            if (list5[l.m]){
                list5[l.m][name1] =1;
                list5[l.m][name2] =1;
            }    

            links2List[name1+"_"+name2] =  links2.length; 
            links2.push(newl); 
        }
        else{
            var oldl = links2[links2List[name1+"_"+name2]];
            if (!oldl[l.m]) 
                oldl[l.m] = l.count;
            else
                oldl[l.m] += l.count;

            if (list5[l.m]){
                list5[l.m][name1] =1;
                list5[l.m][name2] =1;
            }

            oldl.count += l.count;
        }  
    }


    force.nodes(nodes)
        .links(links)
        .start(100,150,200);

   // force2.nodes(nodes2)
   //     .links(links2)
   //     .start();    


  var link2 = svg2.selectAll(".link2")
      .data(links2)
    .enter().append("line")
      .attr("class", "link2")
      .style("stroke",function(d) {
        if (d.count==1){
            return "#fbb";
        }
        else{
            return "#f00";
        }

      })
      .style("stroke-width", function(d) { return 0.5+0.75*linkScale(d.count); });

  var node2 = svg2.selectAll(".nodeText2")
    .data(nodes2)
    .enter().append("text")
        .attr("class", "nodeText2")  
        .text(function(d) { return d.name })           
        .attr("dy", ".35em")
        .style("fill","#000")
        .style("text-anchor","middle")
        .style("text-shadow", "1px 1px 0 rgba(255, 255, 255, 0.6")
        .style("font-weight", function(d) { return d.isSearchTerm ? "bold" : ""; })
        .attr("dy", ".21em")
        .attr("font-family", "sans-serif")
        .attr("font-size", "12px"); 





node2.append("title")
      .text(function(d) { return d.name; });

  force2.on("tick", function() {
    link2.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node2.attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; });
  });






    force.on("tick", function () {
        update();
    });
    force.on("end", function () {
        detactTimeSeries();
        // Populate default panel view when layout stabilizes
        renderPanelAll();
    });

    
    

    setupSliderScale(svg);
    drawColorLegend();
    drawTimeLegend();
  

    for (var i = 0; i < termArray.length; i++) {
        optArray.push(termArray[i].term);
    }
    optArray = optArray.sort();
    $(function () {
        $("#search").autocomplete({
            source: optArray
        });
    }); 
});
}

    function recompute() {
        var bar = document.getElementById('progBar'),
            fallback = document.getElementById('downloadProgress'),
            loaded = 0;

        var load = function() {
            loaded += 1;
            bar.value = loaded;

            /* The below will be visible if the progress tag is not supported */
            $(fallback).empty().append("HTML5 progress tag not supported: ");
            $('#progUpdate').empty().append(loaded + "% loaded");

            if (loaded == 100) {
                clearInterval(beginLoad);
                $('#progUpdate').empty().append("Complete");
            }
        };

        var beginLoad = setInterval(function() {load();}, 10);
        setTimeout(alertFunc, 333);
        
        function alertFunc() {
            readTermsAndRelationships();
            computeNodes();
            computeLinks()
            force.nodes(nodes)
                .links(links)
                .start();
        }
    } 

    function readTermsAndRelationships() {
        data2 = data.filter(function (d, i) {
           // if (d.year<20) return; 
            if (!searchTerm || searchTerm=="" ) {
                return d;
            }
            else if (d[searchTerm])
                return d;
        });

        console.log("data2="+data2.length);
        var selected  ={}
        if (searchTerm && searchTerm!=""){
            data2.forEach(function(d) {
                 for (var term1 in d) {
                    if (!selected[term1])
                        selected[term1] = {};
                    else{
                        if (!selected[term1].isSelected)
                            selected[term1].isSelected = 1;
                        else
                            selected[term1].isSelected ++;
                    }    
               }
            } );
        }


        var removeList = {};   // remove list **************

         

        termArray = [];
        for (var att in terms) {
            var e =  {};
            e.term = att;
            if (removeList[e.term] || (searchTerm && searchTerm!="" && !selected[e.term])) // remove list **************
                continue;

            /*
            var maxNet = 0;
            var maxYear = -1;
            for (var y=1; y<numYear;y++){
                if (terms[att][y]){
                    var previous = 0;
                    if (terms[att][y-1])
                        previous = terms[att][y-1];
                    var net = (terms[att][y]+1)/(previous+1);
                    if (net>maxNet){
                        maxNet=net;
                        maxYear = y;
                    }    
                }
            }*/
            var maxmaxmax = 0
            for (var i=0;i<numYear;i++){
                if (terms[att][i])
                    maxmaxmax+=terms[att][i]
             }

            e.count = terms[att].count;
            e.max = maxmaxmax;////terms[att].max;
            e.maxYear = terms[att].maxYear;
            e.category = terms[att].category;
            e.sponsorGroups = terms[att].sponsorGroups || {};   

            
            if (e.term==searchTerm){
                e.isSearchTerm = 1;
            }
              
            termArray.push(e);
        }
//        console.log("  termArray.length="+termArray.length) ; 
       
        if (!searchTerm)
            numberInputTerms = termArray.length;
        
       console.log("Finish ordering term by maxNet") ; 
        
        
       
    // Compute relationship **********************************************************
        numNode2 = termArray.length;
        relationship ={};
        relationshipMaxMax =0;
       // rrr ={};
        ttt ={};
        data2.forEach(function(d) { 
            var year = d.year;
            var list = d["Authors"].split(",").map(function(a) { return a.trim(); }); // Trim whitespace
            // Only count unique pairs once (i < j), exclude self-connections
            for (var i=0; i<list.length;i++){
                var term1 = list[i];
                for (var j=i+1; j<list.length;j++){  // j starts at i+1 to avoid self-connections and duplicates
                    var term2 = list[j];
                    // Use consistent ordering to avoid counting A->B and B->A separately
                    var key = term1 < term2 ? term1+"__"+term2 : term2+"__"+term1;
                    if (!relationship[key]){
                        relationship[key] = new Object();
                     //   rrr[key] = new Object();
                        ttt[key] = new Object();
                        relationship[key].max = 1;
                        relationship[key].maxYear =year;
                    }    
                    if (!relationship[key][year]){
                        relationship[key][year] = 1;
                  //      rrr[key][year] = {};
                        ttt[key][year] = [];
                        ttt[key][year].push({
                            proposal_no: d["proposal_no"],
                            theme: d.theme,
                            sponsor: d.sponsor
                        });
                    }
                    else{
                      //  if (!rrr[key][year][d["theme"]+"**"+d["title"].substring(0,10)]){
                            relationship[key][year]++;
                            ttt[key][year].push({
                                proposal_no: d["proposal_no"],
                                theme: d.theme,
                                sponsor: d.sponsor
                            });
                        
                            if (relationship[key][year]>relationship[key].max){
                                relationship[key].max = relationship[key][year];
                                relationship[key].maxYear =year; 
                                
                                if (relationship[key].max>relationshipMaxMax) // max over time
                                    relationshipMaxMax = relationship[key].max;
                            } 
                    //    } 
                    }

                }
            }
        });
        console.log("DONE computing realtionships relationshipMaxMax="+relationshipMaxMax);
    }
    

    function computeConnectivity(a, num) {
        for (var i=0; i<num;i++){
            a[i].isConnected=-100;
            a[i].isConnectedMaxYear= a[i].maxYear;
        }    
        
        for (var i=0; i<num;i++){
            var term1 =  a[i].term;
            for (var j=i+1; j<num;j++){
                var term2 =  a[j].term;
                // Use consistent ordering to match the key used in readTermsAndRelationships
                var key = term1 < term2 ? term1+"__"+term2 : term2+"__"+term1;
                if (relationship[key] && relationship[key].max>=valueSlider){
                    if (relationship[key].max> a[i].isConnected 
                        || (relationship[key].max == a[i].isConnected
                            && relationship[key].maxYear<a[i].isConnectedMaxYear)){
                        a[i].isConnected = relationship[key].max;
                        a[i].isConnectedMaxYear = relationship[key].maxYear;
                    }    
                    if (relationship[key].max> a[j].isConnected
                        || (relationship[key].max == a[j].isConnected
                            && relationship[key].maxYear<a[j].isConnectedMaxYear)){
                        a[j].isConnected = relationship[key].max;
                        a[j].isConnectedMaxYear = relationship[key].maxYear;
                    }   
                }
            }
        }
    }

    function computeNodes() {
        numNode0 = Math.min(200, termArray.length);
        console.log("termArray="+termArray.length);
        computeConnectivity(termArray, numNode0);
        
        
        termArray.sort(function (a, b) {
         if (a.isConnected < b.isConnected) {
            return 1;
          }
          else if (a.isConnected > b.isConnected) {
            return -1;
          }
          else{
                if (a.max < b.max) {
                    return 1;
                }
                else if (a.max > b.max) {
                    return -1;
                }
                else 
                return 0;
            }
        });   
      
        numNode = Math.min(50, termArray.length);
        computeConnectivity(termArray, numNode);
        nodes = [];
        for (var i=0; i<numNode;i++){
            var nod = new Object();
            nod.id = i;
            nod.group = termArray[i].category;
            nod.name = termArray[i].term;
            nod.max = termArray[i].max;
            var maxMonthRelationship = termArray[i].maxYear;
            nod.isConnectedMaxYear = termArray[i].isConnectedMaxYear;
            nod.maxYear = termArray[i].isConnectedMaxYear;
            nod.year = termArray[i].isConnectedMaxYear;
            nod.minY = 0;  // Initialize to prevent NaN errors
            nod.maxY = 0;  // Initialize to prevent NaN errors
            if (termArray[i].isSearchTerm){
                nod.isSearchTerm =1;
                if (!nod.year)
                    nod.year = termArray[i].maxYear;
                if (!nod.isConnectedMaxYear)
                    nod.isConnectedMaxYear = termArray[i].maxYear;
            }

            if (!maxCount[nod.group] || nod.max>maxCount[nod.group])
                maxCount[nod.group] = nod.max;

            if (termArray[i].isConnected>0)  // Only allow connected items
                nodes.push(nod);
        }
        numNode = nodes.length;
        
        console.log("numNode="+numNode);
        

        // compute the yearly data for streamgraph
        termMaxMax2 = 0;

        for (var i=0; i<numNode; i++){
            nodes[i].yearly = new Array(numYear);

            // Initialize sponsor group arrays for streamgraph
            nodes[i].sponsorGroupsData = {};
            if (sponsorGroups && sponsorGroups.length > 0) {
                sponsorGroups.forEach(function(groupName) {
                    nodes[i].sponsorGroupsData[groupName] = new Array(numYear);
                });
            }

            for (var y=0; y<numYear; y++){
                nodes[i].yearly[y] = new Object();

                // Total proposals for this year
                if (terms[nodes[i].name][y]){
                    nodes[i].yearly[y].value = terms[nodes[i].name][y];
                    if (nodes[i].yearly[y].value >termMaxMax2)
                         termMaxMax2 = nodes[i].yearly[y].value ;
                }
                else{
                    nodes[i].yearly[y].value = 0;
                }

                nodes[i].yearly[y].yearId = y;
                nodes[i].yearly[y].yNode = nodes[i].y;

                // Initialize sponsor group values for this year
                if (sponsorGroups && sponsorGroups.length > 0) {
                    sponsorGroups.forEach(function(groupName) {
                        if (!nodes[i].sponsorGroupsData[groupName]) {
                            nodes[i].sponsorGroupsData[groupName] = new Array(numYear);
                        }
                        if (!nodes[i].sponsorGroupsData[groupName][y]) {
                            nodes[i].sponsorGroupsData[groupName][y] = new Object();
                        }

                        // Get value for this sponsor group in this year
                        var groupValue = 0;
                        if (terms[nodes[i].name].sponsorGroups &&
                            terms[nodes[i].name].sponsorGroups[groupName] &&
                            terms[nodes[i].name].sponsorGroups[groupName][y]) {
                            groupValue = terms[nodes[i].name].sponsorGroups[groupName][y];
                        }

                        nodes[i].sponsorGroupsData[groupName][y].value = groupValue;
                        nodes[i].sponsorGroupsData[groupName][y].yearId = y;
                        nodes[i].sponsorGroupsData[groupName][y].yNode = nodes[i].y;

                        // Store in yearly for stacking
                        nodes[i].yearly[y][groupName] = groupValue;
                    });
                }
            }
        } 
        
        // Construct an array of only parent nodes
        pNodes = new Array(numNode);
        termMaxMax3 = 0;
        for (var i=0; i<numNode;i++){
            pNodes[i] = nodes[i];
            if (pNodes[i].max>termMaxMax3)
                termMaxMax3 = pNodes[i].max;
        }
       // drawStreamTerm(svg, pNodes, 100, 600);

    }    

    // Find strongly connected components using DFS
    function findConnectedComponents() {
        var componentId = 0;
        var visited = {};
        var components = {}; // componentId -> array of node indices
        
        function dfs(nodeIndex, compId) {
            if (visited[nodeIndex]) return;
            visited[nodeIndex] = true;
            
            if (!components[compId]) {
                components[compId] = [];
            }
            components[compId].push(nodeIndex);
            nodes[nodeIndex].componentId = compId;
            
            // Visit all connected nodes (only parent nodes for component detection)
            if (nodes[nodeIndex].connect) {
                for (var k = 0; k < nodes[nodeIndex].connect.length; k++) {
                    var connectedId = nodes[nodeIndex].connect[k];
                    // Only traverse parent nodes (not child nodes)
                    if (connectedId < numNode && 
                        (nodes[connectedId].parentNode === undefined || nodes[connectedId].parentNode < 0)) {
                        if (!visited[connectedId]) {
                            dfs(connectedId, compId);
                        }
                    }
                }
            }
        }
        
        // Find components starting from each unvisited parent node
        for (var i = 0; i < numNode; i++) {
            if (!visited[i] && (nodes[i].parentNode === undefined || nodes[i].parentNode < 0)) {
                dfs(i, componentId);
                componentId++;
            }
        }
        
        // Assign child nodes to their parent's component
        for (var i = numNode; i < nodes.length; i++) {
            if (nodes[i].parentNode !== undefined && nodes[i].parentNode >= 0) {
                var parentCompId = nodes[nodes[i].parentNode].componentId;
                if (parentCompId !== undefined) {
                    nodes[i].componentId = parentCompId;
                }
            }
        }
        
        // Ensure all nodes have a componentId (assign isolated nodes)
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].componentId === undefined) {
                nodes[i].componentId = componentId;
                if (!components[componentId]) {
                    components[componentId] = [];
                }
                components[componentId].push(i);
                componentId++;
            }
        }
        
        console.log("Found", Object.keys(components).length, "connected components");
        return components;
    }

    // Calculate theme information for each node based on their publications
    function calculateNodeThemes() {
        nodeThemes = {};

        for (var i = 0; i < numNode; i++) {
            var nodeName = nodes[i].name;
            nodeThemes[nodeName] = {};

            // Count themes from publications
            var pubs = authorPubs[nodeName] || [];
            for (var j = 0; j < pubs.length; j++) {
                var theme = pubs[j].theme;
                if (theme) {
                    if (!nodeThemes[nodeName][theme]) {
                        nodeThemes[nodeName][theme] = 0;
                    }
                    nodeThemes[nodeName][theme]++;
                }
            }
        }

        console.log("Calculated themes for", Object.keys(nodeThemes).length, "nodes");

        // Debug: Show sample theme data
        var sampleCount = 0;
        for (var name in nodeThemes) {
            if (sampleCount < 3) {
                console.log("Sample themes for", name, ":", nodeThemes[name]);
                sampleCount++;
            }
        }
    }

    // Calculate theme similarity between two nodes (Jaccard similarity)
    function calculateThemeSimilarity(name1, name2) {
        if (!nodeThemes[name1] || !nodeThemes[name2]) return 0;

        var themes1 = nodeThemes[name1];
        var themes2 = nodeThemes[name2];

        // Get all unique themes
        var allThemes = {};
        for (var theme in themes1) allThemes[theme] = true;
        for (var theme in themes2) allThemes[theme] = true;

        var intersection = 0;
        var union = 0;

        for (var theme in allThemes) {
            var count1 = themes1[theme] || 0;
            var count2 = themes2[theme] || 0;
            intersection += Math.min(count1, count2);
            union += Math.max(count1, count2);
        }

        return union > 0 ? intersection / union : 0;
    }

    function computeLinks() {
        links = [];
        relationshipMaxMax2 =0;
        
        for (var i=0; i<numNode;i++){
            var term1 =  nodes[i].name;
            for (var j=i+1; j<numNode;j++){
                var term2 =  nodes[j].name;
                // Use consistent ordering to match the key used in readTermsAndRelationships
                var key = term1 < term2 ? term1+"__"+term2 : term2+"__"+term1;
                if (relationship[key]){
                    var ordering =0;
                    for (var m=1; m<numYear;m++){
                        if (relationship[key][m] && relationship[key][m]>=valueSlider){
                            var sourceNodeId = i;
                            var targetNodeId = j;
                            
                            if (!nodes[i].connect)
                                nodes[i].connect = new Array();
                            nodes[i].connect.push(j)
                            if (!nodes[j].connect)
                                nodes[j].connect = new Array();
                            nodes[j].connect.push(i)

                            if (m != nodes[i].maxYear){
                                if (isContainedChild(nodes[i].childNodes,m)>=0){  // already have the child node for that month
                                    sourceNodeId =  nodes[i].childNodes[isContainedChild(nodes[i].childNodes,m)];
                                }  
                                else{  
                                    var nod = new Object();
                                    nod.id = nodes.length;
                                    nod.group = nodes[i].group;
                                    nod.name = nodes[i].name;
                                    nod.max = nodes[i].max;
                                    nod.maxYear = nodes[i].maxYear;
                                    nod.year = m;
                                    
                                    nod.parentNode = i;   // this is the new property to define the parent node
                                    if (!nodes[i].childNodes)
                                         nodes[i].childNodes = new Array();
                                    nodes[i].childNodes.push(nod.id);
                                    
                                    sourceNodeId = nod.id;
                                    nodes.push(nod);
                                }
                            }
                            if (m != nodes[j].maxYear){
                                if (isContainedChild(nodes[j].childNodes,m)>=0){
                                    targetNodeId = nodes[j].childNodes[isContainedChild(nodes[j].childNodes,m)];
                                }
                                else{    
                                    var nod = new Object();
                                    nod.id = nodes.length;
                                    nod.group = nodes[j].group;
                                    nod.name = nodes[j].name;
                                    nod.max = nodes[j].max;
                                    nod.maxYear = nodes[j].maxYear;
                                    nod.year = m;
                                    
                                    nod.parentNode = j;   // this is the new property to define the parent node
                                     if (!nodes[j].childNodes)
                                         nodes[j].childNodes = new Array();
                                    nodes[j].childNodes.push(nod.id);
                                    
                                    targetNodeId = nod.id;
                                    nodes.push(nod);
                                }    
                            }
                            
                            var l = new Object();
                            l.source = sourceNodeId;
                            l.target = targetNodeId;
                            l.m = m; 
                            l.ordering = ordering; 
                            ordering++;
                            //l.value = linkScale(relationship[term1+"__"+term2][m]); 
                            links.push(l);
                            if (relationship[key][m] > relationshipMaxMax2)
                                relationshipMaxMax2 = relationship[key][m];
                        }
                    }
                }
            }
        }
        
        var linearScale = d3.scale.linear()
            .range([0.3, 0.2])
            .domain([0, 500]);
        var hhh = Math.min(linearScale(numNode)*height/numNode,10);

        console.log("hhh="+hhh+" linearScale="+linearScale(numNode)+"    termMaxMax2="+termMaxMax2);
        // Increase scale for visible streamgraphs
        // Make streamgraphs prominent: use hhh*2 for good visibility
        yScale = d3.scale.linear()
            .range([0, hhh * 2])
            .domain([0, termMaxMax2]);
        // Use square root scale to compress high relationship counts
        // This prevents very thick arcs while still showing relative differences
        var maxCount = Math.max(relationshipMaxMax2, 2);
        
        // Create a custom scale function that ensures count=1 is always thin
        // and prevents count=2 from mapping to maximum when maxCount is small
        linkScale = function(count) {
            if (count <= 1) {
                return 1.2;  // Always return minimum for count=1 or less
            }
            // For small maxCount, use a more gradual scale
            if (maxCount <= 2) {
                // Linear interpolation: count=1 → 1.2, count=2 → 1.8
                return 1.2 + (count - 1) * 0.6;
            }
            // Use square root scale for larger maxCount values
            var sqrtScale = d3.scale.sqrt()
                .range([1.2, 3])
                .domain([1, maxCount])
                .clamp(true);
            return sqrtScale(count);
        };

        links.forEach(function(l) { 
            var term1 = nodes[l.source].name;
            var term2 = nodes[l.target].name;
            var month = l.m;
            // Use consistent ordering to match the key used in readTermsAndRelationships
            var key = term1 < term2 ? term1+"__"+term2 : term2+"__"+term1;
            var count = relationship[key] && relationship[key][month] ? relationship[key][month] : 1;
            l.count = count;
            l.type = ttt[key] && ttt[key][month] ? ttt[key][month] : [];
            // Ensure count is at least 1
            var clampedCount = Math.max(1, count);
            l.value = linkScale(clampedCount);
            
            // Debug: log all arcs to understand the data
            if (count > 1) {
                console.log("Arc with count > 1:", {
                    term1: term1,
                    term2: term2,
                    month: month,
                    count: count,
                    value: l.value,
                    publications: l.type ? l.type.length : 0,
                    key: key,
                    relationshipValue: relationship[key] ? relationship[key][month] : 'undefined'
                });
            }
            
            // Debug: log if count=1 but value is unexpectedly high
            if (count === 1 && l.value > 1.5) {
                console.warn("Arc with count=1 has high value:", {
                    term1: term1,
                    term2: term2,
                    month: month,
                    count: count,
                    value: l.value,
                    maxCount: maxCount,
                    key: key,
                    relationshipValue: relationship[key] ? relationship[key][month] : 'undefined'
                });
            }
        });  

        console.log("DONE links relationshipMaxMax2="+relationshipMaxMax2);

        // Calculate theme information for each node
        calculateNodeThemes();

        // Find connected components after links are computed
        var components = findConnectedComponents();
        
        // Store component information globally for use in force layout
        window.components = components;
        window.numComponents = Object.keys(components).length;

        //Create all the line svgs but without locations yet
        svg.selectAll(".linkArc").remove();
        svg.selectAll("g.linkArcGroup").remove();
        var linkArcGroup = svg.append("g")
            .attr("class", "linkArcGroup");
            // Removed clip-path to allow arcs to extend slightly beyond bounds if needed
        linkArcs = linkArcGroup.selectAll("path")
        .data(links)
        .enter().append("path")
        .attr("class", "linkArc")
        .style("stroke", function (d) {
            // If count=1, use the sponsor's color directly
            if (d.count == 1) {
                return getColor(d.type[0] ? d.type[0].sponsor : null);
            }
            
            // For count > 1, check if all sponsors are in the same group
            if (d.type && d.type.length > 0) {
                var groupColors = [];
                var uniqueGroupColors = {};
                
                // Get group colors for all publications
                for (var i = 0; i < d.type.length; i++) {
                    if (d.type[i] && d.type[i].sponsor) {
                        var groupColor = getGroupColor(d.type[i].sponsor);
                        if (!uniqueGroupColors[groupColor]) {
                            uniqueGroupColors[groupColor] = true;
                            groupColors.push(groupColor);
                        }
                    }
                }
                
                // If all publications have the same group color, use it
                // Otherwise, use black
                if (groupColors.length === 1) {
                    return groupColors[0];
                } else {
                    return "#000"; // Different groups, use black
                }
            }
            
            // Fallback to black
            return "#000";
        })
        .style("stroke-opacity", 1)
        .style("stroke-width", function (d) {
            // Force count=1 to always be thin, regardless of value
            if (d.count === 1) {
                return 1.2;
            }
            return d.value;
        })
        .each(function(d) {
            // Debug: log all arcs to see what's happening
            if (d.count === 1 && d.value > 1.5) {
                console.warn("Arc with count=1 but value > 1.5:", {
                    count: d.count,
                    value: d.value,
                    source: d.source.name || nodes[d.source].name,
                    target: d.target.name || nodes[d.target].name,
                    month: d.m
                });
            }
        });   

         svg.selectAll(".linkArc")
            .on('mouseover', mouseoveredLink)
            .on('mouseout', mouseoutedLink);

        // Render proposal circles for sponsor groups (replaced streamgraphs)
        renderProposalCircles();

        svg.selectAll(".nodeG").remove();
        nodeG = svg.selectAll(".nodeG")
            .data(pNodes).enter().append("g")
            .attr("class", "nodeG")
         
        nodeG.append("text")
            .attr("class", "nodeText")
            .text(function(d) { return d.name })
            .attr("dy", "3px")
            .style("fill","#000000")
            .style("text-anchor","end")
            .style("text-shadow", "1px 1px 0 rgba(255, 255, 255, 0.6")
            .style("font-weight", function(d) { return d.isSearchTerm ? "bold" : ""; })
            .attr("font-family", "sans-serif")
            .attr("font-size", "12px")
            .on('mouseover', mouseoveredNode)
            .on('mouseout', mouseoutedNode);

    

        // Horizontal lines
        svg.selectAll(".linePNodes").remove();
        linePNodes = svg.selectAll(".linePNodes")
            .data(pNodes).enter().append("line")
            .attr("class", "linePNodes")
            .attr("x1", function(d) {return xStep+xScale(d.minY);})
            .attr("y1", function(d) {return d.y;})
            .attr("x2", function(d) {return xStep+xScale(d.maxY);})
            .attr("y2", function(d) {return d.y;})
            .style("stroke-dasharray", ("1, 1"))
            .style("stroke-width",0.4)
            .style("stroke", "#000"); 



         // This is for linkDistance
        listYear = [];
        links.forEach(function(l) { 
            if (searchTerm!=""){
                if (nodes[l.source].name == searchTerm || nodes[l.target].name == searchTerm){
                    if (isContainedInteger(listYear,l.m)<0)
                        listYear.push(l.m);
                }
            }    
        }); 
        listYear.sort(function (a, b) {
          if (a > b) {
            return 1;
          }
          else if (a < b) {
            return -1;
          }
          else
            return 0;
        });    
       // listYear.sort();
    }

    // OLD STREAMGRAPH CODE - Replaced by proposal circles
    // Keeping for reference but no longer used
    /*
    function updateStreamgraphLayers(durationTime) {
        if (!pNodes || pNodes.length === 0 || !sponsorGroups || sponsorGroups.length === 0) {
            return;
        }

        try {
            // Update each streamgraph layer
            var layerIndex = 0;
            pNodes.forEach(function(node) {
                if (!node.sponsorGroupsData) return;

                sponsorGroups.forEach(function(groupName, groupIndex) {
                    if (!node.sponsorGroupsData[groupName]) {
                        layerIndex++;
                        return;
                    }

                    var groupData = node.sponsorGroupsData[groupName];

                    // Create updated path data with new Y position
                    var pathData = [];
                    for (var y = 0; y < numYear; y++) {
                        if (!groupData[y]) continue;

                        // Calculate cumulative offset (stack from bottom)
                        var cumulativeOffset = 0;
                        for (var prevGroupIndex = 0; prevGroupIndex < groupIndex; prevGroupIndex++) {
                            var prevGroupName = sponsorGroups[prevGroupIndex];
                            if (node.sponsorGroupsData[prevGroupName] &&
                                node.sponsorGroupsData[prevGroupName][y]) {
                                cumulativeOffset += node.sponsorGroupsData[prevGroupName][y].value || 0;
                            }
                        }

                        pathData.push({
                            yearId: y,
                            yNode: node.y,  // Updated Y position
                            value: groupData[y].value || 0,
                            y0: cumulativeOffset,
                            y1: cumulativeOffset + (groupData[y].value || 0)
                        });
                    }

                    // Create area generator for this sponsor group
                    var groupArea = d3.svg.area()
                        .interpolate("basis")
                        .x(function(d) { return xStep + xScale(d.yearId); })
                        .y0(function(d) { return d.yNode - yScale(d.y0); })
                        .y1(function(d) { return d.yNode - yScale(d.y1); });

                    // Update the layer
                    var layers = svg.selectAll(".streamgraph-layer");
                    if (layers && layers[0] && layers[0][layerIndex]) {
                        var layer = d3.select(layers[0][layerIndex]);
                        if (layer && !layer.empty()) {
                            layer.transition().duration(durationTime)
                                .attr("d", groupArea(pathData));
                        }
                    }

                    layerIndex++;
                });
            });
        } catch (e) {
            console.error("Error updating streamgraph layers:", e);
        }
    }
    */
    // END OF OLD STREAMGRAPH UPDATE CODE

    // OLD STREAMGRAPH RENDERING FUNCTION - Replaced by renderProposalCircles()
    // Keeping for reference but no longer used
    /*
    function renderSponsorGroupStreamgraphs() {
        try {
            // Remove existing streamgraph layers
            svg.selectAll(".streamgraph-layer").remove();
            svg.selectAll(".streamgraph-layers-group").remove();

            if (!sponsorGroups || sponsorGroups.length === 0 || !pNodes || pNodes.length === 0) {
                console.log("Skipping streamgraph rendering: no sponsor groups or nodes");
                return;
            }

            // Create a group for streamgraph layers (below arcs)
            var streamgraphGroup = svg.insert("g", ".linkArcGroup")
                .attr("class", "streamgraph-layers-group");

            // For each parent node, render stacked areas for sponsor groups
            pNodes.forEach(function(node, nodeIndex) {
                if (!node.sponsorGroupsData) {
                    console.warn("Node missing sponsorGroupsData:", node.name);
                    return;
                }

                // Calculate cumulative heights for stacking
                // Bottom-up stacking approach
                sponsorGroups.forEach(function(groupName, groupIndex) {
                    if (!node.sponsorGroupsData[groupName]) {
                        console.warn("Missing data for group:", groupName, "node:", node.name);
                        return;
                    }

                    var groupData = node.sponsorGroupsData[groupName];

                    // Create area path data with cumulative offsets
                    var pathData = [];
                    for (var y = 0; y < numYear; y++) {
                        if (!groupData[y]) {
                            console.warn("Missing data for year", y, "group:", groupName, "node:", node.name);
                            continue;
                        }

                        var dataPoint = {
                            yearId: y,
                            yNode: node.y || 0,
                            value: groupData[y].value || 0,
                            y0: 0, // Will be calculated based on previous groups
                            y1: 0  // Will be calculated
                        };

                        // Calculate cumulative offset (stack from bottom)
                        var cumulativeOffset = 0;
                        for (var prevGroupIndex = 0; prevGroupIndex < groupIndex; prevGroupIndex++) {
                            var prevGroupName = sponsorGroups[prevGroupIndex];
                            if (node.sponsorGroupsData[prevGroupName] &&
                                node.sponsorGroupsData[prevGroupName][y]) {
                                cumulativeOffset += node.sponsorGroupsData[prevGroupName][y].value || 0;
                            }
                        }

                        dataPoint.y0 = cumulativeOffset;
                        dataPoint.y1 = cumulativeOffset + dataPoint.value;

                        pathData.push(dataPoint);
                    }

                    // Skip if no data
                    if (pathData.length === 0) {
                        return;
                    }

                    // Create area generator for this sponsor group
                    var groupArea = d3.svg.area()
                        .interpolate("basis")
                        .x(function(d) { return xStep + xScale(d.yearId); })
                        .y0(function(d) { return d.yNode - yScale(d.y0); })
                        .y1(function(d) { return d.yNode - yScale(d.y1); });

                    // Render the area
                    var groupColor = sponsorGroupColors[groupName] || "#999";
                    streamgraphGroup.append("path")
                        .datum(pathData)
                        .attr("class", "streamgraph-layer")
                        .attr("data-author", node.name)  // Store author name for highlighting
                        .attr("data-group", groupName)    // Store group name
                        .attr("d", groupArea)
                        .style("fill", groupColor)
                        .style("fill-opacity", 0.7)
                        .style("stroke", "none")
                        .on("mouseover", function() {
                            d3.select(this)
                                .style("fill-opacity", 0.9)
                                .style("stroke", groupColor)
                                .style("stroke-width", 0.5);
                        })
                        .on("mouseout", function() {
                            d3.select(this)
                                .style("fill-opacity", 0.7)
                                .style("stroke", "none");
                        })
                        .append("title")
                        .text(groupName + " - " + node.name);
                });
            });

            console.log("Rendered", svg.selectAll(".streamgraph-layer").size(), "streamgraph layers");
        } catch (e) {
            console.error("Error rendering streamgraph layers:", e);
        }
    }
    */
    // END OF OLD STREAMGRAPH CODE

$('#btnUpload').click(function() {
    var bar = document.getElementById('progBar'),
        fallback = document.getElementById('downloadProgress'),
        loaded = 0;

    var load = function() {
        loaded += 1;
        bar.value = loaded;

        /* The below will be visible if the progress tag is not supported */
        $(fallback).empty().append("HTML5 progress tag not supported: ");
        $('#progUpdate').empty().append(loaded + "% loaded");

        if (loaded == 100) {
            clearInterval(beginLoad);
            $('#progUpdate').empty().append("Upload Complete");
            console.log('Load was performed.');
        }
    };

    var beginLoad = setInterval(function() {load();}, 50);

});

function searchNode() {

    svg.selectAll(".linePNodes").remove();
        
    searchTerm = document.getElementById('search').value;
    console.log("searchTerm="+searchTerm);
    valueSlider =1;
    handle.attr("cx", xScaleSlider(valueSlider));
    recompute();
}

function mouseoveredLink(l) {  
    if (force.alpha()==0) {
        // mouseovered(l.source);

        var term1 = l.source.name;
        var term2 = l.target.name;
        var list = {};
        list[term1] = l.source;
        list[term2] = l.target;
        
        var listCardId = [];
        var listTilte = [];
        var listTilte = [];
        var listEvidence = [];
        var listType = [];
        var listBoth = {};

        // Use l.type which contains all publications for this relationship
        // This ensures we show all publications that contribute to the count
        // l.type stores {proposal_no, theme, sponsor} but not title, so we need to look it up
        if (l.type && l.type.length > 0) {
            // Create a map of proposal_no to publication data for quick lookup
            var proposalMap = {};
            data2.forEach(function(d) {
                if (d.year == l.m) {
                    proposalMap[d.proposal_no] = d;
                }
            });
            
            // Add all publications from l.type
            for (var i = 0; i < l.type.length; i++) {
                var pub = l.type[i];
                var pubData = proposalMap[pub.proposal_no];
                if (pubData) {
                    // Check if both authors are in this publication
                    var authorList = pubData["Authors"].split(",").map(function(a) { return a.trim(); });
                    if (authorList.indexOf(term1) >= 0 && authorList.indexOf(term2) >= 0) {
                        listCardId.push(pub.proposal_no);
                        listEvidence.push(pubData.title);
                        listTilte.push(pubData.title);
                        listType.push({
                            proposal_no: pub.proposal_no,
                            theme: pub.theme,
                            sponsor: pub.sponsor
                        });
                    }
                }
            }
        } else {
            // Fallback to old method if l.type is not available
            data2.forEach(function(d) { 
                var year = d.year;
                if (year==l.m){
                    var list = d["Authors"].split(",");
                    for (var i=0; i<list.length;i++){
                        if (term1==list[i]){
                            for (var j=0; j<list.length;j++){
                                if (term2==list[j]){
                                    if (!listBoth[d.title.substring(0,10)+"**"+d.theme]){
                                        listCardId.push(d["proposal_no"]);
                                        listEvidence.push(d.title);
                                        listTilte.push(d.title);
                                        listType.push({
                                            proposal_no: d["proposal_no"],
                                            theme: d.theme,
                                            sponsor: d.sponsor
                                        });
                                        listBoth[d.title.substring(0,10)+"**"+d.theme] =1;
                                    }
                                }    
                            }
                        }
                    }
                }
            });
        }
        
        var x1 = l.source.x;
        var x2 = l.target.x;
        var y1 = l.source.y;
        var y2 = l.target.y;

        // Check if tooltip would go off right edge, if so position it on the left
        var midX = xStep+(x1+x2)/2;
        var tooltipOffset = Math.abs(y1-y2)/2+10;
        var estimatedTooltipWidth = 600; // Approximate width of tooltip
        var showTooltipOnLeft = (midX + tooltipOffset + estimatedTooltipWidth) > fullWidth;

        var x3 = showTooltipOnLeft ? (midX - tooltipOffset) : (midX + tooltipOffset);
        var yGap = 12;
        var totalSize = yGap*listTilte.length;

        var tipData = new Object();
        tipData.x = x3;
        tipData.y = (y1+y2)/2;
        tipData.a = listTilte;
        for (var i=0; i<listTilte.length;i++){
            var y3 = (y1+y2)/2-totalSize/2+(i+0.5)*yGap;

            // Proposal number with sponsor color
            var proposalText = svg.append("text")
                .attr("class", "linkTilte")
                .attr("x", x3)
                .attr("y", y3)
                .text((listType[i] ? listType[i].proposal_no : "") + " ")
                .attr("dy", ".21em")
                .attr("font-family", "sans-serif")
                .attr("font-size", "12px")
                .style("font-weight", "bold")
                .style("text-anchor", showTooltipOnLeft ? "end" : "left")
                .style("fill", function(d) {
                    return getColor(listType[i] ? listType[i].sponsor : null);
                 })
                .style("text-shadow", "1px 1px 0 rgba(200, 200, 200, 0.6");

            // Get the width of the proposal number text to position the title
            var proposalWidth = proposalText.node().getComputedTextLength();

            // Title in black (truncated to fit)
            var titleText = listEvidence[i];
            var maxTitleLength = 80;  // Maximum characters for title
            var displayTitle = titleText.length > maxTitleLength
                ? titleText.substring(0, maxTitleLength - 3) + "..."
                : titleText;

            svg.append("text")
                .attr("class", "linkTilte")
                .attr("x", showTooltipOnLeft ? (x3 - proposalWidth) : (x3 + proposalWidth))
                .attr("y", y3)
                .text(displayTitle)
                .attr("dy", ".21em")
                .attr("font-family", "sans-serif")
                .attr("font-size", "12px")
                .style("font-weight", "normal")
                .style("text-anchor", showTooltipOnLeft ? "end" : "left")
                .style("fill", "#000000")
                .style("text-shadow", "1px 1px 0 rgba(200, 200, 200, 0.6")
                .append("title")  // Add SVG title element for full text on hover
                .text(titleText);
        }
    
        svg.selectAll(".linkArc")
            .style("stroke-opacity", function(l2) {
                if (l==l2)
                    return 1;
                else
                    return 0.05;
            });

        svg.selectAll(".linePNodes")
            .style("stroke-opacity", 0.1);

        nodeG.style("fill-opacity" , function(n) {
            if (n.name== term1 || n.name== term2)
                return 1;
            else
              return 0.05;
            });

        // Fade proposal circles (dots) except for the two connected authors
        svg.selectAll(".proposal-circle")
            .style("fill-opacity", function() {
                var circleAuthor = d3.select(this).attr("data-author");
                if (circleAuthor === term1 || circleAuthor === term2) {
                    return 0.9;  // Keep connected authors' circles visible
                }
                return 0.05;  // Fade other circles
            }); 

         nodeG.transition().duration(500).attr("transform", function(n) {
                if (n.name== term1 || n.name== term2){
                    var newX =xStep+xScale(l.m);
                    return "translate(" + newX + "," + n.y + ")"
                }
                else{
                    return "translate(" + n.xConnected + "," + n.y + ")"
                }
            })        
    }     
} 
function mouseoutedLink(l) {
    if (force.alpha()==0) {
        svg.selectAll(".linkTilte").remove();
        svg.selectAll(".linkArc")
            .style("stroke-opacity" , 1);
        nodeG.style("fill-opacity" , 1);
        nodeG.transition().duration(500).attr("transform", function(n) {
            return "translate(" +n.xConnected + "," + n.y + ")"
        })
        svg.selectAll(".linePNodes")
            .style("stroke-opacity", 1);

        // Reset proposal circles to normal opacity
        svg.selectAll(".proposal-circle")
            .style("fill-opacity", 0.7);

    }
}   


function mouseoveredNode(d) {
    if (force.alpha()>0) return;

    var list = new Object();
    list[d.name] = new Object();

    // Highlight connected arcs
    svg.selectAll(".linkArc")
        .style("stroke-opacity" , function(l) {
            if (l.source.name==d.name){
                if (!list[l.target.name]){
                    list[l.target.name] = new Object();
                    list[l.target.name].count=1;
                    list[l.target.name].year=l.m;
                    list[l.target.name].linkcount=l.count;
                }
                else{
                    list[l.target.name].count++;
                    if (l.count>list[l.target.name].linkcount){
                        list[l.target.name].linkcount = l.count;
                        list[l.target.name].year=l.m;
                    }
                }
                return 1;
            }
            else if (l.target.name==d.name){
                if (!list[l.source.name]){
                    list[l.source.name] = new Object();
                    list[l.source.name].count=1;
                    list[l.source.name].year=l.m;
                    list[l.source.name].linkcount=l.count;
                }
                else{
                    list[l.source.name].count++;
                    if (l.count>list[l.source.name].linkcount){
                        list[l.source.name].linkcount = l.count;
                        list[l.source.name].year=l.m;
                    }
                }
                return 1;
            }
            else
              return 0.01;
     });

    svg.selectAll(".linePNodes")
        .style("stroke-opacity" , function(n) {
            if (d==n)
               return 1;
            return 0.01;
     });

    nodeG.style("fill-opacity" , function(n) {
        if (list[n.name])
            return 1;
        else
          return 0.1;
        })
        .style("font-weight", function(n) { return d.name==n.name ? "bold" : ""; })
    ;

    // Highlight proposal circles for the hovered node
    highlightAuthorCircles(d.name, list);

    nodeG.transition().duration(500).attr("transform", function(n) {
        if (list[n.name] && n.name!=d.name){
            var newX =xStep+xScale(list[n.name].year);
            return "translate(" + newX + "," + n.y + ")"
        }
        else{
            return "translate(" + n.xConnected + "," + n.y + ")"
        }
    })

    // Render into the right-side panel instead of in-SVG tooltip
    renderPanelForPerson(d.name);
}

function mouseoutedNode(d) {
    if (force.alpha()==0) {
        // Clear any SVG tooltips if present (legacy cleanup)
        svg.selectAll(".publicationTooltip").remove();

        nodeG.style("fill-opacity" , 1);
        svg.selectAll(".linkArc")
            .style("stroke-opacity" , 1);
        svg.selectAll(".linePNodes")
            .style("stroke-opacity" , 1);

        // Restore proposal circle highlighting
        resetCircleHighlight();

        nodeG.style("font-weight", "")  ;
        nodeG.transition().duration(500).attr("transform", function(n) {
            return "translate(" +n.xConnected + "," + n.y + ")"

        })

        // Restore default panel view: all professors and their publications
        renderPanelAll();
    }
}

// Keep old functions for backward compatibility
function mouseovered(d) {
    mouseoveredNode(d);
}

function mouseouted(d) {
    mouseoutedNode(d);
}

    // check if a node for a month m already exist.
    function isContainedChild(a, m) {
        if (a){
            for (var i=0; i<a.length;i++){
                var index = a[i];
                if (nodes[index].year==m)
                    return i;
            }
        }
        return -1;
    }

     // check if a node for a month m already exist.
    function isContainedInteger(a, m) {
        if (a){
            for (var i=0; i<a.length;i++){
                if (a[i]==m)
                    return i;
            }
        }
        return -1;
    }

    function linkArc(d) {
        var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy)/2;
        // return "M" + (xStep+d.source.x) + "," + d.source.y + " Q" + ((xStep+d.source.x)+dr) + "," + d.target.y+ " " + (xStep+d.target.x) + "," + d.target.y;
     
        if (d.source.y<d.target.y )
            return "M" + (xStep+d.source.x) + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + (xStep+d.target.x) + "," + d.target.y;
        else
            return "M" + (xStep+d.target.x) + "," + d.target.y + "A" + dr + "," + dr + " 0 0,1 " + (xStep+d.source.x) + "," + d.source.y;
    }



    function update(){
        // Calculate max proposals and max connectivity for normalization
        var maxProposals = 0;
        var maxConnectivity = 0;
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].max > maxProposals) maxProposals = nodes[i].max;
            if (nodes[i].connect && nodes[i].connect.length > maxConnectivity) {
                maxConnectivity = nodes[i].connect.length;
            }
        }

        // Calculate component centers for repulsion
        var componentCenters = {};
        var componentSizes = {};
        if (window.components && window.numComponents > 1) {
            // Calculate center of mass for each component
            for (var compId in window.components) {
                var compNodes = window.components[compId];
                var centerX = 0, centerY = 0, count = 0;
                for (var i = 0; i < compNodes.length; i++) {
                    var nodeIdx = compNodes[i];
                    if (nodeIdx < nodes.length && nodes[nodeIdx].x !== undefined && nodes[nodeIdx].y !== undefined) {
                        centerX += nodes[nodeIdx].x;
                        centerY += nodes[nodeIdx].y;
                        count++;
                    }
                }
                if (count > 0) {
                    componentCenters[compId] = {x: centerX / count, y: centerY / count};
                    componentSizes[compId] = count;
                }
            }
        }

        nodes.forEach(function(d) {
            //if (searchTerm!="")
            //    d.x += (width/2-d.x)*0.02;
            //else
                d.x += (width/2-d.x)*0.005;

            if  (d.parentNode>=0){
                d.y += (nodes[d.parentNode].y- d.y)*0.1;
            }
            else if (d.childNodes){
                var yy = 0;
                for (var i=0; i< d.childNodes.length;i++){
                    var child = d.childNodes[i];
                    yy += nodes[child].y;
                }
                if (d.childNodes.length>0){
                    yy = yy/d.childNodes.length; // average y coordinate
                    d.y += (yy-d.y)*0.5;
                }
            }

            // Custom forces for parent nodes only
            if (d.parentNode === undefined || d.parentNode < 0) {
                // Force 1: Pull toward center (different behavior per mode)
                if (clusteringMode === 'connectivity') {
                    // Pull high-proposal authors toward vertical center
                    var proposalScore = maxProposals > 0 ? (d.max || 0) / maxProposals : 0;
                    var centerY = height / 2;
                    var centerPull = (centerY - d.y) * proposalScore * 0.08;
                    d.y += centerPull;
                } else if (clusteringMode === 'theme') {
                    // Weak centering to prevent excessive drift
                    var centerY = height / 2;
                    var centerPull = (centerY - d.y) * 0.02; // Very weak
                    d.y += centerPull;
                }

                // Force 2: Different clustering based on mode
                if (clusteringMode === 'connectivity') {
                    // Pull highly-connected authors toward each other
                    // Authors with more connections are pulled toward the average Y of their connected peers
                    if (d.connect && d.connect.length > 0) {
                        var avgConnectedY = 0;
                        var connectedCount = 0;
                        for (var i = 0; i < d.connect.length; i++) {
                            var connectedNodeId = d.connect[i];
                            if (connectedNodeId < nodes.length && nodes[connectedNodeId].y) {
                                avgConnectedY += nodes[connectedNodeId].y;
                                connectedCount++;
                            }
                        }
                        if (connectedCount > 0) {
                            avgConnectedY /= connectedCount;
                            var connectivityScore = maxConnectivity > 0 ? d.connect.length / maxConnectivity : 0;
                            var clusterPull = (avgConnectedY - d.y) * connectivityScore * 0.06;
                            d.y += clusterPull;
                        }
                    }
                } else if (clusteringMode === 'theme') {
                    // Pull authors with similar themes toward each other
                    var avgSimilarY = 0;
                    var totalSimilarity = 0;
                    var similarNodes = 0;
                    var topSimilarNodes = []; // Track top similar nodes for debugging

                    for (var i = 0; i < numNode; i++) {
                        if (i === d.id || nodes[i].parentNode >= 0) continue; // Skip self and child nodes

                        var similarity = calculateThemeSimilarity(d.name, nodes[i].name);
                        if (similarity > 0.05) { // Lower threshold for more grouping (was 0.1)
                            avgSimilarY += nodes[i].y * similarity;
                            totalSimilarity += similarity;
                            similarNodes++;
                            topSimilarNodes.push({name: nodes[i].name, sim: similarity});
                        }
                    }

                    if (totalSimilarity > 0 && similarNodes > 0) {
                        avgSimilarY /= totalSimilarity;
                        // Strong force for theme clustering (no connectivity forces to fight against)
                        var similarityScore = Math.min(totalSimilarity / 1.5, 1);
                        var clusterPull = (avgSimilarY - d.y) * similarityScore * 0.2;
                        d.y += clusterPull;

                        // Debug specific authors to understand clustering behavior
                        if (d.name === "Michael Gelfond" || d.name === "Yuanlin Zhang") {
                            topSimilarNodes.sort(function(a,b) { return b.sim - a.sim; });
                            console.log(d.name, "being pulled toward", topSimilarNodes.slice(0, 3), "with total pull:", clusterPull.toFixed(2));
                        }
                    }
                }

                // Force 3: Repulsion between different components
                // This separates strongly connected components
                // Reduce this force in theme mode to allow theme-based clustering
                if (window.components && window.numComponents > 1 && d.componentId !== undefined && clusteringMode === 'connectivity') {
                    var repulsionStrength = 0.15; // Adjust this to control separation strength
                    var minDistance = 100; // Minimum desired distance between components
                    
                    for (var otherCompId in componentCenters) {
                        if (otherCompId != d.componentId && componentCenters[otherCompId]) {
                            var otherCenter = componentCenters[otherCompId];
                            var dx = d.x - otherCenter.x;
                            var dy = d.y - otherCenter.y;
                            var distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if (distance > 0 && distance < minDistance * 2) {
                                // Apply repulsion force inversely proportional to distance
                                var force = repulsionStrength * (minDistance / distance);
                                d.x += (dx / distance) * force;
                                d.y += (dy / distance) * force;
                            }
                        }
                    }
                }
            }
        });    
        //if (document.getElementById("checkbox1").checked){
             linkArcs.style("stroke-width", 0);
            
            // nodeG.transition().duration(500).attr("transform", function(d) {
            //    return "translate(" + 200 + "," + d.y + ")"
           // })
           // svg.selectAll(".nodeText").style("text-anchor","start")


            // Keep the same yScale for visible streamgraphs (don't reset to tiny value)
            // yScale is already set to proper range in computeLinks, don't override it
            nodeG.attr("transform", function(d) {
                return "translate(" + (xStep+d.x) + "," + d.y + ")"
            })
            linkArcs.style("stroke-width", function (d) {
                // Force count=1 to always be thin
                if (d.count === 1) {
                    return 1.2;
                }
                return d.value;
            });
        /*}
        else{
        
            yScale = d3.scale.linear()
            .range([0, 0])
            .domain([0, termMaxMax2]);
        

            nodeG.attr("transform", function(d) {
                return "translate(" + (xStep+d.x) + "," + d.y + ")"
            })
            linkArcs.style("stroke-width", function (d) {
                // Force count=1 to always be thin
                if (d.count === 1) {
                    return 1.2;
                }
                return d.value;
            });
         }   */

        linkArcs.attr("d", linkArc);

        // Update proposal circles to follow their author nodes during force layout
        // This makes circles animate smoothly with nodes, treating them as nodes without links
        svg.selectAll(".proposal-circle")
            .attr("cy", function() {
                var authorName = d3.select(this).attr("data-author");
                // Find the author's current Y position
                for (var i = 0; i < pNodes.length; i++) {
                    if (pNodes[i].name === authorName) {
                        return pNodes[i].y;
                    }
                }
                // Fallback: keep current position if author not found
                return parseFloat(d3.select(this).attr("cy"));
            });
      //  if (force.alpha()<0.02)
      //     force.stop();
    } 

    function updateTransition(durationTime, timeY){  // timeY is the position of time legend
        nodes.forEach(function(d) {
           d.x=xScale(d.year);
            if (d.parentNode>=0)
                d.y= nodes[d.parentNode].y;
        });    


        var list = new Object();
        links.forEach(function(l) {  
            var m = l.m
            if (!list[l.target.name])
                list[l.target.name] = new Object();
            if (!list[l.target.name][m])
                list[l.target.name][m] = 0;
            list[l.target.name][m]++;
            
            if (!list[l.source.name])
                list[l.source.name] = new Object();
            if (!list[l.source.name][m])
                list[l.source.name][m] = 0;
            list[l.source.name][m]++;
         });
       

        nodeG.transition().duration(durationTime).attr("transform", function(d) {
           d.xConnected= xStep+ xScale(d.isConnectedMaxYear);

           // Find the earliest month with any activity (proposals OR links)
           var minY = numYear; // Start with max value
           var maxY = 0;

           // Check for proposals in streamgraph data (first activity)
           if (d.sponsorGroupsData && sponsorGroups) {
               for (var m = 0; m < numYear; m++) {
                   var hasActivity = false;
                   // Check if any sponsor group has proposals in this month
                   for (var g = 0; g < sponsorGroups.length; g++) {
                       var groupName = sponsorGroups[g];
                       if (d.sponsorGroupsData[groupName] &&
                           d.sponsorGroupsData[groupName][m] &&
                           d.sponsorGroupsData[groupName][m].value > 0) {
                           hasActivity = true;
                           if (m < minY) minY = m;
                           if (m > maxY) maxY = m;
                       }
                   }
               }
           }

           // Also check links (fallback if no streamgraph data)
           for (var m=0; m<numYear; m++){
                if (list[d.name] && list[d.name][m]){
                    if (m < minY) minY = m;
                    if (m > maxY) maxY = m;
                }
           }

           // If no activity found, use the connected year
           if (minY === numYear) {
               minY = d.isConnectedMaxYear || 0;
           }

            d.minY = minY;
            d.maxY = maxY;
            d.xConnected = xStep + xScale(minY);  // Position at beginning of streamgraph
           return "translate(" + d.xConnected + "," + d.y + ")"
        })
        
        svg.selectAll(".linePNodes").transition().duration(durationTime)
            .attr("x1", function(d) {return xStep+xScale(d.minY);})
            .attr("y1", function(d) {return d.y;})
            .attr("x2", function(d) {return xStep+xScale(d.maxY);})
            .attr("y2", function(d) {return d.y;}); 

       // svg.selectAll(".timeLegend").transition().duration(durationTime)
       //     .attr("y", timeY/3)
        
        
        svg.selectAll(".nodeText").transition().duration(durationTime)
            .text(function(d) { return d.name; })
            .attr("dy", "3px");

        // Update proposal circles to follow node Y positions
        updateProposalCircles(durationTime);  
        linkArcs.transition().duration(durationTime).attr("d", linkArc);     
    }    

    function detactTimeSeries(){
       // console.log("DetactTimeSeries ************************************" +data);
        nodeG.selectAll(".nodeText")
            .attr("font-size", "12px");

        // Calculate scores for each author based on proposals and connectivity
        var termArray = [];
        for (var i=0; i< numNode; i++) {
            var e =  {};
            e.y = nodes[i].y;
            e.nodeId = i;
            // Score combines:
            // - max (total proposals over time) weighted 60%
            // - isConnected (connectivity strength) weighted 40%
            // Normalize both to 0-1 range
            var maxProposals = nodes[i].max || 0;
            var connectivity = 0;
            if (nodes[i].connect && nodes[i].connect.length > 0) {
                connectivity = nodes[i].connect.length;
            }
            e.proposalCount = maxProposals;
            e.linkCount = connectivity;
            // Combined score (higher = more important)
            e.score = (maxProposals * 0.6) + (connectivity * 0.4);
            termArray.push(e);
        }

        // Sort by score descending (highest scores first)
        termArray.sort(function (a, b) {
            if (a.score > b.score) return -1;
            if (a.score < b.score) return 1;
            // Tie-breaker: use current Y position
            if (a.y > b.y) return 1;
            if (a.y < b.y) return -1;
            return 0;
        });

        // Position authors so highest scores are in the middle vertically
        // Use a distribution that places top-scored authors near center
        var step = 20;
        var totalH = termArray.length * step;
        var centerY = height / 2;

        // Create a "middle-out" ordering: highest scores in center, lower scores at edges
        var middleOutOrder = [];
        var mid = Math.floor(termArray.length / 2);

        for (var i = 0; i < termArray.length; i++) {
            if (i % 2 === 0) {
                // Even indices go to the right/bottom of center
                middleOutOrder.push(mid + Math.floor(i / 2));
            } else {
                // Odd indices go to the left/top of center
                middleOutOrder.push(mid - Math.ceil(i / 2));
            }
        }

        // Assign Y positions: highest score authors in the middle
        for (var i = 0; i < termArray.length; i++) {
            var position = middleOutOrder[i];
            nodes[termArray[i].nodeId].y = (height - totalH) / 2 + position * step;
        }

        force.stop();

        updateTransition(2000, height-4);
    }

    // =============== Right Panel Rendering ===============
    function getPublicationsForAuthor(name) {
        // Return unique publications for given author
        var pubs = authorPubs[name] || [];
        // De-duplicate by proposal_no + theme
        var seen = {};
        var out = [];
        for (var i = 0; i < pubs.length; i++) {
            var k = pubs[i].proposal_no + "**" + (pubs[i].theme || "");
            if (!seen[k]) { seen[k] = 1; out.push(pubs[i]); }
        }
        // Sort by year desc, then title
        out.sort(function(a,b){
            if (a.year !== b.year) return b.year - a.year;
            if (a.title < b.title) return -1;
            if (a.title > b.title) return 1;
            return 0;
        });
        return out;
    }

    function renderPanelForPerson(name) {
        var panel = document.getElementById('pub-panel-content');
        if (!panel) return;
        // Save current scroll if switching from all-authors view
        var container = document.getElementById('pub-panel');
        if (container && panelMode === 'all') {
            savedAllPanelScrollTop = container.scrollTop || 0;
        }
        var pubs = getPublicationsForAuthor(name);
        var cap = PANEL_MAX_ITEMS;
        var html = '';
        html += '<div class="pub-group">';
        html += '<div class="pub-group__title">' + escapeHtml(name) + ' - Publications (' + pubs.length + ')</div>';
        if (pubs.length === 0) {
            html += '<div class="pub-muted">No publications found.</div>';
        } else {
            var n = Math.min(cap, pubs.length);
            for (var i=0; i<n; i++) {
                var p = pubs[i];
                var color = getColor(p.sponsor);
                html += '<div class="pub-item">'
                    + '<span class="pub-item__year" style="color:' + color + '">' + p.year + '</span>'
                    + '<span>' + escapeHtml(p.title) + '</span>'
                    + '</div>';
            }
            if (pubs.length > cap) {
                html += '<div class="pub-muted">… and ' + (pubs.length - cap) + ' more</div>';
            }
        }
        html += '</div>';
        panel.innerHTML = html;
        panelMode = 'person';
    }

    function renderPanelAll() {
        var panel = document.getElementById('pub-panel-content');
        if (!panel) return;
        // Sort authors alphabetically by name
        var html = '';
        if (!pNodes || pNodes.length === 0) {
            html = '<div class="pub-muted">No authors available.</div>';
            panel.innerHTML = html;
            return;
        }
        // Create a copy of pNodes and sort alphabetically by name
        var sortedNodes = pNodes.slice().sort(function(a, b) {
            var nameA = a.name.toUpperCase();
            var nameB = b.name.toUpperCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
        for (var i=0; i<sortedNodes.length; i++) {
            var name = sortedNodes[i].name;
            var pubs = getPublicationsForAuthor(name);
            html += '<div class="pub-group">';
            html += '<div class="pub-group__title">' + escapeHtml(name) + ' (' + pubs.length + ')</div>';
            if (pubs.length === 0) {
                html += '<div class="pub-muted">No publications</div>';
            } else {
                for (var j=0; j<pubs.length; j++) {
                    var p = pubs[j];
                    var color = getColor(p.sponsor);
                    html += '<div class="pub-item">'
                        + '<span class="pub-item__year" style="color:' + color + '">' + p.year + '</span>'
                        + '<span>' + escapeHtml(p.title) + '</span>'
                        + '</div>';
                }
            }
            html += '</div>';
        }
        panel.innerHTML = html;
        // Restore previous scroll position from before hover
        var container = document.getElementById('pub-panel');
        if (container) {
            container.scrollTop = savedAllPanelScrollTop || 0;
        }
        panelMode = 'all';
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // =============== Clustering Mode Switching ===============
    function switchToConnectivityClustering() {
        if (clusteringMode === 'connectivity') return; // Already in this mode

        console.log("Switching to connectivity-based clustering");
        clusteringMode = 'connectivity';

        // Update button states
        document.getElementById('btn-connectivity').classList.add('active');
        document.getElementById('btn-theme').classList.remove('active');

        // Restart force simulation with more energy to apply new clustering
        force.alpha(0.3); // Higher alpha for more movement
        force.resume();
    }

    function switchToThemeClustering() {
        if (clusteringMode === 'theme') return; // Already in this mode

        console.log("Switching to theme-based clustering");
        clusteringMode = 'theme';

        // Update button states
        document.getElementById('btn-theme').classList.add('active');
        document.getElementById('btn-connectivity').classList.remove('active');

        // Debug: Log theme similarities including specific pairs
        console.log("=== Theme Similarity Debug ===");

        // Check specific pair: Michael Gelfond and Yuanlin Zhang
        var michael = "Michael Gelfond";
        var yuanlin = "Yuanlin Zhang";
        var simMY = calculateThemeSimilarity(michael, yuanlin);
        console.log("Similarity:", michael, "↔", yuanlin, "=", simMY.toFixed(3));
        if (nodeThemes[michael]) console.log(michael, "themes:", nodeThemes[michael]);
        if (nodeThemes[yuanlin]) console.log(yuanlin, "themes:", nodeThemes[yuanlin]);

        // Show sample similarities
        var debugCount = 0;
        for (var i = 0; i < Math.min(5, numNode); i++) {
            for (var j = i + 1; j < Math.min(10, numNode); j++) {
                var sim = calculateThemeSimilarity(nodes[i].name, nodes[j].name);
                if (sim > 0) {
                    console.log("Similarity:", nodes[i].name, "↔", nodes[j].name, "=", sim.toFixed(3));
                    debugCount++;
                    if (debugCount >= 8) break;
                }
            }
            if (debugCount >= 8) break;
        }

        // Restart force simulation with more energy to apply new clustering
        force.alpha(0.3); // Higher alpha for more movement
        force.resume();
    }

    // Make functions globally accessible
    window.switchToConnectivityClustering = switchToConnectivityClustering;
    window.switchToThemeClustering = switchToThemeClustering;



