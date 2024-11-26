# Custom Crossword Generator and Solver

A Python application to design and solve crossword puzzles using a GUI interface. The project implements both simple and advanced backtracking algorithms with heuristic optimizations to solve crossword puzzles efficiently.

## Features

- **Interactive GUI**: Users can create custom grids, load predefined puzzles, and interact with the crossword design through a user-friendly interface.
- **Backtracking Algorithm**: Supports both basic and optimized backtracking techniques.
- **Constraint Propagation**: Includes AC-3 for arc consistency and heuristics like MRV (Minimum Remaining Values) and Least Constraining Value.
- **Performance Analysis**: Measures time and recursive calls for solving different puzzle sizes and strategies.
- **Predefined Puzzles**: Includes easy, medium, and hard crossword configurations.
- **Custom Word List**: Allows importing a custom word list (e.g., `Words.txt`) for puzzle generation and solving.

## Installation

### Prerequisites

- Python 3.x
- Libraries: `tkinter`, `numpy`

Install missing libraries using:

```bash
pip install numpy
