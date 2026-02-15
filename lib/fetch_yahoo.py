import yfinance as yf
import json
import sys
import numpy as np
from datetime import datetime, timedelta

def fetch_stock_intelligence(symbol="NVDA"):
    try:
        stock = yf.Ticker(symbol)
        
        # 1. Fetch Price & Options Context
        hist = stock.history(period="1d")
        if hist.empty:
            return None
        price = float(hist['Close'].iloc[-1])

        # 2. Calculate Realized Volatility (RV)
        # Fetch 65 days to ensure 60 returns
        hist_long = stock.history(period="3mo")
        if not hist_long.empty and len(hist_long) > 20:
            returns = np.log(hist_long['Close'] / hist_long['Close'].shift(1)).dropna()
            
            # 20-day realized (annualized)
            rv_20d = float(returns.tail(20).std() * np.sqrt(252))
            
            # 60-day realized (annualized)
            rv_60d = float(returns.tail(60).std() * np.sqrt(252))
        else:
            rv_20d = 0.0
            rv_60d = 0.0

        # 3. Implied Vol & Term Structure
        vol = 0.30
        skew = -0.04
        fly = 0.015
        term_structure = []

        try:
            expirations = stock.options[:5] # Get first 5 expiries
            for exp in expirations:
                chain = stock.option_chain(exp)
                # Simple ATM IV for term structure
                atm_idx = (chain.calls['strike'] - price).abs().idxmin()
                iv = float(chain.calls.loc[atm_idx, 'impliedVolatility'])
                days_to_exp = (datetime.strptime(exp, '%Y-%m-%d') - datetime.now()).days
                term_structure.append({"days": max(1, days_to_exp), "iv": round(iv, 4)})
                
                # Use nearest expiry for main surface params
                if exp == expirations[0]:
                    vol = iv
                    # Sub-analysis for skew/fly
                    otm_puts = chain.puts[chain.puts['strike'] < price * 0.95]
                    if not otm_puts.empty:
                        put_iv = otm_puts['impliedVolatility'].mean()
                        skew = float(put_iv - vol)
                    
                    otm_calls = chain.calls[chain.calls['strike'] > price * 1.05]
                    if not otm_calls.empty and not otm_puts.empty:
                        call_iv = otm_calls['impliedVolatility'].mean()
                        fly = float((call_iv + put_iv) / 2 - vol)
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
            "term_structure": term_structure
        }
        print(json.dumps(data))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    sym = sys.argv[1] if len(sys.argv) > 1 else "NVDA"
    fetch_stock_intelligence(sym)
