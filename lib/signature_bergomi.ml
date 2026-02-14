open Stdlib

module Signature = struct
  let sig_size = 15

  (* Native external binding via stubs *)
  external compute_signature_level3_stub : 
    (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t -> 
    int -> 
    (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t -> 
    unit = "caml_compute_signature_level3"

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

end
