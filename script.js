let grid = [];
let words = [];
let slots = { across: {}, down: {} };
let constraints = {};
let solution = {};
let isNumberEntryMode = false;
let currentNumber = 1;
let wordLengthCache = {};

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
        cacheWordsByLength();
    } catch (error) {
        console.error("Error loading words:", error);
        alert("Error loading words. Please check if Words.txt is available.");
    }
}

// Cache words by length to optimize getPossibleWords
function cacheWordsByLength() {
    wordLengthCache = {};
    for (const word of words) {
        const len = word.length;
        if (!wordLengthCache[len]) wordLengthCache[len] = [];
        wordLengthCache[len].push(word);
    }
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
}

// Toggle cell between black and white, or add a number in number-entry mode
function toggleCellOrAddNumber(cell) {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    if (isNumberEntryMode) {
        if (!cell.classList.contains("black-cell") && !cell.textContent) {
            cell.textContent = currentNumber++;
            grid[row][col] = cell.textContent;
        } else {
            alert("Number can only be placed on empty white cells.");
        }
    } else {
        if (cell.classList.contains("black-cell")) {
            cell.classList.replace("black-cell", "white-cell");
            cell.textContent = "";
            grid[row][col] = " ";
        } else if (cell.classList.contains("white-cell")) {
            cell.classList.replace("white-cell", "black-cell");
            cell.textContent = "";
            grid[row][col] = "#";
        }
    }
}

// Start number-entry mode, continuing from the highest number on the grid
function startNumberEntryMode() {
    currentNumber = getMaxNumberOnGrid() + 1;
    isNumberEntryMode = true;
    document.getElementById("stopNumberEntryButton").style.display = "inline";
}

// Stop number-entry mode
function stopNumberEntryMode() {
    isNumberEntryMode = false;
    document.getElementById("stopNumberEntryButton").style.display = "none";
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

// Find across and down slots with connected components
function generateSlots() {
    slots = { across: {}, down: {} };
    let hasWhiteCells = false;

    for (let row of grid) {
        for (let cell of row) {
            if (cell === " ") hasWhiteCells = true;
        }
    }

    console.log("Grid has white cells:", hasWhiteCells);

    if (!hasWhiteCells) {
        console.log("No white cells found; cannot generate slots.");
        return;
    }

    // Continue with slot generation if white cells are present
    console.log("Generating across slots...");
    for (let r = 0; r < grid.length; r++) {
        findAcrossSlots(r);
    }
    console.log("Across slots found:", slots.across);

    console.log("Generating down slots...");
    for (let c = 0; c < grid[0].length; c++) {
        findDownSlots(c);
    }
    console.log("Down slots found:", slots.down);

    generateConstraints();
    console.log("Generated constraints:", constraints);
}

// Helper to find across slots
function findAcrossSlots(row) {
    let c = 0;
    while (c < grid[row].length) {
        if (grid[row][c] !== "#") {
            const { positions, hasNumber } = getConnectedCells(row, c, "across");
            if (positions.length > 1 && hasNumber) {
                const startNumber = `A${grid[row][positions[0][1]]}`;  // Prefix with "A" for across
                slots.across[startNumber] = positions;
                console.log(`Across slot found: Start number ${startNumber} at row ${row} with positions`, positions);
            }
            c += positions.length;
        } else {
            c++;
        }
    }
}

function findDownSlots(col) {
    let r = 0;
    while (r < grid.length) {
        if (grid[r][col] !== "#") {
            const { positions, hasNumber } = getConnectedCells(r, col, "down");
            if (positions.length > 1 && hasNumber) {
                const startNumber = `D${grid[positions[0][0]][col]}`;  // Prefix with "D" for down
                slots.down[startNumber] = positions;
                console.log(`Down slot found: Start number ${startNumber} at column ${col} with positions`, positions);
            }
            r += positions.length;
        } else {
            r++;
        }
    }
}

// Depth-first search to get connected cells
function getConnectedCells(r, c, direction) {
    const stack = [[r, c]];
    const visited = new Set();
    const positions = [];
    let hasNumber = false;

    while (stack.length) {
        const [row, col] = stack.pop();
        const key = `${row},${col}`;

        if (!visited.has(key) && grid[row][col] !== "#") {
            visited.add(key);
            positions.push([row, col]);

            const cellNumber = parseInt(grid[row][col]);
            if (!isNaN(cellNumber)) hasNumber = true;

            if (direction === "across") {
                if (col < grid[row].length - 1) stack.push([row, col + 1]);
            } else {
                if (row < grid.length - 1) stack.push([row + 1, col]);
            }
        }
    }

    return { positions, hasNumber };
}

// Generate constraints between intersecting slots
function generateConstraints() {
    constraints = {};

    for (const acrossSlot in slots.across) {
        for (const downSlot in slots.down) {
            const acrossPositions = slots.across[acrossSlot];
            const downPositions = slots.down[downSlot];

            for (let aIdx = 0; aIdx < acrossPositions.length; aIdx++) {
                for (let dIdx = 0; dIdx < downPositions.length; dIdx++) {
                    const [aRow, aCol] = acrossPositions[aIdx];
                    const [dRow, dCol] = downPositions[dIdx];

                    if (aRow === dRow && aCol === dCol) {
                        if (!constraints[acrossSlot]) constraints[acrossSlot] = [];
                        if (!constraints[downSlot]) constraints[downSlot] = [];
                        constraints[acrossSlot].push({ slot: downSlot, pos: [aIdx, dIdx] });
                        constraints[downSlot].push({ slot: acrossSlot, pos: [dIdx, aIdx] });
                        console.log(`Constraint added between slots ${acrossSlot} and ${downSlot} at position (${aRow}, ${aCol})`);
                    }
                }
            }
        }
    }
    console.log("Final constraints:", constraints);
}

// Display loading spinner during crossword solving
async function solveCrossword() {
    console.log("Current grid state:", grid);
    console.log("Starting to solve crossword...");
    generateSlots(); // Ensure slots and constraints are generated before solving
    console.log("Generated slots:", slots);

    document.getElementById("loadingSpinner").style.display = "block";
    document.getElementById("result").textContent = "Solving...";

    setTimeout(() => {
        console.log("Calling backtrackingSolve...");
        const result = backtrackingSolve();
        document.getElementById("loadingSpinner").style.display = "none";
        
        if (result) {
            console.log("Solution found, displaying solution...");
            displaySolution();
            document.getElementById("result").textContent = "Crossword solved!";
            displayWordList();
        } else {
            console.log("No possible solution found.");
            document.getElementById("result").textContent = "No possible solution.";
        }
    }, 10);
}

function getPossibleWords(slot) {
    // Determine if the slot is across or down and get its length
    const isAcross = slot in slots.across;
    const positions = isAcross ? slots.across[slot] : slots.down[slot];
    const length = positions.length;

    // Retrieve words from the cache that match the required length
    const possibleWords = wordLengthCache[length] || [];
    console.log(`Possible words for slot ${slot} (length ${length}):`, possibleWords);

    return possibleWords;
}

function selectUnassignedSlot(assignment) {
    // Look for the first unassigned across slot
    for (const slot in slots.across) {
        if (!(slot in assignment)) {
            return slot;
        }
    }
    
    // If no across slots are available, look for unassigned down slots
    for (const slot in slots.down) {
        if (!(slot in assignment)) {
            return slot;
        }
    }
    
    // If no unassigned slots are found, return null
    return null;
}

function isConsistent(slot, word, assignment) {
    const isAcross = slot in slots.across;
    const positions = isAcross ? slots.across[slot] : slots.down[slot];

    // Check that word fits in the slot
    if (word.length !== positions.length) return false;

    // Check each constraint where this slot intersects another slot
    const slotConstraints = constraints[slot] || [];
    for (const { slot: otherSlot, pos: [thisPos, otherPos] } of slotConstraints) {
        const otherWord = assignment[otherSlot];

        // If the other slot is assigned, check if the letters align
        if (otherWord && word[thisPos] !== otherWord[otherPos]) {
            return false;
        }
    }

    return true;
}

// Backtracking algorithm with constraint satisfaction
function backtrackingSolve(assignment = {}) {
    console.log("Running backtrackingSolve with current assignment:", assignment);

    if (Object.keys(assignment).length === Object.keys(slots.across).length + Object.keys(slots.down).length) {
        solution = assignment;
        console.log("Assignment complete, solution found:", solution);
        return true;
    }

    const slot = selectUnassignedSlot(assignment);
    if (!slot) {
        console.log("No unassigned slot found, returning false.");
        return false;
    }

    console.log("Selected slot:", slot);
    const possibleWords = getPossibleWords(slot);
    console.log("Possible words for slot", slot, ":", possibleWords);

    for (const word of possibleWords) {
        console.log("Trying word:", word);
        if (isConsistent(slot, word, assignment)) {
            assignment[slot] = word;
            console.log("Word fits, updated assignment:", assignment);

            if (backtrackingSolve(assignment)) return true;

            console.log("Backtracking, removing word from assignment:", word);
            delete assignment[slot];
        }
    }
    console.log("No valid words for slot", slot, ", backtracking...");
    return false;
}

// Display the solution on the grid
function displaySolution() {
    for (const slot in solution) {
        const word = solution[slot];
        const positions = slots[slot in slots.across ? 'across' : 'down'][slot];

        positions.forEach(([row, col], idx) => {
            const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.textContent = word[idx];
                cell.classList.add("solved-cell");
            }
        });
    }
}

// Display word list organized by slot number and direction
function displayWordList() {
    let acrossWords = [];
    let downWords = [];

    Object.keys(slots.across).sort((a, b) => a - b).forEach(slot => {
        acrossWords.push(`${slot}: ${solution[slot]}`);
    });
    Object.keys(slots.down).sort((a, b) => a - b).forEach(slot => {
        downWords.push(`${slot}: ${solution[slot]}`);
    });

    const resultArea = document.getElementById("result");
    resultArea.innerHTML = `<h3>Across:</h3><p>${acrossWords.join('<br>')}</p><h3>Down:</h3><p>${downWords.join('<br>')}</p>`;
}

// Initialize word list on page load
window.onload = loadWords;
