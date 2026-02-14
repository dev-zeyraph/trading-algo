#pragma once

#include <cstddef>

extern "C" {
/**
 * @brief Perform Sparse Matrix-Vector Multiplication (SpMV): y = A * x
 *        Uses Compressed Sparse Row (CSR) format.
 *
 * @param values Non-zero values of the matrix A.
 * @param col_indices Column indices for each non-zero value.
 * @param row_ptr Row pointers (start index of each row in values).
 * @param num_rows Number of rows in matrix A.
 * @param num_cols Number of columns in matrix A. (Not strictly needed for
 * logic, but good for validation)
 * @param x Input vector (size num_cols).
 * @param y Output vector (size num_rows).
 * @param num_nnz Total number of non-zero elements.
 */
void spmv_csr(const double *values, const int *col_indices, const int *row_ptr,
              int num_rows, int num_cols, const double *x, double *y,
              int num_nnz);
}
