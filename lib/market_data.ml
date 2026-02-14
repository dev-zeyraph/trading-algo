open Lwt.Infix

module MarketData = struct
  let section = Lwt_log.Section.make "market_data"

  type ticker = {
    symbol: string;
    price: float;
    atm_vol: float;
    skew_25d: float;
    fly_25d: float;
    timestamp: float;
  }

  let parse_ticker json_str =
    try
      let json = Yojson.Safe.from_string json_str in
      let open Yojson.Safe.Util in
      Some {
        symbol = json |> member "symbol" |> to_string;
        price = json |> member "price" |> to_float;
        atm_vol = json |> member "vol" |> to_float;
        skew_25d = json |> member "skew" |> to_float;
        fly_25d = json |> member "fly" |> to_float;
        timestamp = Unix.gettimeofday ();
      }
    with _ -> None

  (* Fetch real-world data using the Python bridge *)
  let fetch_real_data () =
    let cmd = "python3 lib/fetch_yahoo.py" in
    let chan = Unix.open_process_in cmd in
    let line = try input_line chan with End_of_file -> "" in
    ignore (Unix.close_process_in chan);
    parse_ticker line

  (* Simulator for "connect data" effect, now with real-world fetch fallback *)
  let run_simulator on_update =
    let rec loop () =
      let t_opt = fetch_real_data () in
      let t = match t_opt with
        | Some t -> t
        | None -> {
            symbol = "NVDA (SIM)";
            price = 135.0 +. (Random.float 2.0 -. 1.0);
            atm_vol = 0.42;
            skew_25d = -0.05;
            fly_25d = 0.02;
            timestamp = Unix.gettimeofday ();
          }
      in
      on_update t >>= fun () ->
      Lwt_unix.sleep 5.0 >>= loop (* Fetch every 5 seconds *)
    in
    loop ()
end
