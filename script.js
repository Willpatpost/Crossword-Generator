// Generate constraints based on slot intersections
function generateConstraints() {
    constraints = {};
    let positionMap = {};

    for (const [slot, positions] of Object.entries(slots)) {
        positions.forEach((pos, idx) => {
            const key = `${pos[0]},${pos[1]}`;
            if (!positionMap[key]) positionMap[key] = [];
            positionMap[key].push({ slot, idx });
        });
    }

    for (const overlaps of Object.values(positionMap)) {
        if (overlaps.length > 1) {
            for (let i = 0; i < overlaps.length; i++) {
                for (let j = i + 1; j < overlaps.length; j++) {
                    const { slot: slot1, idx: idx1 } = overlaps[i];
                    const { slot: slot2, idx: idx2 } = overlaps[j];

                    if (!constraints[slot1]) constraints[slot1] = {};
                    if (!constraints[slot2]) constraints[slot2] = {};

                    if (!constraints[slot1][slot2]) constraints[slot1][slot2] = [];
                    if (!constraints[slot2][slot1]) constraints[slot2][slot1] = [];

                    constraints[slot1][slot2].push([idx1, idx2]);
                    constraints[slot2][slot1].push([idx2, idx1]);
                }
            }
        }
    }

    debugLog("Generated Constraints:", DEBUG_CONSTRAINTS, constraints);
}

// Set up domains for each slot, considering pre-filled letters
function setupDomains() {
    domains = {};
    for (const [slot, positions] of Object.entries(slots)) {
        const length = positions.length;
        const preFilled = {};
        positions.forEach(([r, c], idx) => {
            const key = `${r},${c}`;
            if (cellContents[key]) {
                preFilled[idx] = cellContents[key];
            }
        });

        const possibleWords = wordLengthCache[length] ? wordLengthCache[length] : [];
        domains[slot] = possibleWords.filter(word => {
            return Object.entries(preFilled).every(([idx, letter]) => word[idx] === letter);
        });

        if (domains[slot].length === 0) {
            console.warn(`Domain for slot ${slot} is empty after setup.`);
        }
        debugLog(`Domain for slot ${slot}:`, DEBUG_DOMAIN, domains[slot]);
    }
}

// Generate constraints based on slot intersections
function generateConstraints() {
    constraints = {};
    let positionMap = {};

    for (const [slot, positions] of Object.entries(slots)) {
        positions.forEach((pos, idx) => {
            const key = `${pos[0]},${pos[1]}`;
            if (!positionMap[key]) positionMap[key] = [];
            positionMap[key].push({ slot, idx });
        });
    }

    for (const overlaps of Object.values(positionMap)) {
        if (overlaps.length > 1) {
            for (let i = 0; i < overlaps.length; i++) {
                for (let j = i + 1; j < overlaps.length; j++) {
                    const { slot: slot1, idx: idx1 } = overlaps[i];
                    const { slot: slot2, idx: idx2 } = overlaps[j];

                    if (!constraints[slot1]) constraints[slot1] = {};
                    if (!constraints[slot2]) constraints[slot2] = {};

                    if (!constraints[slot1][slot2]) constraints[slot1][slot2] = [];
                    if (!constraints[slot2][slot1]) constraints[slot2][slot1] = [];

                    constraints[slot1][slot2].push([idx1, idx2]);
                    constraints[slot2][slot1].push([idx2, idx1]);
                }
            }
        }
    }

    debugLog("Generated Constraints:", DEBUG_CONSTRAINTS, constraints);
}

// Set up domains for each slot, considering pre-filled letters
function setupDomains() {
    domains = {};
    for (const [slot, positions] of Object.entries(slots)) {
        const length = positions.length;
        const preFilled = {};
        positions.forEach(([r, c], idx) => {
            const key = `${r},${c}`;
            if (cellContents[key]) {
                preFilled[idx] = cellContents[key];
            }
        });

        const possibleWords = wordLengthCache[length] ? wordLengthCache[length] : [];
        domains[slot] = possibleWords.filter(word => {
            return Object.entries(preFilled).every(([idx, letter]) => word[idx] === letter);
        });

        if (domains[slot].length === 0) {
            console.warn(`Domain for slot ${slot} is empty after setup.`);
        }
        debugLog(`Domain for slot ${slot}:`, DEBUG_DOMAIN, domains[slot]);
    }
}

// AC-3 Algorithm with selective logging for queue processing
async function ac3() {
    const queue = [];
    for (const [var1, neighbors] of Object.entries(constraints)) {
        for (const var2 of Object.keys(neighbors)) {
            queue.push([var1, var2]);
        }
    }

    debugLog("Initial AC-3 queue:", DEBUG_CONSTRAINTS, queue);

    while (queue.length) {
        const [var1, var2] = queue.shift();
        if (revise(var1, var2)) {
            debugLog(`Revised domain for ${var1}:`, DEBUG_DOMAIN, domains[var1]);
            if (!domains[var1].length) {
                console.error(`Domain wiped out for ${var1} during AC-3.`);
                return false;
            }
            for (const neighbor of Object.keys(constraints[var1])) {
                if (neighbor !== var2) queue.push([neighbor, var1]);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 0)); // Yield control to the browser
    }
    return true;
}

// Revise function with logging to detect domain reduction issues
function revise(var1, var2) {
    let revised = false;
    const overlaps = constraints[var1][var2];

    const newDomain = [];
    for (const word1 of domains[var1]) {
        let satisfies = false;
        for (const word2 of domains[var2]) {
            let match = true;
            for (const [idx1, idx2] of overlaps) {
                if (word1[idx1] !== word2[idx2]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                satisfies = true;
                break;
            }
        }
        if (satisfies) {
            newDomain.push(word1);
        } else {
            debugLog(`Removing ${word1} from domain of ${var1} due to conflict with ${var2}`, DEBUG_DOMAIN);
            revised = true;
        }
    }

    if (revised) {
        domains[var1] = newDomain;
    }
    return revised;
}

// Backtracking Search with Debugging for variable selection and assignment
function backtrackingSolve(assignment = {}) {
    if (Object.keys(assignment).length === Object.keys(domains).length) {
        solution = assignment;
        debugLog("Solution found:", DEBUG, solution);
        return true;
    }

    const varToAssign = selectUnassignedVariable(assignment);
    debugLog("Selecting variable to assign:", DEBUG_BACKTRACK, varToAssign);

    for (const value of orderDomainValues(varToAssign, assignment)) {
        debugLog(`Trying ${value} for ${varToAssign}`, DEBUG_BACKTRACK);
        if (isConsistent(varToAssign, value, assignment)) {
            assignment[varToAssign] = value;
            const inferences = forwardCheck(varToAssign, value, assignment);
            if (inferences !== false) {
                const result = backtrackingSolve(assignment);
                if (result) return result;
            }
            delete assignment[varToAssign];
            restoreDomains(inferences);
        }
    }
    return false;
}

// MRV and Degree Heuristic with logging
function selectUnassignedVariable(assignment) {
    const unassignedVars = Object.keys(domains).filter(v => !(v in assignment));
    unassignedVars.sort((a, b) => {
        const lenA = domains[a].length;
        const lenB = domains[b].length;
        if (lenA !== lenB) return lenA - lenB;

        const degreeA = constraints[a] ? Object.keys(constraints[a]).length : 0;
        const degreeB = constraints[b] ? Object.keys(constraints[b]).length : 0;
        return degreeB - degreeA;
    });
    debugLog("Unassigned variables after MRV and Degree sort:", DEBUG_BACKTRACK, unassignedVars);
    return unassignedVars[0];
}

// Least Constraining Value Heuristic with debug logging for word conflicts
function orderDomainValues(variable, assignment) {
    return domains[variable].slice().sort((a, b) => {
        const conflictsA = countConflicts(variable, a, assignment);
        const conflictsB = countConflicts(variable, b, assignment);
        debugLog(`Conflicts for ${a}: ${conflictsA}, ${b}: ${conflictsB}`, DEBUG_DOMAIN);
        return conflictsA - conflictsB;
    });
}

// Count conflicts for LCV heuristic
function countConflicts(variable, value, assignment) {
    let conflicts = 0;
    for (const neighbor in constraints[variable]) {
        if (!(neighbor in assignment)) {
            for (const neighborValue of domains[neighbor]) {
                if (!wordsMatch(variable, value, neighbor, neighborValue)) {
                    conflicts++;
                }
            }
        }
    }
    return conflicts;
}

// Consistency check for backtracking
function isConsistent(variable, value, assignment) {
    for (const neighbor in constraints[variable]) {
        if (neighbor in assignment) {
            if (!wordsMatch(variable, value, neighbor, assignment[neighbor])) {
                debugLog(`Inconsistent assignment: ${value} for ${variable} conflicts with ${assignment[neighbor]} for ${neighbor}`, DEBUG_BACKTRACK);
                return false;
            }
        }
    }
    return true;
}

// Check if two words match at their overlapping positions
function wordsMatch(var1, word1, var2, word2) {
    const overlaps = constraints[var1][var2];
    for (const [idx1, idx2] of overlaps) {
        if (word1[idx1] !== word2[idx2]) return false;
    }
    return true;
}

// Forward checking with selective logging
function forwardCheck(variable, value, assignment) {
    const inferences = {};
    for (const neighbor in constraints[variable]) {
        if (!(neighbor in assignment)) {
            if (!inferences[neighbor]) inferences[neighbor] = domains[neighbor].slice();

            domains[neighbor] = domains[neighbor].filter(val => wordsMatch(variable, value, neighbor, val));
            if (!domains[neighbor].length) {
                debugLog(`Domain wiped out for ${neighbor} during forward check after assigning ${value} to ${variable}`, DEBUG_DOMAIN);
                return false;
            } else {
                debugLog(`Domain for ${neighbor} after assigning ${value} to ${variable}:`, DEBUG_DOMAIN, domains[neighbor]);
            }
        }
    }
    return inferences;
}

// Restore domains after backtracking
function restoreDomains(inferences) {
    if (!inferences) return;
    for (const variable in inferences) {
        domains[variable] = inferences[variable];
    }
}

// Solve the crossword with enhanced logging for each step
async function solveCrossword() {
    document.getElementById("result").textContent = "Setting up constraints...";
    generateSlots();

    if (Object.keys(slots).length === 0) {
        alert("No numbered slots found to solve.");
        return;
    }

    await new Promise(resolve => setTimeout(resolve, 10)); // Allow UI update

    debugLog("Starting AC-3 algorithm...", DEBUG);
    document.getElementById("result").textContent = "Running AC-3 algorithm...";

    if (await ac3()) {
        debugLog("AC-3 algorithm completed successfully.", DEBUG);
        document.getElementById("result").textContent = "Starting backtracking search...";
        const result = backtrackingSolve();
        if (result) {
            displaySolution();
            document.getElementById("result").textContent = "Crossword solved!";
            displayWordList();
        } else {
            document.getElementById("result").textContent = "No possible solution.";
        }
    } else {
        document.getElementById("result").textContent = "No solution due to constraints.";
    }
}

// Display the solution on the grid with solved cells highlighted
function displaySolution() {
    for (const [slot, word] of Object.entries(solution)) {
        const positions = slots[slot];

        positions.forEach(([row, col], idx) => {
            const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.textContent = word[idx];
                cell.classList.add("solved-cell");
            }
        });
    }
    debugLog("Solution displayed on the grid.", DEBUG);
}

// Display word list organized by slot number and direction
function displayWordList() {
    const resultArea = document.getElementById("result");
    const acrossWords = [];
    const downWords = [];

    for (const slot of Object.keys(slots)) {
        const word = solution[slot];
        if (slot.endsWith("ACROSS")) {
            acrossWords.push(`${slot}: ${word}`);
        } else if (slot.endsWith("DOWN")) {
            downWords.push(`${slot}: ${word}`);
        }
    }

    resultArea.innerHTML = `<h3>Across:</h3><p>${acrossWords.join('<br>')}</p><h3>Down:</h3><p>${downWords.join('<br>')}</p>`;
}

// Initialize word list on page load
window.onload = loadWords;
