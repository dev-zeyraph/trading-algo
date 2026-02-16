(** Manifold Geometry Interface *)

(** Non-negative density type. *)
type density

(** Constructs a density with non-negativity clamping. *)
val make_density : float -> density

(** Extracts the raw float value from a density type. *)
val density_value : density -> float

(** Fisherman Information Metric (Internal/Diagnostic) *)
val fisher_metric : mu:'a -> sigma2:float -> float * float

(** Extracts drift and energy parameters from log-signature coefficients. *)
val params_of_logsig : 
  (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t -> 
  float * float

(** Computes the exhaustion score [0, 1] for a given log-signature. *)
val exhaustion_score : 
  (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t -> 
  density

(** Full manifold state snapshot. *)
type manifold_state = {
  fisher_distance: float;
  curvature: float;
  exhaustion: density;
  mu: float;
  sigma2: float;
  log_signature: float array;
}

(** Computes the full manifold state from path data and signature history. *)
val compute_state : 
  (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t -> 
  (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t -> 
  int -> 
  manifold_state

(** Computes the natural Riemannian distance between two points on the Fisher manifold. *)
val geodesic_distance : (float * float) -> (float * float) -> float
