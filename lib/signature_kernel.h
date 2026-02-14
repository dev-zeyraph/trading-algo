#pragma once

#include <cstddef>
#include <vector>

extern "C" {
/**
 * @brief Compute the Signature of a path up to level 3.
 *
 * @param path The input path as a flat array of (time, value) pairs.
 *             Length should be 2 * num_points.
 * @param num_points Number of points in the path.
 * @param output_signature Buffer to store the resulting signature.
 *                         Size should be adequate for level 3 signature of a 2D
 * path. (1 + 2 + 4 + 8 = 15 terms).
 */
void compute_signature_level3(const double *path, size_t num_points,
                              double *output_signature);
}
