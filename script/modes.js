// modes.js

/**
 * ModesManager handles the activation and deactivation of different interaction modes:
 * - Number Entry Mode
 * - Letter Entry Mode
 * - Drag Mode
 * It ensures that only one mode is active at a time and updates the UI accordingly.
 */

export class ModesManager {
    constructor(grid, notificationManager) {
        this.grid = grid; // Instance of Grid class
        this.notificationManager = notificationManager; // Instance of NotificationManager class

        // Mode Flags
        this.isNumberEntryMode = false;
        this.isLetterEntryMode = false;
        this.isDragMode = false;
        this.isDragging = false;

        // Current Number for Number Entry Mode
        this.currentNumber = 1;

        // Bind UI Elements
        this.bindUIElements();
    }

    /**
     * Binds the mode control buttons to their respective event handlers.
     */
    bindUIElements() {
        this.startNumberEntryButton = document.getElementById("startNumberEntryButton");
        this.stopNumberEntryButton = document.getElementById("stopNumberEntryButton");
        this.startLetterEntryButton = document.getElementById("startLetterEntryButton");
        this.startDragModeButton = document.getElementById("startDragModeButton");

        if (this.startNumberEntryButton) {
            this.startNumberEntryButton.addEventListener("click", () => this.startNumberEntryMode());
        }

        if (this.stopNumberEntryButton) {
            this.stopNumberEntryButton.addEventListener("click", () => this.stopNumberEntryMode());
        }

        if (this.startLetterEntryButton) {
            this.startLetterEntryButton.addEventListener('click', () => this.toggleLetterEntryMode());
        }

        if (this.startDragModeButton) {
            this.startDragModeButton.addEventListener('click', () => this.toggleDragMode());
        }

        // Bind Grid Events
        this.gridContainer = document.getElementById("gridContainer");
        if (this.gridContainer) {
            this.gridContainer.addEventListener("click", (e) => this.handleGridClick(e));
            this.gridContainer.addEventListener("keydown", (e) => this.handleGridKeyDown(e));
        }

        // Bind Drag Events (for Drag Mode)
        this.bindDragEvents();
    }

    /**
     * Updates the mode label text in the UI.
     * @param {string} mode - The current active mode.
     */
    updateModeLabelTxt(mode) {
        const modeLabel = document.getElementById("modeLabel");
        if (modeLabel) {
            modeLabel.textContent = "Mode: " + mode;
        }
    }

    /**
     * Activates Number Entry Mode.
     */
    startNumberEntryMode() {
        if (this.isLetterEntryMode) this.toggleLetterEntryMode();
        if (this.isDragMode) this.toggleDragMode();
        if (!this.isNumberEntryMode) {
            this.isNumberEntryMode = true;
            this.startNumberEntryButton.style.display = "none";
            this.stopNumberEntryButton.style.display = "inline";
            this.updateModeLabelTxt("Number Entry");
            this.notificationManager.showInfo("Number Entry Mode Activated.");
            this.grid.updateAllNumbers();
        }
    }

    /**
     * Deactivates Number Entry Mode.
     */
    stopNumberEntryMode() {
        if (this.isNumberEntryMode) {
            this.isNumberEntryMode = false;
            this.startNumberEntryButton.style.display = "inline";
            this.stopNumberEntryButton.style.display = "none";
            this.updateModeLabelTxt("Default");
            this.notificationManager.showInfo("Number Entry Mode Deactivated.");
        }
    }

    /**
     * Toggles Letter Entry Mode.
     */
    toggleLetterEntryMode() {
        if (this.isLetterEntryMode) {
            this.isLetterEntryMode = false;
            this.startLetterEntryButton.textContent = "Letter Entry Mode";
            this.updateModeLabelTxt("Default");
            this.notificationManager.showInfo("Letter Entry Mode Deactivated.");
        } else {
            if (this.isNumberEntryMode) this.stopNumberEntryMode();
            if (this.isDragMode) this.toggleDragMode();
            this.isLetterEntryMode = true;
            this.startLetterEntryButton.textContent = "Exit Letter Entry Mode";
            this.updateModeLabelTxt("Letter Entry");
            this.notificationManager.showInfo("Letter Entry Mode Activated.");
        }
    }

    /**
     * Toggles Drag Mode.
     */
    toggleDragMode() {
        if (this.isDragMode) {
            this.deactivateDragMode();
        } else {
            if (this.isNumberEntryMode) this.stopNumberEntryMode();
            if (this.isLetterEntryMode) this.toggleLetterEntryMode();
            this.activateDragMode();
        }
    }

    /**
     * Activates Drag Mode by updating UI and binding necessary events.
     */
    activateDragMode() {
        this.isDragMode = true;
        this.startDragModeButton.textContent = "Exit Drag Mode";
        this.updateModeLabelTxt("Drag");
        this.notificationManager.showInfo("Drag Mode Activated.");
        // Additional setup for drag mode if necessary
    }

    /**
     * Deactivates Drag Mode by updating UI and unbinding necessary events.
     */
    deactivateDragMode() {
        this.isDragMode = false;
        this.startDragModeButton.textContent = "Drag Mode";
        this.updateModeLabelTxt("Default");
        this.notificationManager.showInfo("Drag Mode Deactivated.");
        // Additional teardown for drag mode if necessary
    }

    /**
     * Handles click events on the grid based on the current mode.
     * @param {Event} e - The click event.
     */
    handleGridClick(e) {
        const cell = e.target.closest('.grid-cell');
        if (!cell) return;

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (this.isDragMode) {
            // In Drag Mode, clicking might not perform any action directly
            return;
        }

        if (this.isNumberEntryMode) {
            this.handleNumberEntry(cell, row, col);
            return;
        }

        if (this.isLetterEntryMode) {
            this.handleLetterEntry(cell, row, col);
            return;
        }

        // Default Mode: Toggle black/white cells
        this.toggleBlackWhite(cell, row, col);
    }

    /**
     * Handles keyboard events on the grid based on the current mode.
     * @param {Event} e - The keyboard event.
     */
    handleGridKeyDown(e) {
        const cell = e.target.closest('.grid-cell');
        if (!cell) return;

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        switch (e.key) {
            case 'Enter':
            case ' ':
                cell.click();
                e.preventDefault();
                break;
            case 'ArrowUp':
                this.focusCell(row - 1, col);
                e.preventDefault();
                break;
            case 'ArrowDown':
                this.focusCell(row + 1, col);
                e.preventDefault();
                break;
            case 'ArrowLeft':
                this.focusCell(row, col - 1);
                e.preventDefault();
                break;
            case 'ArrowRight':
                this.focusCell(row, col + 1);
                e.preventDefault();
                break;
            default:
                break;
        }
    }

    /**
     * Sets focus to a specific cell in the grid.
     * @param {number} row - The row index of the target cell.
     * @param {number} col - The column index of the target cell.
     */
    focusCell(row, col) {
        const targetCell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
        if (targetCell) {
            targetCell.focus();
        }
    }

    /**
     * Handles Number Entry Mode by assigning or removing numbers from cells.
     * @param {HTMLElement} cell - The clicked cell element.
     * @param {number} row - The row index of the cell.
     * @param {number} col - The column index of the cell.
     */
    handleNumberEntry(cell, row, col) {
        const cellValue = this.grid.grid[row][col];
        if (/^\d+$/.test(cellValue)) {
            // Remove number
            this.grid.updateCell(row, col, " ");
            this.notificationManager.showInfo(`Number removed from cell (${row + 1}, ${col + 1}).`);
            this.reassignNumbers();
        } else if (cellValue !== "#") {
            // Assign next available number
            this.grid.updateCell(row, col, String(this.currentNumber));
            this.notificationManager.showInfo(`Number ${this.currentNumber} assigned to cell (${row + 1}, ${col + 1}).`);
            this.currentNumber++;
        } else {
            this.notificationManager.showWarning("Cannot assign a number to a black cell.");
        }
    }

    /**
     * Reassigns numbers sequentially after a number has been removed.
     */
    reassignNumbers() {
        let number = 1;
        for (let r = 0; r < this.grid.rows; r++) {
            for (let c = 0; c < this.grid.columns; c++) {
                const cellValue = this.grid.grid[r][c];
                if (/^\d+$/.test(cellValue)) {
                    this.grid.updateCell(r, c, String(number));
                    number++;
                }
            }
        }
        this.currentNumber = number;
    }

    /**
     * Handles Letter Entry Mode by prompting the user to input a letter.
     * @param {HTMLElement} cell - The clicked cell element.
     * @param {number} row - The row index of the cell.
     * @param {number} col - The column index of the cell.
     */
    handleLetterEntry(cell, row, col) {
        const letter = prompt("Enter a single letter (A-Z):");
        if (letter && /^[A-Za-z]$/.test(letter)) {
            this.grid.updateCell(row, col, letter.toUpperCase(), null, null);
            this.notificationManager.showInfo(`Letter '${letter.toUpperCase()}' entered at (${row + 1}, ${col + 1}).`);
        } else if (letter !== null) {
            this.notificationManager.showWarning("Please enter a single letter (A-Z).");
        }
    }

    /**
     * Toggles a cell between black and white in Default Mode.
     * @param {HTMLElement} cell - The clicked cell element.
     * @param {number} row - The row index of the cell.
     * @param {number} col - The column index of the cell.
     */
    toggleBlackWhite(cell, row, col) {
        if (cell.classList.contains("black-cell")) {
            this.grid.updateCell(row, col, " ");
            this.notificationManager.showInfo(`Cell (${row + 1}, ${col + 1}) changed to white.`);
            this.reassignNumbers();
        } else {
            this.grid.updateCell(row, col, "#");
            this.notificationManager.showInfo(`Cell (${row + 1}, ${col + 1}) changed to black.`);
            this.reassignNumbers();
        }
    }

    /**
     * Binds mouse events for Drag Mode.
     */
    bindDragEvents() {
        this.isDragging = false;
        this.toggleToBlack = false;

        if (this.gridContainer) {
            this.gridContainer.addEventListener("mousedown", (e) => this.startDrag(e));
            this.gridContainer.addEventListener("mousemove", (e) => this.onDrag(e));
            this.gridContainer.addEventListener("mouseup", () => this.stopDrag());
            this.gridContainer.addEventListener("mouseleave", () => this.stopDrag());
        }
    }

    /**
     * Handles the start of a drag action.
     * @param {MouseEvent} event - The mouse event.
     */
    startDrag(event) {
        if (!this.isDragMode) return;
        this.isDragging = true;
        const cell = event.target.closest('.grid-cell');
        if (!cell) return;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        this.toggleToBlack = !cell.classList.contains("black-cell");
        this.toggleCell(row, col);
    }

    /**
     * Handles the dragging action over cells.
     * @param {MouseEvent} event - The mouse event.
     */
    onDrag(event) {
        if (!this.isDragging) return;
        const cell = document.elementFromPoint(event.clientX, event.clientY).closest('.grid-cell');
        if (!cell) return;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        this.toggleCell(row, col);
    }

    /**
     * Handles the end of a drag action.
     */
    stopDrag() {
        if (!this.isDragMode) return;
        this.isDragging = false;
    }

    /**
     * Toggles a cell's state between black and white during Drag Mode.
     * @param {number} row - The row index of the cell.
     * @param {number} col - The column index of the cell.
     */
    toggleCell(row, col) {
        const cellValue = this.grid.grid[row][col];
        if (this.toggleToBlack && cellValue !== "#") {
            this.grid.updateCell(row, col, "#");
            this.notificationManager.showInfo(`Cell (${row + 1}, ${col + 1}) changed to black.`);
            this.reassignNumbers();
        } else if (!this.toggleToBlack && cellValue === "#") {
            this.grid.updateCell(row, col, " ");
            this.notificationManager.showInfo(`Cell (${row + 1}, ${col + 1}) changed to white.`);
            this.reassignNumbers();
        }
    }
}
