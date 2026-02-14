module LSMC = struct
  
  (* Basic 15x15 Linear System Solver (Gaussian Elimination) *)
  let solve_linear_system (a : float array array) (b : float array) =
    let n = Stdlib.Array.length b in
    for i = 0 to n - 1 do
      let max_row = Stdlib.ref i in
      for k = i + 1 to n - 1 do
        if Stdlib.abs_float a.(k).(i) > Stdlib.abs_float a.(!max_row).(i) then max_row := k
      done;
      let temp_a = a.(i) in a.(i) <- a.(!max_row); a.(!max_row) <- temp_a;
      let temp_b = b.(i) in b.(i) <- b.(!max_row); b.(!max_row) <- temp_b;

      for k = i + 1 to n - 1 do
        let factor = a.(k).(i) /. a.(i).(i) in
        b.(k) <- b.(k) -. factor *. b.(i);
        for j = i to n - 1 do
          a.(k).(j) <- a.(k).(j) -. factor *. a.(i).(j)
        done
      done
    done;

    let x = Stdlib.Array.make n 0.0 in
    for i = n - 1 downto 0 do
      let sum = Stdlib.ref 0.0 in
      for j = i + 1 to n - 1 do
        sum := !sum +. a.(i).(j) *. x.(j)
      done;
      x.(i) <- (b.(i) -. !sum) /. a.(i).(i)
    done;
    x

  let solve_regression (x_matrix : float array array) (y_vector : float array) =
    let n = Stdlib.Array.length x_matrix in
    let m = Stdlib.Array.length x_matrix.(0) in
    let xtx = Stdlib.Array.make_matrix m m 0.0 in
    let xty = Stdlib.Array.make m 0.0 in
    for i = 0 to n - 1 do
      for j = 0 to m - 1 do
        for k = 0 to m - 1 do
          xtx.(j).(k) <- xtx.(j).(k) +. x_matrix.(i).(j) *. x_matrix.(i).(k)
        done;
        xty.(j) <- xty.(j) +. x_matrix.(i).(j) *. y_vector.(i)
      done
    done;
    for j = 0 to m - 1 do xtx.(j).(j) <- xtx.(j).(j) +. 1e-9 done;
    solve_linear_system xtx xty

  type option_type = Call | Put

  (* Aligning with Bigarray for zero-copy performance *)
  let price_american (paths : ((float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t * 
                               (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t) array) 
                     (strike : float) (r : float) (dt : float) (opt_type : option_type) =
    let num_paths = Stdlib.Array.length paths in
    let first_path, _ = paths.(0) in
    let num_steps = Bigarray.Array1.dim first_path / 2 in
    
    let cash_flow = Stdlib.Array.init num_paths (fun i ->
      let path, _ = paths.(i) in
      let spot = Bigarray.Array1.get path (2 * (num_steps - 1) + 1) in
      match opt_type with
      | Call -> Stdlib.max 0.0 (spot -. strike)
      | Put -> Stdlib.max 0.0 (strike -. spot)
    ) in
    
    let discount = Stdlib.exp (-. r *. dt) in
    
    for t = num_steps - 2 downto 1 do
      let itm_indices = Stdlib.ref [] in
      for i = 0 to num_paths - 1 do
        let path, _ = paths.(i) in
        let spot = Bigarray.Array1.get path (2 * t + 1) in
        let intrinsic = match opt_type with | Call -> spot -. strike | Put -> strike -. spot in
        if intrinsic > 0.0 then itm_indices := i :: !itm_indices
      done;
      
      let itm_count = Stdlib.List.length !itm_indices in
      if itm_count > 15 then begin
        let x_itm = Stdlib.Array.make_matrix itm_count 15 0.0 in
        let y_itm = Stdlib.Array.make itm_count 0.0 in
        Stdlib.List.iteri (fun idx i ->
          let _path, sig_out = paths.(i) in
          for j = 0 to 14 do x_itm.(idx).(j) <- Bigarray.Array1.get sig_out j done;
          y_itm.(idx) <- cash_flow.(i) *. discount
        ) !itm_indices;
        
        let beta = solve_regression x_itm y_itm in
        
        Stdlib.List.iter (fun i ->
          let path, sig_out = paths.(i) in
          let spot = Bigarray.Array1.get path (2 * t + 1) in
          let intrinsic = match opt_type with | Call -> spot -. strike | Put -> strike -. spot in
          let cont_value = Stdlib.ref 0.0 in
          for j = 0 to 14 do 
            cont_value := !cont_value +. beta.(j) *. Bigarray.Array1.get sig_out j
          done;
          
          if intrinsic > !cont_value then cash_flow.(i) <- intrinsic
          else cash_flow.(i) <- cash_flow.(i) *. discount
        ) !itm_indices;
        
        ()
      end else begin
        for i = 0 to num_paths - 1 do cash_flow.(i) <- cash_flow.(i) *. discount done
      end
    done;
    
    let sum = Stdlib.Array.fold_left (+.) 0.0 cash_flow in
    (sum /. Stdlib.float_of_int num_paths) *. discount

end
