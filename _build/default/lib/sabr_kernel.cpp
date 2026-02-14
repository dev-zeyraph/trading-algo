#include "sabr_kernel.h"
#include <cmath>
#include <iostream>

// Define a macro to conditionally include ORT or stub it
#ifdef USE_ONNX_RUNTIME
#include <onnxruntime_cxx_api.h>
#endif

extern "C" {

// Helper for analytic SABR vol (Hagan et al. 2002)
static double hagan_implied_vol(double F, double K, double T, double alpha,
                                double beta, double rho, double nu) {
  if (F <= 0 || K <= 0)
    return 0.0;

  double F0K0 = std::pow(F * K, (1.0 - beta) / 2.0);
  double logFK = std::log(F / K);
  double z = (nu / alpha) * std::pow(F * K, (1.0 - beta) / 2.0) * logFK;

  double x_z = std::log((std::sqrt(1.0 - 2.0 * rho * z + z * z) + z - rho) /
                        (1.0 - rho));

  double term1 =
      alpha /
      (F0K0 * (1.0 + (std::pow(1.0 - beta, 2) / 24.0) * logFK * logFK +
               (std::pow(1.0 - beta, 4) / 1920.0) * std::pow(logFK, 4)));

  double z_over_xz = (std::abs(z) < 1e-6) ? 1.0 : (z / x_z);

  double term2 = 1.0 + (std::pow(1.0 - beta, 2) / 24.0 * alpha * alpha /
                            std::pow(F * K, 1.0 - beta) +
                        0.25 * rho * beta * nu * alpha / F0K0 +
                        (2.0 - 3.0 * rho * rho) / 24.0 * nu * nu) *
                           T;

  return term1 * z_over_xz * term2;
}

void neural_sabr_inference(const ModelParams *params, double *out_surface,
                           size_t surface_size) {
#ifdef USE_ONNX_RUNTIME
  // ... (existing ORT stub)
#else
  double F = 100.0; // Reference forward price
  double alpha = params->alpha;
  double beta = params->beta;
  double rho = params->rho;
  double nu = params->nu;
  double T = 1.0; // 1 year tenor

  for (size_t i = 0; i < surface_size; ++i) {
    double strike = 80.0 + (double)i * 0.4; // Sample strikes from 80 to 120
    out_surface[i] = hagan_implied_vol(F, strike, T, alpha, beta, rho, nu);
  }
#endif
}
}
