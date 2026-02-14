#pragma once

#include <span>
#include <cstdint>
#include <vector>

extern "C" {

    // 64-byte alignment to match cache lines and avoid false sharing
    struct alignas(64) ModelParams {
        double alpha;
        double beta;
        double rho;
        double nu;
        // Padding to ensure size is a multiple of 64 if needed, 
        // but alignas(64) handles the base alignment.
        // We might want to add more fields or padding explicitly if we interpret this as an array of structs.
        double padding[4]; 
    };

    // Exported function to process parameters relative to the "Memory Bridge"
    // In reality, OCaml will allocate a Bigarray of doubles (or struct representation) 
    // and pass the pointer here.
    void process_model_params(double* raw_data, size_t count);
}

// C++ internal API
namespace QuantKernel {
    using ParamSpan = std::span<const double>;

    // Zero-copy wrapper around logical ModelParams
    // This assumes specific memory layout if we are just passing doubles.
    // If we pass structs, we cast the pointer.
    inline std::span<ModelParams> get_model_params_span(void* raw_data, size_t count) {
        return std::span<ModelParams>(static_cast<ModelParams*>(raw_data), count);
    }
}
