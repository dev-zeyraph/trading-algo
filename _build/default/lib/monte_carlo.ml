open Domain

module Engine = struct
  type config = {
    num_paths: int;
    num_steps: int;
    dt: float;
    num_domains: int;
  }

  (* SABR Path Generation: dS = sigma * S^beta * dW, dsigma = nu * sigma * dZ *)
  let simulate_path config (s0, sigma0) beta rho nu =
    let path = Bigarray.Array1.create Bigarray.float64 Bigarray.c_layout (config.num_steps * 2) in
    let rec loop i s sigma =
      if i >= config.num_steps then ()
      else
        let z1 = Random.float 2.0 -. 1.0 in (* Simple uniform approximation for demo *)
        let z2 = Random.float 2.0 -. 1.0 in
        let dw = z1 *. Float.sqrt config.dt in
        let dz = (rho *. z1 +. Float.sqrt (1.0 -. rho *. rho) *. z2) *. Float.sqrt config.dt in
        
        let s_new = s +. sigma *. (Float.pow s beta) *. dw in
        let sigma_new = sigma *. Float.exp (nu *. dz -. 0.5 *. nu *. nu *. config.dt) in
        
        path.{2*i} <- float_of_int i *. config.dt;
        path.{2*i + 1} <- s_new;
        loop (i + 1) s_new sigma_new
    in
    loop 0 s0 sigma0;
    path

  (* Function to compute signature of a path using our C++ kernel *)
  let compute_path_signature path =
    let sig_out = Bigarray.Array1.create Bigarray.float64 Bigarray.c_layout 15 in
    Signature_bergomi.Signature.compute_signature_bigarray path sig_out;
    sig_out

  let run_parallel config (s0, sigma0) beta rho nu =
    let paths_per_domain = config.num_paths / config.num_domains in
    let work () =
      Array.init paths_per_domain (fun _ -> 
        let path = simulate_path config (s0, sigma0) beta rho nu in
        (path, compute_path_signature path)
      )
    in
    let domains = List.init (config.num_domains - 1) (fun _ -> spawn work) in
    let last_batch = work () in
    last_batch :: (List.map join domains)

end
