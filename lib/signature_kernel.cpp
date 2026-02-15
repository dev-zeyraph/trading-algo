#include "signature_kernel.h"
#include <algorithm>
#include <cmath>
#include <cstring>
#include <vector>

#ifdef __ARM_NEON
#include <arm_neon.h>
#endif

extern "C" {

// =============================================================================
// Level-3 Path Signature (existing, NEON-accelerated)
// =============================================================================
void compute_signature_level3(const double *path, size_t num_points,
                              double *output) {
  if (num_points < 2)
    return;

  // Initialize signature S_0 = 1, others 0
  output[0] = 1.0;
  for (size_t k = 1; k < 15; ++k)
    output[k] = 0.0;

  const double inv2 = 0.5;
  const double inv6 = 1.0 / 6.0;

  for (size_t i = 1; i < num_points; ++i) {
    double dx0 = path[2 * i] - path[2 * (i - 1)];         // dt
    double dx1 = path[2 * i + 1] - path[2 * (i - 1) + 1]; // dW

    double prev[15];
    for (int j = 0; j < 15; ++j)
      prev[j] = output[j];

#ifdef __ARM_NEON
    float64x2_t v_dx = {dx0, dx1};
    float64x2_t v_s_seg_l1 = v_dx;

    float64x2_t v_s_seg_l2_0x = vmulq_f64(vmovq_n_f64(dx0 * inv2), v_dx);
    float64x2_t v_s_seg_l2_1x = vmulq_f64(vmovq_n_f64(dx1 * inv2), v_dx);

    float64x2_t v_prev_l1 = vld1q_f64(&prev[1]);
    vst1q_f64(&output[1], vaddq_f64(v_prev_l1, v_s_seg_l1));

    float64x2_t v_prev_l2_0x = vld1q_f64(&prev[3]);
    float64x2_t v_l2_upd_0x =
        vaddq_f64(v_prev_l2_0x, vaddq_f64(vmulq_f64(vmovq_n_f64(prev[1]), v_dx),
                                          v_s_seg_l2_0x));
    vst1q_f64(&output[3], v_l2_upd_0x);

    float64x2_t v_prev_l2_1x = vld1q_f64(&prev[5]);
    float64x2_t v_l2_upd_1x =
        vaddq_f64(v_prev_l2_1x, vaddq_f64(vmulq_f64(vmovq_n_f64(prev[2]), v_dx),
                                          v_s_seg_l2_1x));
    vst1q_f64(&output[5], v_l2_upd_1x);

    float64x2_t v_s_seg_l3_00x = vmulq_f64(vmovq_n_f64(dx0 * dx0 * inv6), v_dx);
    float64x2_t v_s_seg_l3_01x = vmulq_f64(vmovq_n_f64(dx0 * dx1 * inv6), v_dx);
    float64x2_t v_s_seg_l3_10x = vmulq_f64(vmovq_n_f64(dx1 * dx0 * inv6), v_dx);
    float64x2_t v_s_seg_l3_11x = vmulq_f64(vmovq_n_f64(dx1 * dx1 * inv6), v_dx);

    float64x2_t v_p_00_ijk = vld1q_f64(&prev[7]);
    float64x2_t v_p_01_ijk = vld1q_f64(&prev[9]);
    float64x2_t v_p_10_ijk = vld1q_f64(&prev[11]);
    float64x2_t v_p_11_ijk = vld1q_f64(&prev[13]);

    vst1q_f64(&output[7],
              vaddq_f64(v_p_00_ijk,
                        vaddq_f64(vmulq_f64(vmovq_n_f64(prev[3]), v_dx),
                                  vaddq_f64(vmulq_f64(vmovq_n_f64(prev[1]),
                                                      v_s_seg_l2_0x),
                                            v_s_seg_l3_00x))));
    vst1q_f64(&output[9],
              vaddq_f64(v_p_01_ijk,
                        vaddq_f64(vmulq_f64(vmovq_n_f64(prev[4]), v_dx),
                                  vaddq_f64(vmulq_f64(vmovq_n_f64(prev[1]),
                                                      v_s_seg_l2_1x),
                                            v_s_seg_l3_01x))));
    vst1q_f64(&output[11],
              vaddq_f64(v_p_10_ijk,
                        vaddq_f64(vmulq_f64(vmovq_n_f64(prev[5]), v_dx),
                                  vaddq_f64(vmulq_f64(vmovq_n_f64(prev[2]),
                                                      v_s_seg_l2_0x),
                                            v_s_seg_l3_10x))));
    vst1q_f64(&output[13],
              vaddq_f64(v_p_11_ijk,
                        vaddq_f64(vmulq_f64(vmovq_n_f64(prev[6]), v_dx),
                                  vaddq_f64(vmulq_f64(vmovq_n_f64(prev[2]),
                                                      v_s_seg_l2_1x),
                                            v_s_seg_l3_11x))));

#else
    // Scalar fallback
    output[1] = prev[1] + dx0;
    output[2] = prev[2] + dx1;

    double s_seg3 = 0.5 * dx0 * dx0;
    double s_seg4 = 0.5 * dx0 * dx1;
    double s_seg5 = 0.5 * dx1 * dx0;
    double s_seg6 = 0.5 * dx1 * dx1;

    output[3] = prev[3] + prev[1] * dx0 + s_seg3;
    output[4] = prev[4] + prev[1] * dx1 + s_seg4;
    output[5] = prev[5] + prev[2] * dx0 + s_seg5;
    output[6] = prev[6] + prev[2] * dx1 + s_seg6;

    double s3_000 = dx0 * dx0 * dx0 * inv6;
    double s3_001 = dx0 * dx0 * dx1 * inv6;
    double s3_010 = dx0 * dx1 * dx0 * inv6;
    double s3_011 = dx0 * dx1 * dx1 * inv6;
    double s3_100 = dx1 * dx0 * dx0 * inv6;
    double s3_101 = dx1 * dx0 * dx1 * inv6;
    double s3_110 = dx1 * dx1 * dx0 * inv6;
    double s3_111 = dx1 * dx1 * dx1 * inv6;

    output[7] = prev[7] + prev[3] * dx0 + prev[1] * s_seg3 + s3_000;
    output[8] = prev[8] + prev[3] * dx1 + prev[1] * s_seg4 + s3_001;
    output[9] = prev[9] + prev[4] * dx0 + prev[1] * s_seg5 + s3_010;
    output[10] = prev[10] + prev[4] * dx1 + prev[1] * s_seg6 + s3_011;
    output[11] = prev[11] + prev[5] * dx0 + prev[2] * s_seg3 + s3_100;
    output[12] = prev[12] + prev[5] * dx1 + prev[2] * s_seg4 + s3_101;
    output[13] = prev[13] + prev[6] * dx0 + prev[2] * s_seg5 + s3_110;
    output[14] = prev[14] + prev[6] * dx1 + prev[2] * s_seg6 + s3_111;
#endif
  }
}

// =============================================================================
// Log-Signature via Baker-Campbell-Hausdorff (BCH) Inversion
// =============================================================================
// For a 2D path at level 3, the log-signature lives in the free Lie algebra.
// We use the formula: log(S) ≈ (S-1) - ½(S-1)² + ⅓(S-1)³
// Projected onto the Lie algebra basis using the Dynkin map.
//
// Level 1: l¹_i = S¹_i  (direct copy)
// Level 2: l²_ij = S²_ij - ½ S¹_i S¹_j  (antisymmetric part = Lie bracket)
// Level 3: l³_ijk = S³_ijk - ½(S¹_i S²_jk + S²_ij S¹_k) + ⅓ S¹_i S¹_j S¹_k
//
// Output layout (14 terms):
//   [0..1]   = Level 1: l¹_0, l¹_1
//   [2..5]   = Level 2: l²_00, l²_01, l²_10, l²_11
//   [6..13]  = Level 3: l³_000 ... l³_111

void compute_log_signature(const double *sig, double *logsig) {
  // Level 1: direct copy of signature level 1
  // sig layout: [0]=1, [1..2]=L1, [3..6]=L2, [7..14]=L3
  double s1_0 = sig[1];
  double s1_1 = sig[2];

  logsig[0] = s1_0;
  logsig[1] = s1_1;

  // Level 2: l²_ij = S²_ij - ½ S¹_i · S¹_j
  double s2[4] = {sig[3], sig[4], sig[5], sig[6]};
  double s1s1[4] = {s1_0 * s1_0, s1_0 * s1_1, s1_1 * s1_0, s1_1 * s1_1};

#ifdef __ARM_NEON
  float64x2_t v_half = vmovq_n_f64(0.5);
  float64x2_t v_s2_01 = vld1q_f64(&s2[0]);
  float64x2_t v_s1s1_01 = vld1q_f64(&s1s1[0]);
  vst1q_f64(&logsig[2], vsubq_f64(v_s2_01, vmulq_f64(v_half, v_s1s1_01)));

  float64x2_t v_s2_23 = vld1q_f64(&s2[2]);
  float64x2_t v_s1s1_23 = vld1q_f64(&s1s1[2]);
  vst1q_f64(&logsig[4], vsubq_f64(v_s2_23, vmulq_f64(v_half, v_s1s1_23)));
#else
  for (int i = 0; i < 4; ++i)
    logsig[2 + i] = s2[i] - 0.5 * s1s1[i];
#endif

  // Level 3: l³_ijk = S³_ijk - ½(S¹_i·S²_jk + S²_ij·S¹_k) + ⅓·S¹_i·S¹_j·S¹_k
  double s1[2] = {s1_0, s1_1};
  const double inv3 = 1.0 / 3.0;

  for (int i = 0; i < 2; ++i) {
    for (int j = 0; j < 2; ++j) {
      for (int k = 0; k < 2; ++k) {
        int idx3 = 7 + i * 4 + j * 2 + k; // index into sig level 3
        int idx2_jk = 3 + j * 2 + k;      // index into sig level 2
        int idx2_ij = 3 + i * 2 + j;      // index into sig level 2
        int out_idx = 6 + i * 4 + j * 2 + k;

        logsig[out_idx] = sig[idx3] -
                          0.5 * (s1[i] * sig[idx2_jk] + sig[idx2_ij] * s1[k]) +
                          inv3 * s1[i] * s1[j] * s1[k];
      }
    }
  }
}

// =============================================================================
// Expected Signature: Φ(X)_{s,t} = E[Sig(X)] over sliding windows
// =============================================================================
// Filters high-frequency noise by averaging signatures over overlapping
// sub-paths. Preserves the topological "shape" of the price movement.

void compute_expected_signature(const double *path, size_t num_points,
                                size_t window_size, double *expected_sig) {
  if (num_points < window_size || window_size < 2) {
    // Fallback: compute signature of entire path
    compute_signature_level3(path, num_points, expected_sig);
    return;
  }

  // Zero the accumulator
  for (size_t k = 0; k < 15; ++k)
    expected_sig[k] = 0.0;

  double window_sig[15];
  size_t num_windows = num_points - window_size + 1;

  for (size_t start = 0; start < num_windows; ++start) {
    compute_signature_level3(path + 2 * start, window_size, window_sig);

#ifdef __ARM_NEON
    // NEON-accelerated accumulation (process 2 doubles at a time)
    for (size_t k = 0; k < 14; k += 2) {
      float64x2_t v_acc = vld1q_f64(&expected_sig[k]);
      float64x2_t v_win = vld1q_f64(&window_sig[k]);
      vst1q_f64(&expected_sig[k], vaddq_f64(v_acc, v_win));
    }
    expected_sig[14] += window_sig[14]; // last element
#else
    for (size_t k = 0; k < 15; ++k)
      expected_sig[k] += window_sig[k];
#endif
  }

  // Normalize by number of windows
  double inv_n = 1.0 / static_cast<double>(num_windows);

#ifdef __ARM_NEON
  float64x2_t v_inv = vmovq_n_f64(inv_n);
  for (size_t k = 0; k < 14; k += 2) {
    float64x2_t v_acc = vld1q_f64(&expected_sig[k]);
    vst1q_f64(&expected_sig[k], vmulq_f64(v_acc, v_inv));
  }
  expected_sig[14] *= inv_n;
#else
  for (size_t k = 0; k < 15; ++k)
    expected_sig[k] *= inv_n;
#endif
}

// =============================================================================
// Signature Curvature: Measures regime transition speed
// =============================================================================
// Given a sequence of N signature snapshots, compute the discrete curvature
// of the trajectory in signature space.
//
// Curvature κ = |T'(s)| / |X'(s)| where T is the unit tangent.
// High curvature = rapid regime change = exhaustion candidate.

double compute_signature_curvature(const double *signatures, size_t num_sigs) {
  if (num_sigs < 3)
    return 0.0;

  double total_curvature = 0.0;

  for (size_t i = 1; i < num_sigs - 1; ++i) {
    const double *prev = signatures + (i - 1) * 15;
    const double *curr = signatures + i * 15;
    const double *next = signatures + (i + 1) * 15;

    // Velocity vectors (first differences of signature coefficients)
    double v1[14], v2[14];
    double norm_v1 = 0.0, norm_v2 = 0.0;

    for (int k = 1; k < 15; ++k) {
      v1[k - 1] = curr[k] - prev[k];
      v2[k - 1] = next[k] - curr[k];
      norm_v1 += v1[k - 1] * v1[k - 1];
      norm_v2 += v2[k - 1] * v2[k - 1];
    }

    norm_v1 = std::sqrt(norm_v1);
    norm_v2 = std::sqrt(norm_v2);

    if (norm_v1 < 1e-15 || norm_v2 < 1e-15)
      continue;

    // Acceleration (second difference)
    double acc_norm = 0.0;
    for (int k = 0; k < 14; ++k) {
      double a = (v2[k] / norm_v2) - (v1[k] / norm_v1);
      acc_norm += a * a;
    }

    // κ = |dT/ds| / |v|
    total_curvature += std::sqrt(acc_norm) / norm_v1;
  }

  return total_curvature / static_cast<double>(num_sigs - 2);
}

} // extern "C"
