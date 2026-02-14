#include "../src_cpp/markov_kernel.h"
#include "../src_cpp/tracer.h"
#include <chrono>
#include <iostream>
#include <vector>

extern "C" {
void compute_signature_level3(const double *path, size_t num_points,
                              double *output);
}

int main(int argc, char **argv) {
  bool trace = false;
  for (int i = 1; i < argc; ++i) {
    if (std::string(argv[i]) == "--trace")
      trace = true;
  }

  if (trace) {
    ::enable_tracing("benchmark_trace.json");
    std::cout << "Tracing enabled: benchmark_trace.json" << std::endl;
  }

  // Benchmark SpMV
  {
    QuantKernel::TraceScope scope("SpMV_Benchmark");
    int dim = 1000;
    std::vector<double> values(dim * 10, 0.5);
    std::vector<int> col_indices(dim * 10);
    std::vector<int> row_ptr(dim + 1);

    for (int i = 0; i < dim; ++i) {
      row_ptr[i] = i * 10;
      for (int j = 0; j < 10; ++j) {
        col_indices[i * 10 + j] = (i + j) % dim;
      }
    }
    row_ptr[dim] = dim * 10;

    std::vector<double> x(dim, 1.0);
    std::vector<double> y(dim, 0.0);

    std::cout << "Benchmarking SpMV with dim=" << dim << "..." << std::endl;

    auto start = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < 1000; ++i) {
      spmv_csr(values.data(), col_indices.data(), row_ptr.data(), dim, dim,
               x.data(), y.data(), (int)values.size());
    }
    auto end = std::chrono::high_resolution_clock::now();
    auto diff =
        std::chrono::duration_cast<std::chrono::microseconds>(end - start)
            .count();
    std::cout << "SpMV Time per iteration: " << diff / 1000.0 << " us"
              << std::endl;
  }

  // Benchmark Signature Kernel
  {
    QuantKernel::TraceScope scope("Signature_Level3_Benchmark");
    std::cout << "Benchmarking Signature Kernel with path_len=1000..."
              << std::endl;
    std::vector<double> path(2000, 0.1);
    std::vector<double> output(15, 0.0);

    auto start = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < 1000; ++i) {
      compute_signature_level3(path.data(), 1000, output.data());
    }
    auto end = std::chrono::high_resolution_clock::now();
    auto diff =
        std::chrono::duration_cast<std::chrono::microseconds>(end - start)
            .count();
    std::cout << "Signature Time per iteration: " << diff / 1000.0 << " us"
              << std::endl;
  }

  return 0;
}
