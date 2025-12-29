#!/usr/bin/env python3
"""
Huffman compression analysis for coin flip transition streams.

This script:
1. Converts coin flips to a transition stream (1=change, 0=same)
2. Analyzes n-gram patterns in the transition stream
3. Builds Huffman codes based on actual symbol/n-gram frequencies
4. Calculates achievable compression
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
    """
    Convert flip sequence to transition stream.
    1 = different from previous (alternation)
    0 = same as previous (repeat)
    """
    return [1 if flips[i] != flips[i-1] else 0 for i in range(1, len(flips))]


def get_ngrams(stream: List[int], n: int) -> List[str]:
    """Extract n-grams from a stream as strings."""
    return [''.join(map(str, stream[i:i+n])) for i in range(len(stream) - n + 1)]


class HuffmanNode:
    def __init__(self, symbol, freq):
        self.symbol = symbol
        self.freq = freq
        self.left = None
        self.right = None

    def __lt__(self, other):
        return self.freq < other.freq


def build_huffman_tree(freq_dict: Dict[str, int]) -> HuffmanNode:
    """Build Huffman tree from frequency dictionary."""
    heap = [HuffmanNode(sym, freq) for sym, freq in freq_dict.items()]
    heapq.heapify(heap)

    while len(heap) > 1:
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)
        merged = HuffmanNode(None, left.freq + right.freq)
        merged.left = left
        merged.right = right
        heapq.heappush(heap, merged)

    return heap[0] if heap else None


def get_huffman_codes(node: HuffmanNode, prefix: str = "", codes: Dict = None) -> Dict[str, str]:
    """Extract Huffman codes from tree."""
    if codes is None:
        codes = {}

    if node.symbol is not None:
        codes[node.symbol] = prefix if prefix else "0"
    else:
        if node.left:
            get_huffman_codes(node.left, prefix + "0", codes)
        if node.right:
            get_huffman_codes(node.right, prefix + "1", codes)

    return codes


def huffman_encode(symbols: List[str], codes: Dict[str, str]) -> str:
    """Encode a list of symbols using Huffman codes."""
    return ''.join(codes[s] for s in symbols)


def analyze_and_compress(flips: str, name: str = "Sequence"):
    """Analyze transition stream and compute Huffman compression."""

    print(f"\n{'='*70}")
    print(f" HUFFMAN COMPRESSION ANALYSIS: {name}")
    print(f"{'='*70}")

    n = len(flips)
    transitions = to_transitions(flips)
    t_len = len(transitions)

    # Basic statistics
    ones = sum(transitions)
    zeros = t_len - ones
    alt_rate = ones / t_len

    print(f"\n--- Transition Stream Statistics ---")
    print(f"  Original flips: {n}")
    print(f"  Transition stream length: {t_len}")
    print(f"  Alternations (1s): {ones} ({alt_rate*100:.1f}%)")
    print(f"  Repeats (0s): {zeros} ({(1-alt_rate)*100:.1f}%)")

    # Single-symbol entropy
    if 0 < alt_rate < 1:
        entropy_1 = -alt_rate * math.log2(alt_rate) - (1-alt_rate) * math.log2(1-alt_rate)
    else:
        entropy_1 = 0
    print(f"  Single-symbol entropy: {entropy_1:.4f} bits")
    print(f"  Theoretical min (1-gram): {1 + entropy_1 * t_len:.1f} bits")

    results = {}

    # Try different n-gram sizes
    for ngram_size in [1, 2, 3, 4]:
        print(f"\n--- {ngram_size}-gram Huffman Analysis ---")

        ngrams = get_ngrams(transitions, ngram_size)
        if not ngrams:
            continue

        freq = Counter(ngrams)
        total = sum(freq.values())

        print(f"  Unique {ngram_size}-grams: {len(freq)}")
        print(f"  Total {ngram_size}-grams: {total}")

        # Show frequency distribution
        print(f"\n  Frequency distribution:")
        for symbol, count in sorted(freq.items(), key=lambda x: -x[1])[:8]:
            prob = count / total
            print(f"    '{symbol}': {count:4d} ({prob*100:5.1f}%)")

        # Build Huffman tree and get codes
        tree = build_huffman_tree(freq)
        codes = get_huffman_codes(tree)

        # Calculate average code length
        avg_code_len = sum(len(codes[s]) * freq[s] for s in freq) / total

        # Calculate entropy for this n-gram level
        entropy = -sum((c/total) * math.log2(c/total) for c in freq.values())

        print(f"\n  Huffman codes:")
        for symbol, code in sorted(codes.items(), key=lambda x: (len(x[1]), x[0]))[:8]:
            prob = freq[symbol] / total
            print(f"    '{symbol}' -> {code:<10} (prob: {prob:.3f})")

        # Encode the stream
        encoded = huffman_encode(ngrams, codes)
        encoded_bits = len(encoded)

        # Total bits needed (including first flip bit)
        # For n-grams, we also need to encode any remaining symbols
        remainder = t_len % ngram_size
        remainder_bits = remainder  # Just use 1 bit each for leftovers

        total_bits = 1 + encoded_bits + remainder_bits  # 1 for first flip

        # Original: 1 bit per flip = n bits
        original_bits = n
        compression_ratio = total_bits / original_bits
        savings = (1 - compression_ratio) * 100

        print(f"\n  Compression results:")
        print(f"    Entropy: {entropy:.4f} bits per {ngram_size}-gram")
        print(f"    Avg Huffman code length: {avg_code_len:.4f} bits per {ngram_size}-gram")
        print(f"    Encoded stream: {encoded_bits} bits")
        print(f"    Total with overhead: {total_bits} bits")
        print(f"    Original: {original_bits} bits")
        print(f"    Compression ratio: {compression_ratio:.4f}")
        print(f"    Space savings: {savings:.2f}%")

        results[ngram_size] = {
            'encoded_bits': encoded_bits,
            'total_bits': total_bits,
            'ratio': compression_ratio,
            'savings': savings,
            'entropy': entropy,
            'avg_code_len': avg_code_len,
            'codes': codes,
            'freq': freq,
        }

    # Summary
    print(f"\n{'='*70}")
    print(f" SUMMARY: {name}")
    print(f"{'='*70}")
    print(f"\n  {'N-gram':<10} {'Total Bits':<12} {'Ratio':<10} {'Savings':<10}")
    print(f"  {'-'*42}")
    for ng, r in sorted(results.items()):
        print(f"  {ng:<10} {r['total_bits']:<12} {r['ratio']:<10.4f} {r['savings']:>8.2f}%")

    best = min(results.items(), key=lambda x: x[1]['ratio'])
    print(f"\n  Best compression: {best[0]}-grams with {best[1]['savings']:.2f}% savings")

    return results


def main():
    print("\n" + "#"*70)
    print("# HUFFMAN COMPRESSION ON TRANSITION STREAMS")
    print("#"*70)
    print("""
Strategy:
1. Convert flips to transitions: 1=alternation, 0=repeat
2. Analyze n-gram frequencies in the transition stream
3. Build optimal Huffman codes for each n-gram size
4. Find the best compression achievable

Human bias: Alternating too often means more 1s than 0s,
and potentially patterns in alternation sequences.
""")

    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / 'data'

    # Analyze random sequence
    random_file = data_dir / 'random_coin_flips.txt'
    if random_file.exists():
        random_flips = load_flips(random_file)
        if random_flips:
            random_results = analyze_and_compress(random_flips, "Computer Random")

    # Analyze user sequence
    user_file = data_dir / 'user_coin_flips.txt'
    if user_file.exists():
        user_content = open(user_file).read()
        if 'REPLACE' not in user_content:
            user_flips = load_flips(user_file)
            if user_flips:
                user_results = analyze_and_compress(user_flips, "Human Generated")

                # Final comparison
                print(f"\n{'#'*70}")
                print("# COMPARISON: Random vs Human")
                print(f"{'#'*70}")

                print(f"\n  {'N-gram':<10} {'Random Savings':<18} {'Human Savings':<18}")
                print(f"  {'-'*46}")
                for ng in sorted(random_results.keys()):
                    r_sav = random_results[ng]['savings']
                    h_sav = user_results[ng]['savings']
                    marker = " <-- human more compressible" if h_sav > r_sav + 1 else ""
                    print(f"  {ng:<10} {r_sav:>15.2f}%   {h_sav:>15.2f}%{marker}")


if __name__ == "__main__":
    main()
