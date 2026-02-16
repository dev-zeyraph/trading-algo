(** WebSocket Stream Server Interface *)

(** 
    Starts the high-frequency telemetry server on the specified port.
    The server broadcasts path updates, ticker data, and manifold state 
    to all connected clients.
*)
val start : int -> unit Lwt.t
