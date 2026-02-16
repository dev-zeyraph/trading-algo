export const DEFAULT_HESTON_PARAMS = {
    // [GOD MATH] Heston Stochastic Volatility Parameters
    // dS_t = mu * S_t * dt + sqrt(V_t) * S_t * dW_t^S
    // dV_t = kappa * (theta - V_t) * dt + xi * sqrt(V_t) * dW_t^V

    kappa: 2.0,   // Mean Reversion Speed: How fast vol pulled back to long-run
    theta: 0.09,  // Long Run Variance: (0.3)^2 = 0.09 corresponds to 30% Vol
    xi: 0.3,      // Vol of Vol: The "Tail Risk" parameter. High = Fat Tails.
    rho: -0.7,    // Correlation: Leverage Effect. Price falls -> Vol Spikes.
    mu: 0.0       // Drift: Assumed risk-neutral for options
};
