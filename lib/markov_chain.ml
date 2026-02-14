open Stdlib
open Ctypes
open Foreign

module Markov = struct
  
  let handle = Dl.dlopen ~filename:"" ~flags:[Dl.RTLD_LAZY; Dl.RTLD_GLOBAL]

  (* External SpMV binding *)
  let spmv_csr = 
    foreign ~from:handle "spmv_csr" (ptr double @-> ptr int @-> ptr int @-> int @-> int @-> ptr double @-> ptr double @-> int @-> returning void)

  (* Graph representation: Adjacency list *)
  type transition = { target : int; prob : float }
  type graph = (int, transition list) Hashtbl.t

  (* CSR Matrix representation *)
  type csr_matrix = {
    values : (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t;
    col_indices : (int32, Bigarray.int32_elt, Bigarray.c_layout) Bigarray.Array1.t;
    row_ptr : (int32, Bigarray.int32_elt, Bigarray.c_layout) Bigarray.Array1.t;
    num_rows : int;
    num_cols : int;
    nnz : int;
  }

  (* Pruning function: Remove any transition with p < epsilon *)
  let prune_graph (g : graph) (epsilon : float) : graph =
    let new_g = Hashtbl.create (Hashtbl.length g) in
    Hashtbl.iter (fun node transitions ->
      let valid_transitions = List.filter (fun t -> t.prob >= epsilon) transitions in
      if valid_transitions <> [] then
        Hashtbl.add new_g node valid_transitions
    ) g;
    new_g

  let to_csr (g : graph) num_nodes =
    let nnz = Hashtbl.fold (fun _ transitions acc -> acc + List.length transitions) g 0 in
    let values = Bigarray.Array1.create Bigarray.float64 Bigarray.c_layout nnz in
    let col_indices = Bigarray.Array1.create Bigarray.int32 Bigarray.c_layout nnz in
    let row_ptr = Bigarray.Array1.create Bigarray.int32 Bigarray.c_layout (num_nodes + 1) in
    let current_idx = ref 0 in
    Bigarray.Array1.set row_ptr 0 Int32.zero;
    for i = 0 to num_nodes - 1 do
      let transitions = try Hashtbl.find g i with Not_found -> [] in
      List.iter (fun t ->
        Bigarray.Array1.set values !current_idx t.prob;
        Bigarray.Array1.set col_indices !current_idx (Int32.of_int t.target);
        incr current_idx
      ) transitions;
      Bigarray.Array1.set row_ptr (i+1) (Int32.of_int !current_idx);
    done;
    { values; col_indices; row_ptr; num_rows = num_nodes; num_cols = num_nodes; nnz }

end
