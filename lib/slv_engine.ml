open Stdlib

(* Dupire Formula: sigma_loc^2 = 2 * (dV/dT + r * K * dV/dK) / (K^2 * d2V/dK2) 
   where V is the undiscounted call price.
   Simplification using implied vol w(K,T):
   sigma_loc^2 = (w^2 + 2*T*w*(dw/dT + (r-q)*K*dw/dK)) / ( (1 + K*d1*sqrt(T)*dw/dK)^2 + K^2*T*w*(d2w/dK2 - d1*sqrt(T)*(dw/dK)^2) )
*)

let compute_local_vol ~s0 ~strike ~tenor ~get_vol ~r =
  let eps_k = strike *. 0.01 in
  let eps_t = 0.01 in
  
  let vol = get_vol strike tenor in
  let vol_up_k = get_vol (strike +. eps_k) tenor in
  let vol_dn_k = get_vol (strike -. eps_k) tenor in
  let vol_up_t = get_vol strike (tenor +. eps_t) in
  
  (* Finite differences *)
  let dvol_dk = (vol_up_k -. vol_dn_k) /. (2.0 *. eps_k) in
  let d2vol_dk2 = (vol_up_k -. 2.0 *. vol +. vol_dn_k) /. (eps_k *. eps_k) in
  let dvol_dt = (vol_up_t -. vol) /. eps_t in
  
  let d1 = (log (s0 /. strike) +. (r +. 0.5 *. vol *. vol) *. tenor) /. (vol *. sqrt tenor) in
  
  let numerator = vol *. vol +. 2.0 *. tenor *. vol *. (dvol_dt +. r *. strike *. dvol_dk) in
  let denominator = (1.0 +. strike *. d1 *. sqrt tenor *. dvol_dk) ** 2.0 
                    +. strike *. strike *. tenor *. vol *. (d2vol_dk2 -. d1 *. sqrt tenor *. (dvol_dk ** 2.0)) in
  
  if denominator <= 0.0 then vol (* Fallback to implied vol if Dupire fails *)
  else sqrt (max 0.0 (numerator /. denominator))

(* Calibrate Leverage Surface L(S,t) *)
(* L(S,t) = sigma_dup(S,t) / sqrt(E[sigma_stoch^2 | S_t=S]) *)
let calibrate_leverage paths ~strike ~tenor ~sigma_dup =
  let sum_sigma2 = ref 0.0 in
  let count = ref 0 in
  
  (* Find paths close to strike at time t *)
  let t_idx = int_of_float (tenor /. 0.01) in (* Assuming dt=0.01 *)
  
  Array.iter (fun (path, _sig) ->
    let spot = Bigarray.Array1.get path (2 * t_idx + 1) in
    if abs_float (spot -. strike) < 5.0 then begin
      (* In a real SLV, we would store the stochastic vol path too. 
         For this demo, we'll approximate the conditional expectation. *)
      sum_sigma2 := !sum_sigma2 +. 0.04; (* Placeholder for E[sigma^2] *)
      count := !count + 1
    end
  ) paths;
  
  if !count = 0 then 1.0
  else 
    let e_sigma2 = !sum_sigma2 /. float_of_int !count in
    sigma_dup /. (sqrt e_sigma2)
