open Lwt.Infix
open Websocket_lwt_unix
open Monte_carlo

module Server = struct
  let section = Lwt_log.Section.make "stream_server"

  let handle_client (conn : Connected_client.t) =
    let id = Random.int 1000 in
    let current_symbol = ref "NVDA" in
    Lwt_log.info_f ~section "Client %d connected" id >>= fun () ->

    (* Listen for incoming messages (symbol switches) *)
    let rec listen_loop () =
      Lwt.catch (fun () ->
        Connected_client.recv conn >>= fun frame ->
        let content = frame.Websocket.Frame.content in
        (try
          let json = Yojson.Safe.from_string content in
          let open Yojson.Safe.Util in
          let msg_type = json |> member "type" |> to_string in
          if msg_type = "switch_symbol" then begin
            let sym = json |> member "symbol" |> to_string in
            current_symbol := sym;
            Lwt_log.info_f ~section "Client %d switched to %s" id sym |> Lwt.ignore_result
          end
        with _ -> ());
        listen_loop ()
      ) (fun _ -> Lwt.return_unit)
    in

    let rec stream_data () =
      let config : Engine.config = {
        num_paths = 5;
        num_steps = 100;
        dt = 0.01;
        num_domains = 1;
      } in

      let results = Engine.run_parallel config (100.0, 0.2) 0.5 (-0.5) 0.4 in
      let flattened = Array.concat results in

      let serialize_path (path, _sig) =
        let n = Bigarray.Array1.dim path / 2 in
        let spots = ref [] in
        for i = n - 1 downto 0 do
          let spot = Bigarray.Array1.get path (2 * i + 1) in
          spots := `Float spot :: !spots
        done;
        `List !spots
      in

      (* Compute Manifold State from the first simulated path *)
      let manifold_json =
        if Array.length flattened > 0 then begin
          let (first_path, _) = flattened.(0) in
          (* Build signature history from all paths for curvature *)
          let num_sigs = min 10 (Array.length flattened) in
          let sig_history = Bigarray.Array1.create Bigarray.float64 Bigarray.c_layout (num_sigs * 15) in
          for s = 0 to num_sigs - 1 do
            let (_, path_sig) = flattened.(s) in
            for k = 0 to 14 do
              Bigarray.Array1.set sig_history (s * 15 + k) (Bigarray.Array1.get path_sig k)
            done
          done;
          let state = Manifold_geometry.ManifoldGeometry.compute_state first_path sig_history num_sigs in
          `Assoc [
            ("fisher_distance", `Float state.fisher_distance);
            ("curvature", `Float state.curvature);
            ("exhaustion", `Float (Manifold_geometry.ManifoldGeometry.density_value state.exhaustion));
            ("mu", `Float state.mu);
            ("sigma2", `Float state.sigma2);
            ("log_signature", `List (Array.to_list (Array.map (fun v -> `Float v) state.log_signature)))
          ]
        end else
          `Assoc [
            ("fisher_distance", `Float 0.0);
            ("curvature", `Float 0.0);
            ("exhaustion", `Float 0.5);
            ("mu", `Float 0.0);
            ("sigma2", `Float 0.0);
            ("log_signature", `List [])
          ]
      in

      let symbol = !current_symbol in
      let ticker_opt = Market_data.MarketData.fetch_real_data ~symbol () in
      let ticker = match ticker_opt with
        | Some t -> t
        | None -> { 
            Market_data.MarketData.symbol; 
            price = 100.0; 
            atm_vol = 0.30; 
            skew_25d = -0.04; 
            fly_25d = 0.015;
            rv_20d = 0.28;
            rv_60d = 0.32;
            term_structure = [];
            gex_profile = [];
            hurst_price = 0.5;
            hurst_vol = 0.5;
            timestamp = Unix.gettimeofday () 
          }
      in

      let json_data = `Assoc [
        ("type", `String "path_update");
        ("paths", `List (Array.to_list (Array.map serialize_path flattened)));
        ("ticker", `Assoc [
          ("symbol", `String ticker.symbol);
          ("price", `Float ticker.price);
          ("vol", `Float ticker.atm_vol);
          ("skew", `Float ticker.skew_25d);
          ("fly", `Float ticker.fly_25d);
          ("rv_20d", `Float ticker.rv_20d);
          ("rv_60d", `Float ticker.rv_60d);
          ("term_structure", `List (List.map (fun (p: Market_data.MarketData.term_point) -> 
            `Assoc [("days", `Int p.days); ("iv", `Float p.iv)]
          ) ticker.term_structure));
          ("gex_profile", `List (List.map (fun (g: Market_data.MarketData.gex_point) ->
            `Assoc [("strike", `Float g.strike); ("gex", `Float g.gex)]
          ) ticker.gex_profile));
          ("hurst_price", `Float ticker.hurst_price);
          ("hurst_vol", `Float ticker.hurst_vol)
        ]);
        ("manifold", manifold_json)
      ] in
      let msg = Yojson.Basic.to_string json_data in

      Connected_client.send conn (Websocket.Frame.create ~content:msg ()) >>= fun () ->
      Lwt_unix.sleep 0.5 >>= stream_data
    in

    (* Run listener and streamer concurrently *)
    Lwt.catch (fun () ->
      Lwt.pick [listen_loop (); stream_data ()]
    ) (fun _ ->
      Lwt_log.info_f ~section "Client %d disconnected" id
    )

  let start port =
    Lwt_log.info_f ~section "Starting WebSocket server on port %d" port >>= fun () ->
    let mode = `TCP (`Port port) in
    establish_server ~mode handle_client

end
