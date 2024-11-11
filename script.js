(() => {
    // Encapsulate all variables and functions within an IIFE to avoid polluting the global scope.

    // Constants and configurations
    const DEBUG = false; // Toggle debug messages
    const RANDOM_SEED = 123;
    let seed = RANDOM_SEED;

    // Cached data
    const wordLengthCache = new Map();
    const memoizedMaxNumber = {};

    // Data structures
    let grid = [];
    let words = [];
    let slots = new Map();
    let constraints = new Map();
    let solution = {};
    let domains = new Map();
    let cellContents = new Map();
    let isNumberEntryMode = false;
    let currentNumber = 1;

    // Seeded randomization using Linear Congruential Generator (LCG)
    function seededRandom() {
        const a = 1664525;
        const c = 1013904223;
        seed = (a * seed + c) % 4294967296;
        return seed / 4294967296;
    }

    function shuffleWithSeed(array) {
        let m = array.length, t, i;
        while (m) {
            i = Math.floor(seededRandom() * m--);
            t = array[m];
            array[m] = array[i];
            array[i] = t;
        }
        return array;
    }

    // Helper function for logging
    function debugLog(message, flag = DEBUG, ...optionalParams) {
        if (flag) {
            console.log(message, ...optionalParams);
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
            debugLog("Words loaded:", words.length);
        } catch (error) {
            console.error("Error loading words:", error);
            alert("Error loading words. Please check if Words.txt is available and correctly formatted.");
        }
    }

    // Cache words by length to optimize domain setup
    function cacheWordsByLength() {
        wordLengthCache.clear();
        for (const word of words) {
            const len = word.length;
            if (!wordLengthCache.has(len)) wordLengthCache.set(len, []);
            wordLengthCache.get(len).push(word);
        }
        debugLog("Word length cache created.");
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

        // Batch DOM updates using DocumentFragment
        const fragment = document.createDocumentFragment();

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
            fragment.appendChild(rowDiv);
        }

        gridContainer.appendChild(fragment);
        memoizedMaxNumber.value = null; // Reset memoization
        debugLog("Grid generated with rows:", rows, "columns:", cols);
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
                memoizedMaxNumber.value = currentNumber - 1;
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

    // Get the maximum number currently on the grid with memoization
    function getMaxNumberOnGrid() {
        if (memoizedMaxNumber.value !== null) {
            return memoizedMaxNumber.value;
        }
        let maxNumber = 0;
        for (const row of grid) {
            for (const cell of row) {
                const cellNumber = parseInt(cell);
                if (!isNaN(cellNumber) && cellNumber > maxNumber) maxNumber = cellNumber;
            }
        }
        memoizedMaxNumber.value = maxNumber;
        return maxNumber;
    }

    // Generate slots and handle pre-filled letters
    function generateSlots() {
        slots.clear();
        domains.clear();
        cellContents.clear();

        const rows = grid.length;
        const cols = grid[0].length;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                if (/^[A-Z]$/.test(cell)) {
                    cellContents.set(`${r},${c}`, cell);
                } else if (cell !== "#" && cell.trim() !== "") {
                    cellContents.set(`${r},${c}`, null);
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
                            slots.set(slotName, positions);
                        }
                    }
                    if (r === 0 || grid[r - 1][c] === "#") {
                        const positions = getSlotPositions(r, c, "down");
                        if (positions.length >= 2) {
                            const slotName = `${cell}DOWN`;
                            slots.set(slotName, positions);
                        }
                    }
                }
            }
        }

        debugLog("Generated Slots:", slots);

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

        debugLog("Generated Constraints:", constraints);
    }

    // Set up domains for each slot using regex for faster filtering
    function setupDomains() {
        domains.clear();
        for (const [slot, positions] of slots.entries()) {
            const length = positions.length;
            let regexPattern = positions.map(([r, c]) => cellContents.has(`${r},${c}`) ? cellContents.get(`${r},${c}`) : '.').join('');
            const regex = new RegExp(`^${regexPattern}$`);

            const possibleWords = wordLengthCache.get(length) ? wordLengthCache.get(length) : [];
            const filteredWords = possibleWords.filter(word => regex.test(word));

            if (filteredWords.length === 0) {
                console.warn(`Domain for slot ${slot} is empty after setup.`);
            }

            domains.set(slot, filteredWords);
        }

        debugLog("Domains after setup:", domains);
    }

    // AC-3 Algorithm with asynchronicity for better UI responsiveness
    async function ac3() {
        const queue = [];

        for (const [var1, neighbors] of constraints.entries()) {
            for (const var2 of neighbors.keys()) {
                queue.push([var1, var2]);
            }
        }

        // Prioritize variables with smaller domains
        queue.sort((a, b) => domains.get(a[0]).length - domains.get(b[0]).length);

        debugLog("Initial AC-3 queue:", queue);

        while (queue.length) {
            const [var1, var2] = queue.shift();
            if (revise(var1, var2)) {
                debugLog(`Revised ${var1}, new domain:`, domains.get(var1));
                if (!domains.get(var1).length) {
                    console.error(`Domain wiped out for ${var1} during AC-3.`);
                    return false;
                }
                for (const neighbor of constraints.get(var1).keys()) {
                    if (neighbor !== var2) queue.push([neighbor, var1]);
                }
                // Re-sort the queue
                queue.sort((a, b) => domains.get(a[0]).length - domains.get(b[0]).length);
            }
            await new Promise(resolve => setTimeout(resolve, 0)); // Yield control to the browser
        }
        return true;
    }

    // Function to revise domains for consistency
    function revise(var1, var2) {
        let revised = false;
        const overlaps = constraints.get(var1).get(var2);

        const domainVar1 = domains.get(var1);
        const domainVar2 = domains.get(var2);

        const newDomain = [];

        outerLoop:
        for (const word1 of domainVar1) {
            for (const word2 of domainVar2) {
                if (wordsMatch(var1, word1, var2, word2)) {
                    newDomain.push(word1);
                    continue outerLoop;
                }
            }
            revised = true;
        }

        if (revised) {
            domains.set(var1, newDomain);
        }
        return revised;
    }

    // Backtracking Search with MRV and Degree Heuristics
    function backtrackingSolve(assignment = {}) {
        if (Object.keys(assignment).length === slots.size) {
            solution = assignment;
            debugLog("Solution found:", solution);
            return true;
        }

        const varToAssign = selectUnassignedVariable(assignment);
        if (!varToAssign) return false;
        debugLog("Selecting variable to assign:", varToAssign);

        for (const value of orderDomainValues(varToAssign, assignment)) {
            debugLog(`Trying ${value} for ${varToAssign}`);
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

    // MRV with degree heuristic tie-breaker
    function selectUnassignedVariable(assignment) {
        const unassignedVars = Array.from(domains.keys()).filter(v => !(v in assignment));
        if (unassignedVars.length === 0) return null;

        unassignedVars.sort((a, b) => {
            const lenA = domains.get(a).length;
            const lenB = domains.get(b).length;
            if (lenA !== lenB) return lenA - lenB;

            const degreeA = constraints.get(a) ? constraints.get(a).size : 0;
            const degreeB = constraints.get(b) ? constraints.get(b).size : 0;
            return degreeB - degreeA;
        });
        return unassignedVars[0];
    }

    // Least Constraining Value heuristic with domain shuffling for randomization
    function orderDomainValues(variable, assignment) {
        let domainValues = shuffleWithSeed(domains.get(variable).slice());
        return domainValues.sort((a, b) => {
            const conflictsA = countConflicts(variable, a, assignment);
            const conflictsB = countConflicts(variable, b, assignment);
            return conflictsA - conflictsB;
        });
    }

    // Count conflicts for Least Constraining Value
    function countConflicts(variable, value, assignment) {
        let conflicts = 0;
        const neighbors = constraints.get(variable);
        if (!neighbors) return conflicts;

        for (const neighbor of neighbors.keys()) {
            if (!(neighbor in assignment)) {
                for (const neighborValue of domains.get(neighbor)) {
                    if (!wordsMatch(variable, value, neighbor, neighborValue)) {
                        conflicts++;
                    }
                }
            }
        }
        return conflicts;
    }

    // Consistency check function
    function isConsistent(variable, value, assignment) {
        const neighbors = constraints.get(variable);
        if (!neighbors) return true;

        for (const neighbor of neighbors.keys()) {
            if (neighbor in assignment) {
                if (!wordsMatch(variable, value, neighbor, assignment[neighbor])) {
                    return false;
                }
            }
        }
        return true;
    }

    // Check word alignment consistency
    function wordsMatch(var1, word1, var2, word2) {
        const overlaps = constraints.get(var1).get(var2);
        for (const [idx1, idx2] of overlaps) {
            if (word1[idx1] !== word2[idx2]) return false;
        }
        return true;
    }

    // Forward Checking with domain restoration
    function forwardCheck(variable, value, assignment) {
        const inferences = {};
        const neighbors = constraints.get(variable);
        if (!neighbors) return inferences;

        for (const neighbor of neighbors.keys()) {
            if (!(neighbor in assignment)) {
                inferences[neighbor] = domains.get(neighbor).slice();
                const newDomain = domains.get(neighbor).filter(val => wordsMatch(variable, value, neighbor, val));
                if (newDomain.length === 0) {
                    debugLog(`Domain wiped out for ${neighbor} during forward checking.`);
                    return false;
                }
                domains.set(neighbor, newDomain);
            }
        }
        return inferences;
    }

    // Restore domain states after backtracking
    function restoreDomains(inferences) {
        if (!inferences) return;
        for (const variable in inferences) {
            domains.set(variable, inferences[variable]);
        }
    }

    // Solve the crossword with UI feedback and debug
    async function solveCrossword() {
        document.getElementById("result").textContent = "Setting up constraints...";
        generateSlots();

        if (slots.size === 0) {
            alert("No numbered slots found to solve.");
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 10)); // Allow UI update

        debugLog("Starting AC-3 algorithm...");
        document.getElementById("result").textContent = "Running AC-3 algorithm...";

        if (await ac3()) {
            debugLog("AC-3 algorithm completed successfully.");
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

    // Display the solution on the grid
    function displaySolution() {
        for (const [slot, word] of Object.entries(solution)) {
            const positions = slots.get(slot);

            positions.forEach(([row, col], idx) => {
                const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    cell.textContent = word[idx];
                    cell.classList.add("solved-cell");
                }
            });
        }
        debugLog("Solution displayed on the grid.");
    }

    // Display word list organized by slot number and direction
    function displayWordList() {
        const resultArea = document.getElementById("result");
        const acrossWords = [];
        const downWords = [];

        for (const slot of slots.keys()) {
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

})();
