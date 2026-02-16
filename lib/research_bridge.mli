(** Research Bridge Interface *)

(** 
    Exports the current state of the engine to a JSON file and triggers 
    an external analysis script (Polyglot: R prioritized, Python fallback).
*)

(** Asynchronously snapshots the state and runs the sidecar analysis. *)
val run_async : Manifold_geometry.manifold_state -> float list -> unit

(** EXPERIMENTAL: Blocking analysis execution (Internal Use Only) *)
val execute_analysis : unit -> unit Lwt.t
