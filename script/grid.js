// grid.js
export class Grid {
    constructor() {
        this.grid = [];
        this.rows = 10;
        this.columns = 10;
    }

    /**
     * Initializes the grid with the specified number of rows and columns.
     * @param {number} rows - Number of rows in the grid.
     * @param {number} columns - Number of columns in the grid.
     */
    initializeGrid(rows, columns) {
        this.rows = rows;
        this.columns = columns;
        this.grid = Array.from({ length: rows }, () => Array(columns).fill(" "));
    }

    /**
     * Loads a predefined puzzle into the grid.
     * @param {Array<Array<string>>} predefinedGrid - The predefined puzzle grid.
     */
    loadPredefinedGrid(predefinedGrid) {
        this.rows = predefinedGrid.length;
        this.columns = predefinedGrid[0].length;
        this.grid = predefinedGrid.map(row => [...row]);
    }

    /**
     * Clears the current grid.
     */
    clearGrid() {
        this.grid = [];
    }

    /**
     * Toggles a cell between black and white.
     * @param {number} row - The row index of the cell.
     * @param {number} col - The column index of the cell.
     */
    toggleCell(row, col) {
        if (this.grid[row][col] === "#") {
            this.grid[row][col] = " ";
        } else {
            this.grid[row][col] = "#";
        }
    }

    /**
     * Updates a cell with a specific value and styling.
     * @param {number} row - The row index of the cell.
     * @param {number} col - The column index of the cell.
     * @param {string} value - The value to set in the cell.
     * @param {string|null} bg - Background color (optional).
     * @param {string|null} fg - Foreground (text) color (optional).
     */
    updateCell(row, col, value, bg = null, fg = null) {
        this.grid[row][col] = value;
        const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            if (value !== "#") {
                cell.classList.remove("black-cell");
                cell.classList.add("white-cell");
                if (/^\d+$/.test(value)) {
                    cell.classList.add("numbered-cell");
                    cell.textContent = value;
                } else if (/^[A-Z]$/.test(value)) {
                    cell.classList.add("prefilled-cell");
                    cell.textContent = value;
                } else {
                    cell.textContent = "";
                }
            } else {
                cell.classList.remove("white-cell", "prefilled-cell", "numbered-cell", "solved-cell");
                cell.classList.add("black-cell");
                cell.textContent = "";
            }

            if (bg) {
                cell.style.backgroundColor = bg;
            }
            if (fg) {
                cell.style.color = fg;
            }
        }
    }

    /**
     * Renders the grid in the DOM.
     */
    renderGrid() {
        const gridContainer = document.getElementById("gridContainer");
        gridContainer.innerHTML = "";
        const fragment = document.createDocumentFragment();

        for (let r = 0; r < this.rows; r++) {
            const rowDiv = document.createElement("div");
            rowDiv.classList.add("grid-row");
            for (let c = 0; c < this.columns; c++) {
                const cellDiv = document.createElement("div");
                cellDiv.classList.add("grid-cell");
                const val = this.grid[r][c];

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
                // Event listeners will be attached in app.js to keep separation of concerns
                fragment.appendChild(cellDiv);
            }
            fragment.appendChild(rowDiv);
        }
        gridContainer.appendChild(fragment);
    }

    /**
     * Updates all numbered cells after grid modifications.
     * This ensures that numbering remains sequential and accurate.
     */
    updateAllNumbers() {
        let number = 1;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.columns; c++) {
                const cell = this.grid[r][c];
                const cellDiv = document.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
                if (cellDiv && /^(?!#)\s*$/.test(cell)) {
                    // Check if this cell should be numbered
                    const isStartOfAcross = (c === 0 || this.grid[r][c - 1] === "#") && (c < this.columns - 1 && this.grid[r][c + 1] !== "#");
                    const isStartOfDown = (r === 0 || this.grid[r - 1][c] === "#") && (r < this.rows - 1 && this.grid[r + 1][c] !== "#");

                    if (isStartOfAcross || isStartOfDown) {
                        cellDiv.setAttribute('data-number', number);
                        cellDiv.classList.add("numbered-cell");
                        cellDiv.textContent = number;
                        this.grid[r][c] = String(number);
                        number++;
                    } else {
                        cellDiv.removeAttribute('data-number');
                        cellDiv.classList.remove("numbered-cell");
                        if (!/^[A-Z]$/.test(cell)) {
                            cellDiv.textContent = "";
                            this.grid[r][c] = " ";
                        }
                    }
                }
            }
        }
    }
}
