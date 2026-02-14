let initialized = ref false

let () =
  let lib_name = 
    if Sys.file_exists "src_cpp/build/libquant_kernel_cpp.dylib" then
      "src_cpp/build/libquant_kernel_cpp.dylib"
    else if Sys.file_exists "libquant_kernel_cpp.dylib" then
      "libquant_kernel_cpp.dylib"
    else
      (* Fallback *)
      "libquant_kernel_cpp.dylib"
  in
  try
    let (_: Dl.library) = Dl.dlopen ~filename:lib_name ~flags:[Dl.RTLD_LAZY; Dl.RTLD_GLOBAL] in
    initialized := true;
    Printf.printf "Loaded C++ wrapper library: %s\n%!" lib_name
  with exn ->
    Printf.eprintf "Failed to load library %s: %s\n%!" lib_name (Printexc.to_string exn);
    raise exn

let init () = if not !initialized then failwith "Library not initialized"
