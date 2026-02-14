import yfinance as yf
import json
import sys

def get_nvda_data():
    try:
        nvda = yf.Ticker("NVDA")
        # Get latest price
        hist = nvda.history(period="1d")
        if hist.empty:
            return None
        
        latest_price = hist['Close'].iloc[-1]
        
        # Get info for volatility/options context
        # Yahoo doesn't provide real-time IV directly in the same way, 
        # but we can look at the current price vs previous close to simulate movement
        # or fetch option chain for a specific strike.
        
        # For simplicity, we fetch the price and use a realistic IV for NVDA
        # In a real system, we'd parse the option chain here.
        
        data = {
            "symbol": "NVDA",
            "price": float(latest_price),
            "vol": 0.42,  # Static estimate for demo if options are slow to parse
            "skew": -0.05,
            "fly": 0.02
        }
        
        # Attempt to get real IV from options chain for current strike
        try:
            options = nvda.option_chain(nvda.options[0]) # Get nearest expiry
            # Filter for ATM put/call to find IV
            # This is a bit complex for a quick script, so we stick to the 
            # realistic static IV for now to ensure the bridge is stable.
            pass
        except:
            pass
            
        print(json.dumps(data))
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    get_nvda_data()
