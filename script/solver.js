// solver.js

/**
 * Solver class encapsulates the logic for solving the crossword puzzle.
 * It identifies slots (across and down), establishes constraints,
 * and employs AC-3 and Backtracking algorithms to find a valid solution.
 */

export class Solver {
    /**
     * Constructs the Solver instance.
     * @param {Grid} grid - Instance of the Grid class.
     * @param {Array<string>} wordList - Array of valid words.
     * @param {NotificationManager} notificationManager - Instance of NotificationManager for user feedback.
     */
    constructor(grid, wordList, notificationManager) {
        this.grid = grid;
        this.wordList = wordList.map(word => word.toUpperCase());
        this.notificationManager = notificationManager;

        // Slots: Map of slotName -> { positions: Array of [row, col], direction: 'across' | 'down' }
        this.slots = new Map();

        // Constraints: Map of slotName -> Map of neighboringSlotName -> Array of overlapping indices
        this.constraints = new Map();

        // Domains: Map of slotName -> Set of possible words
        this.domains = new Map();

        // Solution: Map of slotName -> word
        this.solution = new Map();

        // Performance Metrics
        this.performanceData = {
            ac3Time: 0,
            backtrackTime: 0,
            recursiveCalls: 0
        };
    }

    /**
     * Initiates the solving process.
     * @returns {boolean} True if a solution is found, else false.
     */
    async solve() {
        this.identifySlots();
        this.generateConstraints();
        this.initializeDomains();

        this.notificationManager.showInfo("Starting AC-3 Algorithm...");
        const ac3Start = performance.now();
        const ac3Result = this.ac3();
        const ac3End = performance.now();
        this.performanceData.ac3Time = ((ac3End - ac3Start) / 1000).toFixed(4);
        this.notificationManager.showInfo(`AC-3 Completed in ${this.performanceData.ac3Time} seconds.`);

        if (!ac3Result) {
            this.notificationManager.showWarning("AC-3 failed. No solution possible.");
            return false;
        }

        this.notificationManager.showInfo("Starting Backtracking Search...");
        const btStart = performance.now();
        const result = this.backtrack();
        const btEnd = performance.now();
        this.performanceData.backtrackTime = ((btEnd - btStart) / 1000).toFixed(4);

        if (result) {
            this.performanceData.recursiveCalls = this.recursiveCalls;
            this.notificationManager.showInfo(`Backtracking Completed in ${this.performanceData.backtrackTime} seconds with ${this.performanceData.recursiveCalls} recursive calls.`);
            this.applySolution();
            this.displaySolution();
            this.displayWordList();
            this.logPerformanceMetrics();
            return true;
        } else {
            this.notificationManager.showWarning("No solution found.");
            return false;
        }
    }

    /**
     * Identifies all across and down slots in the grid.
     */
    identifySlots() {
        const rows = this.grid.rows;
        const cols = this.grid.columns;
        let slotCounter = 1;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = this.grid.grid[r][c];
                if (cell === "#") continue;

                // Identify Across Slots
                if ((c === 0 || this.grid.grid[r][c - 1] === "#") && (c < cols - 1 && this.grid.grid[r][c + 1] !== "#")) {
                    const positions = [];
                    let currentC = c;
                    while (currentC < cols && this.grid.grid[r][currentC] !== "#") {
                        positions.push([r, currentC]);
                        currentC++;
                    }
                    const slotName = `S${slotCounter}_ACROSS`;
                    this.slots.set(slotName, { positions, direction: 'across' });
                    slotCounter++;
                }

                // Identify Down Slots
                if ((r === 0 || this.grid.grid[r - 1][c] === "#") && (r < rows - 1 && this.grid.grid[r + 1][c] !== "#")) {
                    const positions = [];
                    let currentR = r;
                    while (currentR < rows && this.grid.grid[currentR][c] !== "#") {
                        positions.push([currentR, c]);
                        currentR++;
                    }
                    const slotName = `S${slotCounter}_DOWN`;
                    this.slots.set(slotName, { positions, direction: 'down' });
                    slotCounter++;
                }
            }
        }

        if (this.slots.size === 0) {
            this.notificationManager.showWarning("No slots found in the grid.");
        } else {
            this.notificationManager.showInfo(`${this.slots.size} slots identified.`);
        }
    }

    /**
     * Generates constraints based on overlapping letters between slots.
     */
    generateConstraints() {
        this.constraints.clear();

        for (const [slotA, dataA] of this.slots.entries()) {
            for (const [slotB, dataB] of this.slots.entries()) {
                if (slotA === slotB) continue;

                const overlaps = [];

                dataA.positions.forEach((posA, idxA) => {
                    dataB.positions.forEach((posB, idxB) => {
                        if (posA[0] === posB[0] && posA[1] === posB[1]) {
                            overlaps.push([idxA, idxB]);
                        }
                    });
                });

                if (overlaps.length > 0) {
                    if (!this.constraints.has(slotA)) {
                        this.constraints.set(slotA, new Map());
                    }
                    this.constraints.get(slotA).set(slotB, overlaps);
                }
            }
        }

        this.notificationManager.showInfo("Constraints generated based on overlapping slots.");
    }

    /**
     * Initializes the domains for each slot based on the word list and pre-filled letters.
     */
    initializeDomains() {
        this.domains.clear();

        for (const [slotName, data] of this.slots.entries()) {
            const pattern = data.positions.map(([r, c]) => {
                const letter = this.grid.grid[r][c];
                return /^[A-Z]$/.test(letter) ? letter : '.';
            }).join('');

            const regex = new RegExp(`^${pattern}$`);
            const possibleWords = this.wordList.filter(word => word.length === data.positions.length && regex.test(word));

            if (possibleWords.length === 0) {
                this.domains.set(slotName, new Set());
            } else {
                this.domains.set(slotName, new Set(possibleWords));
            }
        }

        this.notificationManager.showInfo("Domains initialized for each slot.");
    }

    /**
     * Implements the AC-3 algorithm for enforcing arc consistency.
     * @returns {boolean} True if arc consistency is maintained, else false.
     */
    ac3() {
        const queue = [];

        // Initialize queue with all arcs
        for (const [slotA, neighbors] of this.constraints.entries()) {
            for (const slotB of neighbors.keys()) {
                queue.push([slotA, slotB]);
            }
        }

        while (queue.length > 0) {
            const [slotA, slotB] = queue.shift();
            if (this.revise(slotA, slotB)) {
                if (this.domains.get(slotA).size === 0) {
                    return false; // Domain wiped out
                }
                // Add all neighbors of slotA except slotB to the queue
                for (const slotC of this.constraints.get(slotA).keys()) {
                    if (slotC !== slotB) {
                        queue.push([slotC, slotA]);
                    }
                }
            }
        }

        return true;
    }

    /**
     * Revises the domain of slotA with respect to slotB.
     * @param {string} slotA - The first slot.
     * @param {string} slotB - The second slot.
     * @returns {boolean} True if the domain of slotA was revised, else false.
     */
    revise(slotA, slotB) {
        let revised = false;
        const overlappingIndices = this.constraints.get(slotA).get(slotB);

        const wordsA = Array.from(this.domains.get(slotA));
        const wordsB = Array.from(this.domains.get(slotB));

        const newDomainA = new Set();

        for (const wordA of wordsA) {
            let satisfies = false;
            for (const wordB of wordsB) {
                let match = true;
                for (const [idxA, idxB] of overlappingIndices) {
                    if (wordA[idxA] !== wordB[idxB]) {
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
                newDomainA.add(wordA);
            } else {
                revised = true;
            }
        }

        if (revised) {
            this.domains.set(slotA, newDomainA);
        }

        return revised;
    }

    /**
     * Implements the Backtracking Search algorithm with heuristics.
     * @returns {boolean} True if a solution is found, else false.
     */
    backtrack(assignment = {}) {
        if (Object.keys(assignment).length === this.slots.size) {
            this.solution = new Map(Object.entries(assignment));
            return true;
        }

        // Select unassigned slot with Minimum Remaining Values (MRV)
        let unassignedSlots = Array.from(this.slots.keys()).filter(slot => !(slot in assignment));
        unassignedSlots.sort((a, b) => this.domains.get(a).size - this.domains.get(b).size);
        const slot = unassignedSlots[0];

        for (const word of Array.from(this.domains.get(slot))) {
            if (this.isConsistent(slot, word, assignment)) {
                assignment[slot] = word;
                this.recursiveCalls++;

                if (this.backtrack(assignment)) {
                    return true;
                }

                delete assignment[slot];
            }
        }

        return false;
    }

    /**
     * Checks if assigning a word to a slot is consistent with the current assignment.
     * @param {string} slot - The slot to assign.
     * @param {string} word - The word to assign.
     * @param {Object} assignment - Current slot assignments.
     * @returns {boolean} True if consistent, else false.
     */
    isConsistent(slot, word, assignment) {
        const neighbors = this.constraints.get(slot);

        for (const [neighbor, overlaps] of neighbors.entries()) {
            if (neighbor in assignment) {
                const wordNeighbor = assignment[neighbor];
                for (const [idxA, idxB] of overlaps) {
                    if (word[idxA] !== wordNeighbor[idxB]) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * Applies the solution to the grid by updating the cells with the solved words.
     */
    applySolution() {
        for (const [slot, word] of this.solution.entries()) {
            const { positions } = this.slots.get(slot);
            positions.forEach(([r, c], idx) => {
                const currentLetter = this.grid.grid[r][c];
                if (!/^[A-Z]$/.test(currentLetter)) { // Don't overwrite pre-filled letters
                    this.grid.updateCell(r, c, word[idx]);
                }
            });
        }
    }

    /**
     * Displays the solved words categorized as Across and Down in the Word List section.
     */
    displayWordList() {
        const resultArea = document.getElementById("result");
        if (!resultArea) return;

        let across = [];
        let down = [];

        // Sort slots based on their starting number
        const sortedSlots = Array.from(this.slots.entries()).sort((a, b) => {
            const numA = parseInt(a[0].match(/^S(\d+)_/)[1]);
            const numB = parseInt(b[0].match(/^S(\d+)_/)[1]);
            return numA - numB;
        });

        for (const [slot, data] of sortedSlots) {
            const word = this.solution.get(slot);
            if (word) {
                const slotNumber = parseInt(slot.match(/^S(\d+)_/)[1]);
                const entry = `${slotNumber}: ${word}`;
                if (data.direction === 'across') {
                    across.push(entry);
                } else if (data.direction === 'down') {
                    down.push(entry);
                }
            }
        }

        resultArea.innerHTML = `<strong>Across:</strong><br>${across.join("<br>")}<br><br><strong>Down:</strong><br>${down.join("<br>")}`;
    }

    /**
     * Logs performance metrics to the console.
     */
    logPerformanceMetrics() {
        console.log("Performance Metrics:");
        console.log(`AC-3 Time: ${this.performanceData.ac3Time} seconds`);
        console.log(`Backtracking Time: ${this.performanceData.backtrackTime} seconds`);
        console.log(`Recursive Calls: ${this.performanceData.recursiveCalls}`);
    }

    /**
     * Displays the solution on the grid by updating the DOM elements.
     */
    displaySolution() {
        // The solution is already applied to the grid via applySolution()
        // Additional UI updates can be handled here if necessary
        this.notificationManager.showInfo("Solution applied to the grid.");
    }

    /**
     * Recursively called during backtracking to count the number of recursive calls.
     */
    recursiveCalls = 0;
}
