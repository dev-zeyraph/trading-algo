#include "markov_kernel.h"
#include <vector>

#ifdef __APPLE__
#include <Accelerate/Accelerate.h>
#endif

extern "C" {

void spmv_csr(const double *values, const int *col_indices, const int *row_ptr,
              int num_rows, int num_cols, const double *x, double *y,
              int num_nnz) {
  (void)num_nnz;

#if defined(__APPLE__) && defined(USE_ACCELERATE)
  // Using Transparent Sparse API from Sparse/Solve.h
  // Accelerate expects columnStarts as long* and rowIndices as int*

  std::vector<long> row_ptr_l(num_rows + 1);
  for (int i = 0; i <= num_rows; ++i)
    row_ptr_l[i] = (long)row_ptr[i];

  SparseAttributes_t attribs = {0};
  attribs.transpose = true;
  attribs.kind = SparseOrdinary;

  SparseMatrixStructure structure;
  structure.rowCount = num_cols;
  structure.columnCount = num_rows;
  structure.columnStarts = row_ptr_l.data();
  structure.rowIndices = (int *)col_indices;
  structure.attributes = attribs;
  structure.blockSize = 1;

  SparseMatrix_Double A = {.structure = structure, .data = (double *)values};

  DenseVector_Double vx = {.count = num_cols, .data = (double *)x};
  DenseVector_Double vy = {.count = num_rows, .data = y};

  SparseMultiply(A, vx, vy);
  return;
#endif

  // Fallback: Scalar implementation
  for (int i = 0; i < num_rows; ++i) {
    double sum = 0.0;
    int row_start = row_ptr[i];
    int row_end = row_ptr[i + 1];
    for (int j = row_start; j < row_end; ++j) {
      sum += values[j] * x[col_indices[j]];
    }
    y[i] = sum;
  }
}
}
