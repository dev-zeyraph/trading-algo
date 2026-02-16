open QCheck
open Quant_kernel
open Neural_sabr

(* Property: Valid parameters should be accepted, invalid rejected *)
let test_sabr_validation =
  let gen = 
    QCheck.Gen.(map (fun (alpha, beta, rho, nu) -> Sabr.{ alpha; beta; rho; nu }) 
      (quad float float float float))
  in
  let arb = QCheck.make gen in
  Test.make ~count:1000
    ~name:"sabr_validation"
    arb
    (fun p ->
       let res = Sabr.validate_params p in
       match res with
       | Ok _ -> 
           p.alpha > 0.0 && p.beta >= 0.0 && p.beta <= 1.0 && 
           p.nu >= 0.0 && p.rho >= -1.0 && p.rho <= 1.0
       | Error _ -> 
           not (p.alpha > 0.0 && p.beta >= 0.0 && p.beta <= 1.0 && 
                p.nu >= 0.0 && p.rho >= -1.0 && p.rho <= 1.0)
    )

(* Property: Heston variance should never be negative *)
let test_heston_non_negative_variance =
  let gen = 
    QCheck.Gen.(map (fun (p, v, kappa, xi) -> (p, v, kappa, xi)) 
      (quad float float float float))
  in
  let arb = QCheck.make gen in
  Test.make ~count:1000
    ~name:"heston_positivity"
    arb
    (fun (p, v, kappa, xi) ->
       let params = { Heston.default_params with kappa; xi } in
       (* Ensure inputs are somewhat sane for the test *)
       if v < 0.0 then true else
       let (_, next_v) = Heston.simulate_step p v 0.1 params in
       next_v >= 0.0
    )

let () =
  QCheck_runner.run_tests_main [
    test_sabr_validation;
    test_heston_non_negative_variance;
  ]
