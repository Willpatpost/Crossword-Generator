import tkinter as tk
from tkinter import messagebox, simpledialog
import threading
import random
import re
import time

class CrosswordSolver(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Custom Crossword Generator")
        self.configure(bg="#f0f2f5")

        # Constants and configurations
        self.DEBUG = False  # Toggle debug messages
        self.word_length_cache = {}
        self.memoized_max_number = {'value': None}
        self.is_number_entry_mode = False
        self.current_number = 1
        self.seed = int(time.time())
        random.seed(self.seed)
        self.is_solving = False

        # Data structures
        self.grid = []
        self.words = []
        self.slots = {}
        self.constraints = {}
        self.solution = {}
        self.domains = {}
        self.cell_contents = {}
        self.cells = {}

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
        if self.DEBUG:
            print(message, *args)

    def create_widgets(self):
        # Header
        header = tk.Label(self, text="Custom Crossword Generator",
                          font=("Roboto", 22, "bold"), bg="#f0f2f5", fg="#222")
        header.pack(pady=10)

        # Settings Section
        settings_frame = tk.Frame(self, bg="#f0f2f5")
        settings_frame.pack(pady=10)

        settings_label = tk.Label(settings_frame, text="Select Grid Size",
                                  font=("Roboto", 16), bg="#f0f2f5", fg="#333")
        settings_label.grid(row=0, column=0, columnspan=4, pady=5)

        tk.Label(settings_frame, text="Rows:", bg="#f0f2f5", fg="#333",
                 font=("Roboto", 12)).grid(row=1, column=0, padx=5)
        self.rows_var = tk.IntVar(value=10)
        rows_options = list(range(1, 21))
        self.rows_menu = tk.OptionMenu(settings_frame, self.rows_var, *rows_options)
        self.rows_menu.grid(row=1, column=1, padx=5)

        tk.Label(settings_frame, text="Columns:", bg="#f0f2f5", fg="#333",
                 font=("Roboto", 12)).grid(row=1, column=2, padx=5)
        self.columns_var = tk.IntVar(value=10)
        self.columns_menu = tk.OptionMenu(settings_frame, self.columns_var, *rows_options)
        self.columns_menu.grid(row=1, column=3, padx=5)

        self.generate_grid_button = tk.Button(settings_frame, text="Generate Grid",
                                              command=self.generate_grid, bg="#0069d9",
                                              fg="#ffffff", font=("Roboto", 10, "bold"),
                                              relief="raised", bd=2)
        self.generate_grid_button.grid(row=2, column=0, columnspan=4, pady=10)

        # Predefined Puzzles Section
        puzzles_frame = tk.Frame(self, bg="#f0f2f5")
        puzzles_frame.pack(pady=10)

        puzzles_label = tk.Label(puzzles_frame, text="Load Puzzle",
                                 font=("Roboto", 16), bg="#f0f2f5", fg="#333")
        puzzles_label.pack()

        self.load_easy_puzzle = tk.Button(puzzles_frame, text="Load Easy Puzzle",
                                          command=lambda: self.load_predefined_puzzle("Easy"), bg="#17a2b8",
                                          fg="#ffffff", font=("Roboto", 10, "bold"),
                                          relief="raised", bd=2)
        self.load_easy_puzzle.pack(side="left", padx=5, pady=5)

        self.load_medium_puzzle = tk.Button(puzzles_frame, text="Load Medium Puzzle",
                                            command=lambda: self.load_predefined_puzzle("Medium"), bg="#17a2b8",
                                            fg="#ffffff", font=("Roboto", 10, "bold"),
                                            relief="raised", bd=2)
        self.load_medium_puzzle.pack(side="left", padx=5, pady=5)

        self.load_hard_puzzle = tk.Button(puzzles_frame, text="Load Hard Puzzle",
                                          command=lambda: self.load_predefined_puzzle("Hard"), bg="#17a2b8",
                                          fg="#ffffff", font=("Roboto", 10, "bold"),
                                          relief="raised", bd=2)
        self.load_hard_puzzle.pack(side="left", padx=5, pady=5)

        # Number Entry Controls
        number_entry_frame = tk.Frame(self, bg="#f0f2f5")
        number_entry_frame.pack(pady=10)

        self.start_number_entry_button = tk.Button(number_entry_frame, text="Enter Number Mode",
                                                   command=self.start_number_entry_mode, bg="#0069d9",
                                                   fg="#ffffff", font=("Roboto", 10, "bold"),
                                                   relief="raised", bd=2)
        self.start_number_entry_button.pack(side="left", padx=5)

        self.stop_number_entry_button = tk.Button(number_entry_frame, text="Stop Entering Numbers",
                                                  command=self.stop_number_entry_mode, bg="#dc3545",
                                                  fg="#ffffff", font=("Roboto", 10, "bold"),
                                                  relief="raised", bd=2)
        self.stop_number_entry_button.pack(side="left", padx=5)
        self.stop_number_entry_button.pack_forget()  # Hide initially

        # Crossword Grid Section
        self.grid_frame = tk.Frame(self, bg="#f0f2f5")
        self.grid_frame.pack(pady=10)

        grid_label = tk.Label(self.grid_frame, text="Crossword Grid",
                              font=("Roboto", 16), bg="#f0f2f5", fg="#333")
        grid_label.pack()

        self.grid_container = tk.Frame(self.grid_frame, bg="#ffffff", bd=3, relief="solid")
        self.grid_container.pack(pady=10)

        # Controls Section
        controls_frame = tk.Frame(self, bg="#f0f2f5")
        controls_frame.pack(pady=10)

        self.solve_crossword_button = tk.Button(controls_frame, text="Solve Crossword",
                                                command=self.solve_crossword, bg="#0069d9",
                                                fg="#ffffff", font=("Roboto", 10, "bold"),
                                                relief="raised", bd=2)
        self.solve_crossword_button.pack()

        # Word List Section
        word_list_frame = tk.Frame(self, bg="#f0f2f5")
        word_list_frame.pack(pady=10)

        word_list_label = tk.Label(word_list_frame, text="Word List",
                                   font=("Roboto", 14, "bold"), bg="#f0f2f5", fg="#333")
        word_list_label.pack()

        self.result_display = tk.Text(word_list_frame, height=10, width=60, state="disabled",
                                      bg="#f8f9fa", fg="#222", font=("Roboto", 12))
        self.result_display.pack(pady=5)

        # Footer
        footer = tk.Label(self, text="© 2024 Crossword Generator",
                          font=("Roboto", 10), bg="#f0f2f5", fg="#555")
        footer.pack(pady=10)

    def load_words(self):
        try:
            with open('Words.txt', 'r') as f:
                self.words = [word.strip().upper() for word in f if word.strip()]
            if not all(re.match("^[A-Z]+$", word) for word in self.words):
                raise ValueError("File contains invalid words. Ensure all entries are alphabetic.")
            self.cache_words_by_length()
            self.debug_log("Words loaded:", len(self.words))
        except Exception as e:
            messagebox.showerror("Error", f"Error loading words: {e}")

    def cache_words_by_length(self):
        self.word_length_cache.clear()
        for word in self.words:
            length = len(word)
            if length not in self.word_length_cache:
                self.word_length_cache[length] = []
            self.word_length_cache[length].append(word)
        self.debug_log("Word length cache created.")

    def generate_grid(self):
        # Clear any existing puzzle
        self.grid = []
        self.solution.clear()
        self.slots.clear()
        self.constraints.clear()
        self.domains.clear()
        self.cell_contents.clear()
        self.memoized_max_number['value'] = None

        rows = self.rows_var.get()
        cols = self.columns_var.get()

        if rows <= 0 or cols <= 0:
            messagebox.showerror("Error", "Please enter valid positive numbers for rows and columns.")
            return

        self.grid = [["#" for _ in range(cols)] for _ in range(rows)]
        self.cells = {}
        self.grid_container.destroy()
        self.grid_container = tk.Frame(self.grid_frame, bg="#ffffff", bd=3, relief="solid")
        self.grid_container.pack(pady=10)

        for r in range(rows):
            for c in range(cols):
                cell = tk.Label(self.grid_container, text="", width=2, height=1, bg="#333",
                                fg="#333", bd=1, relief="solid", font=("Roboto", 12, "bold"))
                cell.grid(row=r, column=c)
                cell.bind("<Button-1>", self.toggle_cell_or_add_number)
                cell.row = r
                cell.col = c
                self.cells[(r, c)] = cell

        self.debug_log("Grid generated with rows:", rows, "columns:", cols)

    def load_predefined_puzzle(self, puzzle_name):
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
        self.memoized_max_number['value'] = None

        rows = len(puzzle['grid'])
        cols = len(puzzle['grid'][0])

        self.grid = [row[:] for row in puzzle['grid']]  # Deep copy to avoid modifying the original
        self.cells = {}
        self.grid_container.destroy()
        self.grid_container = tk.Frame(self.grid_frame, bg="#ffffff", bd=3, relief="solid")
        self.grid_container.pack(pady=10)

        for r in range(rows):
            for c in range(cols):
                cell_value = self.grid[r][c]
                cell = tk.Label(self.grid_container, text="", width=2, height=1,
                                bd=1, relief="solid", font=("Roboto", 12, "bold"))

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
        cell = event.widget
        row = cell.row
        col = cell.col

        if self.is_number_entry_mode:
            if cell.cget("bg") != "#333" and not cell.cget("text"):
                cell.config(text=str(self.current_number), fg="#000")
                self.grid[row][col] = str(self.current_number)
                cell.config(bg="#f8f9fa", fg="#000")
                cell.bind("<Button-1>", self.toggle_cell_or_add_number)
                self.current_number += 1
                self.memoized_max_number['value'] = self.current_number - 1
            else:
                messagebox.showwarning("Warning", "Number can only be placed on empty white cells.")
        else:
            if cell.cget("bg") == "#333":  # Black cell
                cell.config(bg="#f8f9fa", fg="#444")
                self.grid[row][col] = " "
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

    def start_number_entry_mode(self):
        self.current_number = self.get_max_number_on_grid() + 1
        self.is_number_entry_mode = True
        self.start_number_entry_button.pack_forget()
        self.stop_number_entry_button.pack(side="left", padx=5)
        messagebox.showinfo("Number Entry", "Number Entry Mode Activated.")
        self.debug_log("Number entry mode started. Current number:", self.current_number)

    def stop_number_entry_mode(self):
        self.is_number_entry_mode = False
        self.stop_number_entry_button.pack_forget()
        self.start_number_entry_button.pack(side="left", padx=5)
        messagebox.showinfo("Number Entry", "Number Entry Mode Deactivated.")
        self.debug_log("Number entry mode stopped.")

    def get_max_number_on_grid(self):
        if self.memoized_max_number['value'] is not None:
            return self.memoized_max_number['value']
        max_number = 0
        for row in self.grid:
            for cell in row:
                try:
                    cell_number = int(cell)
                    if cell_number > max_number:
                        max_number = cell_number
                except ValueError:
                    pass
        self.memoized_max_number['value'] = max_number
        return max_number

    def solve_crossword(self):
        if self.is_solving:
            messagebox.showwarning("Solver Busy", "A puzzle is already being solved. Please wait.")
            return
        self.is_solving = True
        self.solve_crossword_button.config(state="disabled")
        threading.Thread(target=self.solve_crossword_thread).start()

    def solve_crossword_thread(self):
        try:
            # Shuffle domains for randomness
            self.randomize_domains()
            self.result_display.config(state="normal")
            self.result_display.insert(tk.END, "Setting up constraints...\n")
            self.result_display.config(state="disabled")
            self.generate_slots()

            if not self.slots:
                messagebox.showwarning("Warning", "No numbered slots found to solve.")
                self.solve_crossword_button.config(state="normal")
                self.is_solving = False
                return

            self.result_display.config(state="normal")
            self.result_display.insert(tk.END, "Running AC-3 algorithm...\n")
            self.result_display.config(state="disabled")

            ac3_result = self.ac3()

            has_empty_domain = False
            for slot, domain in self.domains.items():
                if len(domain) == 0:
                    self.debug_log(f"Domain for {slot} is empty after AC-3. Falling back to backtracking.")
                    has_empty_domain = True
                else:
                    self.debug_log(f"Domain for {slot} has {len(domain)} options.")

            if not ac3_result or has_empty_domain:
                self.debug_log("AC-3 failed or over-pruned; attempting backtracking without full arc consistency.")
                result = self.backtracking_solve()
                if result:
                    self.display_solution()
                    self.result_display.config(state="normal")
                    self.result_display.insert(tk.END, "Crossword solved!\n")
                    self.result_display.config(state="disabled")
                    self.display_word_list()
                else:
                    self.result_display.config(state="normal")
                    self.result_display.insert(tk.END, "No possible solution.\n")
                    self.result_display.config(state="disabled")
            else:
                self.result_display.config(state="normal")
                self.result_display.insert(tk.END, "Starting backtracking search...\n")
                self.result_display.config(state="disabled")

                result = self.backtracking_solve()

                if result:
                    self.display_solution()
                    self.result_display.config(state="normal")
                    self.result_display.insert(tk.END, "Crossword solved!\n")
                    self.result_display.config(state="disabled")
                    self.display_word_list()
                else:
                    self.result_display.config(state="normal")
                    self.result_display.insert(tk.END, "No possible solution.\n")
                    self.result_display.config(state="disabled")
        except Exception as e:
            messagebox.showerror("Error", f"An error occurred: {e}")
        finally:
            self.solve_crossword_button.config(state="normal")
            self.is_solving = False

    def generate_slots(self):
        self.slots.clear()
        self.domains.clear()
        self.cell_contents.clear()

        rows = len(self.grid)
        cols = len(self.grid[0])

        for r in range(rows):
            for c in range(cols):
                cell = self.grid[r][c]
                if re.match("^[A-Z]$", cell):
                    self.cell_contents[f"{r},{c}"] = cell
                elif cell != "#" and cell.strip() != "":
                    self.cell_contents[f"{r},{c}"] = None

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
        positions = []
        rows = len(self.grid)
        cols = len(self.grid[0])

        while r < rows and c < cols and self.grid[r][c] != "#":
            positions.append((r, c))
            if direction == "across":
                c += 1
            else:
                r += 1

        return positions

    def generate_constraints(self):
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
        self.domains.clear()
        for slot, positions in self.slots.items():
            length = len(positions)
            regex_pattern = ''.join(
                self.cell_contents.get(f"{r},{c}") or '.' for r, c in positions
            )
            regex = re.compile(f"^{regex_pattern}$")

            possible_words = self.word_length_cache.get(length, [])
            filtered_words = [word for word in possible_words if regex.match(word)]

            if not filtered_words:
                self.debug_log(f"Domain for slot {slot} is empty after setup.")
                # Optionally, handle empty domains

            self.domains[slot] = filtered_words

    def word_matches_pre_filled_letters(self, slot, word):
        positions = self.slots[slot]
        for idx in range(len(positions)):
            row, col = positions[idx]
            key = f"{row},{col}"
            pre_filled_letter = self.cell_contents.get(key)
            if pre_filled_letter and pre_filled_letter != word[idx]:
                return False
        return True

    def ac3(self):
        queue = []

        for var1, neighbors in self.constraints.items():
            for var2 in neighbors.keys():
                queue.append((var1, var2))

        # Prioritize variables with smaller domains
        queue.sort(key=lambda arc: len(self.domains[arc[0]]))

        while queue:
            var1, var2 = queue.pop(0)
            if self.revise(var1, var2):
                if not self.domains[var1]:
                    return False
                for neighbor in self.constraints.get(var1, {}).keys():
                    if neighbor != var2:
                        queue.append((neighbor, var1))
        return True

    def revise(self, var1, var2):
        revised = False
        overlaps = self.constraints[var1][var2]

        domain_var1 = self.domains[var1][:]
        domain_var2 = self.domains[var2]

        new_domain = []

        for word1 in domain_var1:
            # Check if word1 matches pre-filled letters in var1
            if not self.word_matches_pre_filled_letters(var1, word1):
                revised = True
                continue

            for word2 in domain_var2:
                if self.words_match(var1, word1, var2, word2):
                    new_domain.append(word1)
                    break
            else:
                revised = True

        if revised:
            self.domains[var1] = new_domain
        return revised

    def words_match(self, var1, word1, var2, word2):
        overlaps = self.constraints[var1][var2]
        for idx1, idx2 in overlaps:
            if word1[idx1] != word2[idx2]:
                return False
        return True

    def backtracking_solve(self, assignment=None):
        if assignment is None:
            assignment = {}
        if len(assignment) == len(self.slots):
            self.solution = assignment.copy()
            self.debug_log("Solution found:", self.solution)
            return True

        var_to_assign = self.select_unassigned_variable(assignment)
        if not var_to_assign:
            return False

        for value in self.order_domain_values(var_to_assign, assignment):
            self.debug_log(f"Trying {value} for {var_to_assign}")
            if self.is_consistent(var_to_assign, value, assignment):
                assignment[var_to_assign] = value
                inferences = self.forward_check(var_to_assign, value, assignment)
                if inferences is not False:
                    result = self.backtracking_solve(assignment)
                    if result:
                        return result
                del assignment[var_to_assign]
                self.restore_domains(inferences)
        return False

    def select_unassigned_variable(self, assignment):
        unassigned_vars = [v for v in self.domains if v not in assignment]
        if not unassigned_vars:
            return None

        def key_func(var):
            len_domain = len(self.domains[var])
            degree = len(self.constraints.get(var, {}))
            return (len_domain, -degree, random.random())

        unassigned_vars.sort(key=key_func)
        return unassigned_vars[0]

    def order_domain_values(self, variable, assignment):
        def count_conflicts(value):
            conflicts = 0
            neighbors = self.constraints.get(variable)
            if not neighbors:
                return conflicts

            for neighbor in neighbors.keys():
                if neighbor not in assignment:
                    for neighbor_value in self.domains[neighbor]:
                        if not self.words_match(variable, value, neighbor, neighbor_value):
                            conflicts += 1
            return conflicts

        domain_values = self.domains[variable][:]
        random.shuffle(domain_values)
        domain_values.sort(key=lambda val: (count_conflicts(val), random.random()))
        return domain_values

    def is_consistent(self, variable, value, assignment):
        if not self.word_matches_pre_filled_letters(variable, value):
            return False

        neighbors = self.constraints.get(variable)
        if not neighbors:
            return True

        for neighbor in neighbors.keys():
            if neighbor in assignment:
                if not self.words_match(variable, value, neighbor, assignment[neighbor]):
                    return False
            else:
                new_domain = [neighbor_value for neighbor_value in self.domains[neighbor]
                              if self.words_match(variable, value, neighbor, neighbor_value)]
                if not new_domain:
                    return False
        return True

    def forward_check(self, variable, value, assignment):
        inferences = {}
        neighbors = self.constraints.get(variable)
        if not neighbors:
            return inferences

        for neighbor in neighbors.keys():
            if neighbor not in assignment:
                inferences[neighbor] = self.domains[neighbor][:]
                new_domain = [val for val in self.domains[neighbor]
                              if self.words_match(variable, value, neighbor, val)
                              and self.word_matches_pre_filled_letters(neighbor, val)]
                if not new_domain:
                    self.debug_log(f"Domain wiped out for {neighbor} during forward checking.")
                    return False
                self.domains[neighbor] = new_domain
        return inferences

    def restore_domains(self, inferences):
        if not inferences:
            return
        for variable, domain in inferences.items():
            self.domains[variable] = domain

    def randomize_domains(self):
        for domain in self.domains.values():
            random.shuffle(domain)

    def display_solution(self):
        for slot, word in self.solution.items():
            positions = self.slots[slot]
            for idx, (row, col) in enumerate(positions):
                cell = self.cells.get((row, col))
                if cell:
                    cell.config(text=word[idx], fg="#155724", bg="#d1e7dd")
        self.debug_log("Solution displayed on the grid.")

    def display_word_list(self):
        across_words = []
        down_words = []

        for slot in self.slots.keys():
            word = self.solution.get(slot)
            if word:
                if slot.endswith("ACROSS"):
                    across_words.append(f"{slot}: {word}")
                elif slot.endswith("DOWN"):
                    down_words.append(f"{slot}: {word}")

        self.result_display.config(state="normal")
        self.result_display.delete(1.0, tk.END)
        self.result_display.insert(tk.END, "Across:\n")
        self.result_display.insert(tk.END, "\n".join(across_words))
        self.result_display.insert(tk.END, "\n\nDown:\n")
        self.result_display.insert(tk.END, "\n".join(down_words))
        self.result_display.config(state="disabled")

# Run main
if __name__ == "__main__":
    app = CrosswordSolver()
    app.mainloop()
