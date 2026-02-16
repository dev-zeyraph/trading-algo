(** Math Guard Interface *)

type safety_status = 
  | Safe
  | Critical_NaN
  | Critical_Inf
  | Layout_Error of string

(** Sets the logging callback for safety violations. *)
val logger_callback : (string -> unit) ref

(** Validates the layout and dimensions of a Bigarray. *)
val validate_layout : 
  (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t -> 
  (unit, string) result

(** Checks if all elements in a Bigarray are finite (neither NaN nor Inf). *)
val check_finite : 
  (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t -> 
  safety_status

(** Executes a signature computation with safety guards against corrupt data. *)
val protected_compute_signature : 
  (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t -> 
  (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t -> 
  bool

(** Computes an exhaustion score with safety clamping and logging. *)
val protected_exhaustion_score : 
  (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t -> 
  Manifold_geometry.density
