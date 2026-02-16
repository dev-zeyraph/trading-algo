(** [GOD MATH] Heston Stochastic Volatility Model Interface *)

type params = {
  mu: float;
  kappa: float;
  theta: float;
  xi: float;
  rho: float;
}

(** Default parameters calibrated for realistic equity markets *)
val default_params : params

(** Simulates a single time step of the Heston process. 
    Returns (next_price, next_vol). *)
val simulate_step : float -> float -> float -> params -> float * float
