# The Chi-Square Distribution

## Overview

The chi-square (χ²) distribution is a continuous probability distribution that arises in statistics, particularly in hypothesis testing and confidence interval estimation. It is widely used for testing categorical data and assessing goodness-of-fit.

## Key Concepts and Definitions

### What is the Chi-Square Distribution?

The chi-square distribution is the distribution of the sum of squared standard normal random variables. If Z₁, Z₂, ..., Zₖ are independent standard normal random variables, then:

$$\chi^2 = Z_1^2 + Z_2^2 + ... + Z_k^2$$

follows a chi-square distribution with k degrees of freedom.

### Properties of the Chi-Square Distribution

1. **Always non-negative**: χ² values are always ≥ 0
2. **Skewed right**: The distribution is positively skewed, especially for small degrees of freedom
3. **Approaches normal**: As df increases, the distribution approaches a normal distribution
4. **Mean = df**: The expected value equals the degrees of freedom
5. **Variance = 2·df**: The variance is twice the degrees of freedom

### Degrees of Freedom

The degrees of freedom (df) depend on the specific test:
- **Goodness-of-fit test**: df = (number of categories) - 1 - (number of estimated parameters)
- **Test of independence**: df = (rows - 1)(columns - 1)
- **Matched pairs**: df = n - 1

---

## Matched or Paired Samples

### Definition

Matched or paired samples occur when observations are naturally paired or matched. Common examples include:
- Before and after measurements on the same subjects
- Twins or matched subjects in experiments
- Left vs. right measurements on the same individual

### McNemar's Test

For paired categorical data (2×2 tables), McNemar's test is used to test for marginal homogeneity.

**Test Statistic:**
$$\chi^2 = \frac{(b - c)^2}{b + c}$$

Where b and c are the off-diagonal frequencies in a 2×2 contingency table.

**Degrees of freedom:** df = 1

### When to Use

- Comparing two related proportions
- Before-after studies with dichotomous outcomes
- Matched case-control studies

---

## Goodness-of-Fit Test

### Purpose

The goodness-of-fit test determines whether observed sample frequencies differ significantly from expected frequencies based on a hypothesized distribution.

### Hypotheses

- **H₀**: The observed frequencies follow the expected distribution
- **H₁**: The observed frequencies do not follow the expected distribution

### Test Statistic

$$\chi^2 = \sum_{i=1}^{k} \frac{(O_i - E_i)^2}{E_i}$$

Where:
- Oᵢ = Observed frequency in category i
- Eᵢ = Expected frequency in category i
- k = Number of categories

### Degrees of Freedom

$$df = k - 1 - m$$

Where:
- k = Number of categories
- m = Number of parameters estimated from the data

### Assumptions

1. Data are from a random sample
2. Expected frequency in each cell ≥ 5 (or use exact tests)
3. Observations are independent
4. Variable is categorical

### Decision Rule

- If χ² > χ²critical, reject H₀
- Or use p-value: if p < α, reject H₀

---

## Test of Independence

### Purpose

The test of independence determines whether two categorical variables are related or independent in a population.

### Hypotheses

- **H₀**: The two variables are independent
- **H₁**: The two variables are not independent (they are related)

### Contingency Tables

Data is organized in an r × c contingency table:
- r = number of rows (categories of variable 1)
- c = number of columns (categories of variable 2)

### Expected Frequencies

For each cell:
$$E_{ij} = \frac{(\text{Row}_i \text{ Total}) \times (\text{Column}_j \text{ Total})}{\text{Grand Total}}$$

### Test Statistic

$$\chi^2 = \sum_{i=1}^{r} \sum_{j=1}^{c} \frac{(O_{ij} - E_{ij})^2}{E_{ij}}$$

### Degrees of Freedom

$$df = (r - 1)(c - 1)$$

### Assumptions

1. Random sampling
2. Independence of observations
3. Expected frequency ≥ 5 for at least 80% of cells
4. No expected frequency < 1

---

## Sample Problems

### Problem 1: Coin Flip Randomness Analysis

**Problem Statement:**

You want to test whether a sequence of 256 coin flips is truly random. One way to test randomness is to analyze the distribution of "runs" - consecutive sequences of the same outcome (heads or tails).

For a random sequence:
- The expected number of runs of length 1 is: n/4 (where n is total flips)
- The expected number of runs of length 2 is: n/8
- The expected number of runs of length k is: n/2^(k+1)

Given a sequence of 256 coin flips, you observe the following run lengths:

| Run Length | Observed | Expected |
|------------|----------|----------|
| 1 | 72 | 64 |
| 2 | 28 | 32 |
| 3 | 18 | 16 |
| 4 | 6 | 8 |
| 5+ | 4 | 8 |

Test at α = 0.05 whether this sequence appears to be random.

**Solution:**

**Step 1: State the hypotheses**
- H₀: The coin flip sequence is random (observed frequencies match expected)
- H₁: The coin flip sequence is not random

**Step 2: Calculate the test statistic**

$$\chi^2 = \frac{(72-64)^2}{64} + \frac{(28-32)^2}{32} + \frac{(18-16)^2}{16} + \frac{(6-8)^2}{8} + \frac{(4-8)^2}{8}$$

$$\chi^2 = \frac{64}{64} + \frac{16}{32} + \frac{4}{16} + \frac{4}{8} + \frac{16}{8}$$

$$\chi^2 = 1.0 + 0.5 + 0.25 + 0.5 + 2.0 = 4.25$$

**Step 3: Determine degrees of freedom**
$$df = 5 - 1 = 4$$

**Step 4: Find critical value**
At α = 0.05 with df = 4: χ²critical = 9.488

**Step 5: Make decision**
Since χ² = 4.25 < 9.488, we fail to reject H₀.

**Conclusion:** There is not sufficient evidence to conclude that the coin flip sequence is non-random at the 0.05 significance level.

---

### Problem 2: Test of Independence - Study Habits and Grades

**Problem Statement:**

A professor wants to determine if there is a relationship between study habits (Poor, Average, Good) and final exam grades (Fail, Pass, Excellent). A random sample of 200 students yields:

|              | Fail | Pass | Excellent | Total |
|--------------|------|------|-----------|-------|
| Poor Study   | 25   | 15   | 5         | 45    |
| Average Study| 20   | 50   | 15        | 85    |
| Good Study   | 5    | 25   | 40        | 70    |
| **Total**    | 50   | 90   | 60        | 200   |

Test at α = 0.01 whether study habits and grades are independent.

**Solution:**

**Step 1: State the hypotheses**
- H₀: Study habits and grades are independent
- H₁: Study habits and grades are related

**Step 2: Calculate expected frequencies**

E = (Row Total × Column Total) / Grand Total

| | Fail | Pass | Excellent |
|--------------|------|------|-----------|
| Poor Study | (45×50)/200 = 11.25 | (45×90)/200 = 20.25 | (45×60)/200 = 13.50 |
| Average Study| (85×50)/200 = 21.25 | (85×90)/200 = 38.25 | (85×60)/200 = 25.50 |
| Good Study | (70×50)/200 = 17.50 | (70×90)/200 = 31.50 | (70×60)/200 = 21.00 |

**Step 3: Calculate the test statistic**

$$\chi^2 = \frac{(25-11.25)^2}{11.25} + \frac{(15-20.25)^2}{20.25} + \frac{(5-13.50)^2}{13.50}$$
$$+ \frac{(20-21.25)^2}{21.25} + \frac{(50-38.25)^2}{38.25} + \frac{(15-25.50)^2}{25.50}$$
$$+ \frac{(5-17.50)^2}{17.50} + \frac{(25-31.50)^2}{31.50} + \frac{(40-21.00)^2}{21.00}$$

$$\chi^2 = 16.81 + 1.36 + 5.35 + 0.07 + 3.61 + 4.32 + 8.93 + 1.34 + 17.19$$

$$\chi^2 = 58.98$$

**Step 4: Determine degrees of freedom**
$$df = (3-1)(3-1) = 4$$

**Step 5: Find critical value**
At α = 0.01 with df = 4: χ²critical = 13.277

**Step 6: Make decision**
Since χ² = 58.98 > 13.277, we reject H₀.

**Conclusion:** There is sufficient evidence at the 0.01 significance level to conclude that study habits and grades are related. Better study habits appear to be associated with better grades.

---

## Practice Exercise: Analyze Your Own Coin Flips

To truly understand randomness, try this experiment:

1. Run the script `scripts/generate_coin_flips.py` to create a truly random sequence
2. Then, try to generate your own "random" sequence by mentally flipping a coin 256 times
3. Enter your sequence in `data/user_coin_flips.txt` (H for heads, T for tails)
4. Run `scripts/analyze_coin_flips.py` to compare both sequences

You'll likely find that humans are poor at generating random sequences - we tend to:
- Avoid long runs (switching too often)
- Create patterns unconsciously
- Balance heads and tails too evenly

This exercise demonstrates the practical application of the chi-square goodness-of-fit test!

---

## Key Takeaways

1. **Chi-square tests are for categorical data** - Don't use them for continuous data
2. **Check assumptions** - Especially the expected frequency requirement
3. **Larger χ² = stronger evidence against H₀** - The test is always one-tailed (right-tailed)
4. **Degrees of freedom matter** - They change the critical value significantly
5. **Goodness-of-fit vs. Independence** - Know which test to use for each situation

---

[← Back to Main Guide](README.md) | [Next: Linear Regression →](02-linear-regression-correlation.md)
