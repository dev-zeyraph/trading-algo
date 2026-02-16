# Sovereign Architect: Knowledge Check
**Objective**: Prove you understand the machine you built.

### 1. The Whiteboard Problem
Why do we need `CAMLparam` and `CAMLlocal` macros when passing a Bigarray from OCaml to C++? What specifically is the OCaml Garbage Collector trying to do that ruins our day?

### 2. The Signature Fingerprint
In a Level 3 Path Signature, what does the term corresponding to "Area" (Level 2) tell us about the relationship between Price and Volatility that a simple correlation coefficient might miss?

### 3. Log-Signature Compression
Why do we convert a Signature to a Log-Signature? If a Signature has 15 terms, why does the Log-Signature only have 14 (or fewer) "generators"? What is the geometric intuition of "removing redundancy"?

### 4. The Trampoline (Fisher Metric)
If the Fisher Metric ($g_{ij}$) is high, does that mean the market is "calm" or "stressed"? Explain in terms of "Cost of Movement" on the manifold.

### 5. Geodesic vs. Euclidean
Why is the "Straight Line" (Euclidean Distance) between two market states wrong? Why must we follow the curve (Geodesic)? Give an example where Euclidean distance says "Safe" but Geodesic says "Crash Imminent."

### 6. The Exhaustion Score
How is $\rho$ (Exhaustion Density) derived from the Fisher distance? Why do we clamp it at 1.0?

### 7. Time-Scale Invariance
Does the Path Signature care if the market moves in 1 second or 1 hour? Why is "reparameterization invariance" a killer feature for HFT?

### 8. The BCH Formula
What is the mathematical tool used to invert a Signature back into a Log-Signature? (Hint: It involves Lie Brackets). And why do we need valid Lie Algebra elements for the mean?

### 9. Frechet Mean
Why can't we just take the arithmetic average of a bunch of matrices? Why do we need an iterative Gradient Descent algorithm to find the "Average Market State"?

### 10. The Fail-Stop Switch
If `MathGuard` detects a `NaN` in the input array, why do we return `false` instead of trying to "fix" the data (e.g., replacing NaN with 0)? What is the philosophy behind this decision?

---
*If you cannot answer these without looking at the code, you are not the Sovereign Architect.*
