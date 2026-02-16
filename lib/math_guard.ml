open Bigarray

type safety_status = 
  | Safe
  | Critical_NaN
  | Critical_Inf
  | Layout_Error of string

let logger_callback = ref (fun msg -> Printf.printf "[MATH_GUARD] %s\n%!" msg)

(* Validate Bigarray Layout *)
let validate_layout (arr : (float, float64_elt, c_layout) Array1.t) =
  let dim = Array1.dim arr in
  if dim <= 0 then Error "Dimension must be positive"
  else Ok ()

(* 
   [PLAIN ENGLISH]: Checks if the input array contains any "Not a Number" (NaN) or "Infinity" values.
*)
let check_finite (arr : (float, float64_elt, c_layout) Array1.t) =
  let dim = Array1.dim arr in
  let rec loop i =
    if i >= dim then Safe
    else
      let v = arr.{i} in
      if Float.is_nan v then Critical_NaN
      else if Float.is_infinite v then Critical_Inf
      else loop (i + 1)
  in
  loop 0

(* 
   [PLAIN ENGLISH]: The Firewall for the Geometric Engine.
*)
let protected_compute_signature path out_sig =
  match check_finite path with
  | Critical_NaN -> 
      !logger_callback "CRITICAL: NaN detected in input path. Aborting signature compute.";
      false
  | Critical_Inf ->
      !logger_callback "CRITICAL: Inf detected in input path. Aborting signature compute.";
      false
  | Layout_Error msg ->
      !logger_callback (Printf.sprintf "CRITICAL: Layout Error: %s" msg);
      false
  | Safe ->
      Signature_bergomi.Signature.compute_signature_bigarray path out_sig;
      true

(* Safe Exhaustion Score - Clamps and Logs *)
let protected_exhaustion_score logsig =
  let score = Manifold_geometry.exhaustion_score logsig in
  let val_score = Manifold_geometry.density_value score in
  
  if Float.is_nan val_score then (
    !logger_callback "CRITICAL: Exhaustion Score is NaN. Defaulting to 1.0 (Safe Mode).";
    Manifold_geometry.make_density 1.0
  ) else if val_score > 1.0 then (
    !logger_callback (Printf.sprintf "WARNING: Exhaustion Score > 1.0 (%.4f). Clamping." val_score);
    Manifold_geometry.make_density 1.0
  ) else (
    score
  )
