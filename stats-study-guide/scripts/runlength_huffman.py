#!/usr/bin/env python3
"""
Run-length Huffman compression for coin flip transition streams.

Key insight: Humans alternate too much AND their alternations come in runs.
So we encode runs of 1s (alternations) and runs of 0s (repeats) separately,
using Huffman codes optimized for each run-length distribution.
"""

from pathlib import Path
from typing import List, Dict, Tuple
from collections import Counter
import heapq
import math


def load_flips(filepath: Path) -> str:
    """Load coin flip sequence from a file."""
    with open(filepath, 'r') as f:
        content = f.read()
    lines = [line for line in content.split('\n') if not line.strip().startswith('#')]
    content = ''.join(lines)
    return ''.join(c.upper() for c in content if c.upper() in 'HT')


def to_transitions(flips: str) -> List[int]:
    """Convert flip sequence to transition stream. 1=alternation, 0=repeat."""
    return [1 if flips[i] != flips[i-1] else 0 for i in range(1, len(flips))]


def get_runs(stream: List[int]) -> List[Tuple[int, int]]:
    """Get runs as (value, length) tuples."""
    if not stream:
        return []

    runs = []
    current_val = stream[0]
    current_len = 1

    for bit in stream[1:]:
        if bit == current_val:
            current_len += 1
        else:
            runs.append((current_val, current_len))
            current_val = bit
            current_len = 1
    runs.append((current_val, current_len))
    return runs


class HuffmanNode:
    def __init__(self, symbol, freq):
        self.symbol = symbol
        self.freq = freq
        self.left = None
        self.right = None
    def __lt__(self, other):
        return self.freq < other.freq


def build_huffman_codes(freq_dict: Dict) -> Dict:
    """Build Huffman codes from frequency dictionary."""
    if len(freq_dict) == 0:
        return {}
    if len(freq_dict) == 1:
        return {list(freq_dict.keys())[0]: '0'}

    heap = [HuffmanNode(sym, freq) for sym, freq in freq_dict.items()]
    heapq.heapify(heap)

    while len(heap) > 1:
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)
        merged = HuffmanNode(None, left.freq + right.freq)
        merged.left = left
        merged.right = right
        heapq.heappush(heap, merged)

    def extract_codes(node, prefix="", codes=None):
        if codes is None:
            codes = {}
        if node.symbol is not None:
            codes[node.symbol] = prefix if prefix else "0"
        else:
            if node.left:
                extract_codes(node.left, prefix + "0", codes)
            if node.right:
                extract_codes(node.right, prefix + "1", codes)
        return codes

    return extract_codes(heap[0])


def analyze_compression(flips: str, name: str = "Sequence"):
    """Analyze run-length Huffman compression."""

    print(f"\n{'='*70}")
    print(f" RUN-LENGTH HUFFMAN ANALYSIS: {name}")
    print(f"{'='*70}")

    n = len(flips)
    transitions = to_transitions(flips)
    t_len = len(transitions)

    ones = sum(transitions)
    zeros = t_len - ones
    alt_rate = ones / t_len

    print(f"\n--- Transition Stream ---")
    print(f"  Length: {t_len} bits")
    print(f"  Alternations (1s): {ones} ({alt_rate*100:.1f}%)")
    print(f"  Repeats (0s): {zeros} ({(1-alt_rate)*100:.1f}%)")

    # Single-symbol entropy (theoretical limit)
    if 0 < alt_rate < 1:
        entropy = -alt_rate * math.log2(alt_rate) - (1-alt_rate) * math.log2(1-alt_rate)
    else:
        entropy = 0
    theoretical_min = 1 + entropy * t_len  # 1 bit for first flip

    print(f"  Entropy: {entropy:.4f} bits/symbol")
    print(f"  Theoretical minimum: {theoretical_min:.1f} bits ({theoretical_min/n*100:.1f}% of original)")

    # Get runs
    runs = get_runs(transitions)
    print(f"\n--- Run Analysis ---")
    print(f"  Total runs: {len(runs)}")

    # Separate runs by value
    runs_of_1 = [length for val, length in runs if val == 1]
    runs_of_0 = [length for val, length in runs if val == 0]

    print(f"\n  Runs of 1s (alternation streaks):")
    print(f"    Count: {len(runs_of_1)}")
    if runs_of_1:
        print(f"    Avg length: {sum(runs_of_1)/len(runs_of_1):.2f}")
        print(f"    Max length: {max(runs_of_1)}")
        freq_1 = Counter(runs_of_1)
        print(f"    Distribution: {dict(sorted(freq_1.items()))}")

    print(f"\n  Runs of 0s (repeat streaks):")
    print(f"    Count: {len(runs_of_0)}")
    if runs_of_0:
        print(f"    Avg length: {sum(runs_of_0)/len(runs_of_0):.2f}")
        print(f"    Max length: {max(runs_of_0)}")
        freq_0 = Counter(runs_of_0)
        print(f"    Distribution: {dict(sorted(freq_0.items()))}")

    # Build Huffman codes for run lengths
    all_run_lengths = [length for _, length in runs]
    run_freq = Counter(all_run_lengths)
    run_codes = build_huffman_codes(run_freq)

    print(f"\n--- Huffman Codes for Run Lengths ---")
    total_runs = len(runs)
    for length, code in sorted(run_codes.items(), key=lambda x: (len(x[1]), x[0])):
        count = run_freq[length]
        prob = count / total_runs
        print(f"    Length {length}: '{code}' (count: {count}, prob: {prob:.3f})")

    # Calculate encoded size
    # We need:
    # 1. First flip: 1 bit
    # 2. First run type: 1 bit (starts with 0 or 1)
    # 3. Huffman-encoded run lengths

    encoded_bits = 1 + 1  # First flip + first run type
    for _, length in runs:
        encoded_bits += len(run_codes[length])

    original_bits = n
    compression_ratio = encoded_bits / original_bits
    savings = (1 - compression_ratio) * 100

    print(f"\n--- Compression Results ---")
    print(f"  Original: {original_bits} bits")
    print(f"  Encoded: {encoded_bits} bits")
    print(f"  Compression ratio: {compression_ratio:.4f}")
    print(f"  Space savings: {savings:.2f}%")
    print(f"  Theoretical max savings: {(1 - theoretical_min/original_bits)*100:.2f}%")

    # Efficiency
    if savings > 0:
        efficiency = savings / ((1 - theoretical_min/original_bits)*100) * 100
        print(f"  Compression efficiency: {efficiency:.1f}% of theoretical")

    return {
        'original': original_bits,
        'encoded': encoded_bits,
        'ratio': compression_ratio,
        'savings': savings,
        'theoretical_min': theoretical_min,
        'alt_rate': alt_rate,
        'entropy': entropy,
        'runs': runs,
        'run_codes': run_codes,
    }


def main():
    print("\n" + "#"*70)
    print("# RUN-LENGTH HUFFMAN COMPRESSION")
    print("#"*70)
    print("""
Strategy:
1. Convert flips to transitions (1=change, 0=same)
2. Extract runs of consecutive 1s and 0s
3. Build Huffman codes for run lengths
4. Encode: first_flip + first_run_type + huffman(run_lengths)

Why this works for human sequences:
- Humans alternate too much → more 1s → longer runs of 1s
- Biased run-length distribution → Huffman can compress
""")

    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / 'data'

    results = {}

    # Analyze random sequence
    random_file = data_dir / 'random_coin_flips.txt'
    if random_file.exists():
        random_flips = load_flips(random_file)
        if random_flips:
            results['random'] = analyze_compression(random_flips, "Computer Random")

    # Analyze user sequence
    user_file = data_dir / 'user_coin_flips.txt'
    if user_file.exists():
        user_content = open(user_file).read()
        if 'REPLACE' not in user_content:
            user_flips = load_flips(user_file)
            if user_flips:
                results['human'] = analyze_compression(user_flips, "Human Generated")

    # Comparison
    if 'random' in results and 'human' in results:
        print(f"\n{'#'*70}")
        print("# FINAL COMPARISON")
        print(f"{'#'*70}")

        r = results['random']
        h = results['human']

        print(f"\n  {'Metric':<25} {'Random':<15} {'Human':<15}")
        print(f"  {'-'*55}")
        print(f"  {'Alternation rate':<25} {r['alt_rate']*100:>12.1f}%  {h['alt_rate']*100:>12.1f}%")
        print(f"  {'Entropy (bits/symbol)':<25} {r['entropy']:>13.4f}   {h['entropy']:>13.4f}")
        print(f"  {'Theoretical min bits':<25} {r['theoretical_min']:>13.1f}   {h['theoretical_min']:>13.1f}")
        print(f"  {'Actual encoded bits':<25} {r['encoded']:>13}   {h['encoded']:>13}")
        print(f"  {'Compression ratio':<25} {r['ratio']:>13.4f}   {h['ratio']:>13.4f}")
        print(f"  {'Space savings':<25} {r['savings']:>12.2f}%  {h['savings']:>12.2f}%")

        if h['savings'] > r['savings']:
            print(f"\n  ✓ Human sequence is MORE COMPRESSIBLE by {h['savings'] - r['savings']:.2f}%")
            print(f"    This proves the human sequence contains exploitable patterns!")
        else:
            print(f"\n  Human sequence compression similar to random")


if __name__ == "__main__":
    main()
