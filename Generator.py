import time
import re
import random
from collections import defaultdict

def load_words_from_file(filename):
    """Reads words from the specified file and returns a list of words."""
    words = []
    try:
        with open(filename, 'r') as file:
            for line in file:
                word = line.strip()
                if word:  # Ignore any blank lines
                    words.append(word.upper())  # Convert words to uppercase for consistency
        if not words:
            print("Warning: Word list is empty.")
    except FileNotFoundError:
        print(f"Error: The file {filename} was not found.")
    return words

# Usage
word_list = load_words_from_file("Words.txt")

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
    [" # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # "],
]

def generate_slots(grid):
    """Generate slots for across and down words based on the grid layout."""
    slots = {}
    slot_id = 1
    rows = len(grid)
    cols = len(grid[0])
    cell_contents = {}

    # Store cell contents (pre-filled letters)
    for r in range(rows):
        for c in range(cols):
            cell = grid[r][c].strip()
            if cell not in ("", "#"):
                if re.match(r"^[A-Z]$", cell):
                    cell_contents[(r, c)] = cell
                else:
                    cell_contents[(r, c)] = None  # Number or empty cell

    # Identify across slots
    for r in range(rows):
        c = 0
        while c < cols:
            cell = grid[r][c].strip()
            if cell != "#" and not re.match(r"^[A-Z]$", cell):
                if c == 0 or grid[r][c-1].strip() == "#" or re.match(r"^[A-Z]$", grid[r][c-1].strip()):
                    # Potential start of across word
                    slot_length = 0
                    positions = []
                    slot_number = cell if re.match(r"^\d+$", cell) else None
                    c_start = c
                    while c < cols and grid[r][c].strip() != "#" and not re.match(r"^[A-Z]$", grid[r][c].strip()):
                        positions.append((r, c))
                        slot_length += 1
                        c += 1
                    while c < cols and re.match(r"^[A-Z]$", grid[r][c].strip()):
                        positions.append((r, c))
                        slot_length += 1
                        c += 1
                    if slot_length >= 2:
                        slot_name = f"{slot_number}ACROSS" if slot_number else f"{slot_id}ACROSS"
                        slots[slot_name] = positions
                        slot_id += 1
                    else:
                        c += 1
                else:
                    c += 1
            elif re.match(r"^[A-Z]$", cell):
                c += 1
            else:
                c += 1

    # Identify down slots
    for c in range(cols):
        r = 0
        while r < rows:
            cell = grid[r][c].strip()
            if cell != "#" and not re.match(r"^[A-Z]$", cell):
                if r == 0 or grid[r-1][c].strip() == "#" or re.match(r"^[A-Z]$", grid[r-1][c].strip()):
                    # Potential start of down word
                    slot_length = 0
                    positions = []
                    slot_number = cell if re.match(r"^\d+$", cell) else None
                    r_start = r
                    while r < rows and grid[r][c].strip() != "#" and not re.match(r"^[A-Z]$", grid[r][c].strip()):
                        positions.append((r, c))
                        slot_length += 1
                        r += 1
                    while r < rows and re.match(r"^[A-Z]$", grid[r][c].strip()):
                        positions.append((r, c))
                        slot_length += 1
                        r += 1
                    if slot_length >= 2:
                        slot_name = f"{slot_number}DOWN" if slot_number else f"{slot_id}DOWN"
                        slots[slot_name] = positions
                        slot_id += 1
                    else:
                        r += 1
                else:
                    r += 1
            elif re.match(r"^[A-Z]$", cell):
                r += 1
            else:
                r += 1

    return slots, cell_contents

slots, cell_contents = generate_slots(initial_grid)

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

crossword_variables = generate_crossword_variables(slots, cell_contents)

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

constraints = generate_constraints(slots)

def solve_crossword(variables, slots, word_list, randomize=False):
    """Solve the crossword puzzle using backtracking with multiple heuristics."""
    backtrack_count = 0

    # Preprocess: Build adjacency (constraint) counts for degree heuristic
    adjacency_counts = {}
    for var in variables:
        adjacency_counts[var] = sum(1 for key in constraints if var in key)

    def is_consistent(var, word, assignment):
        """Check if placing a word in a slot is consistent with all constraints."""
        # Check pre-filled letters
        for idx, letter in variables[var]["pre_filled"].items():
            if word[idx] != letter:
                return False
        for other_var in assignment:
            if (var, other_var) in constraints:
                for pos1, pos2 in constraints[(var, other_var)]:
                    if word[pos1] != assignment[other_var][pos2]:
                        return False
        return True

    def select_unassigned_variable(assignment):
        """Select the next unassigned variable using MRV and Degree Heuristic."""
        unassigned_vars = [v for v in variables if v not in assignment]
        # MRV: Minimum Remaining Values
        min_domain_size = min(len(variables[v]["domain"]) for v in unassigned_vars)
        mrv_vars = [v for v in unassigned_vars if len(variables[v]["domain"]) == min_domain_size]
        if len(mrv_vars) == 1:
            return mrv_vars[0]
        else:
            # Degree Heuristic: Choose the variable with the most constraints on remaining variables
            max_degree = max(adjacency_counts[v] for v in mrv_vars)
            degree_vars = [v for v in mrv_vars if adjacency_counts[v] == max_degree]
            if randomize:
                return random.choice(degree_vars)
            else:
                return degree_vars[0]

    def order_domain_values(var, assignment):
        """Order the domain values using the Least Constraining Value heuristic."""
        if randomize:
            domain = variables[var]["domain"][:]
            random.shuffle(domain)
            return domain

        def count_conflicts(word):
            conflicts = 0
            for other_var in variables:
                if other_var != var and other_var not in assignment and (var, other_var) in constraints:
                    for other_word in variables[other_var]["domain"]:
                        for pos1, pos2 in constraints[(var, other_var)]:
                            if word[pos1] != other_word[pos2]:
                                conflicts += 1
            return conflicts

        # Sort domain values by least constraining value
        return sorted(variables[var]["domain"], key=count_conflicts)

    def forward_check(var, word, assignment, domains):
        """Perform forward checking and prune inconsistent values from domains."""
        temp_domains = {v: domains[v][:] for v in domains}
        for other_var in variables:
            if other_var not in assignment and (var, other_var) in constraints:
                for other_word in domains[other_var][:]:
                    conflict = False
                    for pos1, pos2 in constraints[(var, other_var)]:
                        if word[pos1] != other_word[pos2]:
                            conflict = True
                            break
                    if conflict:
                        domains[other_var].remove(other_word)
                if not domains[other_var]:
                    return None
        return temp_domains

    def backtrack(assignment, domains):
        nonlocal backtrack_count
        if len(assignment) == len(variables):
            return assignment

        var = select_unassigned_variable(assignment)
        for word in order_domain_values(var, assignment):
            if is_consistent(var, word, assignment):
                assignment[var] = word
                # Deep copy domains for forward checking
                new_domains = {v: domains[v][:] for v in domains}
                result_domains = forward_check(var, word, assignment, new_domains)
                if result_domains is not None:
                    result = backtrack(assignment, result_domains)
                    if result:
                        return result
                del assignment[var]
        backtrack_count += 1  # Increment backtracking counter
        return None

    # Set up domains for each variable based on word length and pre-filled letters
    for var, details in variables.items():
        length = details["length"]
        pre_filled = details["pre_filled"]
        variables[var]["domain"] = []
        for word in word_list:
            if len(word) == length:
                match = True
                for idx, letter in pre_filled.items():
                    if word[idx] != letter:
                        match = False
                        break
                if match:
                    variables[var]["domain"].append(word)
        if not variables[var]["domain"]:
            print(f"No words of length {length} matching pre-filled letters for slot {var}.")
            return None

    # Optionally randomize variable and value selection
    if randomize:
        for var in variables:
            random.shuffle(variables[var]["domain"])

    start_time = time.time()
    # Create initial domains
    domains = {var: variables[var]["domain"][:] for var in variables}
    solution = backtrack({}, domains)
    end_time = time.time()

    time_taken = end_time - start_time
    print(f"Time taken: {time_taken:.4f} seconds")
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

    # Display the grid with cell borders and side bars
    for row in filled_grid:
        print("+---" * len(row) + "+")  # Top border for each row
        print("|" + "|".join(row) + "|")  # Row content with side borders
    print("+---" * len(filled_grid[0]) + "+")  # Bottom border for the last row

if __name__ == "__main__":
    # Display the initial puzzle layout
    print("Initial Puzzle:")
    for row in initial_grid:
        print("+---" * len(row) + "+")  # Top border for each row
        print("|" + "|".join(row) + "|")  # Row content with side borders
    print("+---" * len(initial_grid[0]) + "+")  # Bottom border for the last row

    # Solve the crossword puzzle
    # Set randomize=True to enable solution randomization
    solution = solve_crossword(crossword_variables, slots, word_list, randomize=True)

    if solution:
        print("\nSolution Found:")
        for var, word in sorted(solution.items()):
            print(f"{var}: {word}")
        print("\nFilled Puzzle:")
        display_solution(initial_grid, solution, slots)
    else:
        print("No solution found.")
