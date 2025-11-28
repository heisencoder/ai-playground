#!/usr/bin/env python3
"""
Advanced run-length Huffman compression for coin flip transition streams.

Key insight: Compare human vs random using the SAME encoding method.
The difference in compression ratios reveals exploitable human patterns.
"""

from pathlib import Path
from typing import List, Dict, Tuple
from collections import Counter
import heapq
import math


def load_flips(filepath: Path) -> str:
    with open(filepath, 'r') as f:
        content = f.read()
    lines = [line for line in content.split('\n') if not line.strip().startswith('#')]
    content = ''.join(lines)
    return ''.join(c.upper() for c in content if c.upper() in 'HT')


def to_transitions(flips: str) -> List[int]:
    return [1 if flips[i] != flips[i-1] else 0 for i in range(1, len(flips))]


def get_runs(stream: List[int]) -> List[Tuple[int, int]]:
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


def build_huffman_codes(freq_dict: Dict) -> Dict:
    if len(freq_dict) == 0:
        return {}
    if len(freq_dict) == 1:
        return {list(freq_dict.keys())[0]: '0'}

    class Node:
        def __init__(self, sym, freq):
            self.sym = sym
            self.freq = freq
            self.left = None
            self.right = None
        def __lt__(self, other):
            return self.freq < other.freq

    heap = [Node(s, f) for s, f in freq_dict.items()]
    heapq.heapify(heap)

    while len(heap) > 1:
        l = heapq.heappop(heap)
        r = heapq.heappop(heap)
        m = Node(None, l.freq + r.freq)
        m.left, m.right = l, r
        heapq.heappush(heap, m)

    def extract(node, prefix="", codes=None):
        if codes is None:
            codes = {}
        if node.sym is not None:
            codes[node.sym] = prefix if prefix else "0"
        else:
            if node.left:
                extract(node.left, prefix + "0", codes)
            if node.right:
                extract(node.right, prefix + "1", codes)
        return codes

    return extract(heap[0])


def analyze_sequence(flips: str, name: str) -> Dict:
    """Analyze a sequence and return compression results for all methods."""
    n = len(flips)
    transitions = to_transitions(flips)
    runs = get_runs(transitions)

    # Separate run types
    runs_1 = [length for val, length in runs if val == 1]
    runs_0 = [length for val, length in runs if val == 0]

    results = {
        'n': n,
        'num_runs': len(runs),
        'runs_1': runs_1,
        'runs_0': runs_0,
        'alt_rate': sum(transitions) / len(transitions),
    }

    # Build separate codes
    codes_1 = build_huffman_codes(Counter(runs_1))
    codes_0 = build_huffman_codes(Counter(runs_0))

    # Method 1: Separate codes
    bits = 2
    for val, length in runs:
        bits += len(codes_1[length]) if val == 1 else len(codes_0[length])
    results['separate'] = {'bits': bits, 'ratio': bits / n}

    # Method 2: Paired runs
    pairs = []
    i = 0
    while i < len(runs) - 1:
        pairs.append((runs[i][1], runs[i + 1][1]))
        i += 2
    leftover = runs[-1] if len(runs) % 2 == 1 else None

    pair_codes = build_huffman_codes(Counter(pairs))
    bits = 2
    for pair in pairs:
        bits += len(pair_codes[pair])
    if leftover:
        val, length = leftover
        bits += len(codes_1[length]) if val == 1 else len(codes_0[length])
    results['paired'] = {'bits': bits, 'ratio': bits / n, 'unique': len(pair_codes)}

    # Method 3: Triple runs
    triples = []
    i = 0
    while i < len(runs) - 2:
        triples.append((runs[i][1], runs[i+1][1], runs[i+2][1]))
        i += 3
    leftover_runs = runs[-(len(runs) % 3):] if len(runs) % 3 != 0 else []

    triple_codes = build_huffman_codes(Counter(triples)) if triples else {}
    bits = 2
    for triple in triples:
        bits += len(triple_codes[triple])
    for val, length in leftover_runs:
        bits += len(codes_1[length]) if val == 1 else len(codes_0[length])
    results['triple'] = {'bits': bits, 'ratio': bits / n, 'unique': len(triple_codes)}

    # Method 4: Quad runs
    quads = []
    i = 0
    while i < len(runs) - 3:
        quads.append((runs[i][1], runs[i+1][1], runs[i+2][1], runs[i+3][1]))
        i += 4
    leftover_runs = runs[-(len(runs) % 4):] if len(runs) % 4 != 0 else []

    quad_codes = build_huffman_codes(Counter(quads)) if quads else {}
    bits = 2
    for quad in quads:
        bits += len(quad_codes[quad])
    for val, length in leftover_runs:
        bits += len(codes_1[length]) if val == 1 else len(codes_0[length])
    results['quad'] = {'bits': bits, 'ratio': bits / n, 'unique': len(quad_codes)}

    # Method 5: 5-tuples
    quintuples = []
    i = 0
    while i < len(runs) - 4:
        quintuples.append(tuple(r[1] for r in runs[i:i+5]))
        i += 5
    leftover_runs = runs[-(len(runs) % 5):] if len(runs) % 5 != 0 else []

    quint_codes = build_huffman_codes(Counter(quintuples)) if quintuples else {}
    bits = 2
    for quint in quintuples:
        bits += len(quint_codes[quint])
    for val, length in leftover_runs:
        bits += len(codes_1[length]) if val == 1 else len(codes_0[length])
    results['5-tuple'] = {'bits': bits, 'ratio': bits / n, 'unique': len(quint_codes)}

    # Method 6: 6-tuples
    sextuples = []
    i = 0
    while i < len(runs) - 5:
        sextuples.append(tuple(r[1] for r in runs[i:i+6]))
        i += 6
    leftover_runs = runs[-(len(runs) % 6):] if len(runs) % 6 != 0 else []

    sext_codes = build_huffman_codes(Counter(sextuples)) if sextuples else {}
    bits = 2
    for sext in sextuples:
        bits += len(sext_codes[sext])
    for val, length in leftover_runs:
        bits += len(codes_1[length]) if val == 1 else len(codes_0[length])
    results['6-tuple'] = {'bits': bits, 'ratio': bits / n, 'unique': len(sext_codes)}

    return results


def main():
    print("\n" + "#"*70)
    print("# ADVANCED RUN-LENGTH HUFFMAN COMPRESSION")
    print("#"*70)
    print("""
Strategy: Encode N consecutive run lengths as a single Huffman symbol.
Larger N captures more structure but needs more unique symbols.

Key insight: Human patterns allow better compression than random.
The DIFFERENCE in compression ratios reveals exploitable structure.
""")

    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / 'data'

    random_file = data_dir / 'random_coin_flips.txt'
    user_file = data_dir / 'user_coin_flips.txt'

    random_flips = load_flips(random_file) if random_file.exists() else None
    user_content = open(user_file).read() if user_file.exists() else ""
    user_flips = load_flips(user_file) if 'REPLACE' not in user_content else None

    if not random_flips or not user_flips:
        print("Need both random and user flip files!")
        return

    random_results = analyze_sequence(random_flips, "Random")
    human_results = analyze_sequence(user_flips, "Human")

    # Display comparison
    print(f"\n{'='*70}")
    print(" SEQUENCE STATISTICS")
    print(f"{'='*70}")
    print(f"\n  {'Metric':<25} {'Random':<15} {'Human':<15}")
    print(f"  {'-'*55}")
    print(f"  {'Original bits':<25} {random_results['n']:<15} {human_results['n']:<15}")
    print(f"  {'Number of runs':<25} {random_results['num_runs']:<15} {human_results['num_runs']:<15}")
    print(f"  {'Alternation rate':<25} {random_results['alt_rate']*100:>13.1f}% {human_results['alt_rate']*100:>13.1f}%")
    print(f"  {'Max 1-run length':<25} {max(random_results['runs_1']):<15} {max(human_results['runs_1']):<15}")
    print(f"  {'Max 0-run length':<25} {max(random_results['runs_0']):<15} {max(human_results['runs_0']):<15}")

    print(f"\n  Human 0-runs distribution: {dict(Counter(human_results['runs_0']))}")
    print(f"  Human 1-runs distribution: {dict(sorted(Counter(human_results['runs_1']).items()))}")

    methods = ['separate', 'paired', 'triple', 'quad', '5-tuple', '6-tuple']

    print(f"\n{'='*70}")
    print(" COMPRESSION COMPARISON (data bits only, no table overhead)")
    print(f"{'='*70}")
    print(f"\n  {'Method':<12} {'Random':<18} {'Human':<18} {'Human Advantage':<15}")
    print(f"  {'-'*65}")

    for method in methods:
        r = random_results[method]
        h = human_results[method]

        r_savings = (1 - r['ratio']) * 100
        h_savings = (1 - h['ratio']) * 100
        advantage = h_savings - r_savings

        r_str = f"{r['bits']} bits ({r_savings:>5.1f}%)"
        h_str = f"{h['bits']} bits ({h_savings:>5.1f}%)"
        adv_str = f"{advantage:>+6.2f}%" if advantage != 0 else "  0.00%"

        marker = " ←" if advantage > 5 else ""
        print(f"  {method:<12} {r_str:<18} {h_str:<18} {adv_str:<15}{marker}")

    # Find optimal
    best_method = None
    best_advantage = 0
    for method in methods:
        r = random_results[method]
        h = human_results[method]
        h_savings = (1 - h['ratio']) * 100
        r_savings = (1 - r['ratio']) * 100
        advantage = h_savings - r_savings
        if advantage > best_advantage:
            best_advantage = advantage
            best_method = method

    print(f"\n{'='*70}")
    print(" ANALYSIS")
    print(f"{'='*70}")

    h_best = human_results[best_method]
    r_best = random_results[best_method]

    print(f"\n  Best method for detecting human patterns: {best_method}")
    print(f"  Human compression: {h_best['bits']} bits ({(1-h_best['ratio'])*100:.1f}% savings)")
    print(f"  Random compression: {r_best['bits']} bits ({(1-r_best['ratio'])*100:.1f}% savings)")
    print(f"  Human advantage: {best_advantage:.2f}% more compressible")

    # Target: 10% compression for human
    target = 0.10
    for method in methods:
        h = human_results[method]
        h_savings = (1 - h['ratio'])
        if h_savings >= target:
            print(f"\n  ✓ {method} encoding achieves ≥10% compression on human data!")
            print(f"    {h['bits']} bits = {h_savings*100:.1f}% savings")
            break
    else:
        best_h = max(methods, key=lambda m: 1 - human_results[m]['ratio'])
        print(f"\n  Best human compression: {best_h} with {(1-human_results[best_h]['ratio'])*100:.1f}%")

    print(f"\n{'='*70}")
    print(" REALISTIC COMPRESSION (with estimated table overhead)")
    print(f"{'='*70}")

    print(f"\n  For practical compression, we need to transmit the Huffman table.")
    print(f"  Estimate: ~7 bits per unique symbol (4 for code length, 3 for symbol ID)")
    print(f"\n  {'Method':<12} {'Unique Symbols':<16} {'Table Overhead':<16} {'Human Net Savings':<18}")
    print(f"  {'-'*65}")

    for method in methods:
        h = human_results[method]
        unique = h.get('unique', 0)
        if method == 'separate':
            unique = len(set(human_results['runs_1'])) + len(set(human_results['runs_0']))

        overhead = unique * 7  # ~7 bits per symbol
        total_bits = h['bits'] + overhead
        net_savings = (1 - total_bits / human_results['n']) * 100

        print(f"  {method:<12} {unique:<16} {overhead:<16} {net_savings:>15.2f}%")


if __name__ == "__main__":
    main()
