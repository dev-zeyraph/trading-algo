#!/usr/bin/env python3
"""
Phase 25: Fisher Information Manifold — Regime Calibration Visualizer
=====================================================================
Generates synthetic regime paths (Bull, Crash, Chop, Creep),
projects them onto the (μ, σ²) manifold plane, computes Fréchet
Mean centroids, and renders a publication-quality matplotlib chart.
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.colors import LinearSegmentedColormap
from matplotlib import patheffects
import os

# ─── Dark Theme ───────────────────────────────────────────────────────
plt.rcParams.update({
    'figure.facecolor': '#0a0a14',
    'axes.facecolor': '#0d0d1a',
    'axes.edgecolor': '#1a1a2e',
    'axes.labelcolor': '#e0e0e0',
    'text.color': '#e0e0e0',
    'xtick.color': '#888',
    'ytick.color': '#888',
    'grid.color': '#1a1a2e',
    'grid.alpha': 0.5,
    'font.family': 'monospace',
    'font.size': 10,
})

np.random.seed(42)

# ─── Regime Parameters ───────────────────────────────────────────────
REGIMES = {
    'Bull Market':     {'drift': 0.15, 'vol': 0.15, 'color': '#00e5ff', 'marker': 'o'},
    'Bear Crash':      {'drift': -0.50, 'vol': 0.60, 'color': '#ff3d00', 'marker': 's'},
    'High Vol Chop':   {'drift': 0.00, 'vol': 0.40, 'color': '#ffab00', 'marker': 'D'},
    'Low Vol Creep':   {'drift': 0.05, 'vol': 0.08, 'color': '#69f0ae', 'marker': '^'},
}

NUM_PATHS = 500
STEPS = 100
DT = 0.01


def generate_paths(drift, vol, num_paths, steps, dt):
    """Generate GBM paths and return (mu, sigma2) manifold coordinates."""
    mus, sigmas = [], []
    for _ in range(num_paths):
        prices = np.zeros(steps)
        prices[0] = 100.0
        for t in range(1, steps):
            eps = np.random.randn()
            ret = (drift - 0.5 * vol**2) * dt + vol * np.sqrt(dt) * eps
            prices[t] = prices[t-1] * np.exp(ret)

        # Compute manifold parameters from price path
        log_returns = np.diff(np.log(prices))
        mu = np.mean(log_returns) * (1.0 / dt)    # Annualized drift
        sigma2 = np.var(log_returns) * (1.0 / dt)  # Annualized variance
        mus.append(mu)
        sigmas.append(sigma2)

    return np.array(mus), np.array(sigmas)


def frechet_mean(mus, sigmas, max_iter=100, lr=0.1, tol=1e-6):
    """Riemannian centroid (Fréchet Mean) via gradient descent."""
    mu_c = np.mean(mus)
    s2_c = np.mean(sigmas)
    for _ in range(max_iter):
        d_mu = np.mean(mus - mu_c)
        d_s2 = np.mean(sigmas - s2_c)
        if abs(d_mu) < tol and abs(d_s2) < tol:
            break
        mu_c += lr * d_mu
        s2_c += lr * d_s2
        s2_c = max(s2_c, 1e-6)
    return mu_c, s2_c


def geodesic_distance(p1, p2):
    """Rao geodesic distance on Q(μ, σ²) Fisher manifold."""
    mu1, s2_1 = p1
    mu2, s2_2 = p2
    s1 = np.sqrt(s2_1)
    s2 = np.sqrt(s2_2)
    ln_ratio = abs(np.log(s2 / s1))
    mu_term = (mu2 - mu1)**2 / (s1 * s2)
    return np.sqrt(2.0 * ln_ratio**2 + mu_term)


# ─── Generate Data ───────────────────────────────────────────────────
regime_data = {}
centroids = {}

for name, params in REGIMES.items():
    mus, sigmas = generate_paths(params['drift'], params['vol'], NUM_PATHS, STEPS, DT)
    regime_data[name] = (mus, sigmas)
    centroids[name] = frechet_mean(mus, sigmas)

# ─── Build Figure ────────────────────────────────────────────────────
fig = plt.figure(figsize=(16, 10))

# Main scatter plot
ax_main = fig.add_axes([0.08, 0.12, 0.55, 0.78])

# Geodesic distance matrix
ax_geo = fig.add_axes([0.68, 0.55, 0.28, 0.35])

# Centroid bar chart
ax_bar = fig.add_axes([0.68, 0.12, 0.28, 0.35])

# ─── Main Scatter: Regime Clusters on Fisher Manifold ─────────────
for name, params in REGIMES.items():
    mus, sigmas = regime_data[name]
    ax_main.scatter(
        mus, sigmas,
        c=params['color'], alpha=0.12, s=12,
        marker=params['marker'], edgecolors='none',
        label=f'{name} (N={NUM_PATHS})',
    )

# Plot centroids with glow
for name, params in REGIMES.items():
    cx, cy = centroids[name]
    # Glow ring
    ax_main.scatter(
        [cx], [cy], c=params['color'], s=600, alpha=0.15,
        marker='o', edgecolors='none', zorder=5,
    )
    # Core dot
    ax_main.scatter(
        [cx], [cy], c=params['color'], s=120, alpha=1.0,
        marker=params['marker'], edgecolors='white', linewidths=1.5,
        zorder=6
    )
    # Label
    ax_main.annotate(
        f'  {name}\n  μ={cx:.2f}, σ²={cy:.2f}',
        (cx, cy), fontsize=7.5, color=params['color'],
        fontweight='bold',
        path_effects=[patheffects.withStroke(linewidth=2, foreground='#0a0a14')],
        zorder=7,
    )

# Draw geodesic lines between centroids
centroid_names = list(centroids.keys())
for i in range(len(centroid_names)):
    for j in range(i+1, len(centroid_names)):
        c1 = centroids[centroid_names[i]]
        c2 = centroids[centroid_names[j]]
        d = geodesic_distance(c1, c2)
        ax_main.plot(
            [c1[0], c2[0]], [c1[1], c2[1]],
            '--', color='#444', alpha=0.4, linewidth=0.8, zorder=3,
        )

ax_main.set_xlabel('μ (Drift Component)', fontsize=12, fontweight='bold')
ax_main.set_ylabel('σ² (Path Energy / Variance)', fontsize=12, fontweight='bold')
ax_main.set_title(
    'Fisher Information Manifold — Regime Calibration',
    fontsize=15, fontweight='bold', color='#ffffff', pad=15,
)
ax_main.legend(
    loc='upper left', fontsize=8, framealpha=0.3,
    edgecolor='#333', facecolor='#111',
)
ax_main.grid(True, alpha=0.15)
ax_main.set_yscale('log')

# ─── Geodesic Distance Heatmap ───────────────────────────────────
names = list(centroids.keys())
n = len(names)
dist_matrix = np.zeros((n, n))
for i in range(n):
    for j in range(n):
        dist_matrix[i, j] = geodesic_distance(centroids[names[i]], centroids[names[j]])

# Custom colormap: dark → cyan → amber
cmap = LinearSegmentedColormap.from_list('manifold', ['#0d0d1a', '#00e5ff', '#ffab00', '#ff3d00'])
im = ax_geo.imshow(dist_matrix, cmap=cmap, aspect='auto')

short_names = ['Bull', 'Crash', 'Chop', 'Creep']
ax_geo.set_xticks(range(n))
ax_geo.set_xticklabels(short_names, fontsize=8)
ax_geo.set_yticks(range(n))
ax_geo.set_yticklabels(short_names, fontsize=8)

# Annotate cells
for i in range(n):
    for j in range(n):
        val = dist_matrix[i, j]
        color = '#000' if val > dist_matrix.max() * 0.6 else '#fff'
        ax_geo.text(j, i, f'{val:.2f}', ha='center', va='center',
                    fontsize=9, fontweight='bold', color=color)

ax_geo.set_title('Geodesic Distance Matrix (Rao)', fontsize=11,
                 fontweight='bold', color='#fff', pad=10)

# ─── Centroid Energy Bar Chart ───────────────────────────────────
colors = [REGIMES[n]['color'] for n in names]
energies = [centroids[n][1] for n in names]

bars = ax_bar.barh(short_names, energies, color=colors, alpha=0.85, edgecolor='#222')

for bar, energy in zip(bars, energies):
    ax_bar.text(
        bar.get_width() * 1.02, bar.get_y() + bar.get_height() / 2,
        f'{energy:.1f}', va='center', fontsize=9, color='#ccc', fontweight='bold',
    )

ax_bar.set_xlabel('σ² (Manifold Energy)', fontsize=10, fontweight='bold')
ax_bar.set_title('Regime Energy Separation', fontsize=11,
                 fontweight='bold', color='#fff', pad=10)
ax_bar.set_xscale('log')
ax_bar.grid(True, axis='x', alpha=0.15)

# ─── Watermark ───────────────────────────────────────────────────
fig.text(
    0.5, 0.02,
    'Phase 25 · Fréchet Mean Calibration · Fisher Information Manifold · Riemannian Gradient Descent',
    ha='center', fontsize=8, color='#555', style='italic',
)

# ─── Save ─────────────────────────────────────────────────────────
out_path = os.path.join(os.path.dirname(__file__), '..', 'manifold_calibration_chart.png')
out_path = os.path.abspath(out_path)
fig.savefig(out_path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
plt.close(fig)

print(f"[CHART] Saved to: {out_path}")
print(f"[CHART] Regimes: {len(REGIMES)}")
print(f"[CHART] Paths per regime: {NUM_PATHS}")
for name in names:
    cx, cy = centroids[name]
    print(f"  {name:20s} → μ={cx:+8.3f}  σ²={cy:12.2f}")
