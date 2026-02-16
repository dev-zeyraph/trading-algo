open Lwt.Infix


type term_point = {
  days: int;
  iv: float;
}

type gex_point = {
  strike: float;
  gex: float;
}

type ticker = {
  symbol: string;
  price: float;
  atm_vol: float;
  skew_25d: float;
  fly_25d: float;
  rv_20d: float;
  rv_60d: float;
  term_structure: term_point list;
  gex_profile: gex_point list;
  hurst_price: float;
  hurst_vol: float;
  timestamp: float;
}

let parse_ticker json_str =
  try
    let json = Yojson.Safe.from_string json_str in
    let open Yojson.Safe.Util in
    
    let term_structure = 
      json |> member "term_structure" |> to_list |> List.map (fun j ->
        { days = j |> member "days" |> to_int;
          iv = j |> member "iv" |> to_float }
      ) 
    in

    let gex_profile =
      (try json |> member "gex_profile" |> to_list |> List.map (fun j ->
        { strike = j |> member "strike" |> to_float;
          gex = j |> member "gex" |> to_float }
      ) with _ -> [])
    in

    let hurst_price = try json |> member "hurst_price" |> to_float with _ -> 0.5 in
    let hurst_vol = try json |> member "hurst_vol" |> to_float with _ -> 0.5 in

    Some {
      symbol = json |> member "symbol" |> to_string;
      price = json |> member "price" |> to_float;
      atm_vol = json |> member "vol" |> to_float;
      skew_25d = json |> member "skew" |> to_float;
      fly_25d = json |> member "fly" |> to_float;
      rv_20d = json |> member "rv_20d" |> to_float;
      rv_60d = json |> member "rv_60d" |> to_float;
      term_structure;
      gex_profile;
      hurst_price;
      hurst_vol;
      timestamp = Unix.gettimeofday ();
    }
  with _ -> None

(* Fetch real-world data for any symbol using the Python bridge *)
let fetch_real_data ?(symbol="NVDA") () =
  let cmd = Printf.sprintf "python3 lib/fetch_yahoo.py %s" symbol in
  let chan = Unix.open_process_in cmd in
  let line = try input_line chan with End_of_file -> "" in
  ignore (Unix.close_process_in chan);
  parse_ticker line

(* [GOD MATH] Heston Stochastic Volatility Model (Imported from Heston module) *)

let run_simulator ?(symbol="HESTON-SIM") on_update =
  (* Simulation State *)
  let price = ref 100.0 in
  let vol = ref 0.09 in (* Variance actually, so sqrt(0.09) = 30% vol *)
  let params = Heston.default_params in

  let rec loop () =
    (* High-frequency Loop: Update 10 times per second *)
    let dt = 0.1 in 
    let (next_p, next_v) = Heston.simulate_step !price !vol dt params in
    price := next_p;
    vol := next_v;

    (* Mock Ticker Object *)
    let t = {
      symbol = symbol;
      price = !price;
      atm_vol = sqrt !vol;
      skew_25d = -0.1 *. sqrt !vol; (* Skew deepens with vol *)
      fly_25d = 0.02;
      rv_20d = sqrt !vol;
      rv_60d = sqrt !vol;
      term_structure = [{days=30; iv=sqrt !vol}; {days=60; iv=sqrt !vol *. 1.1}];
      gex_profile = [];
      hurst_price = 0.5 +. (Random.float 0.1 -. 0.05);
      hurst_vol = 0.5;
      timestamp = Unix.gettimeofday ();
    } in

    on_update t >>= fun () ->
    Lwt_unix.sleep 0.1 >>= loop
  in
  loop ()
