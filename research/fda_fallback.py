# ==============================================================================
# Python Fallback: Functional Data Analysis (FDA) for Topological Validation
# ==============================================================================
# Objective: Validate "Roughness" using SciPy B-Splines when R is unavailable.
# Input:  state.json
# Output: diagnostic_manifold.png

import sys
import json
import numpy as np
import matplotlib
matplotlib.use('Agg') # Headless mode
import matplotlib.pyplot as plt
from scipy.interpolate import make_lsq_spline, BSpline

def calculate_roughness(spline, domain=[0, 1]):
    """
    [God Math]: Roughness = Integral( (d^2/dt^2 f(t))^2 ) dt
    We compute the 2nd derivative of the B-Spline and integrate its square.
    """
    # 2nd Derivative of the Spline
    spline_d2 = spline.derivative(nu=2)
    
    # Numerical Integration (trapezoidal) over the domain
    t_eval = np.linspace(domain[0], domain[1], 1000)
    vals = spline_d2(t_eval)
    roughness = np.trapz(vals**2, t_eval)
    return roughness

def main():
    try:
        input_file = sys.argv[1] if len(sys.argv) > 1 else 'state.json'
        with open(input_file, 'r') as f:
            data = json.load(f)
            
        raw_path = np.array(data.get('raw_path', []))
        if len(raw_path) < 4:
            print("Not enough points for spline fitting.")
            return

        n_points = len(raw_path)
        t = np.linspace(0, 1, n_points)
        
        # 1. Fit B-Spline (Order 4 = Cubic)
        # We define knots. For smoothing, we use fewer knots than points.
        n_knots = min(20, max(4, n_points // 2))
        knots = np.linspace(0, 1, n_knots)[1:-1] # Internal knots
        t_knots = np.concatenate(([0]*3, [0], knots, [1], [1]*3)) # Pad for Order 4
        
        # Approximate smoothing via LSQ Spline (similar to FDA roughness penalty)
        spline = make_lsq_spline(t, raw_path, t_knots, k=3)
        
        # 2. Calculate Roughness
        roughness = calculate_roughness(spline)
        
        # 3. OCaml Mismatch
        ocaml_fisher = data['manifold'].get('fisher_distance', 0.0)
        
        # 4. Generate Plot
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 5), facecolor='#050510')
        
        # Plot 1: Smoothing
        t_smooth = np.linspace(0, 1, 200)
        ax1.plot(t, raw_path, 'o', color='#444', markersize=3, label='Raw Tick')
        ax1.plot(t_smooth, spline(t_smooth), '-', color='#00e5ff', linewidth=2, label='B-Spline (FDA)')
        ax1.set_title('B-Spline Smoothing', color='#eee', fontname='monospace')
        ax1.set_facecolor('#050510')
        ax1.tick_params(colors='#888')
        ax1.grid(color='#222', linestyle='--')
        
        # Plot 2: Bar Comparison
        bars = ['Fisher (Geodesic)', 'Roughness (Topo)']
        vals = [ocaml_fisher, np.log1p(roughness)] # Log scale for roughness to be comparable
        colors = ['#00e5ff', '#ff0055']
        
        ax2.bar(bars, vals, color=colors, alpha=0.8)
        ax2.set_title('Geometry vs. Topology', color='#eee', fontname='monospace')
        ax2.set_facecolor('#050510')
        ax2.tick_params(colors='#888')
        ax2.grid(color='#222', linestyle='--')
        
        plt.tight_layout()
        # [FIX]: Output directly to UI public folder
        plt.savefig('ui/public/diagnostic_manifold.png', dpi=100, bbox_inches='tight', facecolor='#050510')
        
        print(f"Python FDA Complete. Roughness: {roughness:.4f}")
        
    except Exception as e:
        print(f"Error in FDA Fallback: {e}")

if __name__ == '__main__':
    main()
