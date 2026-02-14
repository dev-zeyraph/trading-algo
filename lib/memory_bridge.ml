open Ctypes
open Foreign
let () = Config.init ()

(* Define the C struct layout *)
module Types = struct
  type model_params
  let model_params : model_params structure typ = structure "ModelParams"
  let alpha = field model_params "alpha" double
  let beta = field model_params "beta" double
  let rho = field model_params "rho" double
  let nu = field model_params "nu" double
  let padding = field model_params "padding" (array 4 double)
  let () = seal model_params
end

(* Interface to the C++ library *)
module FFI = struct
  (* We assume the shared library will be loaded. 
     In a real app, we might strictly load "libquant_kernel_cpp.so" *)
     
  let process_model_params =
    foreign "process_model_params" (ptr double @-> size_t @-> returning void)

end

(* Memory Bridge Logic *)
module Bridge = struct
  (* specific Bigarray type for double precision floats *)
  type buf = (float, Bigarray.float64_elt, Bigarray.c_layout) Bigarray.Array1.t

  (* Create a shared memory buffer managed by OCaml GC but accessible to C *)
  let create_buffer n_params : buf =
    (* Size of struct in doubles = 4 + 4 = 8 doubles = 64 bytes *)
    let doubles_per_param = 8 in 
    Bigarray.Array1.create Bigarray.float64 Bigarray.c_layout (n_params * doubles_per_param)

  (* Get the raw pointer to pass to C *)
  let ptr_of_buffer (b: buf) =
    bigarray_start array1 b |> to_voidp |> from_voidp double

  (* Example of writing to the buffer *)
  let set_param (b: buf) index (a, beta, r, n) =
    let offset = index * 8 in
    b.{offset + 0} <- a;
    b.{offset + 1} <- beta;
    b.{offset + 2} <- r;
    b.{offset + 3} <- n;
    (* padding *)
    b.{offset + 4} <- 0.0;
    b.{offset + 5} <- 0.0;
    b.{offset + 6} <- 0.0;
    b.{offset + 7} <- 0.0

end
