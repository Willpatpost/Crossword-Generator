let grid = [];
let words = [];
let slots = { across: {}, down: {} };
let constraints = {};
let solution = {};
let isNumberEntryMode = false;
let currentNumber = 1;

// Load words from an external file
async function loadWords() {
    const response = await fetch('Data/Words.txt');
    const text = await response.text();
    words = text.split('\n').map(word => word.trim().toUpperCase());
}

// Initialize the grid with black cells
function generateGrid() {
    const rows = parseInt(document.getElementById("rows").value);
    const cols = parseInt(document.getElementById("columns").value);

    grid = Array.from({ length: rows }, () => Array(cols).fill("#")); // All cells start as black

    const gridContainer = document.getElementById("gridContainer");
    gridContainer.innerHTML = ""; // Clear existing grid

    for (let r = 0; r < rows; r++) {
        const rowDiv = document.createElement("div");
        rowDiv.classList.add("grid-row");

        for (let c = 0; c < cols; c++) {
            const cellDiv = document.createElement("div");
            cellDiv.classList.add("grid-cell", "black-cell"); // Start each cell as black
            cellDiv.dataset.row = r;
            cellDiv.dataset.col = c;

            // Event for toggling cell color or adding a number
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
        // Only allow number entry in white cells without existing numbers
        if (!cell.classList.contains("black-cell") && !cell.textContent) {
            cell.textContent = currentNumber++;
            grid[row][col] = cell.textContent;
        }
    } else {
        // Toggle between black and white if not in number-entry mode
        if (cell.classList.contains("black-cell")) {
            cell.classList.remove("black-cell");
            cell.classList.add("white-cell");
            cell.textContent = ""; // Clear any number in the cell
            grid[row][col] = " ";
        } else if (cell.classList.contains("white-cell")) {
            cell.classList.remove("white-cell");
            cell.classList.add("black-cell");
            cell.textContent = ""; // Clear any number in the cell
            grid[row][col] = "#";
        }
    }
}

// Start number-entry mode, continuing from the highest number on the grid
function startNumberEntryMode() {
    currentNumber = getMaxNumberOnGrid() + 1; // Start numbering from the next available number
    isNumberEntryMode = true;
    document.getElementById("stopNumberEntryButton").style.display = "inline";
}

// Stop number-entry mode
function stopNumberEntryMode() {
    isNumberEntryMode = false;
    document.getElementById("stopNumberEntryButton").style.display = "none";
}

// Get the maximum number currently on the grid to continue numbering in sequence
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

// Generate slots based on the grid layout and determine directions
function generateSlots() {
    slots = { across: {}, down: {} };

    // Across Slots
    for (let r = 0; r < grid.length; r++) {
        let c = 0;
        while (c < grid[r].length) {
            if (grid[r][c] !== "#") {
                let positions = [];
                let startNumber = grid[r][c]; // Check if there's a number at the start of the slot
                while (c < grid[r].length && grid[r][c] !== "#") {
                    positions.push([r, c]);
                    c++;
                }
                if (positions.length > 1 && startNumber && !isNaN(startNumber)) {
                    slots.across[startNumber] = positions;
                }
            } else {
                c++;
            }
        }
    }

    // Down Slots
    for (let c = 0; c < grid[0].length; c++) {
        let r = 0;
        while (r < grid.length) {
            if (grid[r][c] !== "#") {
                let positions = [];
                let startNumber = grid[r][c];
                while (r < grid.length && grid[r][c] !== "#") {
                    positions.push([r, c]);
                    r++;
                }
                if (positions.length > 1 && startNumber && !isNaN(startNumber)) {
                    slots.down[startNumber] = positions;
                }
            } else {
                r++;
            }
        }
    }

    generateConstraints();
    console.log("Generated Slots:", slots);
}

// Generate constraints between intersecting slots
function generateConstraints() {
    constraints = {};

    for (let acrossSlot in slots.across) {
        for (let downSlot in slots.down) {
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
    console.log("Generated Constraints:", constraints);
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

// Backtracking algorithm with constraint satisfaction
function backtrackingSolve(assignment = {}) {
    if (Object.keys(assignment).length === Object.keys(slots.across).length + Object.keys(slots.down).length) {
        solution = assignment;
        return true;
    }

    const slot = selectUnassignedSlot(assignment);
    const possibleWords = getPossibleWords(slot);

    for (let word of possibleWords) {
        if (isConsistent(slot, word, assignment)) {
            assignment[slot] = word;

            if (backtrackingSolve(assignment)) return true;

            delete assignment[slot];
        }
    }
    return false;
}

// Select the next unassigned slot
function selectUnassignedSlot(assignment) {
    return Object.keys(slots.across).concat(Object.keys(slots.down)).find(slot => !assignment[slot]);
}

// Get possible words that match the slot length
function getPossibleWords(slot) {
    const slotLength = slots.across[slot] ? slots.across[slot].length : slots.down[slot].length;
    return words.filter(word => word.length === slotLength);
}

// Check if placing a word in a slot is consistent with constraints
function isConsistent(slot, word, assignment) {
    if (!constraints[slot]) return true;

    for (let constraint of constraints[slot]) {
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
            }
        });
    }
}

// Display word list organized by slot number and direction
function displayWordList() {
    let acrossWords = [];
    let downWords = [];

    // Collect words for across and down, sorted by slot number
    Object.keys(slots.across).sort((a, b) => a - b).forEach(slot => {
        acrossWords.push(`${slot}: ${solution[slot]}`);
    });
    Object.keys(slots.down).sort((a, b) => a - b).forEach(slot => {
        downWords.push(`${slot}: ${solution[slot]}`);
    });

    // Display the word list in the result area
    const resultArea = document.getElementById("result");
    resultArea.innerHTML = `<h3>Across:</h3><p>${acrossWords.join('<br>')}</p><h3>Down:</h3><p>${downWords.join('<br>')}</p>`;
}

// Initialize word list on page load
window.onload = loadWords;
