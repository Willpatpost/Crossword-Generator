(() => {
    // This JavaScript version aims to replicate the behavior and logic of the Python Tkinter version
    // as closely as possible. It includes multiple modes (default, number entry, letter entry, drag),
    // predefined puzzles, AC-3 + backtracking solver, performance metrics, and domain displays.

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
    function debugLog(...params) {
        if (DEBUG) console.log(...params);
    }

    function updateStatus(message, clear = false) {
        const statusDisplay = document.getElementById("result");
        if (clear) {
            statusDisplay.textContent = "";
        }
        statusDisplay.textContent += message + "\n";
        debugLog(message);
    }

    function showWarning(msg) {
        alert(msg);
    }

    function showError(msg) {
        alert("Error: " + msg);
    }

    function showInfo(msg) {
        alert(msg);
    }

    // ------------------------- Mode Handling -------------------------
    const modeLabel = document.createElement('div');
    modeLabel.id = "modeLabel";
    modeLabel.textContent = "Mode: Default";
    document.body.insertBefore(modeLabel, document.body.firstChild);

    document.getElementById("startNumberEntryButton").addEventListener("click", startNumberEntryMode);
    document.getElementById("stopNumberEntryButton").addEventListener("click", stopNumberEntryMode);

    const startLetterEntryButton = document.createElement('button');
    startLetterEntryButton.textContent = "Letter Entry Mode";
    document.getElementById('number-entry-controls').appendChild(startLetterEntryButton);

    const startDragModeButton = document.createElement('button');
    startDragModeButton.textContent = "Drag Mode";
    document.getElementById('number-entry-controls').appendChild(startDragModeButton);

    startLetterEntryButton.addEventListener('click', toggleLetterEntryMode);
    startDragModeButton.addEventListener('click', toggleDragMode);

    function updateModeLabelTxt(mode) {
        modeLabel.textContent = "Mode: " + mode;
    }

    function startNumberEntryMode() {
        if (isLetterEntryMode) toggleLetterEntryMode();
        if (isDragMode) stopDragMode();
        if (!isNumberEntryMode) {
            isNumberEntryMode = true;
            document.getElementById("stopNumberEntryButton").style.display = "inline";
            updateModeLabelTxt("Number Entry");
            updateStatus("Number Entry Mode Activated.");
        }
    }

    function stopNumberEntryMode() {
        isNumberEntryMode = false;
        document.getElementById("stopNumberEntryButton").style.display = "none";
        updateModeLabelTxt("Default");
        updateStatus("Number Entry Mode Deactivated.");
    }

    function toggleLetterEntryMode() {
        if (isLetterEntryMode) {
            isLetterEntryMode = false;
            startLetterEntryButton.textContent = "Letter Entry Mode";
            updateModeLabelTxt("Default");
            updateStatus("Letter Entry Mode Deactivated.");
        } else {
            if (isNumberEntryMode) stopNumberEntryMode();
            if (isDragMode) stopDragMode();
            isLetterEntryMode = true;
            startLetterEntryButton.textContent = "Exit Letter Entry Mode";
            updateModeLabelTxt("Letter Entry");
            updateStatus("Letter Entry Mode Activated.");
        }
    }

    function toggleDragMode() {
        if (isDragMode) {
            stopDragMode();
        } else {
            if (isNumberEntryMode) stopNumberEntryMode();
            if (isLetterEntryMode) toggleLetterEntryMode();
            isDragMode = true;
            startDragModeButton.textContent = "Exit Drag Mode";
            updateModeLabelTxt("Drag");
            updateStatus("Drag Mode Activated.");
            bindDragEvents();
        }
    }

    function stopDragMode() {
        isDragMode = false;
        startDragModeButton.textContent = "Drag Mode";
        updateModeLabelTxt("Default");
        updateStatus("Drag Mode Deactivated.");
        unbindDragEvents();
    }

    // ------------------------- Word Loading & Caching -------------------------
    async function loadWords() {
        try {
            const response = await fetch('Data/Words.txt');
            if (!response.ok) throw new Error("Could not load words file");
            const text = await response.text();
            words = text.split('\n').map(w => w.trim().toUpperCase()).filter(w => w);
            if (!words.every(w => /^[A-Z]+$/.test(w))) {
                throw new Error("File contains invalid words.");
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

    function cacheWordsByLength() {
        wordLengthCache.clear();
        for (const word of words) {
            const len = word.length;
            if (!wordLengthCache.has(len)) wordLengthCache.set(len, []);
            wordLengthCache.get(len).push(word);
        }
        debugLog("Word length cache created.");
    }

    function calculateLetterFrequencies() {
        const allLetters = words.join('');
        const freq = {};
        for (const ch of allLetters) {
            freq[ch] = (freq[ch] || 0) + 1;
        }
        letterFrequencies = freq;
    }

    // ------------------------- Grid Management -------------------------
    document.getElementById("generateGridButton").addEventListener("click", generateGrid);
    document.getElementById("loadEasyPuzzle").addEventListener("click", () => loadPredefinedPuzzle("Easy"));
    document.getElementById("loadMediumPuzzle").addEventListener("click", () => loadPredefinedPuzzle("Medium"));
    document.getElementById("loadHardPuzzle").addEventListener("click", () => loadPredefinedPuzzle("Hard"));
    document.getElementById("solveCrosswordButton").addEventListener("click", solveCrossword);

    function generateGrid() {
        const rows = parseInt(document.getElementById("rows").value);
        const cols = parseInt(document.getElementById("columns").value);

        if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) {
            showError("Please enter valid positive numbers for rows and columns.");
            return;
        }

        clearPuzzleState();

        grid = Array.from({ length: rows }, () => Array(cols).fill("#"));
        renderGrid();
        debugLog("Grid generated with rows:", rows, "columns:", cols);
    }

    function loadPredefinedPuzzle(name) {
        const puzzle = predefinedPuzzles.find(p => p.name === name);
        if (!puzzle) {
            showError(`Puzzle ${name} not found.`);
            return;
        }
        clearPuzzleState();

        grid = puzzle.grid.map(r => r.slice());
        renderGrid();
        debugLog(`Loaded predefined puzzle: ${name}`);
    }

    function clearPuzzleState() {
        grid = [];
        solution = {};
        slots.clear();
        constraints.clear();
        domains.clear();
        cellContents.clear();
    }

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

                cellDiv.dataset.row = r;
                cellDiv.dataset.col = c;
                cellDiv.addEventListener("click", cellClicked);
                rowDiv.appendChild(cellDiv);
            }
            fragment.appendChild(rowDiv);
        }
        gridContainer.appendChild(fragment);
    }

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
            updateCell(row, col, "", "#333", "#333");
            grid[row][col] = "#";
            updateNumbersAfterRemoval(row, col);
        }
    }

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

    function addNumberToCell(row, col) {
        const numberPositions = getNumberPositions();
        const newNumber = getNewNumber(row, col, numberPositions);
        updateNumbersAfterInsertion(row, col, newNumber);
        updateCell(row, col, String(newNumber), "#f8f9fa", "#000");
        grid[row][col] = String(newNumber);
    }

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

    function updateNumbersAfterRemoval(row, col) {
        if (grid[row][col] && /^\d+$/.test(grid[row][col])) {
            removeNumberFromCell(row, col);
        }
    }

    function updateCell(row, col, value, bg, fg) {
        const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
        if (!cell) return;
        if (value !== null) cell.textContent = value;
        if (bg !== null) cell.style.backgroundColor = bg;
        if (fg !== null) cell.style.color = fg;

        cell.classList.remove("black-cell", "white-cell", "prefilled-cell", "numbered-cell");
        if (bg === "#333") {
            cell.classList.add("black-cell");
        } else {
            cell.classList.add("white-cell");
            if (value && /^[A-Z]$/.test(value)) cell.classList.add("prefilled-cell");
            if (value && /^\d+$/.test(value)) cell.classList.add("numbered-cell");
        }
    }

    // ------------------------- Drag Mode -------------------------
    function bindDragEvents() {
        const gridContainer = document.getElementById("gridContainer");
        gridContainer.addEventListener("mousedown", startDrag);
        gridContainer.addEventListener("mousemove", onDrag);
        gridContainer.addEventListener("mouseup", stopDrag);
        gridContainer.addEventListener("mouseleave", stopDrag);
    }

    function unbindDragEvents() {
        const gridContainer = document.getElementById("gridContainer");
        gridContainer.removeEventListener("mousedown", startDrag);
        gridContainer.removeEventListener("mousemove", onDrag);
        gridContainer.removeEventListener("mouseup", stopDrag);
        gridContainer.removeEventListener("mouseleave", stopDrag);
    }

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

    function onDrag(event) {
        if (!isDragging) return;
        const cell = document.elementFromPoint(event.clientX, event.clientY);
        if (!cell || !cell.classList.contains('grid-cell')) return;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        toggleCell(row, col);
    }

    function stopDrag() {
        if (!isDragMode) return;
        isDragging = false;
    }

    function toggleCell(row, col) {
        const cellVal = grid[row][col];
        if (toggleToBlack && cellVal !== "#") {
            updateCell(row, col, "", "#333", "#333");
            grid[row][col] = "#";
            updateNumbersAfterRemoval(row, col);
        } else if (!toggleToBlack && cellVal === "#") {
            updateCell(row, col, "", "#f8f9fa", "#444");
            grid[row][col] = " ";
        }
    }

    // ------------------------- Slot & Constraint Generation -------------------------
    function generateSlots() {
        slots.clear();
        domains.clear();
        cellContents.clear();

        const rows = grid.length;
        const cols = grid[0].length;

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

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                if (/^\d+$/.test(cell)) {
                    if (c === 0 || grid[r][c - 1] === "#") {
                        const positions = getSlotPositions(r, c, "across");
                        if (positions.length >= 2) {
                            slots.set(`${cell}ACROSS`, positions);
                        }
                    }
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

    function generateConstraints() {
        constraints.clear();
        const positionMap = new Map();

        for (const [slot, positions] of slots.entries()) {
            positions.forEach((pos, idx) => {
                const key = `${pos[0]},${pos[1]}`;
                if (!positionMap.has(key)) positionMap.set(key, []);
                positionMap.get(key).push({ slot, idx });
            });
        }

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
    async function ac3() {
        const queue = [];
        for (const [var1, neighbors] of constraints.entries()) {
            for (const var2 of neighbors.keys()) {
                queue.push([var1, var2]);
            }
        }

        while (queue.length) {
            const [var1, var2] = queue.shift();
            if (revise(var1, var2)) {
                if (domains.get(var1).length === 0) {
                    return false;
                }
                for (const neighbor of constraints.get(var1).keys()) {
                    if (neighbor !== var2) queue.push([neighbor, var1]);
                }
            }
            await new Promise(res => setTimeout(res, 0)); // yield to UI
        }
        return true;
    }

    function revise(var1, var2) {
        let revised = false;
        const overlaps = constraints.get(var1).get(var2);
        const domainVar1 = domains.get(var1);
        const domainVar2 = domains.get(var2);
        const newDomain = [];

        outer: for (const word1 of domainVar1) {
            if (!wordMatchesPreFilledLetters(var1, word1)) {
                revised = true;
                continue;
            }
            for (const word2 of domainVar2) {
                if (wordsMatch(var1, word1, var2, word2)) {
                    newDomain.push(word1);
                    continue outer;
                }
            }
            revised = true;
        }

        if (revised) {
            domains.set(var1, newDomain);
        }
        return revised;
    }

    function wordsMatch(var1, word1, var2, word2) {
        const overlaps = constraints.get(var1).get(var2);
        for (const [idx1, idx2] of overlaps) {
            if (word1[idx1] !== word2[idx2]) return false;
        }
        return true;
    }

    // ------------------------- Backtracking Search -------------------------
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

    function selectUnassignedVariable(assignment) {
        const unassigned = Array.from(domains.keys()).filter(v => !(v in assignment));
        if (unassigned.length === 0) return null;

        // MRV
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

        // Degree heuristic
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

    function orderDomainValues(variable, assignment) {
        const values = domains.get(variable).slice();
        // Use letter frequency heuristic (least constraining)
        values.sort((a, b) => valueScore(a) - valueScore(b));
        // Shuffle for randomness
        shuffleArray(values);
        return values;
    }

    function valueScore(value) {
        let score = 0;
        for (const ch of value) {
            score += (letterFrequencies[ch] || 0);
        }
        return score;
    }

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

    function restoreDomains(inferences) {
        if (!inferences) return;
        for (const variable in inferences) {
            domains.set(variable, inferences[variable]);
        }
    }

    function randomizeDomains() {
        for (const domain of domains.values()) {
            shuffleArray(domain);
        }
    }

    // ------------------------- Solving & Display -------------------------
    async function solveCrossword() {
        if (isSolving) {
            showWarning("Solver is already running.");
            return;
        }
        isSolving = true;
        document.getElementById("solveCrosswordButton").disabled = true;
        updateStatus("Setting up constraints...", true);

        generateSlots();

        if (slots.size === 0) {
            showWarning("No numbered slots found to solve.");
            isSolving = false;
            document.getElementById("solveCrosswordButton").disabled = false;
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
            const ac3Time = (endAC3 - startAC3) / 1000;
            const btTime = (endBT - startBT) / 1000;
            performanceData['AC-3'] = { time: ac3Time };
            performanceData['Backtracking'] = { time: btTime, calls: recursiveCalls };
            displaySolution();
            displayWordList();
            const totalSolveTime = ac3Time + btTime;
            updateStatus(`Total solving time: ${totalSolveTime.toFixed(2)} seconds`);
            logPerformanceMetrics();
        } else {
            updateStatus("No possible solution found.");
        }

        document.getElementById("solveCrosswordButton").disabled = false;
        isSolving = false;
    }

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

    function logPerformanceMetrics() {
        for (const [method, data] of Object.entries(performanceData)) {
            updateStatus(`${method} - Time: ${data.time.toFixed(4)}s${data.calls ? ', Recursive Calls: ' + data.calls : ''}`);
        }
        debugLog(performanceData);
    }

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

    // Load words on page load
    window.onload = loadWords;

})();
