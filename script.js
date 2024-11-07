// Placeholder variables for grid, crossword setup, and slots
let grid = [];  // Stores the current crossword grid
let words = [];  // Stores the word list for crossword generation
let slots = {};  // Stores slots for across and down words

// Load words from an external file (words.txt)
async function loadWords() {
    const response = await fetch('words.txt');
    const text = await response.text();
    words = text.split('\n').map(word => word.trim().toUpperCase());
}

// Initialize the grid with empty cells based on the selected size
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

            cellDiv.addEventListener("click", () => toggleCell(cellDiv));

            rowDiv.appendChild(cellDiv);
        }
        gridContainer.appendChild(rowDiv);
    }
}

// Toggle cell between white (empty) and black (blocked)
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

// Generate slots based on the grid layout
function generateSlots() {
    slots = { across: {}, down: {} };
    let slotId = 1;

    // Generate Across Slots
    for (let r = 0; r < grid.length; r++) {
        let c = 0;
        while (c < grid[r].length) {
            if (grid[r][c] !== "#") {
                let positions = [];
                while (c < grid[r].length && grid[r][c] !== "#") {
                    positions.push([r, c]);
                    c++;
                }
                if (positions.length > 1) {  // Only consider slots with length > 1
                    slots.across[slotId + "A"] = positions;
                    slotId++;
                }
            } else {
                c++;
            }
        }
    }

    // Generate Down Slots
    for (let c = 0; c < grid[0].length; c++) {
        let r = 0;
        while (r < grid.length) {
            if (grid[r][c] !== "#") {
                let positions = [];
                while (r < grid.length && grid[r][c] !== "#") {
                    positions.push([r, c]);
                    r++;
                }
                if (positions.length > 1) {
                    slots.down[slotId + "D"] = positions;
                    slotId++;
                }
            } else {
                r++;
            }
        }
    }

    console.log("Generated Slots:", slots);  // For debugging
}

// Solve the crossword puzzle using backtracking
function solveCrossword() {
    generateSlots();  // Generate slots each time a solution is requested

    const result = backtrackingSolve();

    if (result) {
        displaySolution();
        document.getElementById("result").textContent = "Crossword solved!";
    } else {
        document.getElementById("result").textContent = "No possible solution.";
    }
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

// Placeholder function for backtracking
function backtrackingSolve() {
    // Implement AC-3, forward checking, MRV heuristic, etc., here
    return true;  // Placeholder return value
}

// Initialize word list on page load
window.onload = loadWords;
