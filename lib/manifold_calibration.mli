(** Manifold Calibration Interface *)

type calibrated_refs = {
  expansion_ref : float * float;
  crash_ref : float * float;
  chop_ref : float * float;
}

(** 
    Performs a synthetic regime stress test to calibrate the manifold 
    reference points. Uses Monte Carlo path generation and Frechet mean 
    optimization on the signature space.
*)
val calibrate_manifold : unit -> calibrated_refs
