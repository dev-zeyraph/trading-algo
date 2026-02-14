cmake_minimum_required(VERSION 3.25)
project(QuantKernelCpp)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Optimization flags
if(APPLE)
    add_compile_options(-O3 -march=native -mcpu=apple-m2)
else()
    add_compile_options(-O3 -march=native)
endif()

# Main shared library for FFI
add_library(quant_kernel_cpp SHARED 
    kernel.cpp 
    sabr_kernel.cpp 
    signature_kernel.cpp 
    markov_kernel.cpp
    neural_calib.cpp
)

# Benchmark executable
add_executable(bench_spmv ../bench/bench_spmv.cpp markov_kernel.cpp signature_kernel.cpp)

if(APPLE)
    find_library(ACCELERATE_FRAMEWORK Accelerate)
    if(ACCELERATE_FRAMEWORK)
        target_link_libraries(quant_kernel_cpp PRIVATE ${ACCELERATE_FRAMEWORK})
        target_link_libraries(bench_spmv PRIVATE ${ACCELERATE_FRAMEWORK})
        add_compile_definitions(USE_ACCELERATE)
    endif()
endif()

# Placeholder for MKL/ONNX on other platforms
# if(USE_INTEL_MKL)
#     find_package(MKL REQUIRED)
#     target_link_libraries(quant_kernel_cpp PRIVATE MKL::MKL)
# endif()
