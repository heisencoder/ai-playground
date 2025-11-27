# F Distribution and One-Way ANOVA

## Overview

The F distribution and One-Way Analysis of Variance (ANOVA) are powerful tools for comparing means across multiple groups. While t-tests compare two groups, ANOVA extends this to three or more groups, helping us determine if at least one group differs significantly from the others.

## Key Concepts and Definitions

### The F Distribution

The F distribution is a continuous probability distribution that arises as the ratio of two chi-square distributions divided by their respective degrees of freedom.

$$F = \frac{\chi^2_1 / df_1}{\chi^2_2 / df_2}$$

### Properties of the F Distribution

1. **Always non-negative**: F values are always ≥ 0
2. **Right-skewed**: The distribution is positively skewed
3. **Two degrees of freedom**: df₁ (numerator) and df₂ (denominator)
4. **Mean**: For df₂ > 2, mean = df₂/(df₂ - 2)
5. **Approaches 1**: As sample sizes increase, F approaches 1 when null hypothesis is true

### Applications of the F Distribution

- One-Way ANOVA
- Two-Way ANOVA
- Comparing variances (F-test)
- Regression analysis (testing overall significance)
- Multiple comparison procedures

---

## One-Way ANOVA

### Purpose

One-Way ANOVA tests whether the means of three or more independent groups are equal. It's called "one-way" because we're examining one factor (independent variable) with multiple levels (groups).

### Why Not Multiple t-tests?

If you have k groups, you'd need k(k-1)/2 pairwise t-tests. This leads to:
- **Type I error inflation**: With 5 groups at α = 0.05, the probability of at least one false positive is 1 - (0.95)¹⁰ = 0.40 (40%!)
- ANOVA controls the overall Type I error rate at α

### Hypotheses

- **H₀**: μ₁ = μ₂ = μ₃ = ... = μₖ (all population means are equal)
- **H₁**: At least one population mean is different

**Note**: ANOVA doesn't tell you which means differ, only that at least one is different.

### Assumptions

1. **Independence**: Observations are independent within and between groups
2. **Normality**: Each group comes from a normally distributed population
3. **Homogeneity of Variance**: All groups have equal population variances (homoscedasticity)

### Partitioning Variation

Total variation is split into two components:

$$SS_{Total} = SS_{Between} + SS_{Within}$$

Where:
- **SS_Total**: Total sum of squares (total variation in the data)
- **SS_Between**: Between-group sum of squares (variation due to group differences)
- **SS_Within**: Within-group sum of squares (variation within groups, i.e., error)

### Calculating Sums of Squares

**Total Sum of Squares:**
$$SS_{Total} = \sum_{i=1}^{k} \sum_{j=1}^{n_i} (x_{ij} - \bar{x}_{grand})^2$$

**Between-Group Sum of Squares:**
$$SS_{Between} = \sum_{i=1}^{k} n_i (\bar{x}_i - \bar{x}_{grand})^2$$

**Within-Group Sum of Squares:**
$$SS_{Within} = \sum_{i=1}^{k} \sum_{j=1}^{n_i} (x_{ij} - \bar{x}_i)^2$$

Or simply: $SS_{Within} = SS_{Total} - SS_{Between}$

### Degrees of Freedom

- **df_Between** = k - 1 (where k = number of groups)
- **df_Within** = N - k (where N = total sample size)
- **df_Total** = N - 1

### Mean Squares

$$MS_{Between} = \frac{SS_{Between}}{df_{Between}}$$

$$MS_{Within} = \frac{SS_{Within}}{df_{Within}}$$

### The F-Statistic

$$F = \frac{MS_{Between}}{MS_{Within}}$$

**Interpretation:**
- F ≈ 1: No evidence against H₀ (between-group variation ≈ within-group variation)
- F > 1: Some evidence against H₀ (between-group variation > within-group variation)
- F >> 1: Strong evidence against H₀

### ANOVA Table

| Source | SS | df | MS | F |
|--------|----|----|-----|-----|
| Between | SS_B | k-1 | SS_B/(k-1) | MS_B/MS_W |
| Within | SS_W | N-k | SS_W/(N-k) | |
| Total | SS_T | N-1 | | |

### Decision Rule

- If F > F_critical, reject H₀
- Or if p-value < α, reject H₀

---

## Post-Hoc Tests

### When to Use

If ANOVA rejects H₀, post-hoc tests determine which specific groups differ.

### Common Post-Hoc Tests

1. **Tukey's HSD (Honestly Significant Difference)**
   - Most commonly used
   - Controls family-wise error rate
   - Best when comparing all pairs of means

2. **Bonferroni Correction**
   - Conservative approach
   - Divides α by number of comparisons
   - Simple but can be overly strict

3. **Scheffé Test**
   - Most conservative
   - Good for complex comparisons
   - Controls Type I error well

4. **Fisher's LSD (Least Significant Difference)**
   - Least conservative
   - Only use after significant ANOVA

### Tukey's HSD Formula

$$HSD = q_{\alpha,k,df_W} \sqrt{\frac{MS_W}{n}}$$

Where:
- q = studentized range statistic
- k = number of groups
- df_W = within-group degrees of freedom
- n = sample size per group (for equal n)

Two means are significantly different if: $|\bar{x}_i - \bar{x}_j| > HSD$

---

## Effect Size

### Eta-Squared (η²)

$$\eta^2 = \frac{SS_{Between}}{SS_{Total}}$$

**Interpretation:** Proportion of total variance explained by group membership

| η² Value | Interpretation |
|----------|----------------|
| 0.01 | Small effect |
| 0.06 | Medium effect |
| 0.14 | Large effect |

### Omega-Squared (ω²)

A less biased estimate of effect size:

$$\omega^2 = \frac{SS_{Between} - (k-1)MS_{Within}}{SS_{Total} + MS_{Within}}$$

---

## Sample Problems

### Problem 1: Comparing Teaching Methods

**Problem Statement:**

A researcher wants to compare the effectiveness of three teaching methods on student test scores. Students were randomly assigned to one of three groups:
- Method A (Traditional lecture)
- Method B (Group discussion)
- Method C (Hands-on activities)

Test scores after the course:

| Method A | Method B | Method C |
|----------|----------|----------|
| 72 | 78 | 85 |
| 75 | 82 | 88 |
| 68 | 79 | 90 |
| 71 | 85 | 87 |
| 74 | 76 | 92 |

Test at α = 0.05 whether there is a significant difference among the teaching methods.

**Solution:**

**Step 1: State the hypotheses**
- H₀: μ_A = μ_B = μ_C (all methods produce equal mean scores)
- H₁: At least one method produces a different mean score

**Step 2: Calculate group statistics**

| Group | n | Sum | Mean (x̄) |
|-------|---|-----|----------|
| A | 5 | 360 | 72.0 |
| B | 5 | 400 | 80.0 |
| C | 5 | 442 | 88.4 |
| Total | 15 | 1202 | 80.13 |

Grand mean: $\bar{x}_{grand}$ = 1202/15 = 80.13

**Step 3: Calculate Sums of Squares**

**SS_Between:**
$$SS_B = 5(72-80.13)^2 + 5(80-80.13)^2 + 5(88.4-80.13)^2$$
$$SS_B = 5(66.10) + 5(0.02) + 5(68.39)$$
$$SS_B = 330.5 + 0.1 + 342.0 = 672.6$$

**SS_Within (calculate for each group):**

Group A: $(72-72)^2 + (75-72)^2 + (68-72)^2 + (71-72)^2 + (74-72)^2$
$= 0 + 9 + 16 + 1 + 4 = 30$

Group B: $(78-80)^2 + (82-80)^2 + (79-80)^2 + (85-80)^2 + (76-80)^2$
$= 4 + 4 + 1 + 25 + 16 = 50$

Group C: $(85-88.4)^2 + (88-88.4)^2 + (90-88.4)^2 + (87-88.4)^2 + (92-88.4)^2$
$= 11.56 + 0.16 + 2.56 + 1.96 + 12.96 = 29.2$

$$SS_W = 30 + 50 + 29.2 = 109.2$$

**SS_Total:**
$$SS_T = SS_B + SS_W = 672.6 + 109.2 = 781.8$$

**Step 4: Calculate degrees of freedom**
- df_B = k - 1 = 3 - 1 = 2
- df_W = N - k = 15 - 3 = 12
- df_T = N - 1 = 15 - 1 = 14

**Step 5: Calculate Mean Squares**
$$MS_B = \frac{672.6}{2} = 336.3$$
$$MS_W = \frac{109.2}{12} = 9.1$$

**Step 6: Calculate F-statistic**
$$F = \frac{336.3}{9.1} = 36.96$$

**Step 7: ANOVA Table**

| Source | SS | df | MS | F |
|--------|-------|----|----|------|
| Between | 672.6 | 2 | 336.3 | 36.96 |
| Within | 109.2 | 12 | 9.1 | |
| Total | 781.8 | 14 | | |

**Step 8: Make decision**

Critical value: F_0.05(2, 12) = 3.89

Since F = 36.96 > 3.89, **reject H₀**.

**Step 9: Calculate effect size**
$$\eta^2 = \frac{672.6}{781.8} = 0.86$$

**Conclusion:** There is a statistically significant difference among the three teaching methods (F(2,12) = 36.96, p < 0.05). The effect size (η² = 0.86) indicates that 86% of the variance in test scores is explained by teaching method—a very large effect.

Post-hoc tests would be needed to determine which specific methods differ from each other.

---

### Problem 2: Fertilizer Effectiveness

**Problem Statement:**

An agricultural researcher tests four types of fertilizer on plant growth. Each fertilizer is applied to 6 plots, and plant height (cm) is measured after 4 weeks:

| Fertilizer 1 | Fertilizer 2 | Fertilizer 3 | Fertilizer 4 |
|--------------|--------------|--------------|--------------|
| 20 | 25 | 28 | 22 |
| 22 | 27 | 30 | 24 |
| 19 | 24 | 27 | 21 |
| 21 | 26 | 29 | 23 |
| 23 | 28 | 31 | 25 |
| 21 | 26 | 29 | 23 |

a) Perform a One-Way ANOVA at α = 0.01
b) Calculate η² and interpret the effect size
c) If significant, which fertilizers might differ?

**Solution:**

**Step 1: Calculate group statistics**

| Group | n | Sum | Mean | Variance |
|-------|---|-----|------|----------|
| Fert 1 | 6 | 126 | 21.0 | 2.0 |
| Fert 2 | 6 | 156 | 26.0 | 2.0 |
| Fert 3 | 6 | 174 | 29.0 | 2.0 |
| Fert 4 | 6 | 138 | 23.0 | 2.0 |
| Total | 24 | 594 | 24.75 | |

Grand mean = 594/24 = 24.75

**Step 2: Calculate Sums of Squares**

**SS_Between:**
$$SS_B = 6(21-24.75)^2 + 6(26-24.75)^2 + 6(29-24.75)^2 + 6(23-24.75)^2$$
$$SS_B = 6(14.06) + 6(1.56) + 6(18.06) + 6(3.06)$$
$$SS_B = 84.38 + 9.38 + 108.38 + 18.38 = 220.5$$

**SS_Within:**
Each group has variance = 2.0, so SS for each group = (n-1) × variance = 5 × 2 = 10
$$SS_W = 10 + 10 + 10 + 10 = 40$$

**SS_Total:**
$$SS_T = 220.5 + 40 = 260.5$$

**Step 3: Degrees of freedom**
- df_B = 4 - 1 = 3
- df_W = 24 - 4 = 20
- df_T = 24 - 1 = 23

**Step 4: Mean Squares**
$$MS_B = \frac{220.5}{3} = 73.5$$
$$MS_W = \frac{40}{20} = 2.0$$

**Step 5: F-statistic**
$$F = \frac{73.5}{2.0} = 36.75$$

**Step 6: ANOVA Table**

| Source | SS | df | MS | F |
|--------|-------|----|----|------|
| Between | 220.5 | 3 | 73.5 | 36.75 |
| Within | 40.0 | 20 | 2.0 | |
| Total | 260.5 | 23 | | |

**Step 7: Decision**

Critical value: F_0.01(3, 20) = 4.94

Since F = 36.75 > 4.94, **reject H₀**.

**a) Conclusion:** There is a statistically significant difference among the four fertilizers (F(3, 20) = 36.75, p < 0.01).

**b) Effect Size:**
$$\eta^2 = \frac{220.5}{260.5} = 0.847$$

**Interpretation:** 84.7% of the variance in plant height is explained by fertilizer type—a very large effect.

**c) Comparing Fertilizers:**

Looking at the means:
- Fertilizer 1: 21.0 cm
- Fertilizer 2: 26.0 cm
- Fertilizer 3: 29.0 cm (highest)
- Fertilizer 4: 23.0 cm

Fertilizer 3 appears most effective, while Fertilizer 1 appears least effective. A post-hoc test (like Tukey's HSD) would confirm which pairs are significantly different.

Using Tukey's HSD (with q_0.01(4,20) ≈ 4.70):
$$HSD = 4.70 \sqrt{\frac{2.0}{6}} = 4.70(0.577) = 2.71$$

Comparing differences:
- |F1 - F2| = 5.0 > 2.71 ✓ Significant
- |F1 - F3| = 8.0 > 2.71 ✓ Significant
- |F1 - F4| = 2.0 < 2.71 ✗ Not significant
- |F2 - F3| = 3.0 > 2.71 ✓ Significant
- |F2 - F4| = 3.0 > 2.71 ✓ Significant
- |F3 - F4| = 6.0 > 2.71 ✓ Significant

**Conclusion:** All pairs are significantly different except Fertilizer 1 and Fertilizer 4.

---

## Checking ANOVA Assumptions

### 1. Testing for Normality
- **Shapiro-Wilk test** for each group
- **Q-Q plots** visual inspection
- ANOVA is robust to mild violations with equal sample sizes

### 2. Testing for Homogeneity of Variance
- **Levene's Test**: More robust to non-normality
- **Bartlett's Test**: More powerful but sensitive to non-normality
- Rule of thumb: Largest variance / Smallest variance < 4

### 3. When Assumptions Are Violated
- **Non-normality**: Use Kruskal-Wallis test (non-parametric alternative)
- **Unequal variances**: Use Welch's ANOVA

---

## Key Takeaways

1. **ANOVA compares means by analyzing variances** - Don't let the name confuse you
2. **Significant F means at least one group differs** - Not which ones
3. **Post-hoc tests are needed** to identify specific differences
4. **Effect size (η²) is important** - Statistical significance ≠ practical significance
5. **Check assumptions** - Especially with unequal sample sizes
6. **Use Bonferroni or Tukey for multiple comparisons** - Control Type I error

---

[← Previous: Linear Regression](02-linear-regression-correlation.md) | [Back to Main Guide](README.md)
