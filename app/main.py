import os
import sys
import tempfile
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import streamlit as st

ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))
try:
    from src.models.turb_predictor import TurbinePredictor  # noqa: E402
    HAS_ML = True
except ImportError:
    TurbinePredictor = None  # type: ignore
    HAS_ML = False

# === 3D (Plotly) — tùy chọn, app vẫn chạy nếu thiếu ===
try:
    from src.visualization.turbine_3d import (
        create_sensor_space_3d,
        create_turbine_figure,
        create_vibration_3d_scatter,
        generate_demo_data,
    )
    HAS_3D = True
except ImportError:
    HAS_3D = False

# === BẢN DỊCH HIỂN THỊ ===
SEVERITY_VI = {
    "verde": "XANH — BÌNH THƯỜNG",
    "amarillo": "VÀNG — CẢNH BÁO",
    "rojo": "ĐỎ — NGUY HIỂM",
    "desconocido": "KHÔNG XÁC ĐỊNH",
    "no cumple": "KHÔNG ĐẠT",
}

SEVERITY_STATE = {
    "verde": "✅ ỔN ĐỊNH",
    "amarillo": "⚠️ CẢNH BÁO",
    "rojo": "❌ NGUY HIỂM",
}


def translate_prediction(label: str) -> str:
    """Đổi nhãn dự đoán của model sang tiếng Việt."""
    upper = label.upper()
    if "DESALINEA" in upper:
        return label.replace("DESALINEACIÓN", "LỆCH TRỤC").replace(
            "DESALINEACION", "LỆCH TRỤC")
    return label.replace("DESBALANCEO", "MẤT CÂN BẰNG")


def is_misalignment(label: str) -> bool:
    return "DESALINEA" in label.upper() or "LỆCH TRỤC" in label.upper()


# === CẤU HÌNH TRANG ===
st.set_page_config(
    page_title="Phát hiện bất thường tuabin",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.title("⚡ Phát hiện bất thường tuabin thủy điện")
st.markdown("---")

# === CACHE: Nạp mô hình dự đoán một lần duy nhất ===
@st.cache_resource
def load_predictor():
    return TurbinePredictor()

if not HAS_ML:
    predictor = None
    model_ok = False
else:
    try:
        predictor = load_predictor()
        model_ok = True
    except Exception:
        predictor = None
        model_ok = False

# === HÀM PHỤ: Chuyển numpy sang kiểu Python thường ===
def convert_numpy(obj):
    """Chuyển numpy array thành list/float."""
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: convert_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [convert_numpy(item) for item in obj]
    return obj


def build_demo_result(anomaly: str = "desbalanceo", n: int = 900):
    """Tạo kết quả giả lập cùng cấu trúc với predictor.predict()."""
    kph, sensor_data, sensors, severity, max_values = generate_demo_data(
        n=n, anomaly=anomaly)
    stack = np.column_stack([np.asarray(sensor_data[s]["abs_residual"])
                             for s in sensors])
    mean_res = stack.mean(axis=1)
    thr = float(np.percentile(mean_res, 90))
    n_anom = int((mean_res > thr).sum())
    is_desbal = anomaly == "desbalanceo"
    p_lech_truc = 0.07 if is_desbal else 0.93
    return {
        "prediction": "MẤT CÂN BẰNG (demo)" if is_desbal else "LỆCH TRỤC (demo)",
        "confidence": 1 - p_lech_truc if is_desbal else p_lech_truc,
        "probabilities": {"desbalanceo": 1 - p_lech_truc,
                          "desalineacion": p_lech_truc},
        "metadata": {
            "nominal_speed": float(np.median(kph)),
            "samples_analyzed": len(kph),
            "n_anomalies": n_anom,
            "sensors": sensors,
            "sensor_data": sensor_data,
            "kph": kph,
            "max_values": max_values,
        },
        "severity": severity,
    }

# === THANH BÊN ===
with st.sidebar:
    st.header("⚙️ Cấu hình")
    if model_ok:
        st.success("✅ Đã nạp mô hình ML")
    else:
        st.warning("⚠️ Chưa tải được mô hình ML (thiếu file Git LFS) — "
                   "hãy dùng chế độ demo 3D bên dưới.")
    uploaded_file = st.file_uploader("Tải lên file CSV:", type=["csv"])
    st.markdown("---")
    st.subheader("🌀 Dữ liệu demo")
    use_demo = st.checkbox(
        "Dùng dữ liệu demo (không cần CSV/model)",
        value=(not model_ok),
        help="Sinh dữ liệu giả lập giống tuabin thật để xem ngay mô hình 3D.",
    )
    demo_anomaly = st.selectbox(
        "Loại bất thường demo:",
        ["desbalanceo", "misalignment"],
        format_func=lambda x: "Mất cân bằng"
        if x == "desbalanceo" else "Lệch trục",
    )

# === LẤY KẾT QUẢ: file CSV thật hoặc dữ liệu demo ===
result = None
is_demo = False

if uploaded_file is not None and model_ok:

    with st.spinner("🔄 Đang xử lý..."):
        try:
            temp_path = None

            # Kiểm tra định dạng file
            if not uploaded_file.name.endswith('.csv'):
                st.error("❌ Chỉ chấp nhận file CSV")
                st.stop()

            # Lưu file tạm
            with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as temp_file:
                temp_file.write(uploaded_file.getvalue())
                temp_path = temp_file.name

            # Dự đoán
            result = predictor.predict(temp_path)

            # Chuyển numpy sang kiểu Python thường
            sensor_data_clean = {}
            for sensor, data in result.get("sensor_data", {}).items():
                sensor_data_clean[sensor] = {
                    "original": convert_numpy(data["original"]),
                    "predicted": convert_numpy(data["predicted"]),
                    "residual": convert_numpy(data["residual"]),
                    "abs_residual": convert_numpy(data["abs_residual"]),
                    "mean_residual": float(data["mean_residual"])
                }

            # Cấu trúc kết quả cuối cùng
            result = {
                "prediction": translate_prediction(result["prediction"]),
                "confidence": result["confidence"],
                "probabilities": result["probabilities"],
                "metadata": {
                    **result["metadata"],
                    "sensor_data": sensor_data_clean,
                    "kph": convert_numpy(result.get("kph", [])),
                    "max_values": convert_numpy(result.get("max_values", {}))
                },
                "severity": result["severity"]
            }

            # Dọn file tạm
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)

        except Exception as e:
            st.error(f"❌ Lỗi: {str(e)}")
            import traceback
            st.error(traceback.format_exc())
            st.stop()

elif use_demo and HAS_3D:
    with st.spinner("🔄 Đang sinh dữ liệu demo..."):
        result = build_demo_result(demo_anomaly)
        is_demo = True

if uploaded_file is not None and not model_ok:
    st.warning("⚠️ Đã nhận file CSV nhưng mô hình ML chưa sẵn sàng "
               "(thiếu scikit-learn hoặc file model Git LFS). "
               "Hãy bật **dữ liệu demo** để xem mô hình 3D.")

if result is not None:

    if is_demo:
        st.info("🧪 **Chế độ DEMO** — dữ liệu giả lập (không phải số đo thật). "
                "Hãy tải lên file CSV để phân tích thật khi đã có mô hình.")

    # === CÁC TAB ===
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📊 Dự đoán tổng thể",
        "📈 Đồ thị từng cảm biến",
        "🎯 Mức độ rung",
        "🌀 Tuabin 3D",
        "📦 Phân tích 3D",
    ])

    # === TAB 1: DỰ ĐOÁN TỔNG THỂ ===
    with tab1:
        st.subheader("Kết quả dự đoán tổng thể")

        probs = result["probabilities"]
        mat_can_bang_pct = probs["desbalanceo"] * 100
        lech_truc_pct = probs["desalineacion"] * 100

        prediction = result["prediction"]
        confidence = result["confidence"] * 100

        col1, col2 = st.columns([2, 1])

        with col1:
            if is_misalignment(prediction):
                st.error(f"🔴 **{prediction}**\nĐộ tin cậy: {confidence:.1f}%", icon="⚠️")
            else:
                st.success(f"🟢 **{prediction}**\nĐộ tin cậy: {confidence:.1f}%", icon="✅")

        with col2:
            total_points = result["metadata"]["samples_analyzed"]
            st.metric("Tổng số mẫu", total_points)

        st.markdown("---")

        mat_can_bang_points = int(total_points * probs["desbalanceo"])
        lech_truc_points = int(total_points * probs["desalineacion"])

        st.subheader("📊 Phân bố hiện tượng")

        col1, col2 = st.columns(2)

        with col1:
            st.metric(
                "🟢 Mất cân bằng",
                f"{mat_can_bang_points} điểm",
                delta=f"{mat_can_bang_pct:.1f}%"
            )

        with col2:
            st.metric(
                "🔴 Lệch trục",
                f"{lech_truc_points} điểm",
                delta=f"{lech_truc_pct:.1f}%"
            )

        st.markdown("---")

        st.subheader("📋 Thông tin phân tích")
        col1, col2, col3, col4 = st.columns(4)

        with col1:
            st.info(f"**Tốc độ danh định:** {result['metadata']['nominal_speed']:.2f} KPH")
        with col2:
            st.info(f"**Số cảm biến:** {len(result['metadata']['sensors'])}")
        with col3:
            sensors_list = ", ".join(result['metadata']['sensors'])
            st.info(f"**Cảm biến:** {sensors_list}")
        with col4:
            st.info(f"**Độ tin cậy mô hình:** {confidence:.1f}%")

    # === TAB 2: ĐỒ THỊ TỪNG CẢM BIẾN ===
    with tab2:
        st.subheader("📈 Phân tích chi tiết từng cảm biến")

        sensor_data = result["metadata"].get("sensor_data", {})
        sensors = result["metadata"]["sensors"]
        kph = result["metadata"].get("kph", [])
        severity = result["severity"]
        max_values = result["metadata"].get("max_values", {})

        severity_colors = {
            "verde": "#059669",
            "amarillo": "#F59E0B",
            "rojo": "#DC2626"
        }

        for sensor in sensors:
            st.markdown(f"#### {sensor}")

            sensor_severity = severity.get(sensor, "desconocido").lower()
            severity_color = severity_colors.get(sensor_severity, "#666666")
            severity_label = SEVERITY_VI.get(sensor_severity,
                                             sensor_severity.upper())
            max_val = max_values.get(sensor, 0)

            col1, col2, col3 = st.columns(3)
            with col1:
                st.markdown(
                    f"**Mức độ:** "
                    f"<span style='color: {severity_color}; font-size: 16px; font-weight: bold;'>"
                    f"{severity_label}</span>",
                    unsafe_allow_html=True
                )
            with col2:
                st.markdown(f"**Giá trị lớn nhất:** {max_val:.2f}")
            with col3:
                mean_residual = sensor_data.get(sensor, {}).get("mean_residual", 0)
                st.markdown(f"**Sai số trung bình:** {mean_residual:.4f}")

            if sensor in sensor_data:
                fig, ax = plt.subplots(figsize=(12, 5), dpi=100)

                original = sensor_data[sensor]["original"]
                predicted = sensor_data[sensor]["predicted"]
                abs_residual = sensor_data[sensor]["abs_residual"]

                ax.scatter(
                    kph, original,
                    c=abs_residual, cmap="RdYlGn_r",
                    alpha=0.7, s=50, label=f"Dữ liệu đo ({sensor})",
                    edgecolors="black", linewidth=0.5
                )

                ax.plot(kph, predicted, color="red", label="Đường cong chuẩn", linewidth=2.5)
                ax.fill_between(kph, predicted, original, color="gray", alpha=0.2, label="Sai số")

                ax.set_xlabel("KPH (Tốc độ)", fontsize=11, fontweight="bold")
                ax.set_ylabel(f"Biên độ ({sensor})", fontsize=11, fontweight="bold")
                ax.set_title(f"{sensor} - Số đo và đường cong chuẩn", fontsize=12, fontweight="bold")
                ax.legend(loc="best", fontsize=10)
                ax.grid(True, alpha=0.3)

                scatter = ax.collections[0]
                cbar = plt.colorbar(scatter, ax=ax)
                cbar.set_label("|Sai số|", fontsize=10, fontweight="bold")

                plt.tight_layout()
                st.pyplot(fig)

            st.markdown("---")

    # === TAB 3: MỨC ĐỘ RUNG CHI TIẾT ===
    with tab3:
        st.subheader("🎯 Báo cáo mức độ rung từng cảm biến")

        severity = result["severity"]
        max_vals = result["metadata"].get("max_values", {})

        severity_data = []
        for sensor in result["metadata"]["sensors"]:
            level = severity.get(sensor, "desconocido")
            max_val = max_vals.get(sensor, 0)

            severity_data.append({
                "Cảm biến": sensor,
                "Giá trị lớn nhất": f"{max_val:.2f}",
                "Mức độ": SEVERITY_VI.get(level.lower(), level.upper()),
                "Trạng thái": SEVERITY_STATE.get(level.lower(), "❓ CHƯA RÕ")
            })

        df_sev = pd.DataFrame(severity_data)

        html_table = "<table style='width: 100%; border-collapse: collapse;'>"
        html_table += "<tr style='background-color: #1E3A8A; color: white;'>"
        for col in df_sev.columns:
            html_table += (
                f"<th style='padding: 12px; text-align: left; border: 1px solid #ccc;'>"
                f"{col}</th>"
            )
        html_table += "</tr>"

        for idx, row in df_sev.iterrows():
            level_key = [k for k, v in SEVERITY_VI.items()
                         if v == row["Mức độ"]]
            level_key = level_key[0] if level_key else ""

            if "verde" in level_key:
                bg_color = "#DCFCE7"
                text_color = "#059669"
            elif "amarillo" in level_key:
                bg_color = "#FEF3C7"
                text_color = "#F59E0B"
            else:
                bg_color = "#FEE2E2"
                text_color = "#DC2626"

            html_table += f"<tr style='background-color: {bg_color};'>"
            html_table += (
                f"<td style='padding: 12px; border: 1px solid #ccc; color: {text_color}; "
                f"font-weight: bold;'>{row['Cảm biến']}</td>"
            )
            html_table += (
                f"<td style='padding: 12px; border: 1px solid #ccc; color: {text_color}; "
                f"font-weight: bold;'>{row['Giá trị lớn nhất']}</td>"
            )
            html_table += (
                f"<td style='padding: 12px; border: 1px solid #ccc; color: {text_color}; "
                f"font-weight: bold;'>{row['Mức độ']}</td>"
            )
            html_table += (
                f"<td style='padding: 12px; border: 1px solid #ccc; color: {text_color}; "
                f"font-weight: bold;'>{row['Trạng thái']}</td>"
            )
            html_table += "</tr>"

        html_table += "</table>"
        st.markdown(html_table, unsafe_allow_html=True)

        st.markdown("---")

        verde = sum(1 for s in severity.values() if "verde" in s.lower())
        amarillo = sum(1 for s in severity.values() if "amarillo" in s.lower())
        rojo = sum(1 for s in severity.values() if "rojo" in s.lower())

        st.subheader("📋 Tổng hợp trạng thái")
        col1, col2, col3 = st.columns(3)

        with col1:
            st.metric("🟢 Xanh", verde, delta=f"{verde}/{len(severity)}")
        with col2:
            st.metric("🟡 Vàng", amarillo, delta=f"{amarillo}/{len(severity)}")
        with col3:
            st.metric("🔴 Đỏ", rojo, delta=f"{rojo}/{len(severity)}")

        st.markdown("---")

        st.subheader("💡 Khuyến nghị")

        if rojo > 0:
            sensores_rojos = [s for s, level in severity.items() if "rojo" in level.lower()]
            st.error(f"🔴 NGUY HIỂM: {', '.join(sensores_rojos)} - Cần xử lý NGAY LẬP TỨC")

        if amarillo > 0:
            sensores_amarillos = [s for s, level in severity.items() if "amarillo" in level.lower()]
            st.warning(f"🟡 CẢNH BÁO: {', '.join(sensores_amarillos)} - Cần theo dõi liên tục")

        if verde == len(severity):
            st.success("🟢 BÌNH THƯỜNG: Tất cả cảm biến đều trong ngưỡng cho phép")

    # === TAB 4: MÔ HÌNH 3D TUABIN ===
    with tab4:
        st.subheader("🌀 Mô hình 3D tuabin Francis")
        st.caption("Kéo để xoay • Cuộn chuột để thu/phóng • Chuột phải để di chuyển • "
                   "Di chuột lên cảm biến để xem chi tiết")
        if not HAS_3D:
            st.error("❌ Chưa cài plotly. Chạy: `pip install plotly`")
        else:
            severity = result["severity"]
            max_vals = result["metadata"].get("max_values", {})
            sensor_data = result["metadata"].get("sensor_data", {})
            sensors = result["metadata"]["sensors"]
            mean_res = {s: sensor_data.get(s, {}).get("mean_residual", 0)
                        for s in sensors}
            fig3d = create_turbine_figure(severity, max_vals, mean_res, sensors)
            st.plotly_chart(fig3d, use_container_width=True)
            with st.expander("📖 Chú thích"):
                st.markdown("""
                | Màu cảm biến | Ý nghĩa |
                |---|---|
                | 🟢 Xanh lá | Bình thường — trong ngưỡng cho phép |
                | 🟡 Vàng | Cảnh báo — cần theo dõi |
                | 🔴 Đỏ | Nguy hiểm — xử lý ngay (có quầng mờ) |

                **Các bộ phận:** 🔵 vỏ máy phát • 🔵 buồng xoắn (vỏ ốc) •
                🟡 bánh xe công tác 13 cánh • ⚪ trục chính • 🔵 gối đỡ
                (GE-NDE / GE-DE / T) • ⬜ ống hút dưới bánh xe.

                **Vị trí cảm biến:** CSP/CSL → gối GE-NDE •
                CIL/CIP/CLA → gối GE-DE • CTP/CTL → gối tuabin T.
                """)

    # === TAB 5: PHÂN TÍCH 3D ===
    with tab5:
        st.subheader("📦 Phân tích rung động 3D")
        if not HAS_3D:
            st.error("❌ Chưa cài plotly. Chạy: `pip install plotly`")
        else:
            sensor_data = result["metadata"].get("sensor_data", {})
            sensors = result["metadata"]["sensors"]
            kph = result["metadata"].get("kph", [])
            max_pts = st.select_slider(
                "Số điểm tối đa mỗi cảm biến (giảm xuống nếu máy chậm):",
                options=[500, 1000, 2000, 4000], value=2000)
            st.markdown("#### 1️⃣ Tốc độ (KPH) × Cảm biến × Biên độ (màu = |sai số|)")
            fig_vib = create_vibration_3d_scatter(kph, sensor_data, sensors,
                                                  max_points=max_pts)
            st.plotly_chart(fig_vib, use_container_width=True)
            st.caption("Điểm càng đỏ = càng lệch khỏi đường cong chuẩn "
                       "(đa thức bậc 3). Đường đỏ = đường cong chuẩn.")
            st.markdown("---")
            st.markdown("#### 2️⃣ Không gian cảm biến 3D")
            fig_space = create_sensor_space_3d(kph, sensor_data, sensors,
                                               max_points=max_pts)
            st.plotly_chart(fig_space, use_container_width=True)
            st.caption("Mỗi điểm là 1 mẫu đo trong không gian 3 cảm biến. "
                       "Cụm điểm đỏ tách biệt = vùng bất thường.")

else:
    st.info("👈 Hãy tải lên file CSV để bắt đầu phân tích "
            "— hoặc bật **dữ liệu demo** ở thanh bên để xem mô hình 3D ngay.")
    if HAS_3D:
        st.markdown("### 🌀 Xem trước mô hình 3D")
        st.caption("Mô hình demo — bật chế độ demo ở sidebar để phân tích đầy đủ.")
        demo_kph, demo_sd, demo_sensors, demo_sev, demo_max = generate_demo_data(n=300)
        demo_mean = {s: demo_sd[s]["mean_residual"] for s in demo_sensors}
        st.plotly_chart(
            create_turbine_figure(demo_sev, demo_max, demo_mean, demo_sensors,
                                  height=560),
            use_container_width=True)
