# Probability and Statistics Study Guide

A comprehensive study guide for a college probability and statistics final exam. This guide covers key topics with definitions, concepts, and practice problems.

## Table of Contents

1. [The Chi-Square Distribution](01-chi-square-distribution.md)
   - Matched or Paired Samples
   - Facts About the Chi-Square Distribution
   - Goodness-of-Fit Test
   - Test of Independence

2. [Linear Regression and Correlation](02-linear-regression-correlation.md)
   - The Regression Equation
   - Testing the Significance of the Correlation Coefficient
   - Prediction

3. [F Distribution and One-Way ANOVA](03-f-distribution-anova.md)
   - The F Distribution
   - One-Way Analysis of Variance (ANOVA)
   - Post-Hoc Tests

## Quick Reference: Key Formulas

### Chi-Square Test Statistic
$$\chi^2 = \sum \frac{(O - E)^2}{E}$$

Where:
- O = Observed frequency
- E = Expected frequency

### Linear Regression
$$\hat{y} = a + bx$$

Where:
- $b = \frac{n\sum xy - (\sum x)(\sum y)}{n\sum x^2 - (\sum x)^2}$
- $a = \bar{y} - b\bar{x}$

### Correlation Coefficient
$$r = \frac{n\sum xy - (\sum x)(\sum y)}{\sqrt{[n\sum x^2 - (\sum x)^2][n\sum y^2 - (\sum y)^2]}}$$

### F-Statistic (One-Way ANOVA)
$$F = \frac{MS_{between}}{MS_{within}} = \frac{SS_{between}/df_{between}}{SS_{within}/df_{within}}$$

## Project Structure

```
stats-study-guide/
├── README.md                           # This file
├── 01-chi-square-distribution.md       # Chi-Square Distribution section
├── 02-linear-regression-correlation.md # Linear Regression section
├── 03-f-distribution-anova.md          # F Distribution and ANOVA section
├── data/
│   ├── random_coin_flips.txt           # Computer-generated random coin flips
│   └── user_coin_flips.txt             # Your manually entered coin flips
└── scripts/
    ├── generate_coin_flips.py          # Generate random coin flip data
    ├── analyze_coin_flips.py           # Analyze coin flip sequences
    ├── regression_helper.py            # Linear regression calculations
    └── anova_helper.py                 # ANOVA calculations
```

## How to Use This Guide

1. **Read through each section** to understand the concepts and definitions
2. **Work through the sample problems** to practice applying the formulas
3. **Use the Python scripts** to generate additional practice data and verify your calculations
4. **Complete the coin flip experiment** to get hands-on experience with the Chi-Square test

## Python Scripts

### Running the Scripts

Make sure you have Python 3 installed with the following packages:
- numpy
- scipy

Install dependencies:
```bash
pip install numpy scipy
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `generate_coin_flips.py` | Generates random coin flip sequences |
| `analyze_coin_flips.py` | Analyzes coin flip data for randomness |
| `regression_helper.py` | Performs linear regression calculations |
| `anova_helper.py` | Performs One-Way ANOVA calculations |

## Study Tips

1. **Understand the assumptions** - Each test has specific conditions that must be met
2. **Practice setting up hypotheses** - Know when to use one-tailed vs two-tailed tests
3. **Memorize critical values** or know how to use tables
4. **Show your work** - Partial credit is often given for correct setup
5. **Check your degrees of freedom** - A common source of errors

## Critical Value Tables

For quick reference during study:

### Chi-Square Critical Values (right-tail, α = 0.05)

| df | Critical Value |
|----|----------------|
| 1  | 3.841 |
| 2  | 5.991 |
| 3  | 7.815 |
| 4  | 9.488 |
| 5  | 11.070 |
| 10 | 18.307 |
| 15 | 24.996 |
| 20 | 31.410 |

### F Critical Values (α = 0.05, df1 = numerator, df2 = denominator)

| df1\df2 | 5 | 10 | 15 | 20 | 30 |
|---------|---|----|----|----|-----|
| 1 | 6.61 | 4.96 | 4.54 | 4.35 | 4.17 |
| 2 | 5.79 | 4.10 | 3.68 | 3.49 | 3.32 |
| 3 | 5.41 | 3.71 | 3.29 | 3.10 | 2.92 |
| 4 | 5.19 | 3.48 | 3.06 | 2.87 | 2.69 |
| 5 | 5.05 | 3.33 | 2.90 | 2.71 | 2.53 |

---

Good luck on your exam!
