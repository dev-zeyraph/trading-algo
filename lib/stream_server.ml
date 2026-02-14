open Lwt.Infix
open Websocket_lwt_unix
open Monte_carlo

module Server = struct
  let section = Lwt_log.Section.make "stream_server"

  let handle_client (conn : Connected_client.t) =
    let id = Random.int 1000 in
    Lwt_log.info_f ~section "Client %d connected" id >>= fun () ->
    
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

      let ticker_opt = Market_data.MarketData.fetch_real_data () in
      let ticker = match ticker_opt with
        | Some t -> t
        | None -> { Market_data.MarketData.symbol = "NVDA"; price = 135.0; atm_vol = 0.42; skew_25d = -0.05; fly_25d = 0.02; timestamp = Unix.gettimeofday () }
      in

      let json_data = `Assoc [
        ("type", `String "path_update");
        ("paths", `List (Array.to_list (Array.map serialize_path flattened)));
        ("ticker", `Assoc [
          ("symbol", `String ticker.symbol);
          ("price", `Float ticker.price);
          ("vol", `Float ticker.atm_vol);
          ("skew", `Float ticker.skew_25d);
          ("fly", `Float ticker.fly_25d)
        ])
      ] in
      let msg = Yojson.Basic.to_string json_data in
      
      Connected_client.send conn (Websocket.Frame.create ~content:msg ()) >>= fun () ->
      Lwt_unix.sleep 0.5 >>= stream_data
    in
    
    Lwt.catch stream_data (fun _ -> 
      Lwt_log.info_f ~section "Client %d disconnected" id
    )

  let start port =
    Lwt_log.info_f ~section "Starting WebSocket server on port %d" port >>= fun () ->
    let mode = `TCP (`Port port) in
    establish_server ~mode handle_client

end
