# 🌀 Mô hình 3D tuabin Francis (Plotly)

Tài liệu cho module `src/visualization/turbine_3d.py` + 2 tab 3D trong app Streamlit.

## 1. Có gì mới?

| # | Nội dung | File / vị trí |
|---|----------|---------------|
| 1 | Mô hình 3D tuabin Francis nằm ngang: trục, 3 gối đỡ, máy phát, buồng xoắn, bánh xe 13 cánh, ống hút + cảm biến tô màu theo mức độ rung | `src/visualization/turbine_3d.py` → `create_turbine_figure()` · tab **🌀 Tuabin 3D** |
| 2 | Scatter 3D: **KPH × cảm biến × biên độ**, màu = \|residual\| + đường cong đa thức chuẩn | `create_vibration_3d_scatter()` · tab **📦 Phân tích 3D** |
| 3 | Không gian cảm biến 3D: 3 cảm biến làm 3 trục, màu = residual trung bình | `create_sensor_space_3d()` · tab **📦 Phân tích 3D** |
| 4 | Chế độ **demo** (không cần CSV/model) + xem trước 3D ngay khi mở app | `app/main.py` sidebar · `generate_demo_data()` |
| 5 | Script sinh file HTML độc lập, mở bằng trình duyệt | `workflows/visualize_3d.py` → `models/predictions/3d_*.html` |

## 2. Chạy nhanh

```bash
# Cài thêm plotly (nếu chưa có)
pip install plotly

# Cách 1: xem trong app (có demo sẵn, không cần model/CSV)
streamlit run app/main.py
# → bật "Dùng dữ liệu demo" ở sidebar → mở tab 🌀 Tuabin 3D / 📦 Phân tích 3D

# Cách 2: xuất file HTML độc lập
python -m workflows.visualize_3d
python -m workflows.visualize_3d --anomaly misalignment --points 1500 --open
```

## 3. Màu sắc & vị trí cảm biến

| Màu | Giá trị trong code | Ý nghĩa |
|-----|-------------------|---------|
| 🟢 `#059669` | `verde` | Bình thường |
| 🟡 `#F59E0B` | `amarillo` | Cảnh báo — theo dõi (có quầng mờ) |
| 🔴 `#DC2626` | `rojo` | Nguy hiểm — xử lý ngay (có quầng mờ) |

Kích thước marker ∝ giá trị max (chuẩn hoá theo 150 µm).

| Cảm biến | Gối đỡ | Toạ độ 3D (x, y, z) |
|----------|--------|---------------------|
| CSP, CSL, CLE… (`CS*`) | GE-NDE (máy phát, xa khớp nối) | x = −3.0 |
| CIL, CIP, CLA… (`CI*/CLA*`) | GE-DE (máy phát, gần khớp nối) | x = −1.2 |
| CTP, CTL… (`CT*`) | T (tuabin) | x = +1.6 |

Cảm biến lạ (tên khác) được xếp tự động quanh gối tuabin — xem
`get_sensor_position()` / `SENSOR_POSITIONS` để thêm vị trí mới.

Hệ tọa độ: **X** = dọc trục (máy phát trái, tuabin phải),
**Y** = ngang, **Z** = đứng. Đơn vị mét (tương đối, minh hoạ).

## 4. Tùy chỉnh

```python
from src.visualization.turbine_3d import create_turbine_figure

fig = create_turbine_figure(
    severity={"CSP": "verde", "CSL": "rojo"},   # chữ thường
    max_values={"CSP": 45.0, "CSL": 160.0},     # µm → cỡ marker
    mean_residuals={"CSP": 0.5, "CSL": 3.2},    # hiện ở tooltip
    height=700,
)
fig.show()  # hoặc fig.write_html("turbine.html")
```

- Đổi màu: sửa `SEVERITY_COLORS`.
- Thêm cảm biến mới: thêm vào `SENSOR_POSITIONS` + `SENSOR_DESCRIPTIONS`.
- Giảm tải khi nhiều điểm: tham số `max_points` (mặc định 2000–2500,
  lấy mẫu đều nên vẫn giữ hình dạng đường cong).

## 5. Lưu ý

- Module 3D **không phụ thuộc model ML** — chỉ cần `plotly` + `numpy`,
  nên vẫn chạy khi file `.pkl`/CSV còn là con trỏ Git LFS.
- File HTML xuất ra dùng `plotly.js` qua CDN → cần mạng khi mở lần đầu.
- Kích thước tuabin là minh hoạ tương đối, không phải bản vẽ chế tạo.
  Muốn dựng đúng kích thước thật: thay các hằng số trong
  `create_turbine_figure()` bằng số đo thực tế của tổ máy.
