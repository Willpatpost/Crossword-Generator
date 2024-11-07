let grid = [];
let words = [];
let slots = { across: {}, down: {} };
let constraints = {};
let solution = {};
let isNumberEntryMode = false;
let currentNumber = 1;
let wordLengthCache = {};

// Load words from an external file and cache by word length
async function loadWords() {
    try {
        const response = await fetch('Data/Words.txt');
        const text = await response.text();
        words = text.split('\n').map(word => word.trim().toUpperCase());
        cacheWordsByLength();
    } catch (error) {
        console.error("Error loading words:", error);
    }
}

// Cache words by length to optimize getPossibleWords
function cacheWordsByLength() {
    wordLengthCache = {};
    for (const word of words) {
        const len = word.length;
        if (!wordLengthCache[len]) {
            wordLengthCache[len] = [];
        }
        wordLengthCache[len].push(word);
    }
}

// Initialize the grid with black cells and load from local storage if available
function generateGrid() {
    const rows = parseInt(document.getElementById("rows").value);
    const cols = parseInt(document.getElementById("columns").value);

    if (isNaN(rows) || isNaN(cols)) {
        alert("Please enter valid numbers for rows and columns.");
        return;
    }

    grid = Array.from({ length: rows }, () => Array(cols).fill("#"));
    restoreGridFromLocalStorage();

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
            saveGridToLocalStorage();
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
        saveGridToLocalStorage();
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
    for (let row of grid) {
        for (let cell of row) {
            const cellNumber = parseInt(cell);
            if (!isNaN(cellNumber) && cellNumber > maxNumber) {
                maxNumber = cellNumber;
            }
        }
    }
    return maxNumber;
}

// Find across and down slots with connected components
function generateSlots() {
    slots = { across: {}, down: {} };

    for (let r = 0; r < grid.length; r++) {
        findAcrossSlots(r);
    }
    for (let c = 0; c < grid[0].length; c++) {
        findDownSlots(c);
    }

    generateConstraints();
}

// Helper to find across slots
function findAcrossSlots(row) {
    let c = 0;
    while (c < grid[row].length) {
        if (grid[row][c] !== "#") {
            const { positions, hasNumber } = getConnectedCells(row, c, "across");
            if (positions.length > 1 && hasNumber) {
                const startNumber = grid[row][positions[0][1]];
                slots.across[startNumber] = positions;
            }
            c += positions.length;
        } else {
            c++;
        }
    }
}

// Helper to find down slots
function findDownSlots(col) {
    let r = 0;
    while (r < grid.length) {
        if (grid[r][col] !== "#") {
            const { positions, hasNumber } = getConnectedCells(r, col, "down");
            if (positions.length > 1 && hasNumber) {
                const startNumber = grid[positions[0][0]][col];
                slots.down[startNumber] = positions;
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
                    }
                }
            }
        }
    }
}

// Save the current grid to local storage
function saveGridToLocalStorage() {
    localStorage.setItem("crosswordGrid", JSON.stringify(grid));
}

// Restore grid from local storage
function restoreGridFromLocalStorage() {
    const savedGrid = localStorage.getItem("crosswordGrid");
    if (savedGrid) {
        grid = JSON.parse(savedGrid);
    }
}

// Solve the crossword puzzle using backtracking
function solveCrossword() {
    generateSlots();

    const result = backtrackingSolve();
    if (result) {
        displaySolution();
        document.getElementById("result").textContent = "Crossword solved!";
        displayWordList(); // Display the word list by slots
    } else {
        document.getElementById("result").textContent = "No possible solution.";
    }
}

// Backtracking algorithm with constraint satisfaction and MRV heuristic
function backtrackingSolve(assignment = {}) {
    if (Object.keys(assignment).length === Object.keys(slots.across).length + Object.keys(slots.down).length) {
        solution = assignment;
        return true;
    }

    const slot = selectUnassignedSlot(assignment);
    const possibleWords = getPossibleWords(slot);

    for (const word of possibleWords) {
        if (isConsistent(slot, word, assignment)) {
            assignment[slot] = word;

            if (backtrackingSolve(assignment)) return true;

            delete assignment[slot];
        }
    }
    return false;
}

// Select the next unassigned slot using Minimum Remaining Value (MRV) heuristic
function selectUnassignedSlot(assignment) {
    return Object.keys(slots.across)
        .concat(Object.keys(slots.down))
        .filter(slot => !assignment[slot])
        .sort((a, b) => getPossibleWords(a).length - getPossibleWords(b).length)[0];
}

// Get possible words that match the slot length from the cached word list
function getPossibleWords(slot) {
    const slotLength = slots.across[slot] ? slots.across[slot].length : slots.down[slot].length;
    return wordLengthCache[slotLength] || [];
}

// Check if placing a word in a slot is consistent with constraints
function isConsistent(slot, word, assignment) {
    if (!constraints[slot]) return true;

    for (const constraint of constraints[slot]) {
        const { slot: otherSlot, pos: [pos1, pos2] } = constraint;
        const otherWord = assignment[otherSlot];

        if (otherWord && word[pos1] !== otherWord[pos2]) {
            return false;
        }
    }
    return true;
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
                cell.classList.add("solved-cell"); // Add a class for solved cells for styling
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
