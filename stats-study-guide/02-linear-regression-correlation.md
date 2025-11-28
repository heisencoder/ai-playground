# Linear Regression and Correlation

## Overview

Linear regression and correlation are fundamental statistical techniques for analyzing relationships between variables. While correlation measures the strength and direction of a linear relationship, regression allows us to predict values and model the relationship mathematically.

## Key Concepts and Definitions

### Correlation vs. Regression

| Aspect | Correlation | Regression |
|--------|-------------|------------|
| Purpose | Measure strength of relationship | Predict Y from X |
| Output | Correlation coefficient (r) | Equation: ŷ = a + bx |
| Symmetry | Symmetric (r of X,Y = r of Y,X) | Not symmetric |
| Causation | Does not imply causation | Does not imply causation |

### Types of Variables

- **Independent Variable (X)**: The predictor or explanatory variable
- **Dependent Variable (Y)**: The response or outcome variable
- **Lurking Variable**: An unmeasured variable that affects both X and Y

---

## The Regression Equation

### Simple Linear Regression Model

The population regression model:
$$Y = \beta_0 + \beta_1 X + \epsilon$$

The sample regression equation (best estimate):
$$\hat{y} = a + bx$$

Where:
- ŷ = predicted value of Y
- a = y-intercept (value of ŷ when x = 0)
- b = slope (change in ŷ for each unit change in x)
- x = value of the independent variable

### Calculating the Slope (b)

$$b = \frac{n\sum xy - (\sum x)(\sum y)}{n\sum x^2 - (\sum x)^2}$$

Or equivalently:
$$b = \frac{\sum(x - \bar{x})(y - \bar{y})}{\sum(x - \bar{x})^2} = \frac{S_{xy}}{S_{xx}}$$

### Calculating the Y-Intercept (a)

$$a = \bar{y} - b\bar{x}$$

Where:
- $\bar{x}$ = mean of X values
- $\bar{y}$ = mean of Y values

### Interpretation

- **Slope (b)**: For each one-unit increase in X, Y changes by b units (on average)
- **Intercept (a)**: The predicted value of Y when X = 0 (may not be meaningful in context)

### Coefficient of Determination (r²)

$$r^2 = \frac{SS_{regression}}{SS_{total}} = \frac{\sum(\hat{y}_i - \bar{y})^2}{\sum(y_i - \bar{y})^2}$$

**Interpretation**: r² represents the proportion of variance in Y that is explained by X.
- r² = 0.85 means 85% of the variation in Y is explained by the linear relationship with X

---

## The Correlation Coefficient

### Pearson Correlation Coefficient (r)

$$r = \frac{n\sum xy - (\sum x)(\sum y)}{\sqrt{[n\sum x^2 - (\sum x)^2][n\sum y^2 - (\sum y)^2]}}$$

Or equivalently:
$$r = \frac{\sum(x - \bar{x})(y - \bar{y})}{\sqrt{\sum(x - \bar{x})^2 \cdot \sum(y - \bar{y})^2}}$$

### Properties of r

1. **Range**: -1 ≤ r ≤ 1
2. **Sign indicates direction**:
   - Positive r: As X increases, Y tends to increase
   - Negative r: As X increases, Y tends to decrease
3. **Magnitude indicates strength**:
   - |r| near 1: Strong linear relationship
   - |r| near 0: Weak or no linear relationship
4. **Unitless**: r has no units
5. **Symmetric**: r(X,Y) = r(Y,X)

### Interpreting r Values

| |r| Value | Interpretation |
|-----------|----------------|
| 0.00 - 0.19 | Very weak |
| 0.20 - 0.39 | Weak |
| 0.40 - 0.59 | Moderate |
| 0.60 - 0.79 | Strong |
| 0.80 - 1.00 | Very strong |

### Relationship Between r and b

$$b = r \cdot \frac{s_y}{s_x}$$

Where $s_x$ and $s_y$ are the standard deviations of X and Y.

---

## Testing the Significance of the Correlation Coefficient

### Hypotheses

- **H₀**: ρ = 0 (no linear correlation in the population)
- **H₁**: ρ ≠ 0 (or ρ > 0 or ρ < 0 for one-tailed tests)

Where ρ (rho) is the population correlation coefficient.

### Test Statistic (t-test)

$$t = \frac{r\sqrt{n-2}}{\sqrt{1-r^2}}$$

**Degrees of freedom**: df = n - 2

### Critical Value Approach

1. Calculate t statistic
2. Find critical value from t-table with df = n - 2
3. Reject H₀ if |t| > t_critical (two-tailed)

### P-value Approach

1. Calculate t statistic
2. Find p-value from t-distribution
3. Reject H₀ if p-value < α

### Assumptions

1. **Linearity**: Relationship between X and Y is linear
2. **Normality**: For small samples, both X and Y should be approximately normal
3. **Random sampling**: Data comes from a random sample
4. **No outliers**: Outliers can severely affect r

---

## Prediction

### Making Predictions

Once you have the regression equation ŷ = a + bx:

1. Substitute the X value into the equation
2. Calculate ŷ

### Interpolation vs. Extrapolation

- **Interpolation**: Predicting within the range of observed X values (more reliable)
- **Extrapolation**: Predicting outside the range of observed X values (less reliable, use caution)

### Standard Error of the Estimate

$$s_e = \sqrt{\frac{\sum(y_i - \hat{y}_i)^2}{n-2}} = \sqrt{\frac{SS_{residual}}{n-2}}$$

This measures the typical distance between observed Y values and the regression line.

### Prediction Interval

For a predicted value at x = x₀:

$$\hat{y} \pm t_{\alpha/2} \cdot s_e \sqrt{1 + \frac{1}{n} + \frac{(x_0 - \bar{x})^2}{\sum(x_i - \bar{x})^2}}$$

Note: Prediction intervals are wider than confidence intervals for the mean.

### Confidence Interval for Mean Response

For the mean of Y at x = x₀:

$$\hat{y} \pm t_{\alpha/2} \cdot s_e \sqrt{\frac{1}{n} + \frac{(x_0 - \bar{x})^2}{\sum(x_i - \bar{x})^2}}$$

---

## Sample Problems

### Problem 1: Study Hours vs. Exam Score

**Problem Statement:**

A researcher wants to determine if there's a relationship between hours spent studying and exam scores. Data from 8 students:

| Student | Hours (X) | Score (Y) |
|---------|-----------|-----------|
| 1 | 2 | 65 |
| 2 | 3 | 70 |
| 3 | 4 | 72 |
| 4 | 5 | 78 |
| 5 | 5 | 75 |
| 6 | 6 | 82 |
| 7 | 7 | 85 |
| 8 | 8 | 90 |

a) Find the regression equation
b) Calculate the correlation coefficient
c) Test if the correlation is significant at α = 0.05
d) Predict the score for a student who studies 6.5 hours

**Solution:**

**First, calculate the necessary sums:**

| X | Y | XY | X² | Y² |
|---|---|----|----|-----|
| 2 | 65 | 130 | 4 | 4225 |
| 3 | 70 | 210 | 9 | 4900 |
| 4 | 72 | 288 | 16 | 5184 |
| 5 | 78 | 390 | 25 | 6084 |
| 5 | 75 | 375 | 25 | 5625 |
| 6 | 82 | 492 | 36 | 6724 |
| 7 | 85 | 595 | 49 | 7225 |
| 8 | 90 | 720 | 64 | 8100 |
| **ΣX=40** | **ΣY=617** | **ΣXY=3200** | **ΣX²=228** | **ΣY²=48067** |

n = 8, $\bar{x}$ = 40/8 = 5, $\bar{y}$ = 617/8 = 77.125

**a) Regression Equation:**

$$b = \frac{n\sum xy - (\sum x)(\sum y)}{n\sum x^2 - (\sum x)^2}$$
$$b = \frac{8(3200) - (40)(617)}{8(228) - (40)^2} = \frac{25600 - 24680}{1824 - 1600} = \frac{920}{224} = 4.107$$

$$a = \bar{y} - b\bar{x} = 77.125 - 4.107(5) = 77.125 - 20.535 = 56.59$$

**Regression equation: ŷ = 56.59 + 4.107x**

**b) Correlation Coefficient:**

$$r = \frac{n\sum xy - (\sum x)(\sum y)}{\sqrt{[n\sum x^2 - (\sum x)^2][n\sum y^2 - (\sum y)^2]}}$$

$$r = \frac{8(3200) - (40)(617)}{\sqrt{[8(228) - 1600][8(48067) - 380689]}}$$

$$r = \frac{920}{\sqrt{(224)(3847)}} = \frac{920}{\sqrt{861728}} = \frac{920}{928.29} = 0.991$$

**r = 0.991** (very strong positive correlation)

**c) Test of Significance:**

- H₀: ρ = 0
- H₁: ρ ≠ 0

$$t = \frac{r\sqrt{n-2}}{\sqrt{1-r^2}} = \frac{0.991\sqrt{6}}{\sqrt{1-0.982}} = \frac{0.991(2.449)}{\sqrt{0.018}} = \frac{2.427}{0.134} = 18.11$$

df = n - 2 = 6
Critical value at α = 0.05, two-tailed: t_critical = 2.447

Since |t| = 18.11 > 2.447, **reject H₀**.

**Conclusion:** The correlation is statistically significant at α = 0.05.

**d) Prediction for 6.5 hours:**

$$\hat{y} = 56.59 + 4.107(6.5) = 56.59 + 26.70 = 83.29$$

**Predicted score: 83.29 points**

---

### Problem 2: Temperature and Ice Cream Sales

**Problem Statement:**

An ice cream shop owner collected data on daily high temperature (°F) and ice cream sales ($):

| Day | Temp (X) | Sales (Y) |
|-----|----------|-----------|
| 1 | 65 | 120 |
| 2 | 70 | 145 |
| 3 | 75 | 160 |
| 4 | 80 | 185 |
| 5 | 85 | 210 |
| 6 | 90 | 240 |

a) Calculate r² and interpret it
b) Find the regression equation
c) How much do sales increase per degree of temperature?
d) Predict sales if the temperature is 78°F

**Solution:**

**Calculate necessary values:**

| X | Y | XY | X² | Y² |
|---|---|----|----|-----|
| 65 | 120 | 7800 | 4225 | 14400 |
| 70 | 145 | 10150 | 4900 | 21025 |
| 75 | 160 | 12000 | 5625 | 25600 |
| 80 | 185 | 14800 | 6400 | 34225 |
| 85 | 210 | 17850 | 7225 | 44100 |
| 90 | 240 | 21600 | 8100 | 57600 |
| **ΣX=465** | **ΣY=1060** | **ΣXY=84200** | **ΣX²=36475** | **ΣY²=196950** |

n = 6, $\bar{x}$ = 77.5, $\bar{y}$ = 176.67

**First, find r:**

$$r = \frac{6(84200) - (465)(1060)}{\sqrt{[6(36475) - 465^2][6(196950) - 1060^2]}}$$

$$r = \frac{505200 - 492900}{\sqrt{(218850 - 216225)(1181700 - 1123600)}}$$

$$r = \frac{12300}{\sqrt{(2625)(58100)}} = \frac{12300}{\sqrt{152512500}} = \frac{12300}{12349.6} = 0.996$$

**a) r² = (0.996)² = 0.992**

**Interpretation:** 99.2% of the variation in ice cream sales can be explained by the linear relationship with temperature.

**b) Regression Equation:**

$$b = \frac{6(84200) - (465)(1060)}{6(36475) - (465)^2} = \frac{12300}{2625} = 4.686$$

$$a = 176.67 - 4.686(77.5) = 176.67 - 363.17 = -186.50$$

**Regression equation: ŷ = -186.50 + 4.686x**

**c) Sales increase per degree:**

The slope b = 4.686 means **sales increase by approximately $4.69 for each degree increase in temperature**.

**d) Prediction for 78°F:**

$$\hat{y} = -186.50 + 4.686(78) = -186.50 + 365.51 = 179.01$$

**Predicted sales: $179.01**

---

## Common Mistakes to Avoid

1. **Confusing correlation with causation** - A high r doesn't mean X causes Y
2. **Extrapolating too far** - The linear relationship may not hold outside the data range
3. **Ignoring outliers** - A single outlier can drastically affect r and the regression line
4. **Forgetting to check linearity** - Always plot the data first
5. **Misinterpreting r²** - It's about explained variation, not the strength of relationship

---

## Key Takeaways

1. **r measures linear relationships only** - A low r doesn't mean no relationship
2. **r² is the proportion of variance explained** - Easier to interpret than r
3. **The regression line passes through (x̄, ȳ)** - Always true
4. **Prediction is more reliable within the data range** - Avoid extrapolation
5. **Always plot your data** - Visual inspection is crucial

---

[← Previous: Chi-Square](01-chi-square-distribution.md) | [Back to Main Guide](README.md) | [Next: F Distribution →](03-f-distribution-anova.md)
