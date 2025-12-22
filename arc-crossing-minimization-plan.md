# Plan: Arc Crossing Minimization Algorithm

## Problem Definition

Given:
- **N authors** (nodes) arranged as horizontal lines
- **M arcs** connecting pairs of authors at specific time points
- Each arc connects two authors at a specific x-position (month)

Goal: Find the vertical ordering of N authors that minimizes the total number of arc crossings.

---

## Arc Crossing Detection

Two arcs cross if and only if:
- Arc A connects authors at positions `y1` and `y2` (where `y1 < y2`)
- Arc B connects authors at positions `y3` and `y4` (where `y3 < y4`)
- They occur at the same or overlapping x-position (time)
- One of these conditions holds: `y1 < y3 < y2 < y4` OR `y3 < y1 < y4 < y2`

Simplified: Two arcs at the same time point cross if their endpoint orderings are "interleaved."

---

## Approach Options

### Option 1: Brute Force (Exact, Small N only)

**Complexity**: O(N! × M²)

**Steps**:
1. Generate all N! permutations of author orderings
2. For each permutation:
   - Assign vertical positions based on permutation order
   - Count crossings between all pairs of arcs
3. Return permutation with minimum crossings

**Feasibility**: Only practical for N ≤ 10-12 authors

---

### Option 2: Greedy Insertion

**Complexity**: O(N² × M²)

**Steps**:
1. Start with empty ordering
2. Pick first author with most connections, place at center
3. For each remaining author (sorted by connection count):
   - Try inserting at each possible position (0 to current_length)
   - Calculate crossing count for each position
   - Insert at position with minimum new crossings
4. Return final ordering

**Pros**: Fast, reasonable results
**Cons**: May get stuck in local optima

---

### Option 3: Barycenter/Median Heuristic

**Complexity**: O(K × N × M) where K = iterations

**Steps**:
1. Start with initial ordering (e.g., alphabetical or by degree)
2. Repeat until convergence:
   - For each author, calculate "barycenter" = average position of all connected authors
   - Reorder authors by their barycenter values
   - Count crossings
3. Return best ordering found

**Variant - Median**:
- Use median position instead of mean (more robust to outliers)

---

### Option 4: Pairwise Swapping (Local Search)

**Complexity**: O(K × N² × M²)

**Steps**:
1. Start with initial ordering
2. Repeat until no improvement:
   - For each pair of adjacent authors (i, i+1):
     - Calculate crossings with current order
     - Calculate crossings if swapped
     - If swap reduces crossings, perform swap
3. Extend to non-adjacent swaps if needed
4. Return final ordering

---

### Option 5: Simulated Annealing

**Complexity**: O(iterations × M²)

**Steps**:
1. Start with initial ordering, set temperature T
2. Repeat until cooled:
   - Generate neighbor (random swap)
   - Calculate ΔCrossings = new_crossings - old_crossings
   - If ΔCrossings < 0, accept
   - Else accept with probability exp(-ΔCrossings / T)
   - Decrease T according to cooling schedule
3. Return best ordering found

**Pros**: Can escape local optima
**Cons**: Requires tuning parameters

---

### Option 6: Genetic Algorithm

**Complexity**: O(generations × population × M²)

**Steps**:
1. Initialize population of random orderings
2. Repeat for G generations:
   - Evaluate fitness (inverse of crossing count) for each ordering
   - Select parents (tournament or roulette)
   - Apply crossover (order crossover OX, PMX, etc.)
   - Apply mutation (random swaps)
   - Replace population with offspring
3. Return best ordering found

---

### Option 7: Integer Linear Programming (ILP) - Exact

**Complexity**: Exponential worst case, but optimal

**Formulation**:
- Variables: `x_ij` = 1 if author i is above author j
- Variables: `c_ab` = 1 if arcs a and b cross
- Constraints: Transitivity (if i above j, j above k, then i above k)
- Constraints: Crossing detection based on x variables
- Objective: Minimize Σ c_ab

**Pros**: Guaranteed optimal
**Cons**: May be slow for large instances

---

## Recommended Implementation Plan

### Phase 1: Foundation
1. Extract arc data from current visualization
2. Implement crossing counting function
3. Create permutation representation for orderings

### Phase 2: Quick Wins
4. Implement greedy insertion algorithm
5. Implement barycenter heuristic
6. Compare results

### Phase 3: Refinement
7. Implement local search (pairwise swapping)
8. Combine: Use greedy/barycenter as initial solution, refine with local search

### Phase 4: Advanced (if needed)
9. Implement simulated annealing for better exploration
10. Consider time-aware optimization (group arcs by time period)

---

## Special Considerations for TimeArcs

1. **Time dimension**: Arcs at different x-positions cannot cross each other visually, so only compare arcs at same/nearby time points

2. **Arc bundling**: If multiple arcs connect same author pair at different times, treat as single logical connection

3. **Weighted crossings**: May want to weight crossings by arc thickness (more important collaborations)

4. **Constraints**: Some authors may need to be adjacent (e.g., same department)

5. **Incremental updates**: When data changes, reoptimize from previous solution

---

## Success Metrics

- **Primary**: Total arc crossing count
- **Secondary**: Maximum crossings per arc (distribute crossings evenly)
- **Tertiary**: Visual density/clustering quality
