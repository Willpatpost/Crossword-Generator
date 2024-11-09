// Global variables and debugging flags
let grid = [];
let words = [];
let slots = {};
let constraints = {};
let solution = {};
let isNumberEntryMode = false;
let currentNumber = 1;
let wordLengthCache = {};
let domains = {};
let cellContents = {};

// Example: Disable specific flags temporarily
const DEBUG = true; // Global toggle for essential debugging logs
const DEBUG_DOMAIN = false; // Temporarily disable domain-related logs
const DEBUG_BACKTRACK = true; // Focus on backtracking logs
const DEBUG_CONSTRAINTS = false; // Disable constraints logs for now
// Adjusted debugLog function for more selective logging
function debugLog(message, flag = DEBUG, ...optionalParams) {
    if (flag) {
        // Only log messages with specific keywords for critical debugging
        if (message.includes("Domain wiped out") || message.includes("No possible solution")) {
            console.log(message, ...optionalParams);
        }
    }
}

// Event listeners for buttons
document.getElementById("generateGridButton").addEventListener("click", generateGrid);
document.getElementById("startNumberEntryButton").addEventListener("click", startNumberEntryMode);
document.getElementById("stopNumberEntryButton").addEventListener("click", stopNumberEntryMode);
document.getElementById("solveCrosswordButton").addEventListener("click", solveCrossword);

// Load words from an external file and cache by word length
async function loadWords() {
    try {
        const response = await fetch('Data/Words.txt');
        if (!response.ok) throw new Error("Could not load words file");

        const text = await response.text();
        words = text.split('\n').map(word => word.trim().toUpperCase());
        
        if (!words.every(word => /^[A-Z]+$/.test(word))) {
            throw new Error("File contains invalid words. Ensure all entries are alphabetic.");
        }
        
        cacheWordsByLength();
        debugLog("Words loaded:", DEBUG, words.length);
    } catch (error) {
        console.error("Error loading words:", error);
        alert("Error loading words. Please check if Words.txt is available and correctly formatted.");
    }
}

// Cache words by length to optimize domain setup
function cacheWordsByLength() {
    wordLengthCache = {};
    for (const word of words) {
        const len = word.length;
        if (!wordLengthCache[len]) wordLengthCache[len] = [];
        wordLengthCache[len].push(word);
    }
    debugLog("Word length cache created.", DEBUG);
}

// Initialize the grid with black cells
function generateGrid() {
    const rows = parseInt(document.getElementById("rows").value);
    const cols = parseInt(document.getElementById("columns").value);

    if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) {
        alert("Please enter valid positive numbers for rows and columns.");
        return;
    }

    grid = Array.from({ length: rows }, () => Array(cols).fill("#"));
    const gridContainer = document.getElementById("gridContainer");
    gridContainer.innerHTML = "";

    for (let r = 0; r < rows; r++) {
        const rowDiv = document.createElement("div");
        rowDiv.classList.add("grid-row");

        for (let c = 0; c < cols; c++) {
            const cellDiv = document.createElement("div");
            cellDiv.classList.add("grid-cell", "black-cell");
            cellDiv.dataset.row = r;
            cellDiv.dataset.col = c;
            cellDiv.addEventListener("click", () => toggleCellOrAddNumber(cellDiv));
            rowDiv.appendChild(cellDiv);
        }
        gridContainer.appendChild(rowDiv);
    }

    debugLog("Grid generated with rows:", DEBUG, rows, "columns:", cols);
}

// Toggle cell between black and white, add numbers, or pre-filled letters
function toggleCellOrAddNumber(cell) {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    if (isNumberEntryMode) {
        if (!cell.classList.contains("black-cell") && !cell.textContent) {
            cell.textContent = currentNumber++;
            grid[row][col] = cell.textContent;
            cell.classList.add("numbered-cell");
        } else {
            alert("Number can only be placed on empty white cells.");
        }
    } else if (cell.classList.contains("black-cell")) {
        cell.classList.replace("black-cell", "white-cell");
        cell.textContent = "";
        grid[row][col] = " ";
    } else if (cell.classList.contains("white-cell")) {
        let letter = prompt("Enter a letter (or leave blank to toggle back to black):");
        if (letter) {
            letter = letter.toUpperCase();
            if (/^[A-Z]$/.test(letter)) {
                cell.textContent = letter;
                cell.classList.add("prefilled-cell");
                grid[row][col] = letter;
            } else {
                alert("Please enter a single letter A-Z.");
            }
        } else {
            cell.classList.replace("white-cell", "black-cell");
            cell.textContent = "";
            grid[row][col] = "#";
        }
    } else if (cell.classList.contains("prefilled-cell")) {
        cell.classList.remove("prefilled-cell");
        cell.classList.add("white-cell");
        cell.textContent = "";
        grid[row][col] = " ";
    }
}

// Start number-entry mode
function startNumberEntryMode() {
    currentNumber = getMaxNumberOnGrid() + 1;
    isNumberEntryMode = true;
    document.getElementById("stopNumberEntryButton").style.display = "inline";
    debugLog("Number entry mode started. Current number:", currentNumber);
}

// Stop number-entry mode
function stopNumberEntryMode() {
    isNumberEntryMode = false;
    document.getElementById("stopNumberEntryButton").style.display = "none";
    debugLog("Number entry mode stopped.");
}

// Get the maximum number currently on the grid
function getMaxNumberOnGrid() {
    let maxNumber = 0;
    for (const row of grid) {
        for (const cell of row) {
            const cellNumber = parseInt(cell);
            if (!isNaN(cellNumber) && cellNumber > maxNumber) maxNumber = cellNumber;
        }
    }
    return maxNumber;
}

// Generate slots and handle pre-filled letters
function generateSlots() {
    slots = {};
    domains = {};
    cellContents = {};

    const rows = grid.length;
    const cols = grid[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = grid[r][c];
            if (/^[A-Z]$/.test(cell)) {
                cellContents[`${r},${c}`] = cell;
            } else if (cell !== "#" && cell.trim() !== "") {
                cellContents[`${r},${c}`] = null;
            }
        }
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = grid[r][c];
            if (/^\d+$/.test(cell)) {
                if (c === 0 || grid[r][c - 1] === "#") {
                    const positions = getSlotPositions(r, c, "across");
                    if (positions.length >= 2) {
                        const slotName = `${cell}ACROSS`;
                        slots[slotName] = positions;
                    }
                }
                if (r === 0 || grid[r - 1][c] === "#") {
                    const positions = getSlotPositions(r, c, "down");
                    if (positions.length >= 2) {
                        const slotName = `${cell}DOWN`;
                        slots[slotName] = positions;
                    }
                }
            }
        }
    }

    debugLog("Generated Slots:", DEBUG_CONSTRAINTS, slots);

    generateConstraints();
    setupDomains();
}

// Helper function to get slot positions in a direction
function getSlotPositions(r, c, direction) {
    const positions = [];
    const rows = grid.length;
    const cols = grid[0].length;

    while (r < rows && c < cols && grid[r][c] !== "#") {
        positions.push([r, c]);
        if (direction === "across") {
            c++;
        } else {
            r++;
        }
    }

    return positions;
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
