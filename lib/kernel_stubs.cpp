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
}
