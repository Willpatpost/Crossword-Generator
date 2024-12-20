// app.js

// Importing necessary classes from other modules
import { Grid } from './grid.js';
import { Solver } from './solver.js';
import { ModesManager } from './modes.js';
import { NotificationManager } from './notifications.js';

/**
 * App class serves as the main orchestrator for the crossword generator application.
 * It initializes all components, handles user interactions, and manages the overall application state.
 */
class App {
    constructor() {
        // Initialize Notification Manager
        this.notificationManager = new NotificationManager();

        // Initialize Grid
        this.grid = new Grid();

        // Initialize Modes Manager
        this.modesManager = new ModesManager(this.grid, this.notificationManager);

        // Initialize Solver (wordList will be loaded later)
        this.solver = null;

        // Word List
        this.wordList = [];

        // Predefined Puzzles
        this.predefinedPuzzles = {
            easy: [
                [' ', ' ', 'A', ' ', ' '],
                [' ', '#', '#', '#', ' '],
                ['B', ' ', 'C', ' ', 'D'],
                [' ', '#', '#', '#', ' '],
                [' ', 'E', ' ', 'F', ' ']
            ],
            medium: [
                [' ', ' ', 'A', ' ', ' ', 'G', ' '],
                [' ', '#', '#', '#', '#', '#', ' '],
                ['B', ' ', 'C', ' ', 'D', ' ', 'E'],
                [' ', '#', '#', '#', '#', '#', ' '],
                [' ', 'F', ' ', 'G', ' ', 'H', ' '],
                [' ', '#', '#', '#', '#', '#', ' '],
                ['I', ' ', 'J', ' ', 'K', ' ', 'L']
            ],
            hard: [
                [' ', ' ', 'A', ' ', ' ', 'G', ' ', ' '],
                [' ', '#', '#', '#', '#', '#', '#', ' '],
                ['B', ' ', 'C', ' ', 'D', ' ', 'E', 'F'],
                [' ', '#', '#', '#', '#', '#', '#', ' '],
                [' ', 'G', ' ', 'H', ' ', 'I', ' ', 'J'],
                [' ', '#', '#', '#', '#', '#', '#', ' '],
                ['K', ' ', 'L', ' ', 'M', ' ', 'N', 'O'],
                [' ', '#', '#', '#', '#', '#', '#', ' '],
                [' ', 'P', ' ', 'Q', ' ', 'R', ' ', 'S']
            ]
        };

        // Bind UI Elements
        this.bindUIElements();

        // Load Words
        this.loadWords();

        // Initialize Solver once words are loaded
    }

    /**
     * Binds all necessary UI elements and their respective event listeners.
     */
    bindUIElements() {
        // Generate Grid Button
        this.generateGridButton = document.getElementById("generateGridButton");
        if (this.generateGridButton) {
            this.generateGridButton.addEventListener("click", () => this.handleGenerateGrid());
        }

        // Predefined Puzzle Buttons
        this.loadEasyPuzzleButton = document.getElementById("loadEasyPuzzle");
        this.loadMediumPuzzleButton = document.getElementById("loadMediumPuzzle");
        this.loadHardPuzzleButton = document.getElementById("loadHardPuzzle");

        if (this.loadEasyPuzzleButton) {
            this.loadEasyPuzzleButton.addEventListener("click", () => this.loadPredefinedPuzzle('easy'));
        }
        if (this.loadMediumPuzzleButton) {
            this.loadMediumPuzzleButton.addEventListener("click", () => this.loadPredefinedPuzzle('medium'));
        }
        if (this.loadHardPuzzleButton) {
            this.loadHardPuzzleButton.addEventListener("click", () => this.loadPredefinedPuzzle('hard'));
        }

        // Solve Crossword Button
        this.solveCrosswordButton = document.getElementById("solveCrosswordButton");
        if (this.solveCrosswordButton) {
            this.solveCrosswordButton.addEventListener("click", () => this.handleSolveCrossword());
        }

        // Loading Spinner
        this.loadingSpinner = document.getElementById("loadingSpinner");

        // Disable Solve Button Initially
        if (this.solveCrosswordButton) {
            this.solveCrosswordButton.disabled = true;
        }
    }

    /**
     * Loads the word list from Data/Words.txt.
     * If loading fails, falls back to a predefined word list.
     */
    async loadWords() {
        try {
            const response = await fetch('Data/Words.txt');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const text = await response.text();
            this.wordList = text.split(/\r?\n/).map(word => word.trim().toUpperCase()).filter(word => word.length > 0);
            this.notificationManager.showInfo(`Loaded ${this.wordList.length} words from Words.txt.`);
        } catch (error) {
            this.notificationManager.showWarning(`Failed to load Words.txt. Using fallback word list. Error: ${error.message}`);
            this.wordList = this.getFallbackWordList();
        }

        // Initialize Solver after words are loaded
        this.solver = new Solver(this.grid, this.wordList, this.notificationManager);
        // Enable Solve Crossword Button
        if (this.solveCrosswordButton) {
            this.solveCrosswordButton.disabled = false;
        }
    }

    /**
     * Provides a fallback word list in case loading Words.txt fails.
     * @returns {Array<string>} Array of fallback words.
     */
    getFallbackWordList() {
        return [
            'APPLE',
            'BANANA',
            'CHERRY',
            'DATE',
            'ELDER',
            'FIG',
            'GRAPE',
            'HONEY',
            'INDIGO',
            'JELLY',
            'KIWI',
            'LEMON',
            'MANGO',
            'NECTAR',
            'ORANGE',
            'PAPAYA',
            'QUINCE',
            'RASPBERRY',
            'STRAWBERRY',
            'TANGERINE'
        ];
    }

    /**
     * Handles the Generate Grid button click event.
     * Generates a new grid based on user-specified rows and columns.
     */
    handleGenerateGrid() {
        const rowsSelect = document.getElementById("rows");
        const colsSelect = document.getElementById("columns");
        const rows = parseInt(rowsSelect.value);
        const cols = parseInt(colsSelect.value);

        if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) {
            this.notificationManager.showWarning("Please select valid grid dimensions.");
            return;
        }

        // Initialize and render the grid
        this.grid.initializeGrid(rows, cols);
        this.grid.renderGrid();
        this.grid.updateAllNumbers();

        // Notify user
        this.notificationManager.showInfo(`Generated a ${rows}x${cols} grid.`);

        // Reset Modes
        this.modesManager.stopNumberEntryMode();
        this.modesManager.toggleLetterEntryMode(); // Ensure Letter Entry Mode is off
        if (this.modesManager.isDragMode) {
            this.modesManager.toggleDragMode();
        }
    }

    /**
     * Loads a predefined puzzle into the grid.
     * @param {string} difficulty - The difficulty level ('easy', 'medium', 'hard').
     */
    loadPredefinedPuzzle(difficulty) {
        const puzzle = this.predefinedPuzzles[difficulty];
        if (!puzzle) {
            this.notificationManager.showError(`Predefined puzzle for difficulty '${difficulty}' not found.`);
            return;
        }

        // Initialize and load the predefined grid
        this.grid.loadPredefinedGrid(puzzle);
        this.grid.renderGrid();
        this.grid.updateAllNumbers();

        // Notify user
        this.notificationManager.showInfo(`Loaded ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} puzzle.`);

        // Reset Modes
        this.modesManager.stopNumberEntryMode();
        this.modesManager.toggleLetterEntryMode(); // Ensure Letter Entry Mode is off
        if (this.modesManager.isDragMode) {
            this.modesManager.toggleDragMode();
        }
    }

    /**
     * Handles the Solve Crossword button click event.
     * Initiates the solving process using the Solver module.
     */
    async handleSolveCrossword() {
        if (!this.solver) {
            this.notificationManager.showError("Solver is not initialized.");
            return;
        }

        // Disable Solve Button and Show Spinner
        this.solveCrosswordButton.disabled = true;
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = "inline-block";
        }

        // Clear Previous Solution and Word List
        this.clearSolution();

        // Initiate Solving
        const success = await this.solver.solve();

        // Hide Spinner and Enable Solve Button
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = "none";
        }
        this.solveCrosswordButton.disabled = false;

        if (success) {
            this.notificationManager.showInfo("Crossword solved successfully!");
        } else {
            this.notificationManager.showWarning("Failed to solve the crossword. Please check the grid and try again.");
        }
    }

    /**
     * Clears the previous solution from the grid and word list.
     */
    clearSolution() {
        // Iterate through the grid and remove solved cells
        for (let r = 0; r < this.grid.rows; r++) {
            for (let c = 0; c < this.grid.columns; c++) {
                const cellValue = this.grid.grid[r][c];
                if (/^[A-Z]$/.test(cellValue)) {
                    // Check if the cell was prefilled or solved
                    const cellDiv = document.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
                    if (cellDiv && cellDiv.classList.contains("solved-cell")) {
                        this.grid.updateCell(r, c, " ");
                        cellDiv.classList.remove("solved-cell");
                    }
                }
            }
        }

        // Clear Word List
        const resultArea = document.getElementById("result");
        if (resultArea) {
            resultArea.innerHTML = "";
        }
    }
}

// Initialize the application once the window loads
window.onload = () => {
    const app = new App();
};
