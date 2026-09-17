"""
Mô hình 3D tuabin Francis + biểu đồ phân tích rung động 3D (Plotly).

Module này KHÔNG phụ thuộc model ML — chỉ cần plotly + numpy,
nên chạy được ngay cả khi chưa tải được file .pkl (Git LFS).

Nội dung:
  1. create_turbine_figure()      — Mô hình 3D tuabin Francis nằm ngang
     (trục, gối đỡ, buồng xoắn, bánh xe công tác, máy phát)
     + vị trí cảm biến CSP/CSL/CTP/CTL tô màu theo mức độ rung.
  2. create_vibration_3d_scatter() — Scatter 3D: KPH × Cảm biến × Biên độ,
     màu = |residual| (độ lệch khỏi đường cong đa thức).
  3. create_sensor_space_3d()      — Không gian cảm biến 3D:
     3 cảm biến làm 3 trục, màu = residual trung bình / KPH.
  4. generate_demo_data()          — Dữ liệu giả lập để demo khi chưa có CSV.

Hệ tọa độ tuabin (mét, tương đối):
  X = dọc trục (máy phát bên trái X<0, tuabin bên phải X>0)
  Y = ngang (trái/phải khi nhìn từ trước)
  Z = đứng (lên trên dương)

Tác giả: Agent Mode — 2026-09-17
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np

try:
    import plotly.graph_objects as go
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "Cần cài plotly để dùng module 3D: pip install plotly"
    ) from exc


# ---------------------------------------------------------------------------
# Bảng màu & thông tin cảm biến
# ---------------------------------------------------------------------------

SEVERITY_COLORS = {
    "verde": "#059669",      # xanh lá — bình thường
    "amarillo": "#F59E0B",   # vàng — cảnh báo
    "rojo": "#DC2626",       # đỏ — nguy hiểm
    "desconocido": "#9CA3AF",
    "no cumple": "#6B7280",
}

SEVERITY_VI = {
    "verde": "BÌNH THƯỜNG 🟢",
    "amarillo": "CẢNH BÁO 🟡",
    "rojo": "NGUY HIỂM 🔴",
    "desconocido": "KHÔNG RÕ ⚪",
    "no cumple": "KHÔNG ĐẠT ⚪",
}

# Vị trí cảm biến trên mô hình 3D (x, y, z) — khớp với gối đỡ bên dưới.
#  CSP/CSL -> gối GE-NDE (x = -3.0) | CIL/CIP/CLA* -> gối GE-DE (x = -1.2)
#  CTP/CTL -> gối tuabin T (x = +1.6)
SENSOR_POSITIONS: Dict[str, Tuple[float, float, float]] = {
    # Gối GE-NDE (máy phát, phía xa khớp nối)
    "CSP": (-3.0, 0.85, 0.95),
    "CSL": (-3.0, -0.85, 0.75),
    "CLE": (-3.0, 0.0, 1.15),
    "C1X": (-3.0, 0.85, 0.95),
    "C1Y": (-3.0, -0.85, 0.75),
    # Gối GE-DE (máy phát, phía khớp nối)
    "CIL": (-1.2, 0.85, 0.95),
    "CIP": (-1.2, -0.85, 0.75),
    "CLA": (-1.2, 0.0, 1.15),
    "CLAX": (-1.2, 0.0, 1.15),
    "C2X": (-1.2, 0.85, 0.95),
    "C2Y": (-1.2, -0.85, 0.75),
    # Gối tuabin T
    "CTP": (1.6, 0.95, 0.80),
    "CTL": (1.6, -0.95, 0.80),
    "CTX": (1.6, 0.0, 1.20),
}

SENSOR_DESCRIPTIONS = {
    "CSP": "Gối trên máy phát (GE-NDE, phương đứng)",
    "CSL": "Gối trên máy phát (GE-NDE, phương ngang)",
    "CTP": "Gối tuabin (T, phương đứng)",
    "CTL": "Gối tuabin (T, phương ngang)",
    "CIL": "Gối dưới máy phát (GE-DE)",
    "CIP": "Gối dưới máy phát (GE-DE)",
}

# Ngưỡng hiển thị kích thước marker (micron) — chuẩn hoá trực quan
_MARKER_REF = 150.0


# ---------------------------------------------------------------------------
# Helpers dựng khối hình (Mesh3d)
# ---------------------------------------------------------------------------

def _mesh(
    x, y, z, i, j, k,
    color: str, name: str, opacity: float = 1.0,
    flatshading: bool = False, hoverinfo: str = "name",
) -> "go.Mesh3d":
    return go.Mesh3d(
        x=list(x), y=list(y), z=list(z),
        i=list(i), j=list(j), k=list(k),
        color=color, opacity=opacity, name=name,
        flatshading=flatshading, hoverinfo=hoverinfo,
        lighting=dict(ambient=0.55, diffuse=0.7, specular=0.4,
                      roughness=0.6, fresnel=0.1),
        lightposition=dict(x=2000, y=-1000, z=3000),
    )


def cylinder_along_x(
    x0: float, x1: float, r: float, y0: float = 0.0, z0: float = 0.0,
    n: int = 28, color: str = "#9AA5B1", name: str = "trục",
    opacity: float = 1.0, r1: Optional[float] = None,
) -> "go.Mesh3d":
    """Hình trụ (hoặc côn cụt nếu r1 khác r) dọc trục X."""
    r_end = r if r1 is None else r1
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    cy, sz = np.cos(th), np.sin(th)
    # vòng 1 tại x0, vòng 2 tại x1
    x = [x0] * n + [x1] * n + [x0, x1]
    y = list(y0 + r * cy) + list(y0 + r_end * cy) + [y0, y0]
    z = list(z0 + r * sz) + list(z0 + r_end * sz) + [z0, z0]
    i, j, k = [], [], []
    for a in range(n):
        b = (a + 1) % n
        # mặt bên (2 tam giác)
        i += [a, a]; j += [b, n + b]; k += [n + a, n + a]
        i[-2:] = [a, a]
        # viết tường minh cho rõ:
        # (sửa lại ngay dưới)
    i, j, k = [], [], []
    for a in range(n):
        b = (a + 1) % n
        i += [a, a]
        j += [b, n + b]
        k += [n + a, n + b]
        # tam giác 1: (a, b, n+a) ; tam giác 2: (a, n+b, n+a) -> đảo thứ tự
    # chuẩn hoá lại thứ tự đỉnh cho đúng mặt ngoài:
    i, j, k = [], [], []
    for a in range(n):
        b = (a + 1) % n
        # quad: a -> b -> (n+b) -> (n+a)
        i += [a, a]
        j += [n + a, n + b]
        k += [b, b]
    c0, c1 = 2 * n, 2 * n + 1
    for a in range(n):
        b = (a + 1) % n
        i += [c0, c1]          # nắp 2 đầu
        j += [b, n + a]
        k += [a, n + b]
    return _mesh(x, y, z, i, j, k, color, name, opacity)


def box(
    x0: float, x1: float, y0: float, y1: float, z0: float, z1: float,
    color: str, name: str, opacity: float = 1.0,
) -> "go.Mesh3d":
    x = [x0, x1, x1, x0, x0, x1, x1, x0]
    y = [y0, y0, y1, y1, y0, y0, y1, y1]
    z = [z0, z0, z0, z0, z1, z1, z1, z1]
    faces = [(0, 1, 2), (0, 2, 3), (4, 6, 5), (4, 7, 6),
             (0, 4, 5), (0, 5, 1), (3, 2, 6), (3, 6, 7),
             (1, 5, 6), (1, 6, 2), (0, 3, 7), (0, 7, 4)]
    i, j, k = zip(*faces)
    return _mesh(x, y, z, i, j, k, color, name, opacity)


def torus_around_x(
    xc: float, R: float, r: float, y0: float = 0.0, z0: float = 0.0,
    nu: int = 14, nv: int = 40, color: str = "#3B82F6",
    name: str = "buồng xoắn", opacity: float = 1.0,
) -> "go.Mesh3d":
    """Vành xuyến (buồng xoắn ốc) bao quanh trục X tại xc."""
    u = np.linspace(0, 2 * np.pi, nu, endpoint=False)
    v = np.linspace(0, 2 * np.pi, nv, endpoint=False)
    uu, vv = np.meshgrid(u, v)
    xx = xc + r * np.sin(uu)
    yy = y0 + (R + r * np.cos(uu)) * np.cos(vv)
    zz = z0 + (R + r * np.cos(uu)) * np.sin(vv)
    x, y, z = xx.ravel(), yy.ravel(), zz.ravel()
    i, j, k = [], [], []
    for a in range(nv):
        for b in range(nu):
            p0 = a * nu + b
            p1 = a * nu + (b + 1) % nu
            p2 = ((a + 1) % nv) * nu + b
            p3 = ((a + 1) % nv) * nu + (b + 1) % nu
            i += [p0, p0]; j += [p1, p3]; k += [p2, p2]
            i += [p1, p1]; j += [p3, p2]; k += [p1, p3]
            # gọn lại: 2 tam giác (p0,p1,p3) & (p0,p3,p2)
            i[-4:] = [p0, p0, p1, p1]
            j[-4:] = [p1, p3, p3, p2]
            k[-4:] = [p3, p2, p1, p3]
    # viết lại sạch:
    i, j, k = [], [], []
    for a in range(nv):
        for b in range(nu):
            p0 = a * nu + b
            p1 = a * nu + (b + 1) % nu
            p2 = ((a + 1) % nv) * nu + b
            p3 = ((a + 1) % nv) * nu + (b + 1) % nu
            i += [p0, p0]
            j += [p2, p3]
            k += [p1, p2]
            # tri1=(p0,p2,p1) tri2=(p0,p3,p2) -> chỉnh:
    i, j, k = [], [], []
    for a in range(nv):
        for b in range(nu):
            p0 = a * nu + b
            p1 = a * nu + (b + 1) % nu
            p2 = ((a + 1) % nv) * nu + b
            p3 = ((a + 1) % nv) * nu + (b + 1) % nu
            i.extend([p0, p0])
            j.extend([p1, p3])
            k.extend([p3, p2])
    return _mesh(x, y, z, i, j, k, color, name, opacity)


def _rotated_box_around_x(
    xc: float, angle: float, length: float, width: float, thick: float,
    r_inner: float, color: str, name: str, opacity: float = 1.0,
) -> "go.Mesh3d":
    """Cánh bánh xe: hộp mỏng đặt nghiêng quanh trục X (góc radian)."""
    # tâm cánh cách trục r_inner + length/2
    rc = r_inner + length / 2
    ca, sa = np.cos(angle), np.sin(angle)
    # 8 đỉnh hộp trong mặt YZ rồi quay
    hw, ht = width / 2, thick / 2
    # hộp cục bộ: dx theo X, dy theo bán kính, dz theo tiếp tuyến
    corners = []
    for dx in (-hw, hw):
        for dy in (-length / 2, length / 2):
            for dz in (-ht, ht):
                # vị trí trước quay: y = rc+dy, z = dz, x = xc+dx
                y_raw, z_raw = rc + dy, dz
                y = y_raw * ca - z_raw * sa
                z = y_raw * sa + z_raw * ca
                corners.append((xc + dx, y, z))
    x, y, z = zip(*corners)
    # thứ tự corners: dx(0/1) x dy(0/1) x dz(0/1)
    # mặt hộp chuẩn
    faces = [(0, 1, 3), (0, 3, 2), (4, 6, 7), (4, 7, 5),
             (0, 4, 5), (0, 5, 1), (2, 3, 7), (2, 7, 6),
             (1, 5, 7), (1, 7, 3), (0, 2, 6), (0, 6, 4)]
    i, j, k = zip(*faces)
    return _mesh(x, y, z, i, j, k, color, name, opacity)


# ---------------------------------------------------------------------------
# 1) Mô hình 3D tuabin Francis
# ---------------------------------------------------------------------------

def get_sensor_position(sensor: str, fallback_index: int = 0) -> Tuple[float, float, float]:
    """Trả về toạ độ 3D của cảm biến; cảm biến lạ thì xếp quanh gối tuabin."""
    if sensor in SENSOR_POSITIONS:
        return SENSOR_POSITIONS[sensor]
    # fallback: xếp vòng tròn quanh gối tuabin để không bị đè nhau
    ang = 2 * np.pi * fallback_index / max(1, 6)
    return (1.6 + 0.3 * np.cos(ang * 2), 1.1 * np.cos(ang), 0.9 + 0.4 * np.sin(ang))


def create_turbine_figure(
    severity: Optional[Dict[str, str]] = None,
    max_values: Optional[Dict[str, float]] = None,
    mean_residuals: Optional[Dict[str, float]] = None,
    sensors: Optional[List[str]] = None,
    title: str = "🌀 Mô hình 3D tuabin Francis nằm ngang",
    height: int = 640,
) -> "go.Figure":
    """Dựng mô hình 3D tuabin Francis + cảm biến tô màu theo mức độ rung.

    Args:
        severity: dict {sensor: 'verde'|'amarillo'|'rojo'} (chữ thường).
        max_values: dict {sensor: giá trị max (micron)} — quyết định cỡ marker.
        mean_residuals: dict {sensor: residual trung bình} — hiện ở tooltip.
        sensors: danh sách cảm biến cần vẽ (mặc định lấy từ severity).
        title: tiêu đề hình.
        height: chiều cao (px).
    """
    severity = severity or {}
    max_values = max_values or {}
    mean_residuals = mean_residuals or {}
    if sensors is None:
        sensors = list(severity.keys()) or ["CSP", "CSL", "CTP", "CTL"]

    traces: list = []

    # --- Nền móng + bệ ---
    traces.append(box(-5.0, 4.5, -2.6, 2.6, -2.6, -2.2, "#1F2937", "nền móng"))
    traces.append(box(-4.2, -0.2, -1.2, 1.2, -2.2, -1.1, "#4B5563", "bệ máy phát"))
    traces.append(box(0.6, 3.4, -1.4, 1.4, -2.2, -1.0, "#4B5563", "bệ tuabin"))

    # --- Trục chính + khớp nối ---
    traces.append(cylinder_along_x(-4.4, 3.2, 0.24, color="#C0C7D1", name="trục chính"))
    traces.append(cylinder_along_x(-0.55, 0.05, 0.42, color="#6B7280", name="khớp nối"))
    traces.append(cylinder_along_x(1.05, 1.35, 0.34, color="#6B7280", name="cổ trục tuabin"))

    # --- Gối đỡ (bệ + vỏ gối) ---
    for gx, label in [(-3.0, "gối GE-NDE"), (-1.2, "gối GE-DE"), (1.6, "gối tuabin T")]:
        traces.append(box(gx - 0.45, gx + 0.45, -0.7, 0.7, -1.1, 0.1, "#374151", f"bệ {label}"))
        traces.append(cylinder_along_x(gx - 0.45, gx + 0.45, 0.55, color="#60A5FA",
                                       name=f"vỏ {label}"))
        traces.append(box(gx - 0.45, gx + 0.45, -0.55, 0.55, 0.1, 0.55, "#93C5FD",
                          f"nắp {label}"))

    # --- Máy phát (rotor + vỏ) ---
    traces.append(cylinder_along_x(-4.1, -1.9, 1.05, color="#1D4ED8", name="vỏ máy phát"))
    traces.append(cylinder_along_x(-4.25, -4.05, 0.6, color="#1E3A8A", name="quạt gió"))
    # gân tản nhiệt
    for gx in np.linspace(-3.9, -2.1, 6):
        traces.append(box(gx - 0.06, gx + 0.06, -1.12, 1.12, -1.0, 1.0,
                          "#3B82F6", "gân tản nhiệt", opacity=0.85))

    # --- Buồng xoắn (vỏ ốc) + ống vào ---
    traces.append(torus_around_x(2.35, R=1.55, r=0.55, color="#0EA5E9", name="buồng xoắn"))
    traces.append(cylinder_along_x(2.35, 3.6, 0.5, y0=1.55, z0=0.0, color="#0284C7",
                                   name="ống nước vào"))
    # ống vào thực tế nằm ngang theo Y — dựng thêm đoạn cong đơn giản:
    traces.append(box(2.0, 2.7, 1.3, 2.6, -0.5, 0.5, "#0284C7", "cửa nước vào"))

    # --- Bánh xe công tác (runner): bầu + 13 cánh + vành ---
    traces.append(cylinder_along_x(1.95, 2.75, 0.55, color="#F59E0B", name="bầu bánh xe",
                                   r1=0.35))
    n_blades = 13
    for b in range(n_blades):
        ang = 2 * np.pi * b / n_blades
        traces.append(_rotated_box_around_x(2.35, ang, length=0.85, width=0.5,
                                            thick=0.07, r_inner=0.45,
                                            color="#FBBF24", name="cánh bánh xe"))
    traces.append(torus_around_x(2.35, R=1.30, r=0.10, color="#B45309",
                                 name="vành bánh xe"))

    # --- Cánh hướng (vài cánh tĩnh minh hoạ) ---
    for b in range(8):
        ang = 2 * np.pi * b / 8 + 0.2
        traces.append(_rotated_box_around_x(2.35, ang, length=0.35, width=0.28,
                                            thick=0.06, r_inner=1.45,
                                            color="#A5B4FC", name="cánh hướng",
                                            opacity=0.9))

    # --- Ống hút (draft tube) ---
    traces.append(box(1.9, 2.8, -0.55, 0.55, -2.2, -0.9, "#64748B", "ống hút"))
    traces.append(cylinder_along_x(1.9, 2.8, 0.55, color="#64748B", name="cổ ống hút"))

    # --- Cảm biến ---
    sx, sy, sz, stext, scolor, ssize = [], [], [], [], [], []
    hx, hy, hz, hcolor, hsize = [], [], [], [], []  # halo cho vàng/đỏ
    for idx, s in enumerate(sensors):
        x, y, z = get_sensor_position(s, idx)
        sev = str(severity.get(s, "desconocido")).lower()
        color = SEVERITY_COLORS.get(sev, "#9CA3AF")
        vmax = float(max_values.get(s, 0.0) or 0.0)
        mres = float(mean_residuals.get(s, 0.0) or 0.0)
        size = 9 + 11 * min(vmax / _MARKER_REF, 1.5)
        desc = SENSOR_DESCRIPTIONS.get(s, "Cảm biến rung động")
        sx.append(x); sy.append(y); sz.append(z)
        scolor.append(color); ssize.append(size)
        stext.append(
            f"<b>{s}</b><br>{desc}<br>"
            f"Severidad: <b>{SEVERITY_VI.get(sev, sev)}</b><br>"
            f"Max: {vmax:.2f} µm<br>Residual TB: {mres:.4f}"
        )
        if sev in ("amarillo", "rojo"):
            hx.append(x); hy.append(y); hz.append(z)
            hcolor.append(color); hsize.append(size * 2.2)

    traces.append(go.Scatter3d(
        x=sx, y=sy, z=sz, mode="markers+text", name="cảm biến",
        text=list(sensors), textposition="top center",
        textfont=dict(size=11, color="black"),
        marker=dict(size=ssize, color=scolor, opacity=0.95,
                    line=dict(width=1.5, color="black")),
        hovertext=stext, hoverinfo="text",
    ))
    if hx:
        traces.append(go.Scatter3d(
            x=hx, y=hy, z=hz, mode="markers", name="vùng cảnh báo",
            marker=dict(size=hsize, color=hcolor, opacity=0.25,
                        line=dict(width=0)),
            hoverinfo="skip",
        ))

    # Chú thích mức độ (legend giả bằng trace 2D ẩn — dùng annotation thay)
    fig = go.Figure(data=traces)
    n_verde = sum(1 for s in sensors if str(severity.get(s, "")).lower() == "verde")
    n_ama = sum(1 for s in sensors if str(severity.get(s, "")).lower() == "amarillo")
    n_rojo = sum(1 for s in sensors if str(severity.get(s, "")).lower() == "rojo")
    subtitle = f"🟢 {n_verde} &nbsp; 🟡 {n_ama} &nbsp; 🔴 {n_rojo} &nbsp; · &nbsp;{len(sensors)} cảm biến"
    fig.update_layout(
        title=dict(text=f"{title}<br><sup>{subtitle}</sup>", x=0.02),
        height=height,
        margin=dict(l=0, r=0, t=90, b=0),
        legend=dict(x=0.02, y=0.98, bgcolor="rgba(255,255,255,0.8)", font=dict(size=10)),
        scene=dict(
            xaxis=dict(title="X — dọc trục (m)", backgroundcolor="#F3F4F6",
                       gridcolor="white", showbackground=True),
            yaxis=dict(title="Y — ngang (m)", backgroundcolor="#F3F4F6",
                       gridcolor="white", showbackground=True),
            zaxis=dict(title="Z — đứng (m)", backgroundcolor="#F3F4F6",
                       gridcolor="white", showbackground=True),
            aspectmode="manual",
            aspectratio=dict(x=2.2, y=1.2, z=1.0),
            camera=dict(eye=dict(x=1.6, y=-2.0, z=0.9)),
        ),
    )
    return fig


# ---------------------------------------------------------------------------
# 2) Scatter 3D rung động: KPH × cảm biến × biên độ
# ---------------------------------------------------------------------------

def _downsample(n: int, max_points: int) -> np.ndarray:
    if n <= max_points:
        return np.arange(n)
    return np.linspace(0, n - 1, max_points).astype(int)


def create_vibration_3d_scatter(
    kph,
    sensor_data: Dict[str, Dict],
    sensors: List[str],
    max_points: int = 2000,
    title: str = "📦 Rung động 3D: Tốc độ (KPH) × Cảm biến × Biên độ",
    height: int = 620,
) -> "go.Figure":
    """Scatter 3D mỗi điểm = 1 mẫu đo; màu = |residual|.

    Args:
        kph: mảng tốc độ (n,).
        sensor_data: dict {sensor: {original, predicted, abs_residual, ...}}.
        sensors: thứ tự cảm biến trên trục Y.
        max_points: số điểm tối đa mỗi cảm biến (lấy mẫu đều).
    """
    kph = np.asarray(kph).ravel()
    fig = go.Figure()

    # thang màu chung cho mọi cảm biến
    all_abs = []
    for s in sensors:
        if s in sensor_data:
            all_abs.append(np.asarray(sensor_data[s]["abs_residual"]).ravel())
    cmax = float(np.max(np.concatenate(all_abs))) if all_abs else 1.0
    cmax = cmax if cmax > 0 else 1.0

    for yi, s in enumerate(sensors):
        if s not in sensor_data:
            continue
        d = sensor_data[s]
        orig = np.asarray(d["original"]).ravel()
        pred = np.asarray(d["predicted"]).ravel()
        absres = np.asarray(d["abs_residual"]).ravel()
        n = min(len(kph), len(orig))
        idx = _downsample(n, max_points)
        kk, oo, aa = kph[idx], orig[idx], absres[idx]

        fig.add_trace(go.Scatter3d(
            x=kk, y=np.full_like(kk, yi, dtype=float), z=oo,
            mode="markers", name=f"{s} (đo)",
            marker=dict(size=3.2, color=aa, colorscale="RdYlGn_r",
                        cmin=0, cmax=cmax, opacity=0.75,
                        colorbar=dict(title="|residual|") if yi == 0 else None,
                        showscale=(yi == 0)),
            hovertemplate=(f"<b>{s}</b><br>KPH=%{{x:.1f}}<br>"
                           "Biên độ=%{z:.2f} µm<br>|res|=%{marker.color:.3f}<extra></extra>"),
        ))
        # đường đa thức (sắp xếp theo KPH cho mượt)
        order = np.argsort(kph[:n])
        kk2 = kph[:n][order][::max(1, n // 400)]
        pp2 = pred[:n][order][::max(1, n // 400)]
        fig.add_trace(go.Scatter3d(
            x=kk2, y=np.full_like(kk2, yi, dtype=float), z=pp2,
            mode="lines", name=f"{s} (đa thức)",
            line=dict(width=5, color="red"),
            hovertemplate=f"<b>{s}</b> đường cong chuẩn<extra></extra>",
        ))

    fig.update_layout(
        title=dict(text=title, x=0.02),
        height=height,
        margin=dict(l=0, r=0, t=60, b=0),
        legend=dict(x=0.02, y=0.98, font=dict(size=10),
                    bgcolor="rgba(255,255,255,0.8)"),
        scene=dict(
            xaxis=dict(title="KPH — tốc độ"),
            yaxis=dict(title="Cảm biến", tickmode="array",
                       tickvals=list(range(len(sensors))), ticktext=sensors),
            zaxis=dict(title="Biên độ (µm)"),
            camera=dict(eye=dict(x=1.7, y=-1.6, z=0.9)),
        ),
    )
    return fig


# ---------------------------------------------------------------------------
# 3) Không gian cảm biến 3D
# ---------------------------------------------------------------------------

def create_sensor_space_3d(
    kph,
    sensor_data: Dict[str, Dict],
    sensors: List[str],
    max_points: int = 2500,
    title: str = "🧭 Không gian cảm biến 3D",
    height: int = 620,
) -> "go.Figure":
    """Vẽ 3 cảm biến (hoặc KPH bù) làm 3 trục; màu = residual TB / KPH.

    - ≥3 cảm biến: trục = 3 cảm biến đầu, màu = residual TB mỗi mẫu.
    - 2 cảm biến: trục = S1 × S2 × KPH, màu = residual TB.
    - 1 cảm biến: trục = KPH × biên độ × residual, màu = |residual|.
    """
    kph = np.asarray(kph).ravel()
    avail = [s for s in sensors if s in sensor_data]
    if not avail:
        raise ValueError("Không có dữ liệu cảm biến để vẽ 3D.")

    def arr(s, key):
        return np.asarray(sensor_data[s][key]).ravel()

    n = min(len(kph), min(len(arr(s, "original")) for s in avail))
    idx = _downsample(n, max_points)
    kk = kph[idx]

    # residual trung bình mỗi mẫu qua các cảm biến
    stack = np.column_stack([arr(s, "abs_residual")[:n][idx] for s in avail])
    mean_res = stack.mean(axis=1)

    fig = go.Figure()
    if len(avail) >= 3:
        a, b, c = avail[:3]
        fig.add_trace(go.Scatter3d(
            x=arr(a, "original")[:n][idx], y=arr(b, "original")[:n][idx],
            z=arr(c, "original")[:n][idx], mode="markers", name="mẫu đo",
            marker=dict(size=3.2, color=mean_res, colorscale="RdYlGn_r",
                        opacity=0.75, colorbar=dict(title="res TB")),
            hovertemplate=(f"<b>mẫu</b><br>{a}=%{{x:.2f}}<br>{b}=%{{y:.2f}}<br>"
                           f"{c}=%{{z:.2f}}<extra></extra>"),
            customdata=kk,
        ))
        fig.update_layout(scene=dict(
            xaxis=dict(title=f"{a} (µm)"), yaxis=dict(title=f"{b} (µm)"),
            zaxis=dict(title=f"{c} (µm)")))
    elif len(avail) == 2:
        a, b = avail
        fig.add_trace(go.Scatter3d(
            x=arr(a, "original")[:n][idx], y=arr(b, "original")[:n][idx],
            z=kk, mode="markers", name="mẫu đo",
            marker=dict(size=3.2, color=mean_res, colorscale="RdYlGn_r",
                        opacity=0.75, colorbar=dict(title="res TB")),
            hovertemplate=(f"<b>mẫu</b><br>{a}=%{{x:.2f}}<br>{b}=%{{y:.2f}}<br>"
                           "KPH=%{z:.1f}<extra></extra>")))
        fig.update_layout(scene=dict(
            xaxis=dict(title=f"{a} (µm)"), yaxis=dict(title=f"{b} (µm)"),
            zaxis=dict(title="KPH")))
    else:
        a = avail[0]
        res = arr(a, "residual")[:n][idx]
        fig.add_trace(go.Scatter3d(
            x=kk, y=arr(a, "original")[:n][idx], z=res,
            mode="markers", name="mẫu đo",
            marker=dict(size=3.2, color=np.abs(res), colorscale="RdYlGn_r",
                        opacity=0.8, colorbar=dict(title="|res|")),
            hovertemplate=("<b>mẫu</b><br>KPH=%{x:.1f}<br>Biên độ=%{y:.2f}"
                           "<br>res=%{z:.3f}<extra></extra>")))
        fig.update_layout(scene=dict(
            xaxis=dict(title="KPH"), yaxis=dict(title=f"{a} (µm)"),
            zaxis=dict(title="residual")))

    fig.update_layout(
        title=dict(text=title, x=0.02),
        height=height,
        margin=dict(l=0, r=0, t=60, b=0),
        scene_camera=dict(eye=dict(x=1.6, y=-1.6, z=1.0)),
    )
    return fig


# ---------------------------------------------------------------------------
# 4) Dữ liệu demo (khi chưa có CSV / chưa tải được model)
# ---------------------------------------------------------------------------

def generate_demo_data(
    n: int = 900, seed: int = 42, anomaly: str = "desbalanceo",
) -> Tuple[np.ndarray, Dict[str, Dict], List[str], Dict[str, str], Dict[str, float]]:
    """Sinh dữ liệu giả lập giống tuabin thật để demo 3D.

    Returns:
        (kph, sensor_data, sensors, severity, max_values)
    """
    rng = np.random.default_rng(seed)
    sensors = ["CSP", "CSL", "CTP", "CTL"]
    kph = np.sort(rng.uniform(40, 300, n))

    # đường cong chuẩn bậc 3 khác nhau mỗi cảm biến (biên độ µm)
    coefs = {
        "CSP": (28.0, 0.10, 4.0e-4, -8.0e-7),
        "CSL": (25.0, 0.09, 3.6e-4, -7.0e-7),
        "CTP": (32.0, 0.12, 4.4e-4, -9.0e-7),
        "CTL": (1.1, 0.004, 1.5e-5, -2.5e-8),  # CTL thang nhỏ (mm/s)
    }

    def poly(k, c):
        a0, a1, a2, a3 = c
        return a0 + a1 * k + a2 * k ** 2 + a3 * k ** 3

    sensor_data: Dict[str, Dict] = {}
    max_values: Dict[str, float] = {}
    for s in sensors:
        base = poly(kph, coefs[s])
        noise = rng.normal(0, (0.02 if s != "CTL" else 0.03) * np.abs(base).mean() + 0.4, n)
        orig = base + noise
        # chèn bất thường quanh vùng tốc độ danh định ~ 200-260 KPH
        band = (kph > 190) & (kph < 265)
        if anomaly == "desbalanceo":
            bump = np.zeros(n)
            bump[band] = 18.0 * np.sin(np.pi * (kph[band] - 190) / 75) ** 2
            if s == "CTL":
                bump = bump * 0.06 + 2.4 * (band.astype(float))
            orig = orig + bump * (1.0 if s in ("CSP", "CSL") else 0.6)
        else:  # desalineación — lệch pha 2 gối
            shift = np.zeros(n)
            shift[band] = 22.0 * np.sin(np.pi * (kph[band] - 190) / 75)
            orig = orig + (shift if s in ("CSL", "CTL") else -0.5 * shift)
        pred = poly(kph, coefs[s])
        res = orig - pred
        sensor_data[s] = {
            "original": orig, "predicted": pred, "residual": res,
            "abs_residual": np.abs(res), "mean_residual": float(np.abs(res).mean()),
        }
        max_values[s] = float(np.max(orig))

    # severity demo: 1 xanh, 1 vàng, 1 đỏ để thấy rõ màu trên mô hình
    severity = {"CSP": "verde", "CSL": "amarillo", "CTP": "verde", "CTL": "rojo"}
    return kph, sensor_data, sensors, severity, max_values
