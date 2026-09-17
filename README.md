# ⚡ Phát hiện bất thường tuabin thủy điện

**Hệ thống ML phát hiện và phân loại bất thường (mất cân bằng vs lệch trục) ở tuabin thủy điện Francis bằng phân tích sai số (residual) và các bộ phân loại xác suất.**

---

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Tính năng](#tính-năng)
- [Kiến trúc](#kiến-trúc)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Yêu cầu](#yêu-cầu)
- [Cài đặt](#cài-đặt)
- [Sử dụng](#sử-dụng)
  - [Huấn luyện mô hình](#huấn-luyện-mô-hình)
  - [Huấn luyện bộ phân loại](#huấn-luyện-bộ-phân-loại)
  - [Dự đoán](#dự-đoán)
  - [Chạy giao diện web](#chạy-giao-diện-web)
  - [Mô hình 3D](#mô-hình-3d)
- [API REST (cũ)](#api-rest-cũ)
- [Quy trình CI/CD](#quy-trình-cicd)
- [Triển khai](#triển-khai)
- [Tài liệu kỹ thuật](#tài-liệu-kỹ-thuật)

---

## 🎯 Tổng quan

Dự án triển khai một **hệ thống machine learning hoàn chỉnh** để phát hiện bất thường ở tuabin thủy điện. Hệ thống:

1. **Xử lý dữ liệu cảm biến** rung động (CSP, CSL, CTP, CTL) ở các tốc độ khác nhau (KPH)
2. **Huấn luyện mô hình sai số** dùng đa thức bậc 3 để nắm bắt độ rung nền
3. **Huấn luyện các bộ phân loại xác suất** (Linear, Logistic, GMM) để phân biệt:
   - **Mất cân bằng (Desbalanceo)**: mất cân bằng khối lượng quay
   - **Lệch trục (Desalineación)**: lệch trục quay
4. **Tính mức độ** theo 3 cấp (Xanh, Vàng, Đỏ) cho từng cảm biến
5. **Trực quan hóa tương tác** qua Streamlit (bao gồm mô hình 3D)

---

## ✨ Tính năng

✅ **Mô hình sai số mạnh mẽ**: khớp đa thức theo từng cảm biến để nắm mẫu nền  
✅ **3 bộ phân loại xác suất**: Linear, Logistic, GMM — đều có kiểm chứng train/test  
✅ **Mức độ nhiều cấp**: đánh giá theo từng cảm biến với ngưỡng tùy chỉnh  
✅ **Giao diện web tương tác**: Streamlit với 5 tab (Dự đoán, Đồ thị, Mức độ, Tuabin 3D, Phân tích 3D)  
✅ **Mô hình 3D tương tác**: tuabin Francis 3D (Plotly) + 2 đồ thị phân tích 3D + chế độ demo không cần CSV/model — xem `docs/3D_MODEL.md`  
✅ **Theo dõi thí nghiệm**: MLflow để tái lập kết quả  
✅ **Đã docker hóa**: docker-compose tích hợp MLflow  
✅ **Đã triển khai**: Streamlit Cloud bản production  

---

## 🏗️ Kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                    Dữ liệu CSV (cảm biến)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
    ┌────▼─────┐              ┌──────────▼────┐
    │ EDA       │              │ Tiền xử lý    │
    │ (eda.py)  │              │ (pipeline.py) │
    └────┬─────┘              └──────────┬────┘
         │                               │
         └───────────────┬───────────────┘
                         │
         ┌───────────────▼───────────────┐
         │  Mô hình sai số (huấn luyện)  │
         │  - Đa thức bậc 3              │
         │  - Theo từng cảm biến         │
         │  - residuals_CSP_v3.pkl       │
         └───────────────┬───────────────┘
                         │
         ┌───────────────▼───────────────┐
         │  Trích xuất đặc trưng         │
         │  - 12 đặc trưng thống kê      │
         │  - Theo từng file huấn luyện  │
         └───────────────┬───────────────┘
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
┌───▼────┐          ┌────▼────┐          ┌───▼────┐
│ Linear │          │ Logistic │          │  GMM   │
└───┬────┘          └────┬────┘          └───┬────┘
    │                    │                    │
    └────────────────────┼────────────────────┘
                         │
         ┌───────────────▼───────────────┐
         │  Dự đoán trên dữ liệu mới     │
         │  - Sai số từng mẫu            │
         │  - Xác suất                   │
         │  - Mức độ từng cảm biến       │
         └───────────────┬───────────────┘
                         │
         ┌───────────────▼───────────────┐
         │  Giao diện Streamlit          │
         │  ├─ Tab 1: Dự đoán tổng thể   │
         │  ├─ Tab 2: Đồ thị cảm biến    │
         │  ├─ Tab 3: Mức độ chi tiết    │
         │  ├─ Tab 4: Tuabin 3D          │
         │  └─ Tab 5: Phân tích 3D       │
         └───────────────────────────────┘
```

---

## 📁 Cấu trúc dự án

```
hydro-turb-ai-anomaly/
│
├── 📂 src/
│   ├── 📂 models/
│   │   ├── anomaly_detector.py          # Lớp phát hiện chính
│   │   ├── classifier.py                # Bộ phân loại (Linear/Logistic/GMM)
│   │   ├── residuals_model.py           # Mô hình sai số nền
│   │   ├── sensor_selector.py           # Chọn cảm biến
│   │   ├── turb_predictor.py            # Bộ dự đoán tích hợp
│   │   └── vibration_severity_checker.py # Đánh giá mức độ rung
│   │
│   ├── 📂 preprocessing/
│   │   ├── eda_loader.py                # Nạp dữ liệu & EDA ban đầu
│   │   └── pipeline.py                     # Tiện ích
│   │
│   └── 📂 visualization/
│       ├── charts.py                    # Đồ thị matplotlib
│       ├── eda_plots.py                 # Đồ thị khám phá
│       ├── plots.py                    # Hình vẽ bổ sung
│       └── turbine_3d.py                # Mô hình 3D tuabin + đồ thị 3D (Plotly)
│
├── 📂 workflows/
│   ├── eda.py                           # Phân tích khám phá dữ liệu
│   ├── preprocess.py                    # Tiền xử lý dữ liệu
│   ├── train_model.py                   # Huấn luyện mô hình sai số
│   ├── train_classifier.py              # Huấn luyện bộ phân loại
│   ├── predict_anomalies.py             # Dự đoán trên dữ liệu mới
│   ├── generate_reports.py              # Sinh báo cáo
│   ├── visualize_3d.py                  # Xuất file HTML 3D độc lập
│   └── __init__.py
│
├── 📂 configs/
│   └── config.py                      # Tham số tùy chỉnh
│
├── 📂 app/
│   └── main.py                          # Giao diện Streamlit (tiếng Việt)
│
├── 📂 docs/
│   └── 3D_MODEL.md                      # Tài liệu mô hình 3D
│
├── 📂 data/
│   ├── raw/                             # Dữ liệu gốc
│   ├── processed/
│   │   ├── imbalance/                   # Dữ liệu mất cân bằng
│   │   └── misalignment/                # Dữ liệu lệch trục
│   └── reports/                         # Báo cáo đã sinh
│
├── 📂 models/
│   ├── predictions/                     # Dự đoán + file HTML 3D (3d_*.html)
│   └── trained/                         # Mô hình đã huấn luyện
│       ├── residuals_CSP_v3.pkl         # Mô hình sai số
│       ├── classifier_linear.pkl
│       ├── classifier_logistic.pkl
│       ├── classifier_gmm.pkl
│       ├── classifier_best.pkl
│       └── best_classifier_metadata.json
│
├── 📂 mlruns/                           # Thí nghiệm MLflow (tùy chọn)
├── 📂 mlartifacts/                      # Artifact MLflow (tùy chọn)
│
├── 📂 .github/workflows/
│   ├── preprocess_on_data_change.yml    # Kích hoạt tiền xử lý khi đổi dữ liệu
│   └── preprocess_on_pipeline_change.yml # Kích hoạt khi đổi pipeline.py
│
├── Dockerfile                           # Image Docker
├── docker-compose.yml                   # Dịch vụ (MLflow + API)
├── requirements.txt                     # Thư viện Python
├── .env                                 # Biến môi trường
├── .gitignore
└── README.md                            # File này
```

---

## 📦 Yêu cầu

### Hệ thống
- **Python**: 3.11+
- **Docker**: 24.0+ (tùy chọn, cho các dịch vụ)
- **RAM**: 4GB+ (huấn luyện)
- **CPU**: 2+ nhân

### Thư viện Python

```txt
# Core ML/Data
pandas==2.2.0
numpy==1.24.3
scikit-learn==1.3.2
scipy==1.11.4

# Mô hình
scikit-learn==1.3.2

# Trực quan hóa
matplotlib==3.8.2
seaborn==0.13.0

# Web/API
streamlit==1.28.1
fastapi==0.104.1
uvicorn==0.24.0

# MLflow (theo dõi)
mlflow==2.9.0

# Tiện ích
python-dotenv==1.0.0
pydantic==2.4.2
joblib==1.3.2

# Phát triển
pytest==7.4.3
black==23.12.0
flake8==6.1.0
```

---

## ⚙️ Cài đặt

### 1. Nhân bản repo

```bash
git clone https://github.com/tu-usuario/hydro-turb-ai-anomaly.git
cd hydro-turb-ai-anomaly
```

### 2. Tạo môi trường ảo

```bash
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# hoặc
.venv\Scripts\activate  # Windows
```

### 3. Cài thư viện

```bash
pip install -r requirements.txt
# Thêm plotly để dùng mô hình 3D:
pip install plotly
```

### 4. Cấu hình biến môi trường

```bash
cp .env.example .env
# Sửa .env theo giá trị của bạn
```

### 5. Tải dữ liệu (nếu có)

```bash
# Đặt file CSV vào data/raw/
# Cấu trúc mong đợi:
# data/
# ├── raw/
# │   ├── desbalanceo_archivo1.csv
# │   ├── desbalanceo_archivo2.csv
# │   ├── desalineacion_archivo1.csv
# │   └── ...
```

---

## 🚀 Sử dụng

### Chạy dưới dạng module

Mọi script đều phải chạy dưới dạng **module** từ thư mục gốc dự án:

```bash
python -m workflows.ten_script
```

### 1️⃣ Phân tích khám phá (EDA)

```bash
python -m workflows.eda
```

**Kết quả:**
- Thống kê mô tả
- Phân bố theo cảm biến
- Đồ thị trong `data/reports/eda/`
- Hồ sơ từng file

---

### 2️⃣ Tiền xử lý

```bash
python -m workflows.preprocess
```

**Kết quả:**
- `data/processed/imbalance/` - Dữ liệu mất cân bằng
- `data/processed/misalignment/` - Dữ liệu lệch trục
- Thống kê chuẩn hóa
- Phát hiện giá trị ngoại lai

---

### 3️⃣ Huấn luyện mô hình sai số

```bash
python -m workflows.train_model
```

**Tham số (trong `configs/config.py`):**
```python
POLYNOMIAL_DEGREE = 3  # Bậc đa thức
TEST_SIZE = 0.2        # Tỷ lệ test
RANDOM_STATE = 42
```

**Kết quả:**
- `models/trained/residuals_CSP_v3.pkl` - Mô hình đã lưu
- Chỉ số khớp theo từng cảm biến
- Đồ thị sai số trong `mlartifacts/`
- Thí nghiệm ghi nhận trên MLflow

---

### 4️⃣ Huấn luyện bộ phân loại

```bash
python -m workflows.train_classifier
```

**Các phương pháp được huấn luyện:**
1. **Linear** - Nội suy dựa trên phân vị
2. **Logistic** - Hồi quy logistic (sklearn)
3. **GMM** - Mô hình hỗn hợp Gauss

**Kết quả:**
- `models/trained/classifier_*.pkl` - 3 bộ phân loại
- `models/trained/classifier_best.pkl` - Mô hình tốt nhất (theo độ chính xác test)
- `models/trained/best_classifier_metadata.json` - Thông tin mô hình tốt nhất
- So sánh trên MLflow (train vs test, đường ROC, ...)

**Chọn mô hình tốt nhất:**
```
Nếu độ chính xác test bằng nhau: Logistic > GMM > Linear
Tự phát hiện overfitting (chênh lệch > 0.15)
```

---

### 5️⃣ Dự đoán

```bash
python -m workflows.predict_anomalies
```

**Đầu vào:** file CSV trong `data/processed/imbalance/`

**Kết quả:**
- Phân loại tổng thể (Mất cân bằng/Lệch trục)
- Xác suất (P(Mất cân bằng), P(Lệch trục))
- Mức độ từng cảm biến (Xanh/Vàng/Đỏ)
- Đồ thị trong `models/predictions/`
- Báo cáo JSON chứa kết quả

**Ví dụ kết quả:**
```json
{
  "prediction": "MẤT CÂN BẰNG",
  "confidence": 0.98,
  "probabilities": {
    "desbalanceo": 0.98,
    "desalineacion": 0.02
  },
  "severity": {
    "CSP": "verde",
    "CSL": "amarillo",
    "CTP": "verde",
    "CTL": "rojo"
  }
}
```

---

### 6️⃣ Chạy giao diện web (Streamlit)

```bash
streamlit run app/main.py
```

**Địa chỉ local:** `http://localhost:8501`

**Các tab:**
1. **Dự đoán tổng thể**
   - Phân loại và độ tin cậy
   - Phân bố hiện tượng (điểm mất cân bằng vs lệch trục)
   - Thông tin phân tích

2. **Đồ thị từng cảm biến**
   - Dữ liệu đo vs dự đoán (scatter plot)
   - Đường cong đa thức (đường đỏ)
   - Sai số (vùng tô xám)
   - Thanh màu theo độ lớn sai số

3. **Mức độ chi tiết**
   - Bảng từng cảm biến kèm đánh giá
   - Tổng hợp trạng thái (Xanh/Vàng/Đỏ)
   - Khuyến nghị tự động

4. **🌀 Tuabin 3D**
   - Mô hình 3D tuabin Francis nằm ngang (trục, 3 gối đỡ,
     máy phát, buồng xoắn, bánh xe 13 cánh, ống hút)
   - Cảm biến tô màu theo mức độ rung
   - Kéo để xoay, cuộn chuột để thu/phóng

5. **📦 Phân tích 3D**
   - Scatter 3D: KPH × cảm biến × biên độ (màu = |sai số|)
   - Không gian cảm biến 3D

**Cách dùng:**
1. Tải file CSV từ sidebar
2. Chờ xử lý
3. Xem kết quả ở các tab
4. Chưa có CSV/model: bật **"Dùng dữ liệu demo"** ở sidebar
   để xem ngay mô hình 3D với dữ liệu giả lập

---

### 7️⃣ Mô hình 3D

Chi tiết đầy đủ xem `docs/3D_MODEL.md`.

**Xuất file HTML 3D độc lập (không cần Streamlit):**
```bash
python -m workflows.visualize_3d
python -m workflows.visualize_3d --anomaly misalignment --points 1500 --open
# → models/predictions/3d_turbine.html
# → models/predictions/3d_vibration.html
# → models/predictions/3d_sensor_space.html
```

---

## 🐳 Docker & MLflow

### Khởi động dịch vụ (Dev)

```bash
docker-compose up -d
```

**Dịch vụ:**
- **MLflow**: `http://localhost:5000` - Theo dõi thí nghiệm
- **API**: `http://localhost:8000` - (Cũ, hiện không dùng)

**Volumes:**
```
./mlruns -> /mlflow/mlruns              (Backend store)
./mlartifacts -> /mlflow/mlartifacts    (Artifact store)
./ -> /app                               (Mã nguồn)
./data -> /app/data                      (Dữ liệu)
```

### Dừng dịch vụ

```bash
docker-compose down
```

### Xem log

```bash
docker-compose logs -f mlflow
docker-compose logs -f api
```

---

## 🤖 API REST (cũ)

> **Ghi chú:** API FastAPI hiện không còn dùng. Toàn bộ logic nằm trong Streamlit.
> Giữ lại đây để tham khảo.

### Endpoint: POST `/predict`

```bash
curl -X POST "http://localhost:8000/predict" \
  -F "file=@data/processed/imbalance/archivo.csv"
```

**Response:**
```json
{
  "prediction": "MẤT CÂN BẰNG",
  "confidence": 0.95,
  "probabilities": {
    "desbalanceo": 0.95,
    "desalineacion": 0.05
  },
  "metadata": {
    "samples_analyzed": 1135,
    "nominal_speed": 279.18,
    "sensors": ["CSP", "CSL", "CTP", "CTL"],
    "sensor_data": {
      "CSP": {
        "original": [...],
        "predicted": [...],
        "mean_residual": 1.3029
      }
    }
  },
  "severity": {
    "CSP": "verde",
    "CSL": "amarillo",
    "CTP": "verde",
    "CTL": "rojo"
  }
}
```

---

## 📊 Quy trình CI/CD

### Quy trình hiện tại

**`.github/workflows/`:**

- `preprocess_on_data_change.yml` - Kích hoạt tiền xử lý khi dữ liệu đổi
- `preprocess_on_pipeline_change.yml` - Kích hoạt khi pipeline.py đổi

### Quy trình cần làm (TODO)

Các workflow sau cần hoàn thiện:

```yaml
# 1. test_on_pr.yml
# Chạy pytest khi có PR
# - Kiểm tra cú pháp
# - Test đơn vị
# - Lint (flake8, black)

# 2. train_model_scheduled.yml
# Huấn luyện tự động hằng tuần
# - Kích hoạt: cron (hằng tuần)
# - Huấn luyện mô hình sai số
# - Huấn luyện bộ phân loại
# - So sánh với bản trước
# - Thông báo kết quả

# 3. deploy_streamlit.yml
# Triển khai tự động lên Streamlit Cloud
# - Kích hoạt: push lên main
# - Kiểm tra test
# - Triển khai production
# - Kiểm tra tình trạng

# 4. data_validation.yml
# Kiểm chứng dữ liệu mới
# - Kích hoạt: CSV mới trong data/raw
# - Kiểm tra định dạng
# - Phát hiện bất thường
# - Cảnh báo khi có vấn đề

# 5. model_registry.yml
# Đăng ký mô hình
# - Kích hoạt: có best classifier mới
# - Lưu vào model registry
# - Đánh phiên bản (MLflow)
# - Theo dõi hiệu năng
```

---

## 🌐 Triển khai

### Streamlit Cloud (Production)

**URL:** [Turbine Anomaly Detector](https://hydro-turb-ai-anomaly-hpzpvsmfjrv4gdlcxyxvjg.streamlit.app/)

**Các bước triển khai:**

1. **Kết nối GitHub với Streamlit Cloud**
   ```
   https://share.streamlit.io/ -> "New app" -> Chọn repo
   ```

2. **Cấu hình**
   ```
   - Repository: tu-usuario/hydro-turb-ai-anomaly
   - Branch: main
   - Main file path: app/main.py
   - Python version: 3.11
   ```

3. **Môi trường (Secrets)**
   ```
   # .streamlit/secrets.toml
   MLFLOW_TRACKING_URI = "http://localhost:5000"
   ```

4. **Triển khai**
   - Tự động mỗi khi push lên `main`
   - Log trên dashboard Streamlit

---

## 📚 Tài liệu kỹ thuật

### Mô hình sai số

**Lớp:** `DataResidualsProcessor` (`src/models/residuals_model.py`)

```python
# Đầu vào: DataFrame gồm cảm biến + KPH
# Xử lý:
# 1. Với mỗi cảm biến:
#    - Khớp đa thức bậc 3 (KPH vs biên độ)
#    - Dự đoán = đa thức(KPH)
#    - Sai số = biên độ đo - dự đoán
# 2. Trả về ma trận sai số (n_samples, n_sensores)

# Đầu ra: Sai số, Cột, KPH, Dữ liệu, Dự đoán
```

**Cách dùng:**
```python
from src.models.residuals_model import DataResidualsProcessor

model = DataResidualsProcessor.load("models/trained/residuals_CSP_v3.pkl")
residuals, cols, kph, data, pred = model.calculate_residuals_global(df)
```

---

### Bộ phân loại

**Lớp:** `AnomalyClassifier` (`src/models/classifier.py`)

**Phương pháp:**

| Phương pháp | Tham số | Mô tả |
|--------|-----------|-------------|
| Linear | N/A | Ngưỡng phân vị (p25/p75) |
| Logistic | C=1.0 | Hồi quy logistic sklearn |
| GMM | n_components=2 | Mô hình hỗn hợp Gauss |

**Xác suất:**
```python
# Tất cả trả về P(Lệch trục)
# P(Mất cân bằng) = 1 - P(Lệch trục)

y_proba = classifier.predict_proba(X_test)  # shape: (n, 1)
```

---

### Mức độ rung

**Lớp:** `VibrationSeverityChecker` (`src/models/vibration_severity_checker.py`)

**Ngưỡng theo cảm biến (Francis nằm ngang):**

| Cảm biến | Xanh | Vàng | Đỏ |
|--------|-------|----------|------|
| CSP    | ≤60   | 60-100   | >100 |
| CSL    | ≤70   | 70-110   | >110 |
| CTP    | ≤80   | 80-120   | >120 |
| CTL    | ≤2.5  | 2.5-5    | >5   |

**Tùy chỉnh trong `configs/config.py`:**
```python
SEVERITY_THRESHOLDS = {
    "Francis horizontal": {
        "CSP": {"verde": 60, "amarillo": 100},
        "CSL": {"verde": 70, "amarillo": 110},
        # ...
    }
}
```

---

### Cấu trúc dữ liệu

**CSV đầu vào (raw):**
```csv
Fecha,KPH,CSP,CSL,CTP,CTL
2024-01-15 10:30:00,100.5,65.2,72.1,85.3,2.1
2024-01-15 10:31:00,100.6,65.4,72.3,85.5,2.0
...
```

**Kết quả dự đoán:**
```python
{
    "prediction": "MẤT CÂN BẰNG",               # Phân loại tổng thể
    "confidence": 0.95,                        # Độ tin cậy mô hình tốt nhất
    "probabilities": {
        "desbalanceo": 0.95,
        "desalineacion": 0.05
    },
    "metadata": {
        "samples_analyzed": 1135,
        "nominal_speed": 279.18,
        "sensors": ["CSP", "CSL", "CTP", "CTL"],
        "n_anomalies": 835,
        "sensor_data": {
            "CSP": {
                "original": [65.2, 65.4, ...],
                "predicted": [64.1, 64.3, ...],
                "residual": [1.1, 1.1, ...],
                "abs_residual": [1.1, 1.1, ...],
                "mean_residual": 1.3029
            }
        },
        "kph": [100.5, 100.6, ...]
    },
    "severity": {
        "CSP": "verde",
        "CSL": "amarillo",
        "CTP": "verde",
        "CTL": "rojo"
    }
}
```

---

## 🔍 Lệnh hữu ích

### Phát triển

```bash
# Lint
flake8 src/ workflows/ app/

# Định dạng
black src/ workflows/ app/

# Test (khi đã viết test)
pytest tests/ -v

# Xem cấu trúc
tree -L 3 -I '__pycache__|*.pyc|.venv'
```

### MLflow

```bash
# Mở dashboard
mlflow ui --backend-store-uri file:./mlruns

# Xem thí nghiệm
mlflow experiments list

# Xem run của thí nghiệm
mlflow runs list --experiment-name "classifier_training"
```

### Streamlit

```bash
# Chạy local
streamlit run app/main.py

# Triển khai (nếu đã kết nối)
streamlit deploy

# Xóa cache
streamlit cache clear
```

---

## 🚨 Khắc phục sự cố

### Lỗi: "Không có dữ liệu đồ thị cho cảm biến X"

**Nguyên nhân:** `sensor_data` chưa được điền đúng

**Cách sửa:**
```python
# Kiểm tra TurbinePredictor có trả về sensor_data không
result = predictor.predict(temp_path)
assert "sensor_data" in result["metadata"]
```

### Lỗi: Mức độ hiển thị 0.00

**Nguyên nhân:** `max_values` nằm sai cấp

**Cách sửa:**
```python
# max_values phải nằm ở result, không phải metadata
max_vals = result.get("max_values", {})  # Đúng
# KHÔNG dùng
max_vals = result["metadata"].get("max_values", {})  # Sai
```

### Lỗi: MLflow không kết nối từ Docker

**Nguyên nhân:** URL MLflow sai

**Cách sửa:**
```python
# Trong container, dùng tên service
import os
mlflow.set_tracking_uri(os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000"))
```

### Lỗi: Cổng 8000/5000 đã dùng

**Cách sửa:**
```bash
# Linux/macOS
lsof -i :8000
kill -9 <PID>

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

---

## 📝 Việc tiếp theo

- [ ] Hoàn thiện quy trình CI/CD đầy đủ
- [ ] Thêm test đơn vị (`tests/`)
- [ ] Tài liệu API OpenAPI (nếu bật lại API)
- [ ] Dashboard lịch sử dự đoán
- [ ] Cảnh báo email tự động khi Đỏ
- [ ] Đánh phiên bản mô hình Production
- [ ] Giám sát data drift

---

## 👥 Đóng góp

1. Fork dự án
2. Tạo nhánh feature (`git checkout -b feature/ten-tinh-nang`)
3. Commit thay đổi (`git commit -am 'Thêm tính năng'`)
4. Push lên nhánh (`git push origin feature/ten-tinh-nang`)
5. Mở Pull Request

---

## 📄 Giấy phép

Giấy phép MIT - Xem `LICENSE` để biết chi tiết

---

## 📧 Liên hệ

Có câu hỏi hoặc issue:
- Mở GitHub Issue
- Liên hệ nhóm phát triển

---

**Cập nhật lần cuối:** Tháng 11/2025  
**Phiên bản:** 1.0.0
