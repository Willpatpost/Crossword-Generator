(() => {
    'use strict';

    // ------------------------- Configuration & Global Variables -------------------------
    const DEBUG = true; // Toggle debug messages
    let isNumberEntryMode = false;
    let isLetterEntryMode = false;
    let isDragMode = false;
    let isDragging = false;

    let grid = [];
    let words = [];
    let slots = new Map();
    let constraints = new Map();
    let solution = {};
    let domains = new Map();
    let cellContents = new Map();
    let currentNumber = 1;
    let recursiveCalls = 0;
    let performanceData = {};

    const wordLengthCache = new Map();
    let letterFrequencies = null;

    let toggleToBlack = false; // used in drag mode
    let isSolving = false;

    // Predefined puzzles
    const predefinedPuzzles = [
        {
            name: "Easy",
            grid: [
                ["#", "#", "#", "#", "#", "#", "#"],
                ["#", "1", " ", "2", " ", "3", "#"],
                ["#", "#", "#", " ", "#", " ", "#"],
                ["#", "#", "4", " ", "5", " ", "#"],
                ["#", "6", "#", "7", " ", " ", "#"],
                ["#", "8", " ", " ", " ", " ", "#"],
                ["#", " ", "#", "#", " ", "#", "#"],
                ["#", "#", "#", "#", "#", "#", "#"]
            ]
        },
        {
            name: "Medium",
            grid: [
                ["#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#"],
                ["#", "#", "#", "1", " ", " ", " ", " ", " ", "2", "#", "#", "#", "#"],
                ["#", "#", "#", " ", "#", "#", "#", "#", "#", " ", "#", "#", "3", "#"],
                ["#", "#", "#", " ", "#", "#", "#", "#", "#", " ", "#", "#", " ", "#"],
                ["#", "#", "#", " ", "#", "#", "4", " ", "5", " ", " ", "#", " ", "#"],
                ["#", "#", "#", " ", "#", "#", "#", "#", " ", "#", "#", "#", " ", "#"],
                ["#", "#", "#", "#", "#", "6", "#", "#", "7", " ", "8", " ", " ", "#"],
                ["#", "#", "#", "#", "#", " ", "#", "#", " ", "#", " ", "#", " ", "#"],
                ["#", "#", "9", "#", "10", " ", " ", " ", " ", "#", " ", "#", "#", "#"],
                ["#", "#", " ", "#", "#", " ", "#", "#", " ", "#", " ", "#", "#", "#"],
                ["#", "11", " ", " ", " ", " ", " ", "#", "#", "#", " ", "#", "#", "#"],
                ["#", "#", " ", "#", "#", " ", "#", "#", "#", "#", " ", "#", "#", "#"],
                ["#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#"]
            ]
        },
        {
            name: "Hard",
            grid: [
                ["#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#"],
                ["#", "#", "#", "1", "2", "3", "#", "#", "#", "4", "5", "6", "#", "#", "#"],
                ["#", "#", "7", " ", " ", " ", "8", "#", "9", " ", " ", " ", "10", "#", "#"],
                ["#", "#", "11", " ", " ", " ", " ", "#", "12", " ", " ", " ", " ", "#", "#"],
                ["#", "13", " ", " ", "#", "14", " ", "15", " ", " ", "#", "16", " ", "17", "#"],
                ["#", "18", " ", " ", "19", "#", "20", " ", " ", "#", "21", " ", " ", " ", "#"],
                ["#", "22", " ", " ", " ", "#", "23", " ", " ", "#", "24", " ", " ", " ", "#"],
                ["#", "#", "25", " ", " ", "26", "#", "#", "#", "27", " ", " ", " ", "#", "#"],
                ["#", "#", "#", "28", " ", " ", "29", "#", "30", " ", " ", " ", "#", "#", "#"],
                ["#", "#", "#", "#", "31", " ", " ", "32", " ", " ", " ", "#", "#", "#", "#"],
                ["#", "#", "#", "#", "#", "33", " ", " ", " ", " ", "#", "#", "#", "#", "#"],
                ["#", "#", "#", "#", "#", "#", "N", "T", "H", "#", "#", "#", "#", "#", "#"],
                ["#", "#", "#", "#", "#", "#", "#", " ", "#", "#", "#", "#", "#", "#", "#"],
                ["#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#"]
            ]
        }
    ];

    // ------------------------- Utility & Logging -------------------------
    /**
     * Logs debug messages to the console if DEBUG is enabled.
     * @param  {...any} params - The messages or objects to log.
     */
    function debugLog(...params) {
        if (DEBUG) console.log(...params);
    }

    /**
     * Updates the status area with a new message.
     * @param {string} message - The message to display.
     * @param {boolean} clear - Whether to clear existing messages.
     */
    function updateStatus(message, clear = false) {
        const statusDisplay = document.getElementById("result");
        if (clear) {
            statusDisplay.textContent = "";
        }
        statusDisplay.textContent += message + "\n";
        debugLog(message);
    }

    /**
     * Displays a warning message in the notification area.
     * @param {string} msg - The warning message.
     */
    function showWarning(msg) {
        displayNotification(msg, 'warning');
    }

    /**
     * Displays an error message in the notification area.
     * @param {string} msg - The error message.
     */
    function showError(msg) {
        displayNotification("Error: " + msg, 'error');
    }

    /**
     * Displays an informational message in the notification area.
     * @param {string} msg - The informational message.
     */
    function showInfo(msg) {
        displayNotification(msg, 'info');
    }

    /**
     * Displays a notification message within the application.
     * @param {string} msg - The message to display.
     * @param {string} type - The type of message ('info', 'warning', 'error').
     */
    function displayNotification(msg, type = 'info') {
        const notificationArea = document.getElementById("notification");
        if (!notificationArea) {
            console.warn("Notification area not found.");
            return;
        }
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('notification', type);
        messageDiv.textContent = msg;
        notificationArea.appendChild(messageDiv);

        // Automatically remove the notification after 5 seconds
        setTimeout(() => {
            notificationArea.removeChild(messageDiv);
        }, 5000);
    }

    // ------------------------- Mode Handling -------------------------
    const modeLabel = document.createElement('div');
    modeLabel.id = "modeLabel";
    modeLabel.textContent = "Mode: Default";
    document.body.insertBefore(modeLabel, document.body.firstChild);

    const startNumberEntryButton = document.getElementById("startNumberEntryButton");
    const stopNumberEntryButton = document.getElementById("stopNumberEntryButton");
    const startLetterEntryButton = document.getElementById("startLetterEntryButton");
    const startDragModeButton = document.getElementById("startDragModeButton");

    startNumberEntryButton.addEventListener("click", startNumberEntryMode);
    stopNumberEntryButton.addEventListener("click", stopNumberEntryMode);
    startLetterEntryButton.addEventListener('click', toggleLetterEntryMode);
    startDragModeButton.addEventListener('click', toggleDragMode);

    /**
     * Updates the mode label text.
     * @param {string} mode - The current mode.
     */
    function updateModeLabelTxt(mode) {
        modeLabel.textContent = "Mode: " + mode;
    }

    /**
     * Activates Number Entry Mode.
     */
    function startNumberEntryMode() {
        if (isLetterEntryMode) toggleLetterEntryMode();
        if (isDragMode) stopDragMode();
        if (!isNumberEntryMode) {
            isNumberEntryMode = true;
            startNumberEntryButton.style.display = "none";
            stopNumberEntryButton.style.display = "inline";
            updateModeLabelTxt("Number Entry");
            updateStatus("Number Entry Mode Activated.", true);
        }
    }

    /**
     * Deactivates Number Entry Mode.
     */
    function stopNumberEntryMode() {
        isNumberEntryMode = false;
        startNumberEntryButton.style.display = "inline";
        stopNumberEntryButton.style.display = "none";
        updateModeLabelTxt("Default");
        updateStatus("Number Entry Mode Deactivated.", true);
    }

    /**
     * Toggles Letter Entry Mode.
     */
    function toggleLetterEntryMode() {
        if (isLetterEntryMode) {
            isLetterEntryMode = false;
            startLetterEntryButton.textContent = "Letter Entry Mode";
            updateModeLabelTxt("Default");
            updateStatus("Letter Entry Mode Deactivated.", true);
        } else {
            if (isNumberEntryMode) stopNumberEntryMode();
            if (isDragMode) stopDragMode();
            isLetterEntryMode = true;
            startLetterEntryButton.textContent = "Exit Letter Entry Mode";
            updateModeLabelTxt("Letter Entry");
            updateStatus("Letter Entry Mode Activated.", true);
        }
    }

    /**
     * Toggles Drag Mode.
     */
    function toggleDragMode() {
        if (isDragMode) {
            stopDragMode();
        } else {
            if (isNumberEntryMode) stopNumberEntryMode();
            if (isLetterEntryMode) toggleLetterEntryMode();
            isDragMode = true;
            startDragModeButton.textContent = "Exit Drag Mode";
            updateModeLabelTxt("Drag");
            updateStatus("Drag Mode Activated.", true);
            bindDragEvents();
        }
    }

    /**
     * Deactivates Drag Mode.
     */
    function stopDragMode() {
        isDragMode = false;
        startDragModeButton.textContent = "Drag Mode";
        updateModeLabelTxt("Default");
        updateStatus("Drag Mode Deactivated.", true);
        unbindDragEvents();
    }

    // ------------------------- Word Loading & Caching -------------------------
    /**
     * Loads words from 'Data/Words.txt'. Falls back to a default word list if fetching fails.
     */
    async function loadWords() {
        try {
            const response = await fetch('Data/Words.txt');
            if (!response.ok) throw new Error("Could not load Words.txt");
            const text = await response.text();
            words = text.split('\n').map(w => w.trim().toUpperCase()).filter(w => w);
            if (!words.every(w => /^[A-Z]+$/.test(w))) {
                throw new Error("Words.txt contains invalid entries.");
            }
            cacheWordsByLength();
            calculateLetterFrequencies();
            debugLog("Words loaded:", words.length);
        } catch (error) {
            console.error("Error loading words:", error);
            showWarning("Words.txt not found or invalid. Using fallback word list.");
            words = ["LASER", "SAILS", "SHEET", "STEER", "HEEL", "HIKE", "KEEL", "KNOT"];
            cacheWordsByLength();
            calculateLetterFrequencies();
        }
    }

    /**
     * Caches words by their length for efficient access during solving.
     */
    function cacheWordsByLength() {
        wordLengthCache.clear();
        for (const word of words) {
            const len = word.length;
            if (!wordLengthCache.has(len)) wordLengthCache.set(len, []);
            wordLengthCache.get(len).push(word);
        }
        debugLog("Word length cache created.");
    }

    /**
     * Calculates the frequency of each letter across all words.
     */
    function calculateLetterFrequencies() {
        const allLetters = words.join('');
        const freq = {};
        for (const ch of allLetters) {
            freq[ch] = (freq[ch] || 0) + 1;
        }
        letterFrequencies = freq;
    }

    // ------------------------- Grid Management -------------------------
    const generateGridButton = document.getElementById("generateGridButton");
    const loadEasyPuzzleButton = document.getElementById("loadEasyPuzzle");
    const loadMediumPuzzleButton = document.getElementById("loadMediumPuzzle");
    const loadHardPuzzleButton = document.getElementById("loadHardPuzzle");
    const solveCrosswordButton = document.getElementById("solveCrosswordButton");

    generateGridButton.addEventListener("click", generateGrid);
    loadEasyPuzzleButton.addEventListener("click", () => loadPredefinedPuzzle("Easy"));
    loadMediumPuzzleButton.addEventListener("click", () => loadPredefinedPuzzle("Medium"));
    loadHardPuzzleButton.addEventListener("click", () => loadPredefinedPuzzle("Hard"));
    solveCrosswordButton.addEventListener("click", solveCrossword);

    /**
     * Generates a new crossword grid based on user-specified rows and columns.
     */
    function generateGrid() {
        const rows = parseInt(document.getElementById("rows").value);
        const cols = parseInt(document.getElementById("columns").value);

        if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) {
            showError("Please enter valid positive numbers for rows and columns.");
            return;
        }

        clearPuzzleState();

        // Initialize grid with empty spaces
        grid = Array.from({ length: rows }, () => Array(cols).fill(" "));
        renderGrid();
        debugLog("Grid generated with rows:", rows, "columns:", cols);
    }

    /**
     * Loads a predefined puzzle by name.
     * @param {string} name - The name of the predefined puzzle to load.
     */
    function loadPredefinedPuzzle(name) {
        const puzzle = predefinedPuzzles.find(p => p.name === name);
        if (!puzzle) {
            showError(`Puzzle "${name}" not found.`);
            return;
        }
        clearPuzzleState();

        // Deep copy the grid to prevent mutations
        grid = puzzle.grid.map(row => [...row]);
        renderGrid();
        debugLog(`Loaded predefined puzzle: ${name}`);
    }

    /**
     * Clears the current puzzle state, including grid and solving data.
     */
    function clearPuzzleState() {
        grid = [];
        solution = {};
        slots.clear();
        constraints.clear();
        domains.clear();
        cellContents.clear();
        updateStatus("Puzzle state cleared.", true);
    }

    /**
     * Renders the crossword grid in the DOM.
     */
    function renderGrid() {
        const gridContainer = document.getElementById("gridContainer");
        gridContainer.innerHTML = "";
        const fragment = document.createDocumentFragment();

        for (let r = 0; r < grid.length; r++) {
            const rowDiv = document.createElement("div");
            rowDiv.classList.add("grid-row");
            for (let c = 0; c < grid[0].length; c++) {
                const cellDiv = document.createElement("div");
                cellDiv.classList.add("grid-cell");
                const val = grid[r][c];

                if (val === "#") {
                    cellDiv.classList.add("black-cell");
                } else if (/^\d+$/.test(val)) {
                    cellDiv.classList.add("white-cell", "numbered-cell");
                    cellDiv.textContent = val;
                } else if (/^[A-Z]$/.test(val)) {
                    cellDiv.classList.add("white-cell", "prefilled-cell");
                    cellDiv.textContent = val;
                } else if (val.trim() === "") {
                    cellDiv.classList.add("white-cell");
                } else {
                    cellDiv.classList.add("white-cell");
                }

                cellDiv.setAttribute('data-row', r);
                cellDiv.setAttribute('data-col', c);
                cellDiv.setAttribute('tabindex', '0'); // Make cells focusable
                cellDiv.addEventListener("click", cellClicked);
                cellDiv.addEventListener("keydown", cellKeyDown);
                rowDiv.appendChild(cellDiv);
            }
            fragment.appendChild(rowDiv);
        }
        gridContainer.appendChild(fragment);
    }

    /**
     * Handles cell click events based on the current mode.
     * @param {Event} e - The click event.
     */
    function cellClicked(e) {
        const cell = e.currentTarget;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (isDragMode) {
            // In drag mode, clicking doesn't toggle cells. Dragging does.
            return;
        }

        if (isNumberEntryMode) {
            handleNumberEntry(cell, row, col);
            return;
        }

        if (isLetterEntryMode) {
            const letter = prompt("Enter a single letter (A-Z):");
            if (letter && /^[A-Za-z]$/.test(letter)) {
                updateCell(row, col, letter.toUpperCase(), "#f8f9fa", "#000");
                grid[row][col] = letter.toUpperCase();
            } else if (letter !== null) {
                showWarning("Please enter a single letter (A-Z).");
            }
            return;
        }

        // Default mode: toggle black/white
        if (cell.classList.contains("black-cell")) {
            updateCell(row, col, "", "#f8f9fa", "#444");
            grid[row][col] = " ";
            updateNumbersAfterRemoval(row, col);
        } else {
            updateCell(row, col, "#", "#333", "#333");
            grid[row][col] = "#";
            updateNumbersAfterRemoval(row, col);
        }
    }

    /**
     * Handles keyboard navigation and interactions within grid cells.
     * @param {Event} e - The keyboard event.
     */
    function cellKeyDown(e) {
        const cell = e.currentTarget;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        switch (e.key) {
            case 'Enter':
            case ' ':
                cell.click();
                e.preventDefault();
                break;
            case 'ArrowUp':
                focusCell(row - 1, col);
                e.preventDefault();
                break;
            case 'ArrowDown':
                focusCell(row + 1, col);
                e.preventDefault();
                break;
            case 'ArrowLeft':
                focusCell(row, col - 1);
                e.preventDefault();
                break;
            case 'ArrowRight':
                focusCell(row, col + 1);
                e.preventDefault();
                break;
            default:
                break;
        }
    }

    /**
     * Sets focus to a specific cell in the grid.
     * @param {number} row - The row index of the cell.
     * @param {number} col - The column index of the cell.
     */
    function focusCell(row, col) {
        const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            cell.focus();
        }
    }

    /**
     * Handles number entry in Number Entry Mode.
     * @param {HTMLElement} cell - The cell element.
     * @param {number} row - The row index of the cell.
     * @param {number} col - The column index of the cell.
     */
    function handleNumberEntry(cell, row, col) {
        if (/^\d+$/.test(grid[row][col])) {
            // Remove number
            removeNumberFromCell(row, col);
        } else if (grid[row][col] !== "#") {
            addNumberToCell(row, col);
        } else {
            showWarning("Cannot add number to a black cell.");
        }
    }

    /**
     * Adds a sequential number to a cell.
     * @param {number} row - The row index of the cell.
     * @param {number} col - The column index of the cell.
     */
    function addNumberToCell(row, col) {
        const numberPositions = getNumberPositions();
        const newNumber = getNewNumber(row, col, numberPositions);
        updateNumbersAfterInsertion(row, col, newNumber);
        updateCell(row, col, String(newNumber), "#f8f9fa", "#000");
        grid[row][col] = String(newNumber);
    }

    /**
     * Retrieves all numbered positions sorted in ascending order.
     * @returns {Array} An array of [number, row, col] tuples.
     */
    function getNumberPositions() {
        const numberPositions = [];
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[0].length; c++) {
                const val = grid[r][c];
                if (val && /^\d+$/.test(val)) {
                    numberPositions.push([parseInt(val), r, c]);
                }
            }
        }
        numberPositions.sort((a, b) => a[0] - b[0]);
        return numberPositions;
    }

    /**
     * Determines the new number to assign based on cell position.
     * @param {number} row - The row index.
     * @param {number} col - The column index.
     * @param {Array} numberPositions - Existing numbered positions.
     * @returns {number} The new number to assign.
     */
    function getNewNumber(row, col, numberPositions) {
        let position = 0;
        for (let i = 0; i < numberPositions.length; i++) {
            const [num, rr, cc] = numberPositions[i];
            if ((row < rr) || (row === rr && col < cc)) {
                break;
            }
            position = i + 1;
        }
        return position + 1;
    }

    /**
     * Updates numbers in the grid after inserting a new number.
     * @param {number} row - The row index.
     * @param {number} col - The column index.
     * @param {number} newNumber - The newly assigned number.
     */
    function updateNumbersAfterInsertion(row, col, newNumber) {
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[0].length; c++) {
                const val = grid[r][c];
                if (val && /^\d+$/.test(val)) {
                    const currentNumber = parseInt(val);
                    if (currentNumber >= newNumber && (r !== row || c !== col)) {
                        grid[r][c] = String(currentNumber + 1);
                        updateCell(r, c, String(currentNumber + 1), null, null);
                    }
                }
            }
        }
    }

    /**
     * Removes a number from a cell and updates subsequent numbers.
     * @param {number} row - The row index.
     * @param {number} col - The column index.
     */
    function removeNumberFromCell(row, col) {
        const removedNumber = parseInt(grid[row][col]);
        grid[row][col] = " ";
        updateCell(row, col, "", "#f8f9fa", "#444");
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[0].length; c++) {
                const val = grid[r][c];
                if (val && /^\d+$/.test(val)) {
                    const currentNumber = parseInt(val);
                    if (currentNumber > removedNumber) {
                        grid[r][c] = String(currentNumber - 1);
                        updateCell(r, c, String(currentNumber - 1), null, null);
                    }
                }
            }
        }
    }

    /**
     * Updates numbers after removing a cell's number.
     * @param {number} row - The row index.
     * @param {number} col - The column index.
     */
    function updateNumbersAfterRemoval(row, col) {
        if (grid[row][col] && /^\d+$/.test(grid[row][col])) {
            removeNumberFromCell(row, col);
        }
    }

    /**
     * Updates a specific cell's content and styling.
     * @param {number} row - The row index.
     * @param {number} col - The column index.
     * @param {string|null} value - The new value for the cell.
     * @param {string|null} bg - The background color.
     * @param {string|null} fg - The foreground (text) color.
     */
    function updateCell(row, col, value, bg, fg) {
        const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
        if (!cell) return;
        if (value !== null) cell.textContent = value;
        if (bg !== null) cell.style.backgroundColor = bg;
        if (fg !== null) cell.style.color = fg;

        cell.classList.remove("black-cell", "white-cell", "prefilled-cell", "numbered-cell", "solved-cell");
        if (bg === "#333") {
            cell.classList.add("black-cell");
        } else {
            cell.classList.add("white-cell");
            if (value && /^[A-Z]$/.test(value)) cell.classList.add("prefilled-cell");
            if (value && /^\d+$/.test(value)) cell.classList.add("numbered-cell");
        }
    }

    // ------------------------- Drag Mode -------------------------
    /**
     * Binds mouse events for Drag Mode.
     */
    function bindDragEvents() {
        const gridContainer = document.getElementById("gridContainer");
        gridContainer.addEventListener("mousedown", startDrag);
        gridContainer.addEventListener("mousemove", onDrag);
        gridContainer.addEventListener("mouseup", stopDrag);
        gridContainer.addEventListener("mouseleave", stopDrag);
    }

    /**
     * Unbinds mouse events for Drag Mode.
     */
    function unbindDragEvents() {
        const gridContainer = document.getElementById("gridContainer");
        gridContainer.removeEventListener("mousedown", startDrag);
        gridContainer.removeEventListener("mousemove", onDrag);
        gridContainer.removeEventListener("mouseup", stopDrag);
        gridContainer.removeEventListener("mouseleave", stopDrag);
    }

    /**
     * Handles the start of a drag action.
     * @param {MouseEvent} event - The mouse event.
     */
    function startDrag(event) {
        if (!isDragMode) return;
        isDragging = true;
        const cell = event.target.closest('.grid-cell');
        if (!cell) return;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        toggleToBlack = !cell.classList.contains("black-cell");
        toggleCell(row, col);
    }

    /**
     * Handles the dragging action over cells.
     * @param {MouseEvent} event - The mouse event.
     */
    function onDrag(event) {
        if (!isDragging) return;
        const cell = document.elementFromPoint(event.clientX, event.clientY);
        if (!cell || !cell.classList.contains('grid-cell')) return;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        toggleCell(row, col);
    }

    /**
     * Handles the end of a drag action.
     */
    function stopDrag() {
        if (!isDragMode) return;
        isDragging = false;
    }

    /**
     * Toggles a cell's state between black and white.
     * @param {number} row - The row index.
     * @param {number} col - The column index.
     */
    function toggleCell(row, col) {
        const cellVal = grid[row][col];
        if (toggleToBlack && cellVal !== "#") {
            updateCell(row, col, "#", "#333", "#333");
            grid[row][col] = "#";
            updateNumbersAfterRemoval(row, col);
        } else if (!toggleToBlack && cellVal === "#") {
            updateCell(row, col, " ", "#f8f9fa", "#444");
            grid[row][col] = " ";
        }
    }

    // ------------------------- Slot & Constraint Generation -------------------------
    /**
     * Generates slots (across and down) and sets up constraints for solving.
     */
    function generateSlots() {
        slots.clear();
        domains.clear();
        cellContents.clear();

        const rows = grid.length;
        const cols = grid[0].length;

        // Populate cellContents with prefilled letters or null
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                const key = `${r},${c}`;
                if (/^[A-Z]$/.test(cell)) {
                    cellContents.set(key, cell);
                } else if (cell !== "#" && cell.trim() !== "") {
                    cellContents.set(key, null);
                }
            }
        }

        // Identify slots based on numbered cells
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                if (/^\d+$/.test(cell)) {
                    // Across slot
                    if (c === 0 || grid[r][c - 1] === "#") {
                        const positions = getSlotPositions(r, c, "across");
                        if (positions.length >= 2) {
                            slots.set(`${cell}ACROSS`, positions);
                        }
                    }
                    // Down slot
                    if (r === 0 || grid[r - 1][c] === "#") {
                        const positions = getSlotPositions(r, c, "down");
                        if (positions.length >= 2) {
                            slots.set(`${cell}DOWN`, positions);
                        }
                    }
                }
            }
        }

        generateConstraints();
        setupDomains();
    }

    /**
     * Retrieves the positions of cells in a slot based on direction.
     * @param {number} r - The starting row index.
     * @param {number} c - The starting column index.
     * @param {string} direction - 'across' or 'down'.
     * @returns {Array} An array of [row, col] tuples.
     */
    function getSlotPositions(r, c, direction) {
        const positions = [];
        const rows = grid.length;
        const cols = grid[0].length;
        while (r < rows && c < cols && grid[r][c] !== "#") {
            positions.push([r, c]);
            if (direction === "across") c++;
            else r++;
        }
        return positions;
    }

    /**
     * Generates constraints between overlapping slots.
     */
    function generateConstraints() {
        constraints.clear();
        const positionMap = new Map();

        // Map each cell to the slots that include it
        for (const [slot, positions] of slots.entries()) {
            positions.forEach((pos, idx) => {
                const key = `${pos[0]},${pos[1]}`;
                if (!positionMap.has(key)) positionMap.set(key, []);
                positionMap.get(key).push({ slot, idx });
            });
        }

        // Establish constraints based on overlapping cells
        for (const overlaps of positionMap.values()) {
            if (overlaps.length > 1) {
                for (let i = 0; i < overlaps.length; i++) {
                    for (let j = i + 1; j < overlaps.length; j++) {
                        const { slot: slot1, idx: idx1 } = overlaps[i];
                        const { slot: slot2, idx: idx2 } = overlaps[j];

                        if (!constraints.has(slot1)) constraints.set(slot1, new Map());
                        if (!constraints.has(slot2)) constraints.set(slot2, new Map());

                        if (!constraints.get(slot1).has(slot2)) constraints.get(slot1).set(slot2, []);
                        if (!constraints.get(slot2).has(slot1)) constraints.get(slot2).set(slot1, []);

                        constraints.get(slot1).get(slot2).push([idx1, idx2]);
                        constraints.get(slot2).get(slot1).push([idx2, idx1]);
                    }
                }
            }
        }
    }

    /**
     * Sets up domains (possible word assignments) for each slot.
     */
    function setupDomains() {
        domains.clear();
        for (const [slot, positions] of slots.entries()) {
            const length = positions.length;
            const regexPattern = positions.map(([r, c]) => {
                const content = cellContents.get(`${r},${c}`);
                return content ? content : '.';
            }).join('');

            const regex = new RegExp(`^${regexPattern}$`);
            const possibleWords = wordLengthCache.get(length) || [];
            const filteredWords = possibleWords.filter(w => regex.test(w));
            domains.set(slot, filteredWords);
        }
    }

    /**
     * Checks if a word matches any pre-filled letters in a slot.
     * @param {string} slot - The slot identifier.
     * @param {string} word - The word to check.
     * @returns {boolean} True if the word matches pre-filled letters, else false.
     */
    function wordMatchesPreFilledLetters(slot, word) {
        const positions = slots.get(slot);
        for (let idx = 0; idx < positions.length; idx++) {
            const [r, c] = positions[idx];
            const key = `${r},${c}`;
            const preFilled = cellContents.get(key);
            if (preFilled && preFilled !== word[idx]) return false;
        }
        return true;
    }

    // ------------------------- AC-3 Algorithm -------------------------
    /**
     * Implements the AC-3 algorithm for constraint propagation.
     * @returns {Promise<boolean>} Resolves to true if arc consistency is achieved, else false.
     */
    async function ac3() {
        const queue = [];
        for (const [var1, neighbors] of constraints.entries()) {
            for (const var2 of neighbors.keys()) {
                queue.push([var1, var2]);
            }
        }

        while (queue.length) {
            const [var1, var2] = queue.shift();
            if (await revise(var1, var2)) {
                if (domains.get(var1).length === 0) {
                    return false;
                }
                for (const neighbor of constraints.get(var1).keys()) {
                    if (neighbor !== var2) queue.push([neighbor, var1]);
                }
            }
            // Yield control to the UI thread
            await new Promise(res => setTimeout(res, 0));
        }
        return true;
    }

    /**
     * Revises the domain of var1 by removing values inconsistent with var2.
     * @param {string} var1 - The first variable (slot).
     * @param {string} var2 - The second variable (slot).
     * @returns {Promise<boolean>} Resolves to true if the domain was revised, else false.
     */
    async function revise(var1, var2) {
        let revised = false;
        const overlaps = constraints.get(var1).get(var2);
        const domainVar1 = domains.get(var1);
        const domainVar2 = domains.get(var2);
        const newDomain = [];

        for (const word1 of domainVar1) {
            if (!wordMatchesPreFilledLetters(var1, word1)) {
                revised = true;
                continue;
            }
            let hasMatch = false;
            for (const word2 of domainVar2) {
                if (wordsMatch(var1, word1, var2, word2)) {
                    hasMatch = true;
                    break;
                }
            }
            if (hasMatch) {
                newDomain.push(word1);
            } else {
                revised = true;
            }
        }

        if (revised) {
            domains.set(var1, newDomain);
        }
        return revised;
    }

    /**
     * Checks if two words match based on their overlapping positions.
     * @param {string} var1 - The first variable (slot).
     * @param {string} word1 - The word assigned to var1.
     * @param {string} var2 - The second variable (slot).
     * @param {string} word2 - The word assigned to var2.
     * @returns {boolean} True if words match at overlapping positions, else false.
     */
    function wordsMatch(var1, word1, var2, word2) {
        const overlaps = constraints.get(var1).get(var2);
        for (const [idx1, idx2] of overlaps) {
            if (word1[idx1] !== word2[idx2]) return false;
        }
        return true;
    }

    // ------------------------- Backtracking Search -------------------------
    /**
     * Initiates the backtracking search to find a solution.
     * @param {Object} assignment - Current assignments of slots to words.
     * @param {Object} cache - Cache for memoization.
     * @returns {boolean} True if a solution is found, else false.
     */
    function backtrackingSolve(assignment = {}, cache = {}) {
        if (Object.keys(assignment).length === slots.size) {
            solution = { ...assignment };
            return true;
        }

        recursiveCalls++;

        const assignmentKey = JSON.stringify(Object.keys(assignment).sort().map(k => [k, assignment[k]]));
        if (cache[assignmentKey] !== undefined) return cache[assignmentKey];

        const varToAssign = selectUnassignedVariable(assignment);
        if (!varToAssign) return false;

        for (const value of orderDomainValues(varToAssign, assignment)) {
            if (isConsistent(varToAssign, value, assignment)) {
                assignment[varToAssign] = value;
                const inferences = forwardCheck(varToAssign, value, assignment);
                if (inferences !== false) {
                    const result = backtrackingSolve(assignment, cache);
                    if (result) {
                        cache[assignmentKey] = true;
                        return true;
                    }
                }
                delete assignment[varToAssign];
                restoreDomains(inferences);
            }
        }

        cache[assignmentKey] = false;
        return false;
    }

    /**
     * Selects the next unassigned variable using MRV and Degree heuristics.
     * @param {Object} assignment - Current assignments.
     * @returns {string|null} The selected slot or null if all are assigned.
     */
    function selectUnassignedVariable(assignment) {
        const unassigned = Array.from(domains.keys()).filter(v => !(v in assignment));
        if (unassigned.length === 0) return null;

        // MRV: Minimum Remaining Values
        let minSize = Infinity;
        let candidates = [];
        for (const v of unassigned) {
            const size = domains.get(v).length;
            if (size < minSize) {
                minSize = size;
                candidates = [v];
            } else if (size === minSize) {
                candidates.push(v);
            }
        }

        // Degree Heuristic: Maximum Degree
        let maxDegree = -1;
        let degreeCandidates = [];
        for (const v of candidates) {
            const deg = constraints.has(v) ? constraints.get(v).size : 0;
            if (deg > maxDegree) {
                maxDegree = deg;
                degreeCandidates = [v];
            } else if (deg === maxDegree) {
                degreeCandidates.push(v);
            }
        }

        // If tied, choose randomly
        if (degreeCandidates.length > 1) {
            return degreeCandidates[Math.floor(Math.random() * degreeCandidates.length)];
        }

        return degreeCandidates[0];
    }

    /**
     * Orders domain values using the Least Constraining Value heuristic.
     * @param {string} variable - The slot to assign.
     * @param {Object} assignment - Current assignments.
     * @returns {Array} Ordered list of possible words.
     */
    function orderDomainValues(variable, assignment) {
        const values = domains.get(variable).slice();
        // Least Constraining Value: Sort based on how few options they leave for neighbors
        values.sort((a, b) => leastConstrainingValue(variable, a) - leastConstrainingValue(variable, b));
        return values;
    }

    /**
     * Calculates the least constraining value score for a word.
     * @param {string} variable - The slot.
     * @param {string} value - The word to evaluate.
     * @returns {number} The score representing constraints imposed by the word.
     */
    function leastConstrainingValue(variable, value) {
        let score = 0;
        const neighbors = constraints.get(variable);
        if (!neighbors) return score;

        for (const [neighbor, overlaps] of neighbors.entries()) {
            if (domains.has(neighbor)) {
                for (const word of domains.get(neighbor)) {
                    for (const [idx1, idx2] of overlaps) {
                        if (value[idx1] === word[idx2]) {
                            score++;
                            break;
                        }
                    }
                }
            }
        }
        return score;
    }

    /**
     * Checks if assigning a word to a slot is consistent with current assignments.
     * @param {string} variable - The slot.
     * @param {string} value - The word to assign.
     * @param {Object} assignment - Current assignments.
     * @returns {boolean} True if consistent, else false.
     */
    function isConsistent(variable, value, assignment) {
        if (!wordMatchesPreFilledLetters(variable, value)) return false;

        const neighbors = constraints.get(variable);
        if (!neighbors) return true;

        for (const neighbor of neighbors.keys()) {
            if (assignment[neighbor]) {
                if (!wordsMatch(variable, value, neighbor, assignment[neighbor])) return false;
            } else {
                const newDomain = domains.get(neighbor).filter(v => wordsMatch(variable, value, neighbor, v));
                if (newDomain.length === 0) return false;
            }
        }
        return true;
    }

    /**
     * Performs forward checking after assigning a word to a slot.
     * @param {string} variable - The slot.
     * @param {string} value - The word assigned.
     * @param {Object} assignment - Current assignments.
     * @returns {Object|boolean} Inferences made or false if inconsistency found.
     */
    function forwardCheck(variable, value, assignment) {
        const inferences = {};
        const neighbors = constraints.get(variable);
        if (!neighbors) return inferences;

        for (const neighbor of neighbors.keys()) {
            if (!(neighbor in assignment)) {
                inferences[neighbor] = domains.get(neighbor).slice();
                const newDomain = domains.get(neighbor).filter(val => {
                    return wordsMatch(variable, value, neighbor, val) && wordMatchesPreFilledLetters(neighbor, val);
                });
                if (newDomain.length === 0) {
                    return false;
                }
                domains.set(neighbor, newDomain);
            }
        }
        return inferences;
    }

    /**
     * Restores domains based on inferences made during backtracking.
     * @param {Object} inferences - The inferences to restore.
     */
    function restoreDomains(inferences) {
        if (!inferences) return;
        for (const variable in inferences) {
            if (inferences.hasOwnProperty(variable)) {
                domains.set(variable, inferences[variable]);
            }
        }
    }

    /**
     * Randomizes the order of domain values for variability in solutions.
     */
    function randomizeDomains() {
        for (const domain of domains.values()) {
            shuffleArray(domain);
        }
    }

    // ------------------------- Solving & Display -------------------------
    /**
     * Initiates the crossword solving process.
     */
    async function solveCrossword() {
        if (isSolving) {
            showWarning("Solver is already running.");
            return;
        }
        isSolving = true;
        solveCrosswordButton.disabled = true;
        updateStatus("Setting up constraints...", true);

        generateSlots();

        if (slots.size === 0) {
            showWarning("No numbered slots found to solve.");
            isSolving = false;
            solveCrosswordButton.disabled = false;
            return;
        }

        randomizeDomains();
        updateStatus("Running AC-3 algorithm...");
        const startAC3 = performance.now();
        const ac3Result = await ac3();
        const endAC3 = performance.now();

        let hasEmptyDomain = false;
        for (const [slot, domain] of domains.entries()) {
            if (domain.length === 0) hasEmptyDomain = true;
        }

        if (!ac3Result || hasEmptyDomain) {
            updateStatus("AC-3 failed or domains emptied. Attempting backtracking...");
        } else {
            updateStatus("Starting backtracking search...");
        }

        displayDomainSizes();

        recursiveCalls = 0;
        const startBT = performance.now();
        const result = backtrackingSolve();
        const endBT = performance.now();

        if (result) {
            updateStatus("Solution found.");
            const ac3Time = ((endAC3 - startAC3) / 1000).toFixed(4);
            const btTime = ((endBT - startBT) / 1000).toFixed(4);
            performanceData['AC-3'] = { time: ac3Time };
            performanceData['Backtracking'] = { time: btTime, calls: recursiveCalls };
            displaySolution();
            displayWordList();
            const totalSolveTime = (parseFloat(ac3Time) + parseFloat(btTime)).toFixed(4);
            updateStatus(`Total solving time: ${totalSolveTime} seconds`);
            logPerformanceMetrics();
        } else {
            updateStatus("No possible solution found.");
            showWarning("No possible solution could be found for the current grid.");
        }

        solveCrosswordButton.disabled = false;
        isSolving = false;
    }

    /**
     * Displays the solved words on the grid.
     */
    function displaySolution() {
        for (const [slot, word] of Object.entries(solution)) {
            const positions = slots.get(slot);
            positions.forEach(([r, c], idx) => {
                const cell = document.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
                if (cell) {
                    cell.textContent = word[idx];
                    cell.classList.add("solved-cell");
                }
            });
        }
        debugLog("Solution displayed on the grid.");
    }

    /**
     * Displays the list of solved words categorized as Across and Down.
     */
    function displayWordList() {
        const across = [];
        const down = [];

        const slotKeys = Array.from(slots.keys());
        slotKeys.sort((a, b) => {
            const numA = parseInt(a.match(/^\d+/));
            const numB = parseInt(b.match(/^\d+/));
            return numA - numB;
        });

        for (const slot of slotKeys) {
            const word = solution[slot];
            if (word) {
                const slotNumber = slot.match(/^\d+/)[0];
                const entry = `${slotNumber}: ${word}`;
                if (slot.endsWith("ACROSS")) {
                    across.push(entry);
                } else if (slot.endsWith("DOWN")) {
                    down.push(entry);
                }
            }
        }

        const resultArea = document.getElementById("result");
        resultArea.insertAdjacentText('beforeend', "\nAcross:\n" + across.join("\n") + "\n\nDown:\n" + down.join("\n"));
    }

    /**
     * Logs and displays performance metrics.
     */
    function logPerformanceMetrics() {
        for (const [method, data] of Object.entries(performanceData)) {
            updateStatus(`${method} - Time: ${data.time}s${data.calls ? ', Recursive Calls: ' + data.calls : ''}`);
        }
        debugLog(performanceData);
    }

    /**
     * Displays the sizes of domains for each slot after setup.
     */
    function displayDomainSizes() {
        updateStatus("Domain Sizes After Setup:");
        const slotKeys = Array.from(domains.keys());
        slotKeys.sort((a, b) => {
            const numA = parseInt(a.match(/^\d+/));
            const numB = parseInt(b.match(/^\d+/));
            return numA - numB;
        });
        for (const slot of slotKeys) {
            const size = domains.get(slot).length;
            updateStatus(`Domain for ${slot} has ${size} options.`);
        }
    }

    /**
     * Shuffles an array in place using the Fisher-Yates algorithm.
     * @param {Array} array - The array to shuffle.
     * @returns {Array} The shuffled array.
     */
    function shuffleArray(array) {
        let m = array.length, t, i;
        while (m) {
            i = Math.floor(Math.random() * m--);
            t = array[m];
            array[m] = array[i];
            array[i] = t;
        }
        return array;
    }

    // ------------------------- Notification Area Creation -------------------------
    /**
     * Creates a notification area in the DOM for in-app messages.
     */
    function createNotificationArea() {
        const notificationContainer = document.createElement('div');
        notificationContainer.id = "notification";
        notificationContainer.setAttribute('aria-live', 'polite');
        notificationContainer.setAttribute('aria-atomic', 'true');
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.top = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '1000';
        document.body.appendChild(notificationContainer);
    }

    // ------------------------- Initialization -------------------------
    /**
     * Initializes the application by setting up necessary elements and loading words.
     */
    function initializeApp() {
        createNotificationArea();
        loadWords();
    }

    window.onload = initializeApp;

})();
