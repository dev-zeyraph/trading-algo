open Bigarray

type regime_type = 
  | Bull_Market
  | Bear_Crash
  | High_Vol_Chop

type calibrated_refs = {
  expansion_ref : float * float; (* mu, sigma2 *)
  crash_ref : float * float;
  chop_ref : float * float;
}

(* Synthetic Regime Parameters for Monte Carlo Generator *)
(* Returns (drift, volatility) for the regime *)
let regime_params = function
  | Bull_Market -> (0.15, 0.15)    (* Steady uptake *)
  | Bear_Crash -> (-0.50, 0.60)    (* Violent drop *)
  | High_Vol_Chop -> (0.00, 0.40)  (* Directionless chaos *)

(* Simple Box-Muller Gaussian Generator *)
module Gaussian_rng = struct
  let next () =
    let u1 = Random.float 1.0 in
    let u2 = Random.float 1.0 in
    let z0 = sqrt (-2.0 *. log u1) *. cos (2.0 *. Float.pi *. u2) in
    z0
end

(* Generate N synthetic paths for a regime *)
let generate_regime_batch regime num_paths steps dt =
  let (mu, sigma) = regime_params regime in
  let paths = Array.make num_paths (Array1.create float64 c_layout steps) in
  
  for i = 0 to num_paths - 1 do
    let path = paths.(i) in
    path.{0} <- 100.0; (* Start price *)
    let s = ref 100.0 in
    for t = 1 to steps - 1 do
      let epsilon = Gaussian_rng.next () in
      let ret = (mu -. 0.5 *. sigma *. sigma) *. dt +. sigma *. sqrt(dt) *. epsilon in
      s := !s *. exp(ret);
      path.{t} <- !s
    done
  done;
  paths

(* Main Calibration Routine *)
let calibrate_manifold () =
  Printf.printf "[CALIBRATION] Starting Synthetic Regime Stress Test...\n%!";
  
  let process_regime regime = 
    let paths = generate_regime_batch regime 500 100 0.01 in
    let points = ref [] in
    
    Array.iter (fun path ->
      (* Compute Expected Sig (window=20) then LogSig *)
      let ex_sig = Signature_bergomi.Signature.compute_expected_sig path ~window_size:20 in
      let logsig = Signature_bergomi.Signature.compute_log_signature ex_sig in
      let (mu, s2) = Manifold_geometry.params_of_logsig logsig in
      points := s2 :: mu :: !points (* Push in reverse order for flat array *)
    ) paths;
    
    let point_arr = Array.of_list (List.rev !points) in
    Signature_bergomi.Signature.compute_frechet_mean point_arr
  in

  let (mu_exp, s2_exp) = process_regime Bull_Market in
  let (mu_crash, s2_crash) = process_regime Bear_Crash in
  let (mu_chop, s2_chop) = process_regime High_Vol_Chop in
  
  Printf.printf "[CALIBRATION] Expansion Centroid: (mu=%.4f, s2=%.4f)\n%!" mu_exp s2_exp;
  Printf.printf "[CALIBRATION] Crash Centroid:     (mu=%.4f, s2=%.4f)\n%!" mu_crash s2_crash;
  
  {
    expansion_ref = (mu_exp, s2_exp);
    crash_ref = (mu_crash, s2_crash);
    chop_ref = (mu_chop, s2_chop);
  }
