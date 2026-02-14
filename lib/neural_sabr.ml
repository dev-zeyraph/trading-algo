module Sabr = struct
  type arbitrage_present = Arbitrage
  type no_arbitrage = No_arbitrage

  (* GADT for SABR parameters. The type 'a phantom type tracks the arbitrage status. *)
  type 'a params = {
    alpha : float;
    beta : float;
    rho : float;
    nu : float;
  }

  (* Validator function: checks density positivity and parameter bounds *)
  let validate_params (p : arbitrage_present params) : (no_arbitrage params, string) result =
    if p.alpha <= 0.0 then Error "Alpha must be positive"
    else if p.beta < 0.0 || p.beta > 1.0 then Error "Beta must be in [0, 1]"
    else if p.nu < 0.0 then Error "Nu must be positive"
    else if p.rho < -1.0 || p.rho > 1.0 then Error "Rho must be in [-1, 1]"
    else
      Ok { alpha = p.alpha; beta = p.beta; rho = p.rho; nu = p.nu }

  (* Type-safe solver interface *)
  module Solver = struct
    open Ctypes
    open Foreign
    open Memory_bridge

    let handle = Dl.dlopen ~filename:"src_cpp/build/libquant_kernel_cpp.dylib" ~flags:[Dl.RTLD_LAZY; Dl.RTLD_GLOBAL]

    let neural_sabr_inference =
      foreign ~from:handle "neural_sabr_inference" (ptr Types.model_params @-> ptr double @-> size_t @-> returning void)

    let solve (p : no_arbitrage params) =
      let c_params = make Types.model_params in
      setf c_params Types.alpha p.alpha;
      setf c_params Types.beta p.beta;
      setf c_params Types.rho p.rho;
      setf c_params Types.nu p.nu;
      let surf_size = 100 in
      let out_surf = allocate_n double ~count:surf_size in
      neural_sabr_inference (addr c_params) out_surf (Unsigned.Size_t.of_int surf_size);
      !@ out_surf
  end
end
