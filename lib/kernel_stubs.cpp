#include <caml/alloc.h>
#include <caml/bigarray.h>
#include <caml/custom.h>
#include <caml/memory.h>
#include <caml/mlvalues.h>

#include "sabr_kernel.h"
#include "signature_kernel.h"

extern "C" {
// Neural Calibration Stub
// external calibrate_sabr : Bigarray.float64 -> Bigarray.float64 -> unit
CAMLprim value caml_calibrate_sabr(value v_input, value v_output) {
  double *input = (double *)Caml_ba_data_val(v_input);
  double *output = (double *)Caml_ba_data_val(v_output);

  extern void c_calibrate_sabr(const double *input, double *output);
  c_calibrate_sabr(input, output);

  return Val_unit;
}

// Path Signature Stub
// external compute_signature_level3 : Bigarray.float64 -> int ->
// Bigarray.float64 -> unit
CAMLprim value caml_compute_signature_level3(value v_path, value v_n,
                                             value v_out) {
  double *path = (double *)Caml_ba_data_val(v_path);
  double *out = (double *)Caml_ba_data_val(v_out);
  size_t n = Long_val(v_n);

  compute_signature_level3(path, n, out);

  return Val_unit;
}

// Log-Signature via BCH Inversion
// external compute_log_signature : Bigarray.float64 -> Bigarray.float64 -> unit
CAMLprim value caml_compute_log_signature(value v_sig, value v_out) {
  double *sig = (double *)Caml_ba_data_val(v_sig);
  double *out = (double *)Caml_ba_data_val(v_out);

  compute_log_signature(sig, out);

  return Val_unit;
}

// Expected Signature over sliding windows
// external compute_expected_signature : Bigarray.float64 -> int -> int ->
// Bigarray.float64 -> unit
CAMLprim value caml_compute_expected_signature(value v_path, value v_n,
                                               value v_window, value v_out) {
  double *path = (double *)Caml_ba_data_val(v_path);
  size_t n = Long_val(v_n);
  size_t window = Long_val(v_window);
  double *out = (double *)Caml_ba_data_val(v_out);

  compute_expected_signature(path, n, window, out);

  return Val_unit;
}

// Signature Curvature
// external compute_signature_curvature : Bigarray.float64 -> int -> float
CAMLprim value caml_compute_signature_curvature(value v_sigs, value v_n) {
  double *sigs = (double *)Caml_ba_data_val(v_sigs);
  size_t n = Long_val(v_n);

  double curvature = compute_signature_curvature(sigs, n);

  return caml_copy_double(curvature);
}
}
