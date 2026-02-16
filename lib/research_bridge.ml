open Lwt.Infix

let section = Lwt_log.Section.make "research_bridge"

(* [PLAIN ENGLISH]: Saves the current mathematical state of the engine to a JSON file. *)
let serialize_state_to_json manifold_state raw_path filename =
  let json = `Assoc [
    ("timestamp", `Float (Unix.gettimeofday ()));
    ("manifold", `Assoc [
      ("fisher_distance", `Float manifold_state.Manifold_geometry.fisher_distance);
      ("curvature", `Float manifold_state.curvature);
      ("exhaustion", `Float (Manifold_geometry.density_value manifold_state.exhaustion));
    ]);
    ("raw_path", `List (List.map (fun x -> `Float x) raw_path))
  ] in
  let ch = open_out filename in
  output_string ch (Yojson.Safe.to_string json);
  close_out ch

(* [PLAIN ENGLISH]: Smart Dispatcher. Tries R, falls back to Python. *)
let execute_analysis () =
  Lwt_log.info ~section "Starting Research Sidecar Analysis..." >>= fun () ->
  
  (* 1. Try R *)
  let cmd_r = "Rscript research/sidecar_analysis.R state.json > /dev/null 2>&1" in
  let r_status = Sys.command cmd_r in
  
  if r_status = 0 then (
    Lwt_log.info ~section "R Analysis Success. Diagnostic Generated."
  ) else (
    (* 2. Fallback to Python *)
    let cmd_py = "python3 research/fda_fallback.py state.json > /dev/null 2>&1" in
    let py_status = Sys.command cmd_py in
    if py_status = 0 then
      Lwt_log.info ~section "R missing. Python Fallback Success."
    else
      Lwt_log.error ~section "Critical Verification Failure: Both R and Python bridges failed."
  )

(* [PLAIN ENGLISH]: Async wrapper to run this in the background without blocking the kernel. *)
let run_async manifold_state raw_path =
  Lwt.async (fun () ->
    serialize_state_to_json manifold_state raw_path "state.json";
    execute_analysis ()
  )
