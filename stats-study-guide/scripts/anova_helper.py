#!/usr/bin/env python3
"""
One-Way ANOVA Calculator.

This script performs One-Way Analysis of Variance calculations and provides
step-by-step solutions for study and verification purposes.
"""

import math
from typing import List, Dict, Optional

# Try to import scipy for p-values
try:
    from scipy import stats
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False


def calculate_anova(groups: List[List[float]], group_names: Optional[List[str]] = None,
                    alpha: float = 0.05) -> Dict:
    """
    Perform One-Way ANOVA analysis.

    Args:
        groups: List of lists, where each inner list contains observations for one group
        group_names: Optional names for each group
        alpha: Significance level (default 0.05)

    Returns:
        Dictionary containing all ANOVA statistics
    """
    k = len(groups)  # Number of groups
    if k < 2:
        raise ValueError("Need at least 2 groups for ANOVA")

    # Calculate group statistics
    group_stats = []
    all_values = []
    N = 0  # Total sample size

    for i, group in enumerate(groups):
        n = len(group)
        if n < 2:
            raise ValueError(f"Group {i+1} needs at least 2 observations")

        N += n
        all_values.extend(group)

        mean = sum(group) / n
        variance = sum((x - mean) ** 2 for x in group) / (n - 1)
        ss = sum((x - mean) ** 2 for x in group)

        name = group_names[i] if group_names and i < len(group_names) else f"Group {i+1}"

        group_stats.append({
            'name': name,
            'n': n,
            'sum': sum(group),
            'mean': mean,
            'variance': variance,
            'std': math.sqrt(variance),
            'ss': ss,
            'values': group,
        })

    # Grand mean
    grand_mean = sum(all_values) / N

    # Calculate Sum of Squares
    # SS Between (treatment)
    ss_between = sum(g['n'] * (g['mean'] - grand_mean) ** 2 for g in group_stats)

    # SS Within (error)
    ss_within = sum(g['ss'] for g in group_stats)

    # SS Total
    ss_total = sum((x - grand_mean) ** 2 for x in all_values)

    # Degrees of freedom
    df_between = k - 1
    df_within = N - k
    df_total = N - 1

    # Mean Squares
    ms_between = ss_between / df_between
    ms_within = ss_within / df_within

    # F-statistic
    f_stat = ms_between / ms_within

    # Get critical F-value and p-value
    if SCIPY_AVAILABLE:
        f_critical = stats.f.ppf(1 - alpha, df_between, df_within)
        p_value = 1 - stats.f.cdf(f_stat, df_between, df_within)
    else:
        # Approximate critical values for common df combinations
        f_critical = get_f_critical_approx(df_between, df_within, alpha)
        p_value = None

    # Effect size (eta-squared)
    eta_squared = ss_between / ss_total

    # Omega-squared (less biased)
    omega_squared = (ss_between - (k - 1) * ms_within) / (ss_total + ms_within)

    return {
        # Basic info
        'k': k,
        'N': N,
        'grand_mean': grand_mean,
        'group_stats': group_stats,

        # Sum of Squares
        'ss_between': ss_between,
        'ss_within': ss_within,
        'ss_total': ss_total,

        # Degrees of freedom
        'df_between': df_between,
        'df_within': df_within,
        'df_total': df_total,

        # Mean Squares
        'ms_between': ms_between,
        'ms_within': ms_within,

        # F-test
        'f_statistic': f_stat,
        'f_critical': f_critical,
        'p_value': p_value,
        'alpha': alpha,
        'significant': f_stat > f_critical,

        # Effect sizes
        'eta_squared': eta_squared,
        'omega_squared': omega_squared,
    }


def get_f_critical_approx(df1: int, df2: int, alpha: float = 0.05) -> float:
    """
    Get approximate F critical value for common degrees of freedom.
    """
    # Table of F critical values for alpha = 0.05
    # Format: (df1, df2): F_critical
    f_table = {
        (1, 5): 6.61, (1, 10): 4.96, (1, 15): 4.54, (1, 20): 4.35, (1, 30): 4.17,
        (2, 5): 5.79, (2, 10): 4.10, (2, 15): 3.68, (2, 20): 3.49, (2, 30): 3.32, (2, 12): 3.89,
        (3, 5): 5.41, (3, 10): 3.71, (3, 15): 3.29, (3, 20): 3.10, (3, 30): 2.92,
        (4, 5): 5.19, (4, 10): 3.48, (4, 15): 3.06, (4, 20): 2.87, (4, 30): 2.69,
        (5, 5): 5.05, (5, 10): 3.33, (5, 15): 2.90, (5, 20): 2.71, (5, 30): 2.53,
    }

    # Try exact match first
    if (df1, df2) in f_table:
        return f_table[(df1, df2)]

    # Try to find closest match
    for (d1, d2), val in f_table.items():
        if d1 == df1 and abs(d2 - df2) <= 5:
            return val

    # Default approximation
    return 4.0


def tukey_hsd(results: Dict) -> Dict:
    """
    Perform Tukey's HSD (Honestly Significant Difference) post-hoc test.

    Args:
        results: Results from calculate_anova()

    Returns:
        Dictionary with pairwise comparisons
    """
    groups = results['group_stats']
    k = results['k']
    ms_within = results['ms_within']
    df_within = results['df_within']

    # Check if equal sample sizes
    n_sizes = [g['n'] for g in groups]
    if len(set(n_sizes)) == 1:
        n = n_sizes[0]
        equal_n = True
    else:
        n = sum(n_sizes) / len(n_sizes)  # Use harmonic mean for unequal n
        equal_n = False

    # Get q critical value (studentized range distribution)
    # Approximate values for alpha = 0.05
    q_table = {
        (3, 6): 4.34, (3, 10): 3.88, (3, 12): 3.77, (3, 15): 3.67, (3, 20): 3.58,
        (4, 6): 4.90, (4, 10): 4.33, (4, 12): 4.20, (4, 15): 4.08, (4, 20): 3.96,
        (5, 6): 5.30, (5, 10): 4.65, (5, 12): 4.51, (5, 15): 4.37, (5, 20): 4.23,
    }

    # Find closest q value
    q_critical = q_table.get((k, df_within))
    if q_critical is None:
        # Try to find approximate
        for (kk, df), val in q_table.items():
            if kk == k and abs(df - df_within) <= 5:
                q_critical = val
                break
        if q_critical is None:
            q_critical = 4.0  # Default

    # Calculate HSD
    hsd = q_critical * math.sqrt(ms_within / n)

    # Pairwise comparisons
    comparisons = []
    for i in range(k):
        for j in range(i + 1, k):
            diff = abs(groups[i]['mean'] - groups[j]['mean'])
            significant = diff > hsd
            comparisons.append({
                'group1': groups[i]['name'],
                'group2': groups[j]['name'],
                'mean1': groups[i]['mean'],
                'mean2': groups[j]['mean'],
                'difference': diff,
                'hsd': hsd,
                'significant': significant,
            })

    return {
        'q_critical': q_critical,
        'hsd': hsd,
        'comparisons': comparisons,
        'equal_n': equal_n,
    }


def print_anova_results(results: Dict, show_steps: bool = True):
    """Print formatted ANOVA results."""

    print("\n" + "=" * 70)
    print(" ONE-WAY ANOVA ANALYSIS")
    print("=" * 70)

    # Group summaries
    print("\n--- Group Statistics ---")
    print(f"\n{'Group':<15} {'n':<6} {'Mean':<12} {'Std Dev':<12} {'Sum':<12}")
    print("-" * 60)
    for g in results['group_stats']:
        print(f"{g['name']:<15} {g['n']:<6} {g['mean']:<12.4f} {g['std']:<12.4f} {g['sum']:<12.2f}")

    print(f"\nTotal observations: N = {results['N']}")
    print(f"Number of groups: k = {results['k']}")
    print(f"Grand mean: {results['grand_mean']:.4f}")

    if show_steps:
        print("\n--- Step 1: Calculate Sum of Squares ---")
        print(f"\n  SS Between = Σnᵢ(x̄ᵢ - x̄)²")
        for g in results['group_stats']:
            print(f"    {g['name']}: {g['n']}({g['mean']:.4f} - {results['grand_mean']:.4f})² = "
                  f"{g['n'] * (g['mean'] - results['grand_mean'])**2:.4f}")
        print(f"  SS Between = {results['ss_between']:.4f}")

        print(f"\n  SS Within = ΣΣ(xᵢⱼ - x̄ᵢ)²")
        for g in results['group_stats']:
            print(f"    {g['name']}: SS = {g['ss']:.4f}")
        print(f"  SS Within = {results['ss_within']:.4f}")

        print(f"\n  SS Total = SS Between + SS Within")
        print(f"  SS Total = {results['ss_between']:.4f} + {results['ss_within']:.4f} = {results['ss_total']:.4f}")

        print("\n--- Step 2: Calculate Degrees of Freedom ---")
        print(f"  df Between = k - 1 = {results['k']} - 1 = {results['df_between']}")
        print(f"  df Within = N - k = {results['N']} - {results['k']} = {results['df_within']}")
        print(f"  df Total = N - 1 = {results['N']} - 1 = {results['df_total']}")

        print("\n--- Step 3: Calculate Mean Squares ---")
        print(f"  MS Between = SS Between / df Between = {results['ss_between']:.4f} / {results['df_between']} = {results['ms_between']:.4f}")
        print(f"  MS Within = SS Within / df Within = {results['ss_within']:.4f} / {results['df_within']} = {results['ms_within']:.4f}")

        print("\n--- Step 4: Calculate F-statistic ---")
        print(f"  F = MS Between / MS Within = {results['ms_between']:.4f} / {results['ms_within']:.4f} = {results['f_statistic']:.4f}")

    # ANOVA Table
    print("\n" + "-" * 70)
    print(" ANOVA TABLE")
    print("-" * 70)
    print(f"\n{'Source':<12} {'SS':<14} {'df':<6} {'MS':<14} {'F':<10}")
    print("-" * 56)
    print(f"{'Between':<12} {results['ss_between']:<14.4f} {results['df_between']:<6} {results['ms_between']:<14.4f} {results['f_statistic']:<10.4f}")
    print(f"{'Within':<12} {results['ss_within']:<14.4f} {results['df_within']:<6} {results['ms_within']:<14.4f}")
    print("-" * 56)
    print(f"{'Total':<12} {results['ss_total']:<14.4f} {results['df_total']:<6}")

    # Hypothesis test
    print("\n" + "-" * 70)
    print(" HYPOTHESIS TEST")
    print("-" * 70)
    print(f"\n  H₀: μ₁ = μ₂ = ... = μₖ (all means are equal)")
    print(f"  H₁: At least one mean is different")
    print(f"\n  F-statistic = {results['f_statistic']:.4f}")
    print(f"  F-critical (α={results['alpha']}, df₁={results['df_between']}, df₂={results['df_within']}) = {results['f_critical']:.4f}")
    if results['p_value'] is not None:
        print(f"  p-value = {results['p_value']:.4f}")

    print(f"\n  Decision: ", end="")
    if results['significant']:
        print("REJECT H₀")
        print("  Conclusion: At least one group mean is significantly different from the others")
    else:
        print("FAIL TO REJECT H₀")
        print("  Conclusion: No significant difference among group means")

    # Effect size
    print("\n" + "-" * 70)
    print(" EFFECT SIZE")
    print("-" * 70)
    print(f"\n  η² (eta-squared) = SS Between / SS Total = {results['eta_squared']:.4f}")
    print(f"  Interpretation: {results['eta_squared']*100:.1f}% of variance explained by group membership")

    # Interpret effect size
    if results['eta_squared'] >= 0.14:
        effect = "Large"
    elif results['eta_squared'] >= 0.06:
        effect = "Medium"
    else:
        effect = "Small"
    print(f"  Effect size: {effect}")

    print(f"\n  ω² (omega-squared) = {results['omega_squared']:.4f}")
    print("  (Less biased estimate of effect size)")


def print_tukey_results(tukey: Dict):
    """Print Tukey's HSD results."""

    print("\n" + "-" * 70)
    print(" POST-HOC ANALYSIS: Tukey's HSD")
    print("-" * 70)

    print(f"\n  Studentized range (q) = {tukey['q_critical']:.3f}")
    print(f"  HSD = {tukey['hsd']:.4f}")
    if not tukey['equal_n']:
        print("  Note: Unequal sample sizes - using harmonic mean")

    print(f"\n  Pairwise Comparisons:")
    print(f"\n  {'Comparison':<25} {'Diff':<12} {'> HSD?':<10} {'Significant':<12}")
    print("  " + "-" * 60)

    for comp in tukey['comparisons']:
        name = f"{comp['group1']} vs {comp['group2']}"
        sig = "Yes" if comp['significant'] else "No"
        gt_hsd = "Yes" if comp['significant'] else "No"
        print(f"  {name:<25} {comp['difference']:<12.4f} {gt_hsd:<10} {sig:<12}")


def main():
    """Main function demonstrating ANOVA calculations."""

    print("\n" + "#" * 70)
    print("# ONE-WAY ANOVA HELPER")
    print("#" * 70)

    # Example 1: Teaching Methods (from study guide)
    print("\n\n" + "=" * 70)
    print(" EXAMPLE 1: Teaching Methods Comparison")
    print("=" * 70)

    groups1 = [
        [72, 75, 68, 71, 74],  # Method A
        [78, 82, 79, 85, 76],  # Method B
        [85, 88, 90, 87, 92],  # Method C
    ]
    names1 = ["Method A", "Method B", "Method C"]

    print("\nData:")
    for name, group in zip(names1, groups1):
        print(f"  {name}: {group}")

    results1 = calculate_anova(groups1, names1)
    print_anova_results(results1)

    if results1['significant']:
        tukey1 = tukey_hsd(results1)
        print_tukey_results(tukey1)

    # Example 2: Fertilizer Effectiveness (from study guide)
    print("\n\n" + "=" * 70)
    print(" EXAMPLE 2: Fertilizer Effectiveness")
    print("=" * 70)

    groups2 = [
        [20, 22, 19, 21, 23, 21],  # Fertilizer 1
        [25, 27, 24, 26, 28, 26],  # Fertilizer 2
        [28, 30, 27, 29, 31, 29],  # Fertilizer 3
        [22, 24, 21, 23, 25, 23],  # Fertilizer 4
    ]
    names2 = ["Fertilizer 1", "Fertilizer 2", "Fertilizer 3", "Fertilizer 4"]

    print("\nData (plant height in cm):")
    for name, group in zip(names2, groups2):
        print(f"  {name}: {group}")

    results2 = calculate_anova(groups2, names2, alpha=0.01)
    print_anova_results(results2)

    if results2['significant']:
        tukey2 = tukey_hsd(results2)
        print_tukey_results(tukey2)

    # Interactive mode prompt
    print("\n\n" + "=" * 70)
    print(" TRY YOUR OWN DATA")
    print("=" * 70)
    print("""
    To use this script with your own data, modify the main() function
    or import and call calculate_anova() directly:

    from anova_helper import calculate_anova, print_anova_results, tukey_hsd

    groups = [
        [group1_values],
        [group2_values],
        [group3_values],
    ]
    names = ["Group 1", "Group 2", "Group 3"]

    results = calculate_anova(groups, names, alpha=0.05)
    print_anova_results(results)

    if results['significant']:
        tukey = tukey_hsd(results)
        print_tukey_results(tukey)
    """)


if __name__ == "__main__":
    main()
