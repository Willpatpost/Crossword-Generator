import time

def load_words_from_file(filename):
    """Reads words from the specified file and returns a list of words."""
    words = []
    try:
        with open(filename, 'r') as file:
            for line in file:
                word = line.strip()
                if word:  # Ignore any blank lines
                    words.append(word.upper())  # Convert words to uppercase for consistency
    except FileNotFoundError:
        print(f"Error: The file {filename} was not found.")
    return words

# Usage
word_list = load_words_from_file("Words.txt")

# Variables representing crossword slots with word lengths specified
crossword_variables = {
    "1ACROSS": {"length": 5},
    "4ACROSS": {"length": 4},
    "7ACROSS": {"length": 3},
    "8ACROSS": {"length": 5},
    "2DOWN": {"length": 5},
    "3DOWN": {"length": 5},
    "5DOWN": {"length": 4},
    "6DOWN": {"length": 3}
}

# Define slots and initial puzzle grid
slots = {
    "1ACROSS": [(1, 1), (1, 2), (1, 3), (1, 4), (1, 5)],
    "4ACROSS": [(3, 2), (3, 3), (3, 4), (3, 5)],
    "7ACROSS": [(4, 3), (4, 4), (4, 5)],
    "8ACROSS": [(5, 1), (5, 2), (5, 3), (5, 4), (5, 5)],

    "2DOWN": [(1, 3), (2, 3), (3, 3), (4, 3), (5, 3)],
    "3DOWN": [(1, 5), (2, 5), (3, 5), (4, 5), (5, 5)],
    "5DOWN": [(3, 4), (4, 4), (5, 4), (6, 4)],
    "6DOWN": [(4, 1), (5, 1), (6, 1)]
}

initial_grid = [
    [" # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # "],
    [" # ", " # ", " # ", " 1 ", "   ", "   ", "   ", "   ", "   ", " 2 ", " # ", " # ", " # ", " # "],
    [" # ", " # ", " # ", "   ", " # ", " # ", " # ", " # ", " # ", "   ", " # ", " # ", " 3 ", " # "],
    [" # ", " # ", " # ", "   ", " # ", " # ", " # ", " # ", " # ", "   ", " # ", " # ", "   ", " # "],
    [" # ", " # ", " # ", "   ", " # ", " # ", " 4 ", "   ", " 5 ", "   ", "   ", " # ", "   ", " # "],
    [" # ", " # ", " # ", "   ", " # ", " # ", " # ", " # ", "   ", " # ", " # ", " # ", "   ", " # "],
    [" # ", " # ", " # ", " # ", " # ", " 6 ", " # ", " # ", " 7 ", "   ", " 8 ", "   ", "   ", " # "],
    [" # ", " # ", " # ", " # ", " # ", "   ", " # ", " # ", "   ", " # ", "   ", " # ", "   ", " # "],
    [" # ", " # ", " 9 ", " # ", "10 ", "   ", "   ", "   ", "   ", " # ", "   ", " # ", " # ", " # "],
    [" # ", " # ", "   ", " # ", " # ", "   ", " # ", " # ", "   ", " # ", "   ", " # ", " # ", " # "],
    [" # ", "11 ", "   ", "   ", "   ", "   ", "   ", " # ", " # ", " # ", "   ", " # ", " # ", " # "],
    [" # ", " # ", "   ", " # ", " # ", "   ", " # ", " # ", " # ", " # ", "   ", " # ", " # ", " # "],
    [" # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # ", " # "],
]

def generate_constraints(slots):
    """Automatically generate constraints based on intersecting slots."""
    constraints = {}
    position_map = {}
    for slot, positions in slots.items():
        for i, (row, col) in enumerate(positions):
            if (row, col) not in position_map:
                position_map[(row, col)] = []
            position_map[(row, col)].append((slot, i))

    for (row, col), slot_info in position_map.items():
        if len(slot_info) > 1:
            for i in range(len(slot_info)):
                for j in range(i + 1, len(slot_info)):
                    slot1, index1 = slot_info[i]
                    slot2, index2 = slot_info[j]
                    constraints[(slot1, slot2)] = (index1, index2)
                    constraints[(slot2, slot1)] = (index2, index1)

    return constraints

# Usage:
constraints = generate_constraints(slots)

def solve_crossword(variables, slots, word_list):
    """Solve the crossword puzzle using backtracking and measure backtracking steps."""
    backtrack_count = 0

    def is_consistent(var, word, assignment):
        """Check if placing a word in a slot is consistent with all constraints."""
        for other_var in assignment:
            if (var, other_var) in constraints or (other_var, var) in constraints:
                intersect = constraints.get((var, other_var), constraints.get((other_var, var)))
                if intersect:
                    pos1, pos2 = intersect
                    if word[pos1] != assignment[other_var][pos2]:
                        return False
        return True

    def backtrack(assignment={}, used_words=set()):
        nonlocal backtrack_count
        if len(assignment) == len(variables):
            return assignment

        var = next(v for v in variables if v not in assignment)
        domain = variables[var]["domain"]

        for word in domain:
            if word in used_words:
                continue

            if is_consistent(var, word, assignment):
                assignment[var] = word
                used_words.add(word)
                result = backtrack(assignment, used_words)
                
                if result:
                    return result
                
                del assignment[var]
                used_words.remove(word)
                backtrack_count += 1  # Increment backtracking counter

        return None

    # Set up domains for each variable based on word length
    for var, details in variables.items():
        length = details["length"]
        variables[var]["domain"] = [word for word in word_list if len(word) == length]

    start_time = time.time()
    solution = backtrack()
    end_time = time.time()
    
    time_taken = end_time - start_time
    print(f"Time taken: {time_taken:.4f} seconds")
    print(f"Backtracks taken: {backtrack_count}")
    return solution

def display_solution(grid, solution, slots):
    """Fill in the grid with the solution words at the correct positions and display."""
    filled_grid = [row[:] for row in grid]  # Clone the grid to preserve the initial layout

    # Fill in the grid with solution words
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
    solution = solve_crossword(crossword_variables, slots, word_list)
    
    if solution:
        print("\nSolution Found:")
        for var, word in solution.items():
            print(f"{var}: {word}")
        print("\nFilled Puzzle:")
        display_solution(initial_grid, solution, slots)
    else:
        print("No solution found.")
