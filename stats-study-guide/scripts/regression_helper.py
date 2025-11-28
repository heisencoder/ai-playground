#!/usr/bin/env python3
"""
Linear Regression and Correlation Calculator.

This script performs linear regression calculations and provides
step-by-step solutions for study and verification purposes.
"""

import math
from typing import List, Tuple, Dict, Optional

# Try to import scipy for p-values
try:
    from scipy import stats
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False


def calculate_regression(x: List[float], y: List[float], alpha: float = 0.05) -> Dict:
    """
    Calculate linear regression statistics with detailed steps.

    Args:
        x: List of independent variable values
        y: List of dependent variable values
        alpha: Significance level (default 0.05)

    Returns:
        Dictionary containing all regression statistics and steps
    """
    n = len(x)
    if n != len(y):
        raise ValueError("x and y must have the same length")
    if n < 3:
        raise ValueError("Need at least 3 data points")

    # Calculate sums
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi ** 2 for xi in x)
    sum_y2 = sum(yi ** 2 for yi in y)

    # Calculate means
    x_bar = sum_x / n
    y_bar = sum_y / n

    # Calculate slope (b) and intercept (a)
    numerator_b = n * sum_xy - sum_x * sum_y
    denominator_b = n * sum_x2 - sum_x ** 2

    b = numerator_b / denominator_b
    a = y_bar - b * x_bar

    # Calculate correlation coefficient (r)
    numerator_r = n * sum_xy - sum_x * sum_y
    denominator_r = math.sqrt((n * sum_x2 - sum_x ** 2) * (n * sum_y2 - sum_y ** 2))
    r = numerator_r / denominator_r if denominator_r != 0 else 0

    # Calculate r-squared
    r_squared = r ** 2

    # Calculate predicted values and residuals
    y_pred = [a + b * xi for xi in x]
    residuals = [yi - y_hat for yi, y_hat in zip(y, y_pred)]

    # Calculate sum of squares
    ss_total = sum((yi - y_bar) ** 2 for yi in y)
    ss_regression = sum((y_hat - y_bar) ** 2 for y_hat in y_pred)
    ss_residual = sum(res ** 2 for res in residuals)

    # Standard error of the estimate
    se = math.sqrt(ss_residual / (n - 2)) if n > 2 else 0

    # Test significance of correlation
    df = n - 2
    if abs(r) < 1:
        t_stat = r * math.sqrt(n - 2) / math.sqrt(1 - r ** 2)
    else:
        t_stat = float('inf')

    # Get critical t-value and p-value
    if SCIPY_AVAILABLE:
        t_critical = stats.t.ppf(1 - alpha / 2, df)
        p_value = 2 * (1 - stats.t.cdf(abs(t_stat), df))
    else:
        # Approximate critical values for common df
        t_critical_table = {
            1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
            6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
            15: 2.131, 20: 2.086, 25: 2.060, 30: 2.042, 60: 2.000
        }
        t_critical = t_critical_table.get(df, 2.0)  # Default approximation
        p_value = None

    return {
        # Basic statistics
        'n': n,
        'x_bar': x_bar,
        'y_bar': y_bar,

        # Sums (for showing work)
        'sum_x': sum_x,
        'sum_y': sum_y,
        'sum_xy': sum_xy,
        'sum_x2': sum_x2,
        'sum_y2': sum_y2,

        # Regression equation
        'slope': b,
        'intercept': a,
        'equation': f"ŷ = {a:.4f} + {b:.4f}x",

        # Correlation
        'r': r,
        'r_squared': r_squared,

        # Sum of squares
        'ss_total': ss_total,
        'ss_regression': ss_regression,
        'ss_residual': ss_residual,

        # Standard error
        'se': se,

        # Significance testing
        'df': df,
        't_statistic': t_stat,
        't_critical': t_critical,
        'p_value': p_value,
        'alpha': alpha,
        'significant': abs(t_stat) > t_critical,

        # Predicted values and residuals
        'y_predicted': y_pred,
        'residuals': residuals,
    }


def predict(results: Dict, x_value: float) -> Dict:
    """
    Make a prediction using the regression equation.

    Args:
        results: Results from calculate_regression()
        x_value: X value to predict Y for

    Returns:
        Dictionary with prediction details
    """
    a = results['intercept']
    b = results['slope']
    y_pred = a + b * x_value

    # Check if extrapolation
    x_data = [results['sum_x'] / results['n']]  # Just use mean as reference
    # Note: For full implementation, would need original x values

    return {
        'x_value': x_value,
        'y_predicted': y_pred,
        'equation_used': results['equation'],
    }


def print_regression_results(results: Dict, show_steps: bool = True):
    """Print formatted regression results."""

    print("\n" + "=" * 70)
    print(" LINEAR REGRESSION ANALYSIS")
    print("=" * 70)

    print(f"\nSample size: n = {results['n']}")

    if show_steps:
        print("\n--- Step 1: Calculate Sums ---")
        print(f"  Σx = {results['sum_x']:.4f}")
        print(f"  Σy = {results['sum_y']:.4f}")
        print(f"  Σxy = {results['sum_xy']:.4f}")
        print(f"  Σx² = {results['sum_x2']:.4f}")
        print(f"  Σy² = {results['sum_y2']:.4f}")

        print("\n--- Step 2: Calculate Means ---")
        print(f"  x̄ = {results['x_bar']:.4f}")
        print(f"  ȳ = {results['y_bar']:.4f}")

        print("\n--- Step 3: Calculate Slope (b) ---")
        print(f"  b = [nΣxy - (Σx)(Σy)] / [nΣx² - (Σx)²]")
        print(f"  b = [{results['n']}({results['sum_xy']:.2f}) - ({results['sum_x']:.2f})({results['sum_y']:.2f})] / "
              f"[{results['n']}({results['sum_x2']:.2f}) - ({results['sum_x']:.2f})²]")
        print(f"  b = {results['slope']:.4f}")

        print("\n--- Step 4: Calculate Intercept (a) ---")
        print(f"  a = ȳ - b·x̄")
        print(f"  a = {results['y_bar']:.4f} - ({results['slope']:.4f})({results['x_bar']:.4f})")
        print(f"  a = {results['intercept']:.4f}")

    print("\n" + "-" * 70)
    print(" REGRESSION EQUATION")
    print("-" * 70)
    print(f"\n  {results['equation']}")

    print("\n" + "-" * 70)
    print(" CORRELATION ANALYSIS")
    print("-" * 70)
    print(f"\n  Correlation coefficient (r) = {results['r']:.4f}")
    print(f"  Coefficient of determination (r²) = {results['r_squared']:.4f}")
    print(f"  Interpretation: {results['r_squared']*100:.1f}% of the variance in Y is explained by X")

    # Interpret r
    abs_r = abs(results['r'])
    if abs_r >= 0.8:
        strength = "Very strong"
    elif abs_r >= 0.6:
        strength = "Strong"
    elif abs_r >= 0.4:
        strength = "Moderate"
    elif abs_r >= 0.2:
        strength = "Weak"
    else:
        strength = "Very weak or no"

    direction = "positive" if results['r'] > 0 else "negative"
    print(f"  {strength} {direction} linear relationship")

    print("\n" + "-" * 70)
    print(" SIGNIFICANCE TEST")
    print("-" * 70)
    print(f"\n  H₀: ρ = 0 (no linear correlation)")
    print(f"  H₁: ρ ≠ 0 (linear correlation exists)")
    print(f"\n  t-statistic = {results['t_statistic']:.4f}")
    print(f"  df = {results['df']}")
    print(f"  Critical value (α={results['alpha']}, two-tailed) = ±{results['t_critical']:.4f}")
    if results['p_value'] is not None:
        print(f"  p-value = {results['p_value']:.4f}")

    print(f"\n  Decision: ", end="")
    if results['significant']:
        print("REJECT H₀ - The correlation is statistically significant")
    else:
        print("FAIL TO REJECT H₀ - The correlation is not statistically significant")

    print("\n" + "-" * 70)
    print(" ADDITIONAL STATISTICS")
    print("-" * 70)
    print(f"\n  Standard error of estimate (Sₑ) = {results['se']:.4f}")
    print(f"  SS Total = {results['ss_total']:.4f}")
    print(f"  SS Regression = {results['ss_regression']:.4f}")
    print(f"  SS Residual = {results['ss_residual']:.4f}")


def generate_sample_data() -> Tuple[List[float], List[float], str]:
    """Generate sample data for practice."""
    import random
    random.seed(42)

    # Generate linearly related data with some noise
    n = 10
    x = list(range(1, n + 1))
    y = [2 + 3 * xi + random.gauss(0, 2) for xi in x]

    description = "Study hours (X) vs. Exam score (Y)"

    return x, y, description


def main():
    """Main function demonstrating regression calculations."""

    print("\n" + "#" * 70)
    print("# LINEAR REGRESSION HELPER")
    print("#" * 70)

    # Example 1: Study Hours vs Exam Score (from study guide)
    print("\n\n" + "=" * 70)
    print(" EXAMPLE 1: Study Hours vs Exam Score")
    print("=" * 70)

    x1 = [2, 3, 4, 5, 5, 6, 7, 8]
    y1 = [65, 70, 72, 78, 75, 82, 85, 90]

    print("\nData:")
    print(f"  X (Hours):  {x1}")
    print(f"  Y (Scores): {y1}")

    results1 = calculate_regression(x1, y1)
    print_regression_results(results1)

    # Make a prediction
    x_new = 6.5
    pred = predict(results1, x_new)
    print(f"\n  Prediction for x = {x_new}:")
    print(f"    ŷ = {results1['intercept']:.4f} + {results1['slope']:.4f}({x_new})")
    print(f"    ŷ = {pred['y_predicted']:.2f}")

    # Example 2: Temperature vs Ice Cream Sales
    print("\n\n" + "=" * 70)
    print(" EXAMPLE 2: Temperature vs Ice Cream Sales")
    print("=" * 70)

    x2 = [65, 70, 75, 80, 85, 90]
    y2 = [120, 145, 160, 185, 210, 240]

    print("\nData:")
    print(f"  X (Temperature °F): {x2}")
    print(f"  Y (Sales $):        {y2}")

    results2 = calculate_regression(x2, y2)
    print_regression_results(results2)

    # Interactive mode prompt
    print("\n\n" + "=" * 70)
    print(" TRY YOUR OWN DATA")
    print("=" * 70)
    print("""
    To use this script with your own data, modify the main() function
    or import and call calculate_regression() directly:

    from regression_helper import calculate_regression, print_regression_results

    x = [your x values]
    y = [your y values]
    results = calculate_regression(x, y)
    print_regression_results(results)
    """)


if __name__ == "__main__":
    main()
