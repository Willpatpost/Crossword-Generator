import tkinter as tk
from tkinter import messagebox, simpledialog
import random
import re
import time
import numpy as np
from collections import Counter
import threading

class CrosswordSolver(tk.Tk):
    """
    Main application class for the Crossword Generator and Solver GUI.
    """

    def __init__(self):
        """
        Initialize the crossword solver application.
        """
        super().__init__()
        self.title("Custom Crossword Generator")
        self.configure(bg="#f0f2f5")

        # Constants and configurations
        self.DEBUG = False  # Toggle debug messages
        self.word_length_cache = {}      # Cache for words by length
        self.is_number_entry_mode = False  # Flag for number entry mode
        self.is_solving = False  # Flag to prevent multiple solves at once
        self.recursive_calls = 0  # Count recursive calls for performance metrics
        self.performance_data = {}  # Store performance metrics

        # Data structures
        self.grid = np.array([])              # The crossword grid
        self.words = []             # List of words from the dictionary
        self.slots = {}             # Dictionary of slots with positions
        self.constraints = {}       # Constraints between slots
        self.solution = {}          # Final solution mapping slots to words
        self.domains = {}           # Possible words for each slot
        self.cell_contents = {}     # Pre-filled letters in the grid
        self.cells = {}             # Mapping of grid positions to GUI cells

        # Predefined puzzles
        self.predefined_puzzles = [
            {
                "name": "Easy",
                "grid": [
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
                "name": "Medium",
                "grid": [
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
                "name": "Hard",
                "grid": [
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
        ]

        # Initialize GUI components
        self.create_widgets()

        # Load words
        self.after(0, self.load_words)

    def debug_log(self, message, *args):
        """
        Print debug messages if DEBUG is True.

        Args:
            message (str): The message to log.
            *args: Additional arguments to format into the message.
        """
        if self.DEBUG:
            with open('debug.log', 'a') as log_file:
                log_file.write(message + ' ' + ' '.join(str(arg) for arg in args) + '\n')

    def create_widgets(self):
        """
        Create and configure the GUI components.
        """
        # Main Frame
        main_frame = tk.Frame(self, bg="#f0f2f5")
        main_frame.pack(fill="both", expand=True)

        # Header
        header = tk.Label(main_frame, text="Custom Crossword Generator",
                          font=("Arial", 22, "bold"), bg="#f0f2f5", fg="#222")
        header.pack(pady=10)

        # Top Frame for settings and controls
        top_frame = tk.Frame(main_frame, bg="#f0f2f5")
        top_frame.pack(pady=10, fill="x")

        # Settings Section
        settings_frame = tk.Frame(top_frame, bg="#f0f2f5")
        settings_frame.pack(side="left", padx=10)

        settings_label = tk.Label(settings_frame, text="Select Grid Size",
                                  font=("Arial", 16), bg="#f0f2f5", fg="#333")
        settings_label.grid(row=0, column=0, columnspan=4, pady=5)

        tk.Label(settings_frame, text="Rows:", bg="#f0f2f5", fg="#333",
                 font=("Arial", 12)).grid(row=1, column=0, padx=5)
        self.rows_var = tk.IntVar(value=10)
        rows_options = list(range(1, 21))
        self.rows_menu = tk.OptionMenu(settings_frame, self.rows_var, *rows_options)
        self.rows_menu.grid(row=1, column=1, padx=5)

        tk.Label(settings_frame, text="Columns:", bg="#f0f2f5", fg="#333",
                 font=("Arial", 12)).grid(row=1, column=2, padx=5)
        self.columns_var = tk.IntVar(value=10)
        self.columns_menu = tk.OptionMenu(settings_frame, self.columns_var, *rows_options)
        self.columns_menu.grid(row=1, column=3, padx=5)

        self.generate_grid_button = tk.Button(settings_frame, text="Generate Grid",
                                              command=self.generate_grid, bg="#0069d9",
                                              fg="#ffffff", font=("Arial", 10, "bold"),
                                              relief="raised", bd=2)
        self.generate_grid_button.grid(row=2, column=0, columnspan=4, pady=10)

        # Predefined Puzzles Section
        puzzles_frame = tk.Frame(top_frame, bg="#f0f2f5")
        puzzles_frame.pack(side="left", padx=10)

        puzzles_label = tk.Label(puzzles_frame, text="Load Puzzle",
                                 font=("Arial", 16), bg="#f0f2f5", fg="#333")
        puzzles_label.pack()

        self.load_easy_puzzle = tk.Button(puzzles_frame, text="Load Easy Puzzle",
                                          command=lambda: self.load_predefined_puzzle("Easy"), bg="#17a2b8",
                                          fg="#ffffff", font=("Arial", 10, "bold"),
                                          relief="raised", bd=2)
        self.load_easy_puzzle.pack(side="left", padx=5, pady=5)

        self.load_medium_puzzle = tk.Button(puzzles_frame, text="Load Medium Puzzle",
                                            command=lambda: self.load_predefined_puzzle("Medium"), bg="#17a2b8",
                                            fg="#ffffff", font=("Arial", 10, "bold"),
                                            relief="raised", bd=2)
        self.load_medium_puzzle.pack(side="left", padx=5, pady=5)

        self.load_hard_puzzle = tk.Button(puzzles_frame, text="Load Hard Puzzle",
                                          command=lambda: self.load_predefined_puzzle("Hard"), bg="#17a2b8",
                                          fg="#ffffff", font=("Arial", 10, "bold"),
                                          relief="raised", bd=2)
        self.load_hard_puzzle.pack(side="left", padx=5, pady=5)

        # Number Entry Controls
        number_entry_frame = tk.Frame(top_frame, bg="#f0f2f5")
        number_entry_frame.pack(side="left", padx=10)

        self.start_number_entry_button = tk.Button(number_entry_frame, text="Enter Number Mode",
                                                   command=self.start_number_entry_mode, bg="#0069d9",
                                                   fg="#ffffff", font=("Arial", 10, "bold"),
                                                   relief="raised", bd=2)
        self.start_number_entry_button.pack(side="left", padx=5)

        self.stop_number_entry_button = tk.Button(number_entry_frame, text="Stop Number Mode",
                                                  command=self.stop_number_entry_mode, bg="#dc3545",
                                                  fg="#ffffff", font=("Arial", 10, "bold"),
                                                  relief="raised", bd=2)
        self.stop_number_entry_button.pack(side="left", padx=5)
        self.stop_number_entry_button.pack_forget()  # Hide initially

        # Middle Frame for grid and side panels
        middle_frame = tk.Frame(main_frame, bg="#f0f2f5")
        middle_frame.pack(fill="both", expand=True, padx=10)

        # Left Frame for Status
        status_frame = tk.Frame(middle_frame, bg="#f0f2f5")
        status_frame.pack(side="left", padx=10, fill="y")

        status_label = tk.Label(status_frame, text="Status",
                                font=("Arial", 14, "bold"), bg="#f0f2f5", fg="#333")
        status_label.pack()

        self.status_display = tk.Text(status_frame, height=20, width=30, state="disabled",
                                      bg="#f8f9fa", fg="#222", font=("Arial", 12))
        self.status_display.pack(pady=5)

        # Grid Frame
        self.grid_frame = tk.Frame(middle_frame, bg="#f0f2f5")
        self.grid_frame.pack(side="left", padx=10)

        grid_label = tk.Label(self.grid_frame, text="Crossword Grid",
                              font=("Arial", 16), bg="#f0f2f5", fg="#333")
        grid_label.pack()

        self.grid_container = tk.Frame(self.grid_frame, bg="#ffffff", bd=3, relief="solid")
        self.grid_container.pack(pady=10)

        # Right Frame for Word Lists
        word_list_frame = tk.Frame(middle_frame, bg="#f0f2f5")
        word_list_frame.pack(side="left", padx=10, fill="y")

        # Across Words Frame
        across_frame = tk.Frame(word_list_frame, bg="#f0f2f5")
        across_frame.pack(padx=5)

        across_label = tk.Label(across_frame, text="Across",
                                font=("Arial", 14, "bold"), bg="#f0f2f5", fg="#333")
        across_label.pack()

        self.across_display = tk.Text(across_frame, height=10, width=30, state="disabled",
                                      bg="#f8f9fa", fg="#222", font=("Arial", 12))
        self.across_display.pack(pady=5)

        # Down Words Frame
        down_frame = tk.Frame(word_list_frame, bg="#f0f2f5")
        down_frame.pack(padx=5)

        down_label = tk.Label(down_frame, text="Down",
                              font=("Arial", 14, "bold"), bg="#f0f2f5", fg="#333")
        down_label.pack()

        self.down_display = tk.Text(down_frame, height=10, width=30, state="disabled",
                                    bg="#f8f9fa", fg="#222", font=("Arial", 12))
        self.down_display.pack(pady=5)

        # Controls Section
        controls_frame = tk.Frame(main_frame, bg="#f0f2f5")
        controls_frame.pack(pady=10)

        self.solve_crossword_button = tk.Button(controls_frame, text="Solve Crossword",
                                                command=self.solve_crossword, bg="#28a745",
                                                fg="#ffffff", font=("Arial", 10, "bold"),
                                                relief="raised", bd=2)
        self.solve_crossword_button.pack(side="left", padx=5)

        self.set_seed_button = tk.Button(controls_frame, text="Set Seed",
                                         command=self.set_seed, bg="#ffc107",
                                         fg="#ffffff", font=("Arial", 10, "bold"),
                                         relief="raised", bd=2)
        self.set_seed_button.pack(side="left", padx=5)

        # Footer
        footer = tk.Label(main_frame, text="© 2024 Crossword Generator",
                          font=("Arial", 10), bg="#f0f2f5", fg="#555")
        footer.pack(pady=10)

    def load_words(self):
        """
        Load words from 'Words.txt' and cache them by length.
        """
        try:
            with open('Words.txt', 'r') as f:
                self.words = [word.strip().upper() for word in f if word.strip()]
            if not all(re.match("^[A-Z]+$", word) for word in self.words):
                raise ValueError("File contains invalid words. Ensure all entries are alphabetic.")
            self.cache_words_by_length()
            self.calculate_letter_frequencies()
            self.debug_log("Words loaded:", len(self.words))
        except FileNotFoundError:
            # Fallback word list
            self.words = ["LASER", "SAILS", "SHEET", "STEER", "HEEL", "HIKE", "KEEL", "KNOT"]
            messagebox.showwarning("Warning", "Words.txt not found. Using fallback word list.")
            self.debug_log("Words.txt not found. Using fallback word list.")
            self.cache_words_by_length()
            self.calculate_letter_frequencies()
        except Exception as e:
            messagebox.showerror("Error", f"Error loading words: {e}")

    def cache_words_by_length(self):
        """
        Cache words by their length for efficient domain setup.
        """
        self.word_length_cache.clear()
        for word in self.words:
            length = len(word)
            if length not in self.word_length_cache:
                self.word_length_cache[length] = []
            self.word_length_cache[length].append(word)
        self.debug_log("Word length cache created.")

    def calculate_letter_frequencies(self):
        """
        Precompute letter frequencies across the word list.
        """
        all_letters = "".join(self.words)
        self.letter_frequencies = Counter(all_letters)

    def generate_grid(self):
        """
        Generate a blank grid based on user-selected dimensions using numpy.
        """
        rows = self.rows_var.get()
        cols = self.columns_var.get()

        if rows <= 0 or cols <= 0:
            messagebox.showerror("Error", "Please enter valid positive numbers for rows and columns.")
            return

        # Clear any existing puzzle
        self.grid = np.full((rows, cols), "#", dtype=str)
        self.cells = {}
        self.grid_container.destroy()
        self.grid_container = tk.Frame(self.grid_frame, bg="#ffffff", bd=3, relief="solid")
        self.grid_container.pack(pady=10)

        # Create GUI cells
        for r in range(rows):
            for c in range(cols):
                cell = tk.Label(self.grid_container, text="", width=2, height=1, bg="#333",
                                fg="#333", bd=1, relief="solid", font=("Arial", 12, "bold"))
                cell.grid(row=r, column=c)
                cell.bind("<Button-1>", self.toggle_cell_or_add_number)
                cell.row = r
                cell.col = c
                self.cells[(r, c)] = cell

        self.debug_log("Grid generated with rows:", rows, "columns:", cols)

    def load_predefined_puzzle(self, puzzle_name):
        """
        Load a predefined puzzle by name.

        Args:
            puzzle_name (str): The name of the puzzle to load.
        """
        puzzle = next((p for p in self.predefined_puzzles if p['name'] == puzzle_name), None)
        if not puzzle:
            messagebox.showerror("Error", f"Puzzle {puzzle_name} not found.")
            return

        # Clear any existing puzzle
        self.grid = []
        self.solution.clear()
        self.slots.clear()
        self.constraints.clear()
        self.domains.clear()
        self.cell_contents.clear()

        rows = len(puzzle['grid'])
        cols = len(puzzle['grid'][0])

        # Deep copy to avoid modifying the original puzzle
        self.grid = np.array([row[:] for row in puzzle['grid']], dtype=str)
        self.cells = {}
        self.grid_container.destroy()
        self.grid_container = tk.Frame(self.grid_frame, bg="#ffffff", bd=3, relief="solid")
        self.grid_container.pack(pady=10)

        # Create GUI cells with appropriate content
        for r in range(rows):
            for c in range(cols):
                cell_value = self.grid[r][c]
                cell = tk.Label(self.grid_container, text="", width=2, height=1,
                                bd=1, relief="solid", font=("Arial", 12, "bold"))

                if cell_value == "#":
                    cell.config(bg="#333", fg="#333")
                elif cell_value.isdigit():
                    cell.config(bg="#f8f9fa", fg="#000", text=cell_value)
                elif cell_value.isalpha():
                    cell.config(bg="#f8f9fa", fg="#000", text=cell_value)
                else:
                    cell.config(bg="#f8f9fa", fg="#444")

                cell.grid(row=r, column=c)
                cell.bind("<Button-1>", self.toggle_cell_or_add_number)
                cell.row = r
                cell.col = c
                self.cells[(r, c)] = cell

        self.debug_log(f"Loaded predefined puzzle: {puzzle_name}")

    def toggle_cell_or_add_number(self, event):
        """
        Handle cell clicks for toggling black/white cells or adding numbers/letters.

        Args:
            event: The Tkinter event object.
        """
        cell = event.widget
        row = cell.row
        col = cell.col

        if self.is_number_entry_mode:
            # Number Entry Mode: add slot numbers
            if cell.cget("bg") != "#333":
                if not cell.cget("text").isdigit():
                    self.add_number_to_cell(row, col)
                else:
                    # Remove the number
                    self.remove_number_from_cell(row, col)
            else:
                messagebox.showwarning("Warning", "Number cannot be placed on black cells.")
        else:
            # Regular Mode: toggle cell or add letter
            if cell.cget("bg") == "#333":  # Black cell
                cell.config(bg="#f8f9fa", fg="#444", text="")
                self.grid[row][col] = " "
                self.update_numbers_after_removal(row, col)
            else:
                letter = simpledialog.askstring("Input", "Enter a letter (or leave blank to toggle back to black):")
                if letter:
                    letter = letter.upper()
                    if re.match("^[A-Z]$", letter):
                        cell.config(text=letter, fg="#000")
                        self.grid[row][col] = letter
                    else:
                        messagebox.showwarning("Invalid Input", "Please enter a single letter A-Z.")
                else:
                    cell.config(bg="#333", fg="#333", text="")
                    self.grid[row][col] = "#"
                    self.update_numbers_after_removal(row, col)

    def add_number_to_cell(self, row, col):
        """
        Add a number to a cell and update subsequent numbers.

        Args:
            row (int): The row index of the cell.
            col (int): The column index of the cell.
        """
        # Find the correct number to assign
        number_positions = self.get_number_positions()
        new_number = self.get_new_number(row, col, number_positions)
        self.grid[row][col] = str(new_number)
        self.cells[(row, col)].config(text=str(new_number), fg="#000", bg="#f8f9fa")
        self.update_numbers_after_insertion(row, col, new_number)

    def get_number_positions(self):
        """
        Get a list of positions with their assigned numbers.

        Returns:
            list: A list of tuples containing (number, row, column).
        """
        number_positions = []
        for r in range(self.grid.shape[0]):
            for c in range(self.grid.shape[1]):
                cell_value = self.grid[r][c]
                if cell_value.isdigit():
                    number_positions.append((int(cell_value), r, c))
        number_positions.sort()
        return number_positions

    def get_new_number(self, row, col, number_positions):
        """
        Determine the number to assign to the new cell.

        Args:
            row (int): The row index of the cell.
            col (int): The column index of the cell.
            number_positions (list): A list of existing number positions.

        Returns:
            int: The new number to assign.
        """
        position = 0
        for idx, (_, r, c) in enumerate(number_positions):
            if (row, col) < (r, c):
                break
            position = idx + 1
        new_number = position + 1
        return new_number

    def update_numbers_after_insertion(self, row, col, new_number):
        """
        Update the numbers of cells after inserting a new number.

        Args:
            row (int): The row index of the inserted number.
            col (int): The column index of the inserted number.
            new_number (int): The number assigned to the new cell.
        """
        for r in range(self.grid.shape[0]):
            for c in range(self.grid.shape[1]):
                cell_value = self.grid[r][c]
                if cell_value.isdigit():
                    current_number = int(cell_value)
                    if current_number >= new_number and (r, c) != (row, col):
                        self.grid[r][c] = str(current_number + 1)
                        self.cells[(r, c)].config(text=str(current_number + 1))

    def remove_number_from_cell(self, row, col):
        """
        Remove a number from a cell and update subsequent numbers.

        Args:
            row (int): The row index of the cell.
            col (int): The column index of the cell.
        """
        removed_number = int(self.grid[row][col])
        self.grid[row][col] = " "
        self.cells[(row, col)].config(text="", fg="#444")
        for r in range(self.grid.shape[0]):
            for c in range(self.grid.shape[1]):
                cell_value = self.grid[r][c]
                if cell_value.isdigit():
                    current_number = int(cell_value)
                    if current_number > removed_number:
                        self.grid[r][c] = str(current_number - 1)
                        self.cells[(r, c)].config(text=str(current_number - 1))

    def update_numbers_after_removal(self, row, col):
        """
        Update the numbers when a cell is turned black or cleared.

        Args:
            row (int): The row index of the cell.
            col (int): The column index of the cell.
        """
        if self.grid[row][col].isdigit():
            self.remove_number_from_cell(row, col)

    def start_number_entry_mode(self):
        """
        Activate number entry mode for adding slot numbers.
        """
        self.is_number_entry_mode = True
        self.start_number_entry_button.pack_forget()
        self.stop_number_entry_button.pack(side="left", padx=5)
        messagebox.showinfo("Number Entry", "Number Entry Mode Activated.")
        self.debug_log("Number entry mode started.")

    def stop_number_entry_mode(self):
        """
        Deactivate number entry mode.
        """
        self.is_number_entry_mode = False
        self.stop_number_entry_button.pack_forget()
        self.start_number_entry_button.pack(side="left", padx=5)
        messagebox.showinfo("Number Entry", "Number Entry Mode Deactivated.")
        self.debug_log("Number entry mode stopped.")

    def solve_crossword(self):
        """
        Start the crossword solving process in a separate thread.
        """
        if self.is_solving:
            messagebox.showwarning("Solver Busy", "A puzzle is already being solved. Please wait.")
            return
        self.is_solving = True
        self.solve_crossword_button.config(state="disabled")
        self.update_status("Setting up constraints...", clear=True)
        threading.Thread(target=self.solve_crossword_thread).start()

    def solve_crossword_thread(self):
        """
        Core solving logic executed in a separate thread.
        """
        start_time = time.time()
        try:
            random.seed(None)  # Always random seed
            self.debug_log("Random seed set to system time at start of solving.")

            # Validate the grid before solving
            if not self.validate_grid():
                self.is_solving = False
                self.solve_crossword_button.config(state="normal")
                return

            self.generate_slots()
            if not self.slots:
                messagebox.showwarning("Warning", "No numbered slots found to solve.")
                self.is_solving = False
                self.solve_crossword_button.config(state="normal")
                return

            self.randomize_domains()  # Shuffle domains for initial randomness
            self.update_status("Running AC-3 algorithm...")

            ac3_result = self.ac3()

            has_empty_domain = any(len(domain) == 0 for domain in self.domains.values())

            if not ac3_result or has_empty_domain:
                self.update_status("AC-3 failed, attempting backtracking...")
            else:
                self.update_status("Starting backtracking search...")

            # Display domain sizes
            self.display_domain_sizes()

            # Performance metrics for heuristic backtracking
            self.recursive_calls = 0
            backtracking_start = time.time()
            result = self.backtracking_solve()
            backtracking_end = time.time()
            backtracking_time = backtracking_end - backtracking_start
            total_time = time.time() - start_time

            if result:
                self.update_status("Solution found with backtracking.")
                self.performance_data['Backtracking'] = {
                    'time': backtracking_time,
                    'calls': self.recursive_calls
                }
                self.display_solution()
                self.display_word_list()
                self.update_status(f"Total solving time: {total_time:.2f} seconds")
                self.log_performance_metrics()
            else:
                self.update_status("No possible solution found.")
        except Exception as e:
            messagebox.showerror("Error", f"An error occurred during solving: {e}")
        finally:
            self.solve_crossword_button.config(state="normal")
            self.is_solving = False

    def validate_grid(self):
        """
        Validate the input grid for basic solvability criteria.

        Returns:
            bool: True if the grid is valid, False otherwise.
        """
        if not self.grid.size:
            messagebox.showwarning("Warning", "The grid is empty. Please generate or load a grid.")
            return False

        # Check for sufficient slots
        self.generate_slots()
        if not self.slots:
            messagebox.showwarning("Warning", "No valid slots found in the grid.")
            return False

        return True

    def update_status(self, message, clear=False):
        """
        Update the status display with a new message.

        Args:
            message (str): The status message to display.
            clear (bool): Whether to clear the existing status messages.
        """
        self.status_display.config(state="normal")
        if clear:
            self.status_display.delete(1.0, tk.END)
        self.status_display.insert(tk.END, message + "\n")
        self.status_display.see(tk.END)
        self.status_display.config(state="disabled")
        self.debug_log(message)

    def generate_slots(self):
        """
        Identify all slots in the grid and generate constraints.
        """
        self.slots.clear()
        self.domains.clear()
        self.cell_contents.clear()

        rows, cols = self.grid.shape

        # Record pre-filled letters and numbered cells
        for r in range(rows):
            for c in range(cols):
                cell = self.grid[r][c]
                if re.match("^[A-Z]$", cell):
                    self.cell_contents[f"{r},{c}"] = cell
                elif cell != "#" and cell.strip() != "":
                    self.cell_contents[f"{r},{c}"] = None

        # Identify slots
        for r in range(rows):
            for c in range(cols):
                cell = self.grid[r][c]
                if re.match("^\d+$", cell):
                    if c == 0 or self.grid[r][c - 1] == "#":
                        positions = self.get_slot_positions(r, c, "across")
                        if len(positions) >= 2:
                            slot_name = f"{cell}ACROSS"
                            self.slots[slot_name] = positions
                    if r == 0 or self.grid[r - 1][c] == "#":
                        positions = self.get_slot_positions(r, c, "down")
                        if len(positions) >= 2:
                            slot_name = f"{cell}DOWN"
                            self.slots[slot_name] = positions

        self.generate_constraints()
        self.setup_domains()

    def get_slot_positions(self, r, c, direction):
        """
        Get the positions of cells in a slot starting from (r, c).

        Args:
            r (int): Row index.
            c (int): Column index.
            direction (str): 'across' or 'down'.

        Returns:
            list: Positions in the slot.
        """
        positions = []
        rows, cols = self.grid.shape

        while r < rows and c < cols and self.grid[r][c] != "#":
            positions.append((r, c))
            if direction == "across":
                c += 1
            else:
                r += 1

        return positions

    def generate_constraints(self):
        """
        Generate constraints between overlapping slots.
        """
        self.constraints.clear()
        position_map = {}

        for slot, positions in self.slots.items():
            for idx, pos in enumerate(positions):
                key = f"{pos[0]},{pos[1]}"
                if key not in position_map:
                    position_map[key] = []
                position_map[key].append({'slot': slot, 'idx': idx})

        for overlaps in position_map.values():
            if len(overlaps) > 1:
                for i in range(len(overlaps)):
                    for j in range(i + 1, len(overlaps)):
                        slot1 = overlaps[i]['slot']
                        idx1 = overlaps[i]['idx']
                        slot2 = overlaps[j]['slot']
                        idx2 = overlaps[j]['idx']

                        if slot1 not in self.constraints:
                            self.constraints[slot1] = {}
                        if slot2 not in self.constraints:
                            self.constraints[slot2] = {}

                        if slot2 not in self.constraints[slot1]:
                            self.constraints[slot1][slot2] = []
                        if slot1 not in self.constraints[slot2]:
                            self.constraints[slot2][slot1] = []

                        self.constraints[slot1][slot2].append((idx1, idx2))
                        self.constraints[slot2][slot1].append((idx2, idx1))

    def setup_domains(self):
        """
        Set up the domains for each slot based on possible words and pre-filled letters.
        """
        self.domains.clear()
        for slot, positions in self.slots.items():
            length = len(positions)
            regex_pattern = ''.join(
                self.cell_contents.get(f"{r},{c}") or '.' for r, c in positions
            )
            regex = re.compile(f"^{regex_pattern}$")

            possible_words = self.word_length_cache.get(length, [])
            filtered_words = [word for word in possible_words if regex.match(word)]

            self.domains[slot] = filtered_words

    def word_matches_pre_filled_letters(self, slot, word):
        """
        Check if a word matches the pre-filled letters in a slot.

        Args:
            slot (str): The slot identifier.
            word (str): The word to check.

        Returns:
            bool: True if the word matches pre-filled letters, False otherwise.
        """
        positions = self.slots[slot]
        for idx in range(len(positions)):
            row, col = positions[idx]
            key = f"{row},{col}"
            pre_filled_letter = self.cell_contents.get(key)
            if pre_filled_letter and pre_filled_letter != word[idx]:
                return False
        return True

    def ac3(self):
        """
        Perform the AC-3 algorithm with arc consistency.

        Returns:
            bool: True if arc consistency is achieved, False otherwise.
        """
        queue = set((var1, var2) for var1 in self.constraints for var2 in self.constraints[var1])

        while queue:
            var1, var2 = queue.pop()
            if self.revise(var1, var2):
                if not self.domains[var1]:
                    return False  # Domain wiped out, no solution
                for neighbor in self.constraints[var1]:
                    if neighbor != var2:
                        queue.add((neighbor, var1))
        return True

    def revise(self, var1, var2):
        """
        Revise the domain of var1 to ensure consistency with var2.

        Args:
            var1 (str): Variable to revise.
            var2 (str): Variable to check against.

        Returns:
            bool: True if the domain was revised, False otherwise.
        """
        revised = False
        overlaps = self.constraints[var1][var2]
        new_domain = []

        for word1 in self.domains[var1]:
            if any(self.words_match(var1, word1, var2, word2) for word2 in self.domains[var2]):
                new_domain.append(word1)
            else:
                revised = True

        if revised:
            self.domains[var1] = new_domain
        return revised

    def words_match(self, var1, word1, var2, word2):
        """
        Check if two words are consistent at their overlapping positions.

        Args:
            var1 (str): First variable.
            word1 (str): Word assigned to var1.
            var2 (str): Second variable.
            word2 (str): Word assigned to var2.

        Returns:
            bool: True if words are consistent, False otherwise.
        """
        overlaps = self.constraints[var1][var2]
        for idx1, idx2 in overlaps:
            if word1[idx1] != word2[idx2]:
                return False
        return True

    def backtracking_solve(self, assignment=None, cache=None):
        """
        Recursive backtracking search with heuristics and memoization.

        Args:
            assignment (dict): Current variable assignments.
            cache (dict): Memoization cache.

        Returns:
            bool: True if a solution is found, False otherwise.
        """
        if assignment is None:
            assignment = {}
        if cache is None:
            cache = {}

        if len(assignment) == len(self.slots):
            self.solution = assignment.copy()
            return True

        self.recursive_calls += 1

        assignment_key = tuple(sorted(assignment.items()))
        if assignment_key in cache:
            return cache[assignment_key]

        var_to_assign = self.select_unassigned_variable(assignment)
        if not var_to_assign:
            return False

        for value in self.order_domain_values(var_to_assign, assignment):
            if self.is_consistent(var_to_assign, value, assignment):
                assignment[var_to_assign] = value
                inferences = self.forward_check(var_to_assign, value, assignment)
                if inferences is not False:
                    result = self.backtracking_solve(assignment, cache)
                    if result:
                        cache[assignment_key] = True
                        return True
                del assignment[var_to_assign]
                self.restore_domains(inferences)

        cache[assignment_key] = False
        return False

    def select_unassigned_variable(self, assignment):
        """
        Select the next unassigned variable using MRV and degree heuristics, with random tie-breaking.
        """
        unassigned_vars = [v for v in self.domains if v not in assignment]
        if not unassigned_vars:
            return None

        # Use MRV (minimum domain size) and degree (most constraints), with random tie-breaking
        min_size = min(len(self.domains[var]) for var in unassigned_vars)
        candidates = [var for var in unassigned_vars if len(self.domains[var]) == min_size]

        # If there's a tie, select randomly
        return random.choice(candidates)

    def order_domain_values(self, variable, assignment):
        """
        Order the domain values for a variable using the Least Constraining Value heuristic.
        """
        def value_score(value):
            return sum(self.letter_frequencies[char] for char in value)

        # Order by heuristic but shuffle to ensure randomness
        values = sorted(self.domains[variable], key=lambda val: (value_score(val), random.random()))
        random.shuffle(values)  # Shuffle the sorted list for additional randomness
        return values

    def is_consistent(self, variable, value, assignment):
        """
        Check if assigning a value to a variable is consistent with the current assignment and
        does not wipe out the domains of unassigned neighbors.

        Args:
            variable (str): The variable to assign.
            value (str): The value to assign.
            assignment (dict): Current variable assignments.

        Returns:
            bool: True if consistent, False otherwise.
        """
        if not self.word_matches_pre_filled_letters(variable, value):
            return False

        neighbors = self.constraints.get(variable)
        if not neighbors:
            return True

        for neighbor in neighbors.keys():
            if neighbor in assignment:
                # Check consistency with assigned neighbors
                if not self.words_match(variable, value, neighbor, assignment[neighbor]):
                    return False
            else:
                # Check if the assignment would wipe out the neighbor's domain
                new_domain = [
                    neighbor_value for neighbor_value in self.domains[neighbor]
                    if self.words_match(variable, value, neighbor, neighbor_value)
                ]
                if not new_domain:
                    return False  # Assignment invalidates neighbor's domain
        return True

    def forward_check(self, variable, value, assignment):
        """
        Perform forward checking after assigning a value to a variable.

        Args:
            variable (str): The variable assigned.
            value (str): The value assigned.
            assignment (dict): Current variable assignments.

        Returns:
            dict or bool: Inferences made or False if inconsistency is found.
        """
        inferences = {}
        neighbors = self.constraints.get(variable)
        if not neighbors:
            return inferences

        for neighbor in neighbors.keys():
            if neighbor not in assignment:
                inferences[neighbor] = self.domains[neighbor][:]
                new_domain = [
                    val for val in self.domains[neighbor]
                    if self.words_match(variable, value, neighbor, val)
                ]
                if not new_domain:
                    return False  # Inconsistency found
                self.domains[neighbor] = new_domain
        return inferences

    def restore_domains(self, inferences):
        """
        Restore domains to their previous state after backtracking.

        Args:
            inferences (dict): Inferences to restore.
        """
        if not inferences:
            return
        for variable, domain in inferences.items():
            self.domains[variable] = domain

    def randomize_domains(self):
        """
        Shuffle domain values to introduce randomness.
        """
        for domain in self.domains.values():
            random.shuffle(domain)  # Shuffle every domain
        self.debug_log("Domains randomized.")

    def display_solution(self):
        """
        Display the solution on the GUI grid.
        """
        for slot, word in self.solution.items():
            positions = self.slots[slot]
            for idx, (row, col) in enumerate(positions):
                cell = self.cells.get((row, col))
                if cell:
                    cell.config(text=word[idx], fg="#155724", bg="#d1e7dd")
        self.debug_log("Solution displayed on the grid.")

    def display_word_list(self):
        """
        Display the list of words used in the solution without ACROSS/DOWN labels.
        """
        across_words = []
        down_words = []

        for slot in sorted(self.slots.keys(), key=lambda s: int(re.match(r'\d+', s).group())):
            word = self.solution.get(slot)
            if word:
                slot_number = re.match(r'\d+', slot).group()
                entry = f"{slot_number}: {word}"
                if slot.endswith("ACROSS"):
                    across_words.append(entry)
                elif slot.endswith("DOWN"):
                    down_words.append(entry)

        # Update across words display
        if across_words:
            self.across_display.config(state="normal")
            self.across_display.delete(1.0, tk.END)
            self.across_display.insert(tk.END, "\n".join(across_words))
            self.across_display.config(state="disabled")
        else:
            self.across_display.config(state="normal")
            self.across_display.delete(1.0, tk.END)
            self.across_display.config(state="disabled")

        # Update down words display
        if down_words:
            self.down_display.config(state="normal")
            self.down_display.delete(1.0, tk.END)
            self.down_display.insert(tk.END, "\n".join(down_words))
            self.down_display.config(state="disabled")
        else:
            self.down_display.config(state="normal")
            self.down_display.delete(1.0, tk.END)
            self.down_display.config(state="disabled")

    def log_performance_metrics(self):
        """
        Log the performance metrics for analysis.
        """
        for method, data in self.performance_data.items():
            time_taken = data['time']
            calls = data['calls']
            self.update_status(f"{method} - Time: {time_taken:.4f}s, Recursive Calls: {calls}")
            self.debug_log(f"{method} - Time: {time_taken:.4f}s, Recursive Calls: {calls}")

    def set_seed(self):
        """
        Prompt the user to enter a seed value and set the fixed seed.
        """
        seed_value = simpledialog.askinteger("Set Seed", "Enter seed value (integer):")
        if seed_value is not None:
            self.set_fixed_seed(seed_value)
            messagebox.showinfo("Seed Set", f"Seed value set to {seed_value}")
        else:
            # If user cancels, reset to random behavior
            self.set_fixed_seed(None)
            messagebox.showinfo("Seed Cleared", "Random seed will be used.")

    def display_domain_sizes(self):
        """
        Display the size of the domains for each slot.
        """
        self.update_status("Domain Sizes After Setup:")
        for slot in sorted(self.domains.keys(), key=lambda s: int(re.match(r'\d+', s).group())):
            domain_size = len(self.domains[slot])
            self.update_status(f"Domain for {slot} has {domain_size} options.")

# Run main
if __name__ == "__main__":
    app = CrosswordSolver()
    app.mainloop()
