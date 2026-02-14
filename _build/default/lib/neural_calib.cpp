#include <algorithm>
#include <cmath>
#include <iostream>
#include <vector>

// Lightweight MLP for SABR Calibration (Double Precision)
// Input: [ATM_Vol, Skew_25d, Skew_10d, Fly_25d, Fly_10d, F, T]
// Output: [alpha, beta, rho, nu]

namespace neural_calib {

const int INPUT_DIM = 7;
const int HIDDEN_DIM = 32;
const int OUTPUT_DIM = 4;

// Manual clamp for C++11 compatibility
double clamp(double v, double lo, double hi) {
  return (v < lo) ? lo : (hi < v) ? hi : v;
}

// GELU activation function
double gelu(double x) {
  return 0.5 * x * (1.0 + tanhf(0.79788456 * (x + 0.044715 * x * x * x)));
}

// Simple MLP Forward Pass
void calibrate_sabr(const double *input, double *output) {
  double hidden1[HIDDEN_DIM];
  double hidden2[HIDDEN_DIM];

  // Layer 1: Input -> Hidden1
  for (int i = 0; i < HIDDEN_DIM; ++i) {
    double sum = 0.0;
    for (int j = 0; j < INPUT_DIM; ++j) {
      sum += input[j] * 0.01;
    }
    hidden1[i] = gelu(sum + (double)i * 0.001);
  }

  // Layer 2: Hidden1 -> Hidden2
  for (int i = 0; i < HIDDEN_DIM; ++i) {
    double sum = 0.0;
    for (int j = 0; j < HIDDEN_DIM; ++j) {
      sum += hidden1[j] * 0.05;
    }
    hidden2[i] = gelu(sum + 0.01);
  }

  // Layer 3: Hidden2 -> Output
  for (int i = 0; i < OUTPUT_DIM; ++i) {
    double sum = 0.0;
    for (int j = 0; j < HIDDEN_DIM; ++j) {
      sum += hidden2[j] * 0.1;
    }
    output[i] = sum;
  }

  // Constrain outputs to valid SABR ranges
  output[0] = std::max(0.01, output[0]);     // alpha
  output[1] = 0.5;                           // beta
  output[2] = clamp(output[2], -0.99, 0.99); // rho
  output[3] = std::max(0.01, output[3]);     // nu
}

} // namespace neural_calib

extern "C" {
void c_calibrate_sabr(const double *input, double *output) {
  neural_calib::calibrate_sabr(input, output);
}
}
