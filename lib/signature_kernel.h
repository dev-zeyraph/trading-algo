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

/**
 * @brief Compute the Log-Signature via BCH (Baker-Campbell-Hausdorff)
 * inversion.
 *
 * Maps the group element S(X) back to the Lie algebra via:
 *   log(S) = S¹ - ½[S¹,S¹] + higher order BCH terms
 *
 * For a 2D path at level 3: output is 14 coefficients (levels 1-3, no
 * constant).
 *
 * @param signature Level-3 signature (15 doubles)
 * @param log_signature Output log-signature (14 doubles: 2 + 4 + 8)
 */
void compute_log_signature(const double *signature, double *log_signature);

/**
 * @brief Compute the Expected Signature over a sliding window.
 *
 * Φ(X)_{s,t} = E[Sig(X)] averaged over N overlapping sub-paths.
 * Filters high-frequency noise while preserving topological structure.
 *
 * @param path Full path as flat array of (time, value) pairs.
 * @param num_points Total number of points.
 * @param window_size Number of points per sub-path window.
 * @param expected_sig Output: averaged signature (15 doubles).
 */
void compute_expected_signature(const double *path, size_t num_points,
                                size_t window_size, double *expected_sig);

/**
 * @brief Compute curvature of the path signature manifold.
 *
 * Measures how rapidly the signature coefficients are changing,
 * indicating regime transitions or exhaustion.
 *
 * @param signatures Array of N consecutive signatures (N * 15 doubles).
 * @param num_sigs Number of signature snapshots.
 * @return Scalar curvature estimate.
 */
double compute_signature_curvature(const double *signatures, size_t num_sigs);

/**
 * @brief Compute the Frechet Mean (Riemannian Centroid) on Fisher Manifold.
 *
 * @param manifold_points Flattened array of (mu, sigma2) pairs.
 *                        Length should be 2 * num_points.
 * @param num_points Number of (mu, sigma2) pairs.
 * @param mu_centroid Output: The mu component of the Frechet mean.
 * @param sigma2_centroid Output: The sigma2 component of the Frechet mean.
 */
void compute_frechet_mean(const double *manifold_points, size_t num_points,
                          double *mu_centroid, double *sigma2_centroid);
}
