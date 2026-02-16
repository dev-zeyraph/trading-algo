open Stdlib

module Signature = struct
  let sig_size = 15
  let logsig_size = 14

  (* Native external binding via stubs *)
  external compute_signature_level3_stub : 
    (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t -> 
    int -> 
    (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t -> 
    unit = "caml_compute_signature_level3"
  (* Phase 25: Manifold Calibration *)
  external compute_frechet_mean : float array -> float * float = "caml_compute_frechet_mean"

  external compute_log_signature_stub :
    (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t ->
    (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t ->
    unit = "caml_compute_log_signature"

  external compute_expected_signature_stub :
    (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t ->
    int -> int ->
    (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t ->
    unit = "caml_compute_expected_signature"

  external compute_signature_curvature_stub :
    (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t ->
    int ->
    float = "caml_compute_signature_curvature"

  type point = { t : float; value : float }

  let array_of_path points =
    let n = List.length points in
    let arr = Bigarray.Array1.create Bigarray.float64 Bigarray.c_layout (2 * n) in
    List.iteri (fun i p ->
      Bigarray.Array1.set arr (2 * i) p.t;
      Bigarray.Array1.set arr (2 * i + 1) p.value
    ) points;
    arr

  let compute_signature (points : point list) =
    let n = List.length points in
    let path_arr = array_of_path points in
    let out_sig = Bigarray.Array1.create Bigarray.float64 Bigarray.c_layout sig_size in
    compute_signature_level3_stub path_arr n out_sig;
    out_sig

  let compute_signature_bigarray path_arr out_sig =
    let n = Bigarray.Array1.dim path_arr / 2 in
    compute_signature_level3_stub path_arr n out_sig

  let compute_log_signature sig_arr =
    let out = Bigarray.Array1.create Bigarray.float64 Bigarray.c_layout logsig_size in
    compute_log_signature_stub sig_arr out;
    out

  let compute_expected_sig path_arr ~window_size =
    let n = Bigarray.Array1.dim path_arr / 2 in
    let out = Bigarray.Array1.create Bigarray.float64 Bigarray.c_layout sig_size in
    compute_expected_signature_stub path_arr n window_size out;
    out

  let compute_curvature sig_history_arr num_snapshots =
    compute_signature_curvature_stub sig_history_arr num_snapshots

end
