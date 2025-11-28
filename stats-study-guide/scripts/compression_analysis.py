#!/usr/bin/env python3
"""
Compression analysis for coin flip sequences.

This script implements a compression scheme designed to exploit human
tendencies when generating "random" coin flips:
1. Humans alternate too often (switch more than 50% of the time)
2. Humans avoid long runs of the same outcome

The compression scheme:
1. Encode first flip as 1 bit
2. Predict each subsequent flip will be DIFFERENT from previous
3. Encode prediction errors (0=correct, 1=wrong)
4. Run-length encode the error stream

Since humans alternate more than 50%, we get more 0s than 1s in the
error stream, enabling compression.
"""

from pathlib import Path
from typing import Tuple, List
import math


def load_flips(filepath: Path) -> str:
    """Load coin flip sequence from a file."""
    with open(filepath, 'r') as f:
        content = f.read()

    # Remove comments and extract only H/T
    lines = [line for line in content.split('\n') if not line.strip().startswith('#')]
    content = ''.join(lines)
    flips = ''.join(c.upper() for c in content if c.upper() in 'HT')
    return flips


def to_bits(flips: str) -> List[int]:
    """Convert H/T string to bits (H=1, T=0)."""
    return [1 if f == 'H' else 0 for f in flips]


def get_transitions(bits: List[int]) -> List[int]:
    """Get transition sequence: 1=different from previous, 0=same."""
    return [1 if bits[i] != bits[i-1] else 0 for i in range(1, len(bits))]


def prediction_encode(flips: str) -> Tuple[List[int], dict]:
    """
    Encode using prediction-based scheme.

    Predict each flip will be different from previous.
    Encode: 0 if prediction correct, 1 if wrong.

    Returns:
        Tuple of (error_bits, statistics_dict)
    """
    bits = to_bits(flips)
    n = len(bits)

    # First bit is encoded directly
    first_bit = bits[0]

    # Get transitions (1=different, 0=same)
    transitions = get_transitions(bits)

    # Prediction errors: we predict "different" (1)
    # Error = 0 if transition=1 (correct), 1 if transition=0 (wrong)
    errors = [0 if t == 1 else 1 for t in transitions]

    # Statistics
    num_correct = errors.count(0)
    num_wrong = errors.count(1)
    alternation_rate = num_correct / len(errors) if errors else 0

    return errors, {
        'first_bit': first_bit,
        'num_transitions': len(transitions),
        'num_alternations': num_correct,
        'num_same': num_wrong,
        'alternation_rate': alternation_rate,
    }


def run_length_encode(bits: List[int]) -> List[Tuple[int, int]]:
    """
    Run-length encode a bit sequence.

    Returns list of (bit_value, run_length) tuples.
    """
    if not bits:
        return []

    runs = []
    current_bit = bits[0]
    current_length = 1

    for bit in bits[1:]:
        if bit == current_bit:
            current_length += 1
        else:
            runs.append((current_bit, current_length))
            current_bit = bit
            current_length = 1

    runs.append((current_bit, current_length))
    return runs


def encode_run_length_unary(length: int) -> str:
    """Encode a run length using unary: n ones followed by a zero."""
    return '1' * length + '0'


def encode_run_length_golomb(length: int, m: int = 2) -> str:
    """
    Encode a run length using Golomb coding.

    Golomb codes are optimal for geometric distributions.
    Parameter m should be chosen based on expected run length.

    For m=2 (good for expected length ~1.5):
    - 1 -> 0|0
    - 2 -> 0|1
    - 3 -> 10|0
    - 4 -> 10|1
    - 5 -> 110|0
    etc.
    """
    q = (length - 1) // m  # quotient
    r = (length - 1) % m   # remainder

    # Unary encode quotient, then binary encode remainder
    b = int(math.ceil(math.log2(m))) if m > 1 else 1
    unary = '1' * q + '0'
    binary = format(r, f'0{b}b')

    return unary + binary


def compress_sequence(flips: str, use_golomb: bool = True, golomb_m: int = 2) -> dict:
    """
    Compress a coin flip sequence and return detailed statistics.
    """
    n = len(flips)
    original_bits = n  # 1 bit per flip

    # Get prediction errors
    errors, pred_stats = prediction_encode(flips)

    # Run-length encode the error stream
    runs = run_length_encode(errors)

    # Calculate compressed size
    # First bit: 1 bit
    compressed_bits = 1

    # Encode runs
    encoded_runs = []
    for bit_val, length in runs:
        if use_golomb:
            code = encode_run_length_golomb(length, golomb_m)
        else:
            code = encode_run_length_unary(length)
        encoded_runs.append((bit_val, length, code))
        compressed_bits += len(code)

    # Need 1 bit to indicate which type of run comes first (0-runs or 1-runs)
    compressed_bits += 1

    # Calculate entropy of error stream
    p0 = errors.count(0) / len(errors) if errors else 0.5
    p1 = 1 - p0
    if 0 < p0 < 1:
        entropy = -p0 * math.log2(p0) - p1 * math.log2(p1)
    else:
        entropy = 0

    theoretical_min = 1 + entropy * len(errors)  # First bit + entropy of errors

    return {
        'original_bits': original_bits,
        'compressed_bits': compressed_bits,
        'compression_ratio': compressed_bits / original_bits,
        'savings_percent': (1 - compressed_bits / original_bits) * 100,
        'entropy_per_error_bit': entropy,
        'theoretical_min_bits': theoretical_min,
        'theoretical_ratio': theoretical_min / original_bits,
        'num_runs': len(runs),
        'runs': runs,
        'encoded_runs': encoded_runs,
        'error_stream': errors,
        **pred_stats,
    }


def print_compression_analysis(flips: str, name: str = "Sequence"):
    """Print detailed compression analysis."""

    print(f"\n{'='*70}")
    print(f" COMPRESSION ANALYSIS: {name}")
    print(f"{'='*70}")

    result = compress_sequence(flips)

    print(f"\n--- Sequence Statistics ---")
    print(f"  Length: {len(flips)} flips")
    print(f"  First flip: {'H' if result['first_bit'] else 'T'}")
    print(f"  Alternations: {result['num_alternations']} ({result['alternation_rate']*100:.1f}%)")
    print(f"  Same as previous: {result['num_same']} ({(1-result['alternation_rate'])*100:.1f}%)")

    print(f"\n--- Prediction-Based Encoding ---")
    print(f"  Strategy: Predict each flip will DIFFER from previous")
    print(f"  Prediction accuracy: {result['alternation_rate']*100:.1f}%")
    print(f"  Error stream entropy: {result['entropy_per_error_bit']:.4f} bits/symbol")

    print(f"\n--- Compression Results ---")
    print(f"  Original size: {result['original_bits']} bits")
    print(f"  Compressed size: {result['compressed_bits']} bits")
    print(f"  Compression ratio: {result['compression_ratio']:.4f}")
    print(f"  Space savings: {result['savings_percent']:.2f}%")
    print(f"  Theoretical minimum: {result['theoretical_min_bits']:.1f} bits ({result['theoretical_ratio']:.4f} ratio)")

    print(f"\n--- Run-Length Analysis ---")
    print(f"  Number of runs in error stream: {result['num_runs']}")

    # Distribution of run lengths
    zero_runs = [length for val, length in result['runs'] if val == 0]
    one_runs = [length for val, length in result['runs'] if val == 1]

    print(f"\n  Runs of 0s (correct predictions / alternations):")
    if zero_runs:
        print(f"    Count: {len(zero_runs)}, Avg length: {sum(zero_runs)/len(zero_runs):.2f}")
        print(f"    Lengths: {sorted(set(zero_runs))}")

    print(f"\n  Runs of 1s (wrong predictions / same as previous):")
    if one_runs:
        print(f"    Count: {len(one_runs)}, Avg length: {sum(one_runs)/len(one_runs):.2f}")
        print(f"    Lengths: {sorted(set(one_runs))}")

    # Show first few encoded runs
    print(f"\n--- Sample Encoded Runs (first 10) ---")
    print(f"  {'Value':<6} {'Length':<8} {'Code':<15} {'Code bits':<10}")
    print(f"  {'-'*40}")
    for val, length, code in result['encoded_runs'][:10]:
        print(f"  {val:<6} {length:<8} {code:<15} {len(code):<10}")

    # Interpretation
    print(f"\n--- Interpretation ---")
    if result['alternation_rate'] > 0.55:
        print(f"  The sequence shows HUMAN-LIKE patterns:")
        print(f"  - Alternation rate ({result['alternation_rate']*100:.1f}%) exceeds random (50%)")
        print(f"  - This bias allows {result['savings_percent']:.1f}% compression")
    elif result['alternation_rate'] < 0.45:
        print(f"  The sequence shows UNUSUAL patterns:")
        print(f"  - Alternation rate ({result['alternation_rate']*100:.1f}%) below random (50%)")
        print(f"  - Too many repeated values (long runs)")
    else:
        print(f"  The sequence appears RANDOM:")
        print(f"  - Alternation rate ({result['alternation_rate']*100:.1f}%) near 50%")
        print(f"  - Little to no compression possible")

    return result


def main():
    """Main function to analyze compression of coin flip sequences."""

    print("\n" + "#"*70)
    print("# COIN FLIP COMPRESSION ANALYSIS")
    print("#"*70)
    print("""
This tool analyzes how compressible a coin flip sequence is.

Key insight: Truly random sequences are INCOMPRESSIBLE.
Any compression possible indicates non-randomness.

Humans generating "random" flips tend to:
1. Alternate too often (>50% switches)
2. Avoid long runs

This makes human sequences compressible!
""")

    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / 'data'

    # Analyze random sequence
    random_file = data_dir / 'random_coin_flips.txt'
    if random_file.exists():
        random_flips = load_flips(random_file)
        if random_flips:
            print_compression_analysis(random_flips, "Computer-Generated Random")

    # Analyze user sequence
    user_file = data_dir / 'user_coin_flips.txt'
    if user_file.exists():
        user_content = open(user_file).read()
        if 'REPLACE' not in user_content:
            user_flips = load_flips(user_file)
            if user_flips:
                print_compression_analysis(user_flips, "User-Generated")

                # Compare
                print(f"\n{'='*70}")
                print(" COMPARISON")
                print(f"{'='*70}")

                random_result = compress_sequence(random_flips)
                user_result = compress_sequence(user_flips)

                print(f"\n  {'Metric':<30} {'Random':<15} {'User':<15}")
                print(f"  {'-'*60}")
                print(f"  {'Alternation rate':<30} {random_result['alternation_rate']*100:>13.1f}% {user_result['alternation_rate']*100:>13.1f}%")
                print(f"  {'Compression ratio':<30} {random_result['compression_ratio']:>14.4f} {user_result['compression_ratio']:>14.4f}")
                print(f"  {'Space savings':<30} {random_result['savings_percent']:>13.2f}% {user_result['savings_percent']:>13.2f}%")
        else:
            print("\n" + "-"*70)
            print("User sequence not yet entered.")
            print(f"Edit {user_file} to add your 'random' coin flips,")
            print("then run this script to see how compressible they are!")
            print("-"*70)


if __name__ == "__main__":
    main()
