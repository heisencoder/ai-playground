#!/usr/bin/env python3
"""
Generate random coin flip sequences for Chi-Square analysis.

This script generates truly random coin flips using Python's random module
and saves them to a file for later analysis.
"""

import random
import os
from pathlib import Path


def generate_random_flips(n: int, seed: int = None) -> str:
    """
    Generate a sequence of random coin flips.

    Args:
        n: Number of coin flips to generate
        seed: Optional random seed for reproducibility

    Returns:
        String of 'H' and 'T' characters representing heads and tails
    """
    if seed is not None:
        random.seed(seed)

    flips = ''.join(random.choice('HT') for _ in range(n))
    return flips


def format_flips(flips: str, line_width: int = 64) -> str:
    """
    Format flip sequence into readable lines.

    Args:
        flips: String of coin flip results
        line_width: Number of characters per line

    Returns:
        Formatted string with line breaks
    """
    lines = [flips[i:i+line_width] for i in range(0, len(flips), line_width)]
    return '\n'.join(lines)


def create_user_template(n: int) -> str:
    """
    Create a template file for user to enter their coin flips.

    Args:
        n: Number of flips expected

    Returns:
        Template string with instructions
    """
    template = f"""# User Coin Flip Data
#
# Instructions:
# 1. Replace the placeholder below with your own coin flip sequence
# 2. Use 'H' for heads and 'T' for tails
# 3. Enter exactly {n} characters (spaces and newlines are ignored)
# 4. Try to flip the coin mentally and record what you think is random
#
# The goal is to see if human-generated "random" sequences differ
# from computer-generated random sequences.
#
# Enter your {n} coin flips below (H or T only):
# ================================================================

REPLACE_THIS_WITH_YOUR_FLIPS

# ================================================================
# Example format (64 characters per line for readability):
# HTTHTHHTHTHTHHTHTHHTHTHTHHTHTHHTHTHHTHTHHTHTHHTHTHHTHTHHTHTHHTHTH
# HTHTHHTHTHTHHTHTHTHHTHTHTHHTHTHTHHTHTHTHHTHTHTHHTHTHTHHTHTHTHHTHT
# THTHHTHTHTHHTHTHTHHTHTHTHHTHTHTHHTHTHTHHTHTHTHHTHTHTHHTHTHTHHTHTH
# HTHTHTHHTHTHTHHTHTHTHHTHTHTHHTHTHTHHTHTHTHHTHTHTHHTHTHTHHTHTHTHHT
"""
    return template


def main():
    """Main function to generate coin flip data files."""
    # Get the project root directory
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / 'data'

    # Create data directory if it doesn't exist
    data_dir.mkdir(exist_ok=True)

    # Generate 256 random coin flips
    n_flips = 256
    random_flips = generate_random_flips(n_flips)

    # Save random flips
    random_file = data_dir / 'random_coin_flips.txt'
    with open(random_file, 'w') as f:
        f.write("# Computer-Generated Random Coin Flips\n")
        f.write(f"# Total flips: {n_flips}\n")
        f.write("# Generated using Python's random module\n")
        f.write("# ================================================================\n\n")
        f.write(format_flips(random_flips))
        f.write("\n")

    print(f"Generated {n_flips} random coin flips")
    print(f"Saved to: {random_file}")

    # Count heads and tails
    heads = random_flips.count('H')
    tails = random_flips.count('T')
    print(f"\nSummary:")
    print(f"  Heads: {heads} ({100*heads/n_flips:.1f}%)")
    print(f"  Tails: {tails} ({100*tails/n_flips:.1f}%)")

    # Create user template
    user_file = data_dir / 'user_coin_flips.txt'
    if not user_file.exists():
        with open(user_file, 'w') as f:
            f.write(create_user_template(n_flips))
        print(f"\nCreated template for your coin flips: {user_file}")
        print("Edit this file to enter your own 'random' coin flips!")
    else:
        print(f"\nUser flip file already exists: {user_file}")

    # Print run-length statistics for the random sequence
    print("\n" + "="*50)
    print("Run-Length Distribution (Random Sequence):")
    print("="*50)

    runs = get_runs(random_flips)
    run_lengths = [len(run) for run in runs]

    # Count runs by length
    from collections import Counter
    run_counts = Counter(run_lengths)

    print(f"\n{'Length':<10} {'Count':<10} {'Expected':<10}")
    print("-" * 30)
    total_runs = len(runs)
    for length in sorted(run_counts.keys()):
        # Expected proportion of runs of length k is 1/2^k
        # But total runs depends on sequence, so this is approximate
        expected = n_flips / (2 ** (length + 1))
        print(f"{length:<10} {run_counts[length]:<10} {expected:<10.1f}")


def get_runs(sequence: str) -> list:
    """
    Extract runs from a sequence.

    A run is a consecutive sequence of the same character.

    Args:
        sequence: String of H and T characters

    Returns:
        List of run strings
    """
    if not sequence:
        return []

    runs = []
    current_run = sequence[0]

    for char in sequence[1:]:
        if char == current_run[-1]:
            current_run += char
        else:
            runs.append(current_run)
            current_run = char

    runs.append(current_run)  # Don't forget the last run
    return runs


if __name__ == "__main__":
    main()
