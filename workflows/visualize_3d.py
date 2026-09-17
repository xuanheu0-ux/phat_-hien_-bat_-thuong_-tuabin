"""Tạo file HTML 3D độc lập (mở bằng trình duyệt, không cần Streamlit).

Dùng dữ liệu demo giả lập (giống tuabin thật) vì CSV/model gốc nằm trên Git LFS.

Chạy:
    python -m workflows.visualize_3d
    python -m workflows.visualize_3d --anomaly misalignment --points 1500 --open

Kết quả trong thư mục models/predictions/:
    3d_turbine.html      — mô hình tuabin Francis + cảm biến màu mức độ
    3d_vibration.html    — scatter 3D KPH × cảm biến × biên độ
    3d_sensor_space.html — không gian 3 cảm biến
"""

import argparse
import sys
import webbrowser
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from src.visualization.turbine_3d import (  # noqa: E402
    create_sensor_space_3d,
    create_turbine_figure,
    create_vibration_3d_scatter,
    generate_demo_data,
)

OUT_DIR = ROOT / "models" / "predictions"


def main() -> None:
    ap = argparse.ArgumentParser(description="Sinh mô hình 3D tuabin (HTML Plotly)")
    ap.add_argument("--anomaly", default="desbalanceo",
                    choices=["desbalanceo", "misalignment"],
                    help="Loại bất thường giả lập")
    ap.add_argument("--points", type=int, default=900, help="Số mẫu demo")
    ap.add_argument("--open", action="store_true", help="Mở trình duyệt sau khi xong")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    anomaly = "desalineacion" if args.anomaly == "misalignment" else "desbalanceo"

    print(f"🔧 Sinh {args.points} mẫu demo ({anomaly})...")
    kph, sensor_data, sensors, severity, max_values = generate_demo_data(
        n=args.points, anomaly=anomaly)
    mean_res = {s: sensor_data[s]["mean_residual"] for s in sensors}

    print("🌀 Dựng mô hình tuabin 3D...")
    fig1 = create_turbine_figure(severity, max_values, mean_res, sensors)
    p1 = OUT_DIR / "3d_turbine.html"
    fig1.write_html(str(p1), include_plotlyjs="cdn")
    print(f"   ✓ {p1}")

    print("📦 Dựng scatter rung động 3D...")
    fig2 = create_vibration_3d_scatter(kph, sensor_data, sensors)
    p2 = OUT_DIR / "3d_vibration.html"
    fig2.write_html(str(p2), include_plotlyjs="cdn")
    print(f"   ✓ {p2}")

    print("🧭 Dựng không gian cảm biến 3D...")
    fig3 = create_sensor_space_3d(kph, sensor_data, sensors)
    p3 = OUT_DIR / "3d_sensor_space.html"
    fig3.write_html(str(p3), include_plotlyjs="cdn")
    print(f"   ✓ {p3}")

    print("\n✅ Xong! Mở các file .html trên bằng trình duyệt để xoay/zoom.")
    if args.open:
        webbrowser.open(str(p1))


if __name__ == "__main__":
    main()
