(* [GOD MATH] Heston Stochastic Volatility Model *)
(* dS_t = mu * S_t * dt + sqrt(V_t) * S_t * dW_t^S *)
(* dV_t = kappa * (theta - V_t) * dt + xi * sqrt(V_t) * dW_t^V *)
(* Correlations: dW_t^S * dW_t^V = rho * dt *)

type params = {
  mu: float;    (* Drift *)
  kappa: float; (* Mean reversion speed of vol *)
  theta: float; (* Long-run variance *)
  xi: float;    (* Vol of Vol *)
  rho: float;   (* Correlation between Price/Vol shocks *)
}

let default_params = { 
  mu = 0.0; 
  kappa = 2.0; 
  theta = 0.09; 
  xi = 0.3; 
  rho = -0.7 
}

let simulate_step current_price current_vol dt params =
  let sqrt_dt = sqrt dt in
  let z1 = Random.float 1.0 -. 0.5 in (* Approximate Gaussian *)
  let z2 = Random.float 1.0 -. 0.5 in
  
  (* Correlate shocks *)
  let eps_s = z1 in
  let eps_v = (params.rho *. z1) +. (sqrt (1.0 -. (params.rho ** 2.0)) *. z2) in

  (* Update Variance (Prevent negative variance with max) *)
  (* Using reflection boundary or truncation at 0? Using Truncation/Max here. *)
  let vol_floored = max 0.0001 current_vol in
  let sqrt_vol = sqrt vol_floored in
  
  let dv = params.kappa *. (params.theta -. current_vol) *. dt +. params.xi *. sqrt_vol *. eps_v *. sqrt_dt in
  let next_vol = max 0.0001 (current_vol +. dv) in

  (* Update Price *)
  let ds = params.mu *. current_price *. dt +. sqrt_vol *. current_price *. eps_s *. sqrt_dt in
  let next_price = current_price +. ds in
  
  (next_price, next_vol)
