#!/usr/bin/env python3
"""
Analyze coin flip sequences for randomness using Chi-Square tests.

This script performs multiple tests on coin flip sequences to determine
if they appear to be random:
1. Overall proportion test (50/50 heads/tails)
2. Run-length distribution test
3. Alternation frequency test
4. Serial correlation test

These tests help identify whether a sequence was truly random or
potentially human-generated (which often shows patterns).
"""

import re
import sys
from pathlib import Path
from collections import Counter
from typing import Tuple, List, Dict

# Try to import scipy for chi-square p-values
try:
    from scipy import stats
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    print("Note: scipy not installed. P-values will not be calculated.")
    print("Install with: pip install scipy\n")


def load_flips(filepath: Path) -> str:
    """
    Load coin flip sequence from a file.

    Args:
        filepath: Path to the file containing coin flips

    Returns:
        String containing only 'H' and 'T' characters
    """
    with open(filepath, 'r') as f:
        content = f.read()

    # Remove comments (lines starting with #)
    lines = [line for line in content.split('\n') if not line.strip().startswith('#')]
    content = ''.join(lines)

    # Extract only H and T characters (case insensitive)
    flips = ''.join(c.upper() for c in content if c.upper() in 'HT')

    return flips


def get_runs(sequence: str) -> List[str]:
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

    runs.append(current_run)
    return runs


def chi_square_test(observed: List[int], expected: List[float]) -> Tuple[float, float, int]:
    """
    Perform chi-square goodness-of-fit test.

    Args:
        observed: List of observed frequencies
        expected: List of expected frequencies

    Returns:
        Tuple of (chi-square statistic, p-value, degrees of freedom)
    """
    # Calculate chi-square statistic
    chi_sq = sum((o - e) ** 2 / e for o, e in zip(observed, expected) if e > 0)
    df = len(observed) - 1

    # Calculate p-value if scipy is available
    if SCIPY_AVAILABLE:
        p_value = 1 - stats.chi2.cdf(chi_sq, df)
    else:
        p_value = None

    return chi_sq, p_value, df


def analyze_proportion(flips: str) -> Dict:
    """
    Test if heads and tails are equally likely (50/50).

    Uses chi-square test to compare observed proportions to expected.
    """
    n = len(flips)
    heads = flips.count('H')
    tails = flips.count('T')

    observed = [heads, tails]
    expected = [n / 2, n / 2]

    chi_sq, p_value, df = chi_square_test(observed, expected)

    return {
        'test_name': 'Proportion Test (50/50)',
        'n': n,
        'heads': heads,
        'tails': tails,
        'heads_pct': 100 * heads / n,
        'tails_pct': 100 * tails / n,
        'chi_square': chi_sq,
        'p_value': p_value,
        'df': df,
        'critical_value': 3.841,  # df=1, alpha=0.05
    }


def analyze_run_lengths(flips: str) -> Dict:
    """
    Test if run lengths follow expected distribution.

    For a random sequence, the probability of a run of length k is 1/2^k.
    Expected number of runs of length k = n / 2^(k+1)
    """
    n = len(flips)
    runs = get_runs(flips)
    run_lengths = [len(run) for run in runs]
    run_counts = Counter(run_lengths)

    # Group runs into buckets (1, 2, 3, 4, 5+)
    buckets = {1: 0, 2: 0, 3: 0, 4: 0, '5+': 0}
    for length, count in run_counts.items():
        if length <= 4:
            buckets[length] = count
        else:
            buckets['5+'] += count

    # Calculate expected frequencies
    # Expected runs of length k = n / 2^(k+1)
    expected = {
        1: n / 4,
        2: n / 8,
        3: n / 16,
        4: n / 32,
        '5+': n / 32  # Sum of geometric series for k >= 5
    }

    observed_list = [buckets[k] for k in [1, 2, 3, 4, '5+']]
    expected_list = [expected[k] for k in [1, 2, 3, 4, '5+']]

    chi_sq, p_value, df = chi_square_test(observed_list, expected_list)

    return {
        'test_name': 'Run-Length Distribution Test',
        'total_runs': len(runs),
        'buckets': buckets,
        'expected': expected,
        'chi_square': chi_sq,
        'p_value': p_value,
        'df': df,
        'critical_value': 9.488,  # df=4, alpha=0.05
        'run_counts': dict(run_counts),
    }


def analyze_alternations(flips: str) -> Dict:
    """
    Test frequency of alternations (changes from H to T or T to H).

    For a random sequence, expected alternation rate is 50%.
    """
    n = len(flips)
    if n < 2:
        return {'test_name': 'Alternation Test', 'error': 'Sequence too short'}

    # Count alternations
    alternations = sum(1 for i in range(len(flips) - 1) if flips[i] != flips[i + 1])
    same = n - 1 - alternations

    # Expected: 50% alternations, 50% same
    expected_alt = (n - 1) / 2

    observed = [alternations, same]
    expected = [expected_alt, expected_alt]

    chi_sq, p_value, df = chi_square_test(observed, expected)

    return {
        'test_name': 'Alternation Frequency Test',
        'n_transitions': n - 1,
        'alternations': alternations,
        'same': same,
        'alternation_rate': 100 * alternations / (n - 1),
        'chi_square': chi_sq,
        'p_value': p_value,
        'df': df,
        'critical_value': 3.841,  # df=1, alpha=0.05
    }


def analyze_pairs(flips: str) -> Dict:
    """
    Test distribution of consecutive pairs (HH, HT, TH, TT).

    For a random sequence, each pair should occur with equal frequency.
    """
    n = len(flips)
    if n < 2:
        return {'test_name': 'Pairs Test', 'error': 'Sequence too short'}

    # Count pairs
    pairs = [flips[i:i+2] for i in range(len(flips) - 1)]
    pair_counts = Counter(pairs)

    observed = [pair_counts.get(p, 0) for p in ['HH', 'HT', 'TH', 'TT']]
    expected = [(n - 1) / 4] * 4

    chi_sq, p_value, df = chi_square_test(observed, expected)

    return {
        'test_name': 'Consecutive Pairs Test',
        'n_pairs': n - 1,
        'pair_counts': dict(pair_counts),
        'expected_each': (n - 1) / 4,
        'chi_square': chi_sq,
        'p_value': p_value,
        'df': df,
        'critical_value': 7.815,  # df=3, alpha=0.05
    }


def analyze_serial_correlation(flips: str, lag: int = 1) -> Dict:
    """
    Test for serial correlation (dependency between consecutive flips).

    Converts H=1, T=0 and calculates correlation between flip[i] and flip[i+lag].
    """
    n = len(flips)
    if n < lag + 2:
        return {'test_name': 'Serial Correlation Test', 'error': 'Sequence too short'}

    # Convert to numeric
    numeric = [1 if f == 'H' else 0 for f in flips]

    # Calculate correlation
    x = numeric[:-lag]
    y = numeric[lag:]

    n_pairs = len(x)
    mean_x = sum(x) / n_pairs
    mean_y = sum(y) / n_pairs

    # Covariance and standard deviations
    cov = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n_pairs)) / n_pairs
    std_x = (sum((xi - mean_x) ** 2 for xi in x) / n_pairs) ** 0.5
    std_y = (sum((yi - mean_y) ** 2 for yi in y) / n_pairs) ** 0.5

    if std_x * std_y == 0:
        correlation = 0
    else:
        correlation = cov / (std_x * std_y)

    # Test statistic for correlation (approximately normal for large n)
    if n_pairs > 2:
        t_stat = correlation * ((n_pairs - 2) ** 0.5) / ((1 - correlation ** 2) ** 0.5) if abs(correlation) < 1 else float('inf')
    else:
        t_stat = 0

    return {
        'test_name': f'Serial Correlation Test (lag={lag})',
        'lag': lag,
        'correlation': correlation,
        't_statistic': t_stat,
        'interpretation': 'Strong serial dependency' if abs(correlation) > 0.2 else 'Weak/no dependency',
    }


def print_results(results: Dict, verbose: bool = True):
    """Print formatted test results."""
    print(f"\n{'='*60}")
    print(f" {results['test_name']}")
    print(f"{'='*60}")

    if 'error' in results:
        print(f"Error: {results['error']}")
        return

    # Print test-specific details
    if 'heads' in results:
        print(f"  Heads: {results['heads']} ({results['heads_pct']:.1f}%)")
        print(f"  Tails: {results['tails']} ({results['tails_pct']:.1f}%)")

    if 'buckets' in results:
        print(f"\n  Run Length Distribution:")
        print(f"  {'Length':<10} {'Observed':<12} {'Expected':<12}")
        print(f"  {'-'*34}")
        for k in [1, 2, 3, 4, '5+']:
            obs = results['buckets'][k]
            exp = results['expected'][k]
            diff = obs - exp
            marker = '*' if abs(diff) > exp * 0.5 else ''
            print(f"  {str(k):<10} {obs:<12} {exp:<12.1f} {marker}")

        if verbose and 'run_counts' in results:
            print(f"\n  Detailed run counts: {results['run_counts']}")

    if 'alternations' in results:
        print(f"  Alternations: {results['alternations']} ({results['alternation_rate']:.1f}%)")
        print(f"  Same consecutive: {results['same']}")
        print(f"  Expected alternation rate: 50%")

    if 'pair_counts' in results:
        print(f"\n  Pair Distribution:")
        for pair in ['HH', 'HT', 'TH', 'TT']:
            count = results['pair_counts'].get(pair, 0)
            expected = results['expected_each']
            print(f"    {pair}: {count} (expected: {expected:.1f})")

    if 'correlation' in results:
        print(f"  Correlation coefficient: {results['correlation']:.4f}")
        print(f"  Interpretation: {results['interpretation']}")

    # Print chi-square results
    if 'chi_square' in results:
        print(f"\n  Chi-Square Analysis:")
        print(f"    χ² = {results['chi_square']:.4f}")
        print(f"    df = {results['df']}")
        print(f"    Critical value (α=0.05): {results['critical_value']}")

        if results['p_value'] is not None:
            print(f"    p-value = {results['p_value']:.4f}")

        # Decision
        if results['chi_square'] > results['critical_value']:
            print(f"\n  ⚠ REJECT null hypothesis: Evidence suggests NON-RANDOM sequence")
        else:
            print(f"\n  ✓ FAIL TO REJECT null hypothesis: No evidence against randomness")


def compare_sequences(seq1: str, seq2: str, name1: str = "Sequence 1", name2: str = "Sequence 2"):
    """
    Compare two sequences side by side.
    """
    print(f"\n{'#'*70}")
    print(f"# COMPARING: {name1} vs {name2}")
    print(f"{'#'*70}")

    # Run all tests on both sequences
    tests = [
        analyze_proportion,
        analyze_run_lengths,
        analyze_alternations,
        analyze_pairs,
    ]

    comparison = []
    for test in tests:
        r1 = test(seq1)
        r2 = test(seq2)

        comparison.append({
            'test': r1['test_name'],
            'chi_sq_1': r1.get('chi_square', 'N/A'),
            'chi_sq_2': r2.get('chi_square', 'N/A'),
            'critical': r1.get('critical_value', 'N/A'),
        })

    # Print comparison table
    print(f"\n{'Test':<35} {name1:<12} {name2:<12} {'Critical':<10}")
    print("-" * 70)
    for c in comparison:
        chi1 = f"{c['chi_sq_1']:.2f}" if isinstance(c['chi_sq_1'], float) else c['chi_sq_1']
        chi2 = f"{c['chi_sq_2']:.2f}" if isinstance(c['chi_sq_2'], float) else c['chi_sq_2']
        crit = f"{c['critical']:.2f}" if isinstance(c['critical'], float) else c['critical']
        print(f"{c['test']:<35} {chi1:<12} {chi2:<12} {crit:<10}")


def main():
    """Main function to analyze coin flip sequences."""
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / 'data'

    random_file = data_dir / 'random_coin_flips.txt'
    user_file = data_dir / 'user_coin_flips.txt'

    # Check if files exist
    if not random_file.exists():
        print("Random coin flip file not found. Run generate_coin_flips.py first.")
        sys.exit(1)

    # Load random sequence
    random_flips = load_flips(random_file)
    print(f"Loaded {len(random_flips)} random coin flips")

    # Analyze random sequence
    print("\n" + "#" * 70)
    print("# ANALYSIS: Computer-Generated Random Sequence")
    print("#" * 70)

    print_results(analyze_proportion(random_flips))
    print_results(analyze_run_lengths(random_flips))
    print_results(analyze_alternations(random_flips))
    print_results(analyze_pairs(random_flips))
    print_results(analyze_serial_correlation(random_flips))

    # Try to load and analyze user sequence
    if user_file.exists():
        user_flips = load_flips(user_file)

        if len(user_flips) > 0 and 'REPLACE' not in open(user_file).read():
            print("\n" + "#" * 70)
            print("# ANALYSIS: User-Generated Sequence")
            print("#" * 70)

            if len(user_flips) != 256:
                print(f"\n⚠ Warning: Expected 256 flips, got {len(user_flips)}")

            print_results(analyze_proportion(user_flips))
            print_results(analyze_run_lengths(user_flips))
            print_results(analyze_alternations(user_flips))
            print_results(analyze_pairs(user_flips))
            print_results(analyze_serial_correlation(user_flips))

            # Compare both sequences
            compare_sequences(random_flips, user_flips,
                            "Random", "User")
        else:
            print("\n" + "-" * 70)
            print("User sequence not yet entered.")
            print(f"Edit {user_file} to add your own 'random' coin flips!")
            print("-" * 70)

    # Summary interpretation
    print("\n" + "=" * 70)
    print(" INTERPRETATION GUIDE")
    print("=" * 70)
    print("""
    Chi-Square Tests:
    - If χ² > critical value → Evidence suggests non-random sequence
    - If χ² ≤ critical value → No evidence against randomness

    Common signs of human-generated sequences:
    1. TOO MANY alternations (>55%) - Humans avoid long runs
    2. TOO FEW long runs - True random sequences have occasional long runs
    3. TOO BALANCED proportions - Humans try to maintain 50/50
    4. Pattern in pairs - Humans often alternate HT,TH more than HH,TT

    A truly random sequence will occasionally "look" non-random!
    """)


if __name__ == "__main__":
    main()
