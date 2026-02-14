#include "kernel.h"
#include <iostream>

extern "C" {

void process_model_params(double *raw_data, size_t count) {
  // In a real scenario, avoiding cout in hot path.
  // This is just for verification of the bridge.

  // Assuming raw_data is pointing to a block of ModelParams
  // We need to be careful: if OCaml passes a float array, it's just doubles.
  // If we want structured access, we cast.

  auto params = QuantKernel::get_model_params_span(
      reinterpret_cast<void *>(raw_data), count);

  if (!params.empty()) {
    const auto &p0 = params[0];
    // Accessing memory to verify
    // (volatile to prevent optimization if we were benchmarking)
    volatile double val = p0.alpha + p0.beta;
    (void)val;
  }
}
}
