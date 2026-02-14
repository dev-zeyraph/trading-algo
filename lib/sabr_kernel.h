#pragma once

#include "kernel.h"

extern "C" {
// Run Neural-SABR inference using ONNX Runtime
// Input: pointer to single ModelParams struct (validated by OCaml)
// Output: pointer to implied volatility surface buffer
void neural_sabr_inference(const ModelParams *params, double *out_surface,
                           size_t surface_size);
}
