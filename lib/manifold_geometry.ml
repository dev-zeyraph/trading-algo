(** Manifold Geometry: Fisher Information Metric on Signature Space.
    
    Maps log-signature coefficients onto a statistical manifold and 
    computes geodesic distances to detect regime exhaustion.
    
    All distances are Riemannian (geodesic), never Euclidean.
    Output density ρ is guaranteed non-negative by construction. *)

(* 
   [PLAIN ENGLISH]: Defines the "Shape" of the market's risk.
   It treats the market not as a random walk, but as a particle moving on a curved surface.
   
   [HS MATH]: 
   - High Volatility = High Curvature (Gravity Well).
   - Low Volatility = Flat Surface.
*)
(** Non-negative density type. Constructed only via [make_density]. *)
type density = { rho : float }

let make_density v = 
  if v < 0.0 then { rho = 0.0 } (* clamp: type-level non-negativity *)
  else { rho = v }

let density_value d = d.rho

(** Fisher Information Metric g_ij(θ) for a Gaussian family. *)
let fisher_metric ~mu:_ ~sigma2 =
  if sigma2 < 1e-15 then (1e15, 1e15) (* degenerate: infinite curvature *)
  else (1.0 /. sigma2, 1.0 /. (2.0 *. sigma2 *. sigma2))

(** Extract (μ, σ²) from log-signature coefficients. *)
let params_of_logsig logsig =
  let n = Bigarray.Array1.dim logsig in
  let mu = if n >= 1 then Bigarray.Array1.get logsig 0 else 0.0 in
  let sigma2 = ref 0.0 in
  for i = 2 to n - 1 do
    let v = Bigarray.Array1.get logsig i in
    sigma2 := !sigma2 +. (v *. v)
  done;
  (mu, max 1e-10 !sigma2)

(** Geodesic distance on the Gaussian Fisher manifold. *)
let geodesic_distance (mu1, s2_1) (mu2, s2_2) =
  let s1 = sqrt s2_1 in
  let s2 = sqrt s2_2 in
  let ln_ratio = abs_float (log (s2 /. s1)) in
  let mu_term = (mu2 -. mu1) *. (mu2 -. mu1) /. (s1 *. s2) in
  sqrt (2.0 *. ln_ratio *. ln_ratio +. mu_term)

(** Reference manifold points for regime detection. *)

(* "Expansion" regime: strong drift, moderate energy *)
let expansion_ref = (0.5, 0.1)

(* "Crash/Mean-Reversion" regime: minimal drift, collapsing energy *)
let crash_ref = (0.0, 0.01)

(** Exhaustion score: [0, 1]. *)
let exhaustion_score logsig =
  let params = params_of_logsig logsig in
  let d_expansion = geodesic_distance params expansion_ref in
  let d_crash = geodesic_distance params crash_ref in
  let total = d_expansion +. d_crash in
  if total < 1e-15 then make_density 0.5
  else make_density (d_expansion /. total)

(** Full manifold state: combines all geometric metrics. *)
type manifold_state = {
  fisher_distance: float;     (* geodesic distance to crash manifold *)
  curvature: float;           (* signature curvature from C++ *)
  exhaustion: density;        (* exhaustion score [0, 1] *)
  mu: float;                  (* current drift parameter *)
  sigma2: float;              (* current energy parameter *)
  log_signature: float array; (* raw coefficients for visualization *)
}

(** Compute full manifold state from a path and its signature history. *)
let compute_state path_arr sig_history_arr num_snapshots =
  (* Expected signature (noise-filtered) *)
  let expected_sig = Signature_bergomi.Signature.compute_expected_sig path_arr ~window_size:20 in
  
  (* Log-signature projection to Lie algebra *)
  let logsig = Signature_bergomi.Signature.compute_log_signature expected_sig in
  
  (* Manifold parameters *)
  let (mu, sigma2) = params_of_logsig logsig in
  
  (* Geodesic distances *)
  let d_crash = geodesic_distance (mu, sigma2) crash_ref in
  
  (* Curvature from C++ *)
  let curvature = Signature_bergomi.Signature.compute_curvature sig_history_arr num_snapshots in
  
  (* Exhaustion *)
  let exhaust = exhaustion_score logsig in
  
  (* Pack log-signature for frontend transmission *)
  let n = Bigarray.Array1.dim logsig in
  let ls_arr = Array.init n (fun i -> Bigarray.Array1.get logsig i) in
  
  {
    fisher_distance = d_crash;
    curvature;
    exhaustion = exhaust;
    mu;
    sigma2;
    log_signature = ls_arr;
  }
