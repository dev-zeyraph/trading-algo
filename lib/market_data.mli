(** Market Data Interface *)

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

(** Parses a JSON string into a ticker object *)
val parse_ticker : string -> ticker option

(** Fetches real-world data for a symbol (using Python bridge) *)
val fetch_real_data : ?symbol:string -> unit -> ticker option

(** Runs the Heston internal simulator, calling [on_update] with new ticker data *)
val run_simulator : ?symbol:string -> (ticker -> unit Lwt.t) -> unit Lwt.t
