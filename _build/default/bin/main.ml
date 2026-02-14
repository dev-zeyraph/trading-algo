open Quant_kernel

let () =
  Printf.printf "=== Multi-Model Quant Kernel Server initialized ===\n%!";
  
  (* 1. Validate Phase 11: American Option Pricing (LSMC) *)
  let config : Monte_carlo.Engine.config = {
    num_paths = 1000;
    num_steps = 100;
    dt = 0.01;
    num_domains = 4;
  } in
  
  Printf.printf "Running LSMC validation for American Put (S=100, K=100, r=0.03)...\n%!";
  let results = Monte_carlo.Engine.run_parallel config (100.0, 0.2) 0.5 (-0.5) 0.4 in
  let flattened = Array.concat results in
  let price = American_pricing.LSMC.price_american flattened 100.0 0.03 config.dt American_pricing.LSMC.Put in
  Printf.printf "American Put Price: %.6f\n\n%!" price;
  
  (* 2. Validate Phase 14: Stochastic Local Volatility (SLV) *)
  Printf.printf "=== SLV Calibration Demo ===\n%!";
  let s0 = 100.0 in
  let strike = 110.0 in
  let tenor = 0.5 in
  let r = 0.03 in
  
  (* Mock SABR implied vol surface getter *)
  let get_vol k t = 
    let moneyness = log (k /. s0) in
    0.2 +. 0.1 *. (moneyness ** 2.0) +. 0.02 *. t
  in
  
  let sigma_dup = Slv_engine.compute_local_vol ~s0 ~strike ~tenor ~get_vol ~r in
  Printf.printf "Dupire Local Vol at K=%.1f, T=%.1f: %.6f\n%!" strike tenor sigma_dup;
  
  let results = Monte_carlo.Engine.run_parallel config (s0, 0.2) 0.5 (-0.5) 0.4 in
  let flattened = Array.concat results in
  let leverage = Slv_engine.calibrate_leverage flattened ~strike ~tenor ~sigma_dup in
  Printf.printf "Calibrated Leverage L(S,t): %.6f\n\n%!" leverage;

  (* 3. Validate Phase 13: Neural Calibration (Deep SABR) *)
  Printf.printf "=== Neural Calibration Demo ===\n%!";
  let market_input = Bigarray.Array1.create Bigarray.float64 Bigarray.c_layout 7 in
  let input_vals = [| 0.20; -0.05; -0.08; 0.02; 0.03; 100.0; 1.0 |] in
  for i = 0 to 6 do market_input.{i} <- input_vals.(i) done;
  
  let params_out = Bigarray.Array1.create Bigarray.float64 Bigarray.c_layout 4 in
  Neural_calibrate.calibrate_sabr market_input params_out;
  Printf.printf "Neural SABR Params -> Alpha: %.4f, Beta: %.2f, Rho: %.4f, Nu: %.4f\n\n%!"
    params_out.{0} params_out.{1} params_out.{2} params_out.{3};

  (* 4. Validate Phase 15: Live Market Data *)
  Printf.printf "=== Live Market Data Integration ===\n%!";
  let on_market_update (t : Market_data.MarketData.ticker) =
    Printf.printf "\r[LIVE] %s: Price: %.2f | ATM Vol: %.2f%% | Skew: %.2f%%%!" 
      t.symbol t.price (t.atm_vol *. 100.0) (t.skew_25d *. 100.0);
    Lwt.return_unit
  in
  let _feed = Market_data.MarketData.run_simulator on_market_update in

  (* 5. Launch Phase 10: WebSocket Server *)
  Printf.printf "Starting WebSocket server on Port 8080...\n%!";
  Lwt_main.run (Stream_server.Server.start 8080)
