import time
import re
import random
from collections import defaultdict

# Initial grid for the larger puzzle
initial_grid = [
    [" # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # "],
    [" # ", " # ", " # ", " 1 ", " 2 ", " 3 ", " # ", " # ", " # ", " 4 ", " 5 ", " 6 ", " # ", " # ", " # "],
    [" # ", " # ", " 7 ", "   ", "   ", "   ", " 8 ", " # ", " 9 ", "   ", "   ", "   ", "10 ", " # ", " # "],
    [" # ", " # ", "11 ", "   ", "   ", "   ", "   ", " # ", "12 ", "   ", "   ", "   ", "   ", " # ", " # "],
    [" # ", "13 ", "   ", "   ", " # ", "14 ", "   ", "15 ", "   ", "   ", " # ", "16 ", "   ", "17 ", " # "],
    [" # ", "18 ", "   ", "   ", "19 ", " # ", "20 ", "   ", "   ", " # ", "21 ", "   ", "   ", "   ", " # "],
    [" # ", "22 ", "   ", "   ", "   ", " # ", "23 ", "   ", "   ", " # ", "24 ", "   ", "   ", "   ", " # "],
    [" # ", " # ", "25 ", "   ", "   ", "26 ", " # ", " # ", " # ", "27 ", "   ", "   ", "   ", " # ", " # "],
    [" # ", " # ", " # ", "28 ", "   ", "   ", "29 ", " # ", "30 ", "   ", "   ", "   ", " # ", " # ", " # "],
    [" # ", " # ", " # ", " # ", "31 ", "   ", "   ", "32 ", "   ", "   ", "   ", " # ", " # ", " # ", " # "],
    [" # ", " # ", " # ", " # ", " # ", "33 ", "   ", "   ", "   ", "   ", " # ", " # ", " # ", " # ", " # "],
    [" # ", " # ", " # ", " # ", " # ", " # ", " N ", " T ", " H ", " # ", " # ", " # ", " # ", " # ", " # "],
    [" # ", " # ", " # ", " # ", " # ", " # ", " # ", "   ", " # ", " # ", " # ", " # ", " # ", " # ", " # "],
    [" # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # "]
]

# Function definitions for loading words, generating slots, constraints, AC-3, forward checking, and backtracking
def load_words_from_file(filename):
    """Reads words from the specified file and returns a list of words."""
    words = []
    try:
        with open(filename, 'r') as file:
            for line in file:
                word = line.strip()
                if word:
                    words.append(word.upper())
        if not words:
            print("Warning: Word list is empty.")
    except FileNotFoundError:
        print(f"Error: The file {filename} was not found.")
    return words

def generate_slots(grid):
    """Generate slots for across and down words based on the grid layout."""
    slots = {}
    slot_id = 1
    rows = len(grid)
    cols = len(grid[0])
    cell_contents = {}

    for r in range(rows):
        for c in range(cols):
            cell = grid[r][c].strip()
            if cell not in ("", "#"):
                if re.match(r"^[A-Z]$", cell):
                    cell_contents[(r, c)] = cell
                else:
                    cell_contents[(r, c)] = None

    for r in range(rows):
        c = 0
        while c < cols:
            cell = grid[r][c].strip()
            if cell != "#" and not re.match(r"^[A-Z]$", cell):
                if c == 0 or grid[r][c-1].strip() == "#" or re.match(r"^[A-Z]$", grid[r][c-1].strip()):
                    slot_length = 0
                    positions = []
                    slot_number = cell if re.match(r"^\d+$", cell) else None
                    while c < cols and grid[r][c].strip() != "#" and not re.match(r"^[A-Z]$", grid[r][c].strip()):
                        positions.append((r, c))
                        slot_length += 1
                        c += 1
                    if slot_length >= 2:
                        slot_name = f"{slot_number}ACROSS" if slot_number else f"{slot_id}ACROSS"
                        slots[slot_name] = positions
                        slot_id += 1
            c += 1

    for c in range(cols):
        r = 0
        while r < rows:
            cell = grid[r][c].strip()
            if cell != "#" and not re.match(r"^[A-Z]$", cell):
                if r == 0 or grid[r-1][c].strip() == "#" or re.match(r"^[A-Z]$", grid[r-1][c].strip()):
                    slot_length = 0
                    positions = []
                    slot_number = cell if re.match(r"^\d+$", cell) else None
                    while r < rows and grid[r][c].strip() != "#" and not re.match(r"^[A-Z]$", grid[r][c].strip()):
                        positions.append((r, c))
                        slot_length += 1
                        r += 1
                    if slot_length >= 2:
                        slot_name = f"{slot_number}DOWN" if slot_number else f"{slot_id}DOWN"
                        slots[slot_name] = positions
                        slot_id += 1
            r += 1

    return slots, cell_contents

def generate_crossword_variables(slots, cell_contents):
    """Generate crossword variables with word lengths and pre-filled letters for each slot."""
    crossword_variables = {}
    for slot, positions in slots.items():
        length = len(positions)
        pre_filled = {}
        for idx, (row, col) in enumerate(positions):
            if (row, col) in cell_contents and cell_contents[(row, col)]:
                pre_filled[idx] = cell_contents[(row, col)]
        crossword_variables[slot] = {"length": length, "pre_filled": pre_filled}
    return crossword_variables

def generate_constraints(slots):
    """Automatically generate constraints based on intersecting slots."""
    constraints = defaultdict(list)
    position_map = {}
    for slot, positions in slots.items():
        for i, (row, col) in enumerate(positions):
            if (row, col) not in position_map:
                position_map[(row, col)] = []
            position_map[(row, col)].append((slot, i))

    for slot_positions in position_map.values():
        if len(slot_positions) > 1:
            for i in range(len(slot_positions)):
                for j in range(i + 1, len(slot_positions)):
                    slot1, index1 = slot_positions[i]
                    slot2, index2 = slot_positions[j]
                    constraints[(slot1, slot2)].append((index1, index2))
                    constraints[(slot2, slot1)].append((index2, index1))

    return constraints

def ac3(variables, constraints, domains):
    """Enforce arc consistency with AC-3 algorithm."""
    queue = [(var1, var2) for var1, var2 in constraints]
    while queue:
        (var1, var2) = queue.pop(0)
        if revise(variables, domains, var1, var2, constraints):
            if not domains[var1]:
                return False
            for var3 in [v for v in variables if v != var1 and (v, var1) in constraints]:
                queue.append((var3, var1))
    return True

def revise(variables, domains, var1, var2, constraints):
    """Revise the domain of var1 based on var2."""
    revised = False
    for x in domains[var1][:]:
        if not any(x[pos1] == y[pos2] for y in domains[var2] for pos1, pos2 in constraints[(var1, var2)]):
            domains[var1].remove(x)
            revised = True
    return revised

def solve_crossword(variables, slots, word_list, constraints, randomize=False):
    """Solve the crossword puzzle using backtracking with enhanced heuristics."""
    backtrack_count = 0

    # Set up domains for each variable based on word length and pre-filled letters
    domains = {var: [word for word in word_list if len(word) == details["length"]
                     and all(word[idx] == letter for idx, letter in details["pre_filled"].items())]
               for var, details in variables.items()}

    # Apply AC-3 to enforce arc consistency before starting backtracking
    if not ac3(variables, constraints, domains):
        return None

    def is_consistent(var, word, assignment):
        """Check if placing a word in a slot is consistent with all constraints."""
        for other_var in assignment:
            if (var, other_var) in constraints:
                for pos1, pos2 in constraints[(var, other_var)]:
                    if word[pos1] != assignment[other_var][pos2]:
                        return False
        return True

    def select_unassigned_variable(assignment):
        """Select the next unassigned variable using MRV and Degree Heuristic."""
        unassigned_vars = [v for v in variables if v not in assignment]
        mrv_vars = sorted(unassigned_vars, key=lambda v: len(domains[v]))
        min_domain_size = len(domains[mrv_vars[0]])
        mrv_vars = [v for v in mrv_vars if len(domains[v]) == min_domain_size]
        
        if len(mrv_vars) == 1:
            return mrv_vars[0]
        else:
            return max(mrv_vars, key=lambda v: sum(1 for key in constraints if v in key))

    def order_domain_values(var, assignment):
        """Order the domain values using the Least Constraining Value heuristic."""
        if randomize:
            random.shuffle(domains[var])
            return domains[var]

        def count_conflicts(word):
            return sum(1 for other_var in variables if other_var != var and other_var not in assignment
                       and (var, other_var) in constraints
                       for other_word in domains[other_var]
                       for pos1, pos2 in constraints[(var, other_var)]
                       if word[pos1] != other_word[pos2])

        return sorted(domains[var], key=count_conflicts)

    def forward_check(var, word, assignment):
        """Perform forward checking and track domain changes."""
        changes = {v: [] for v in variables}
        for other_var in variables:
            if other_var not in assignment and (var, other_var) in constraints:
                for other_word in domains[other_var][:]:
                    if any(word[pos1] != other_word[pos2] for pos1, pos2 in constraints[(var, other_var)]):
                        domains[other_var].remove(other_word)
                        changes[other_var].append(other_word)
                if not domains[other_var]:
                    return False, changes
        return True, changes

    def revert_domains(changes):
        """Revert domain changes after backtracking."""
        for var, removed_words in changes.items():
            domains[var].extend(removed_words)

    def backtrack(assignment):
        nonlocal backtrack_count
        if len(assignment) == len(variables):
            return assignment

        var = select_unassigned_variable(assignment)
        for word in order_domain_values(var, assignment):
            if is_consistent(var, word, assignment):
                assignment[var] = word
                success, changes = forward_check(var, word, assignment)
                if success:
                    result = backtrack(assignment)
                    if result:
                        return result
                del assignment[var]
                revert_domains(changes)
        backtrack_count += 1
        return None

    start_time = time.time()
    solution = backtrack({})
    end_time = time.time()

    print(f"Time taken: {end_time - start_time:.4f} seconds")
    print(f"Backtracks taken: {backtrack_count}")
    return solution

def display_solution(grid, solution, slots):
    """Fill in the grid with the solution words at the correct positions and display."""
    filled_grid = [row[:] for row in grid]  # Clone the grid to preserve the initial layout

    # Replace empty spaces and numbers with letters in the solution
    for slot, positions in slots.items():
        word = solution.get(slot, "")
        for (row, col), letter in zip(positions, word):
            filled_grid[row][col] = f" {letter} "

    # Display the grid with cell borders and replace "#" with spaces
    for row in filled_grid:
        display_row = ["   " if cell == " # " else cell for cell in row]  # Replace "#" with space
        print("+---" * len(display_row) + "+")  # Top border for each row
        print("|" + "|".join(display_row) + "|")  # Row content with side borders
    print("+---" * len(filled_grid[0]) + "+")  # Bottom border for the last row

if __name__ == "__main__":
    # Display the initial puzzle layout with hashtags replaced by spaces
    print("Initial Puzzle:")
    for row in initial_grid:
        display_row = ["   " if cell == " # " else cell for cell in row]  # Replace "#" with space
        print("+---" * len(display_row) + "+")  # Top border for each row
        print("|" + "|".join(display_row) + "|")  # Row content with side borders
    print("+---" * len(initial_grid[0]) + "+")  # Bottom border for the last row

    # Load the word list
    word_list = load_words_from_file("Words.txt")

    # Generate slots and constraints
    slots, cell_contents = generate_slots(initial_grid)
    crossword_variables = generate_crossword_variables(slots, cell_contents)
    constraints = generate_constraints(slots)

    # Solve the crossword puzzle
    solution = solve_crossword(crossword_variables, slots, word_list, constraints, randomize=True)

    if solution:
        print("\nSolution Found:")
        for var, word in sorted(solution.items()):
            print(f"{var}: {word}")
        print("\nFilled Puzzle:")
        display_solution(initial_grid, solution, slots)
    else:
        print("No solution found.")
