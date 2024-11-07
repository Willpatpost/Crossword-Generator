let grid = [];
let words = [];
let slots = { across: {}, down: {} };
let constraints = {};
let solution = {};

// Load words from an external file
async function loadWords() {
    const response = await fetch('Data/words.txt');
    const text = await response.text();
    words = text.split('\n').map(word => word.trim().toUpperCase());
}

// Initialize the grid with empty cells based on selected size
function generateGrid() {
    const gridSize = document.getElementById("gridSize").value.split("x");
    const rows = parseInt(gridSize[0]);
    const cols = parseInt(gridSize[1]);

    grid = Array.from({ length: rows }, () => Array(cols).fill(" "));

    const gridContainer = document.getElementById("gridContainer");
    gridContainer.innerHTML = ""; // Clear existing grid

    for (let r = 0; r < rows; r++) {
        const rowDiv = document.createElement("div");
        rowDiv.classList.add("grid-row");

        for (let c = 0; c < cols; c++) {
            const cellDiv = document.createElement("div");
            cellDiv.classList.add("grid-cell");
            cellDiv.dataset.row = r;
            cellDiv.dataset.col = c;

            // Click event to toggle cell to black or add a number
            cellDiv.addEventListener("click", () => toggleCell(cellDiv));
            cellDiv.addEventListener("dblclick", () => addNumber(cellDiv));

            rowDiv.appendChild(cellDiv);
        }
        gridContainer.appendChild(rowDiv);
    }
}

// Toggle cell between white and black (blocked)
function toggleCell(cell) {
    const row = cell.dataset.row;
    const col = cell.dataset.col;

    if (cell.classList.contains("black-cell")) {
        cell.classList.remove("black-cell");
        grid[row][col] = " ";
    } else {
        cell.classList.add("black-cell");
        grid[row][col] = "#";
    }
}

// Add number to the cell for word starting points
function addNumber(cell) {
    const number = prompt("Enter a number for this cell:");
    if (number && !isNaN(number)) {
        cell.textContent = number;
        const row = cell.dataset.row;
        const col = cell.dataset.col;
        grid[row][col] = number;
    }
}

// Generate slots based on the grid layout
function generateSlots() {
    slots = { across: {}, down: {} };
    let slotId = 1;

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
                if (positions.length > 1) {
                    let slotKey = startNumber && !isNaN(startNumber) ? startNumber + "A" : slotId + "A";
                    slots.across[slotKey] = positions;
                    slotId++;
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
                if (positions.length > 1) {
                    let slotKey = startNumber && !isNaN(startNumber) ? startNumber + "D" : slotId + "D";
                    slots.down[slotKey] = positions;
                    slotId++;
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
        const positions = slots[slot.includes("A") ? "across" : "down"][slot];

        positions.forEach(([row, col], idx) => {
            const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.textContent = word[idx];
            }
        });
    }
}

// Initialize word list on page load
window.onload = loadWords;
