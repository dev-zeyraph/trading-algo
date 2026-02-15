import yfinance as yf
import json
import sys
import numpy as np
from datetime import datetime, timedelta

def compute_hurst(ts, max_lag=20):
    """Rescaled Range (R/S) method for Hurst Exponent.
    H > 0.5 = trending, H < 0.5 = mean-reverting, H ~ 0.5 = random walk.
    """
    if len(ts) < max_lag * 2:
        return 0.5  # Insufficient data
    
    lags = range(2, max_lag + 1)
    rs_values = []
    
    for lag in lags:
        rs_lag = []
        for start in range(0, len(ts) - lag, lag):
            segment = ts[start:start + lag]
            mean = np.mean(segment)
            dev = segment - mean
            cumdev = np.cumsum(dev)
            R = np.max(cumdev) - np.min(cumdev)
            S = np.std(segment, ddof=1) if np.std(segment, ddof=1) > 0 else 1e-10
            rs_lag.append(R / S)
        if rs_lag:
            rs_values.append((np.log(lag), np.log(np.mean(rs_lag))))
    
    if len(rs_values) < 3:
        return 0.5
    
    x = np.array([v[0] for v in rs_values])
    y = np.array([v[1] for v in rs_values])
    
    # Linear regression: log(R/S) = H * log(n) + c
    slope, _ = np.polyfit(x, y, 1)
    return float(np.clip(slope, 0.0, 1.0))

def compute_gex(stock, price, expiry):
    """Compute Gamma Exposure (GEX) per strike from real options chain data.
    GEX = OI × Gamma × Spot² × ContractSize / 100
    Dealer is assumed short calls (negative gamma) and short puts (positive gamma).
    """
    try:
        chain = stock.option_chain(expiry)
        calls = chain.calls
        puts = chain.puts
        
        gex_by_strike = {}
        
        # Calls: Dealers are typically short calls → negative gamma exposure
        for _, row in calls.iterrows():
            strike = float(row['strike'])
            oi = int(row.get('openInterest', 0)) if not np.isnan(row.get('openInterest', 0)) else 0
            # BSM Gamma approximation from IV if gamma not directly available
            iv = float(row.get('impliedVolatility', 0.3))
            T = max(1, (datetime.strptime(expiry, '%Y-%m-%d') - datetime.now()).days) / 365.0
            
            # BSM Gamma: e^(-d1²/2) / (S * σ * √(2πT))
            d1 = (np.log(price / strike) + (0.5 * iv**2) * T) / (iv * np.sqrt(T)) if iv > 0 and T > 0 else 0
            gamma = np.exp(-d1**2 / 2) / (price * iv * np.sqrt(2 * np.pi * T)) if iv > 0 and T > 0 else 0
            
            # Dealer short calls → negative gamma
            call_gex = -oi * gamma * price**2 * 100 / 1e6  # in millions
            gex_by_strike[strike] = gex_by_strike.get(strike, 0) + call_gex
        
        # Puts: Dealers are typically short puts → positive gamma exposure
        for _, row in puts.iterrows():
            strike = float(row['strike'])
            oi = int(row.get('openInterest', 0)) if not np.isnan(row.get('openInterest', 0)) else 0
            iv = float(row.get('impliedVolatility', 0.3))
            T = max(1, (datetime.strptime(expiry, '%Y-%m-%d') - datetime.now()).days) / 365.0
            
            d1 = (np.log(price / strike) + (0.5 * iv**2) * T) / (iv * np.sqrt(T)) if iv > 0 and T > 0 else 0
            gamma = np.exp(-d1**2 / 2) / (price * iv * np.sqrt(2 * np.pi * T)) if iv > 0 and T > 0 else 0
            
            # Dealer short puts → positive gamma
            put_gex = oi * gamma * price**2 * 100 / 1e6  # in millions
            gex_by_strike[strike] = gex_by_strike.get(strike, 0) + put_gex
        
        # Filter to strikes within ±10% of spot and sort
        strikes = sorted(gex_by_strike.keys())
        result = []
        for s in strikes:
            if abs(s - price) / price < 0.10:  # Within 10% of spot
                result.append({"strike": round(s, 1), "gex": round(gex_by_strike[s], 4)})
        
        return result
    except Exception as e:
        return []

def fetch_stock_intelligence(symbol="NVDA"):
    try:
        stock = yf.Ticker(symbol)
        
        # 1. Fetch Price & Options Context
        hist = stock.history(period="1d")
        if hist.empty:
            return None
        price = float(hist['Close'].iloc[-1])

        # 2. Calculate Realized Volatility (RV)
        hist_long = stock.history(period="3mo")
        if not hist_long.empty and len(hist_long) > 20:
            returns = np.log(hist_long['Close'] / hist_long['Close'].shift(1)).dropna()
            rv_20d = float(returns.tail(20).std() * np.sqrt(252))
            rv_60d = float(returns.tail(60).std() * np.sqrt(252))
            
            # 2b. Hurst Exponents (Price + Volatility)
            price_series = hist_long['Close'].values
            price_returns = np.diff(np.log(price_series))
            hurst_price = compute_hurst(price_returns)
            
            # Rolling volatility series for vol hurst
            if len(price_returns) > 20:
                vol_series = [np.std(price_returns[max(0,i-10):i]) for i in range(10, len(price_returns))]
                hurst_vol = compute_hurst(np.array(vol_series))
            else:
                hurst_vol = 0.5
        else:
            rv_20d = 0.0
            rv_60d = 0.0
            hurst_price = 0.5
            hurst_vol = 0.5

        # 3. Implied Vol & Term Structure
        vol = 0.30
        skew = -0.04
        fly = 0.015
        term_structure = []
        gex_profile = []

        try:
            expirations = stock.options[:5]
            for exp in expirations:
                chain = stock.option_chain(exp)
                atm_idx = (chain.calls['strike'] - price).abs().idxmin()
                iv = float(chain.calls.loc[atm_idx, 'impliedVolatility'])
                days_to_exp = (datetime.strptime(exp, '%Y-%m-%d') - datetime.now()).days
                term_structure.append({"days": max(1, days_to_exp), "iv": round(iv, 4)})
                
                if exp == expirations[0]:
                    vol = iv
                    otm_puts = chain.puts[chain.puts['strike'] < price * 0.95]
                    if not otm_puts.empty:
                        put_iv = otm_puts['impliedVolatility'].mean()
                        skew = float(put_iv - vol)
                    otm_calls = chain.calls[chain.calls['strike'] > price * 1.05]
                    if not otm_calls.empty and not otm_puts.empty:
                        call_iv = otm_calls['impliedVolatility'].mean()
                        fly = float((call_iv + put_iv) / 2 - vol)
                    
                    # GEX from nearest expiry
                    gex_profile = compute_gex(stock, price, exp)
        except Exception:
            pass

        data = {
            "symbol": symbol.upper(),
            "price": round(price, 2),
            "vol": round(vol, 4),
            "skew": round(skew, 4),
            "fly": round(fly, 4),
            "rv_20d": round(rv_20d, 4),
            "rv_60d": round(rv_60d, 4),
            "term_structure": term_structure,
            "gex_profile": gex_profile,
            "hurst_price": round(hurst_price, 4),
            "hurst_vol": round(hurst_vol, 4)
        }
        print(json.dumps(data))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    sym = sys.argv[1] if len(sys.argv) > 1 else "NVDA"
    fetch_stock_intelligence(sym)
