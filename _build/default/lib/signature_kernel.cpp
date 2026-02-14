#include "signature_kernel.h"
#include <algorithm>
#include <vector>

#ifdef __ARM_NEON
#include <arm_neon.h>
#endif

extern "C" {

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
    // Load dx into NEON register
    float64x2_t v_dx = {dx0, dx1};

    // s_seg Level 1: {dx0, dx1}
    float64x2_t v_s_seg_l1 = v_dx;

    // s_seg Level 2: {0.5*dx0*dx0, 0.5*dx0*dx1, 0.5*dx1*dx0, 0.5*dx1*dx1}
    float64x2_t v_s_seg_l2_0x = vmulq_f64(vmovq_n_f64(dx0 * inv2), v_dx);
    float64x2_t v_s_seg_l2_1x = vmulq_f64(vmovq_n_f64(dx1 * inv2), v_dx);

    // Update Output Level 1 (indices 1, 2)
    float64x2_t v_prev_l1 = vld1q_f64(&prev[1]);
    vst1q_f64(&output[1], vaddq_f64(v_prev_l1, v_s_seg_l1));

    // Update Output Level 2 (indices 3, 4, 5, 6)
    // S_new^{0j} = S_prev^{0j} + S_prev^0 * dx^j + s_seg^{0j}
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

    // Level 3 (8 terms at indices 7..14)
    // S_new^{ijk} = S_prev^{ijk} + S_prev^{ij} * dx^k + S_prev^i * s_seg^{jk} +
    // s_seg^{ijk}
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
}
