# 钓鱼 AI 工具 — 落地方案

> 目标：构建一款让钓友"离不开"的 AI 辅助决策工具，核心价值是将地理空间数据转化为**钓鱼决策支持**，从根本上解决"空军"痛点。

---

## 一、产品定位与目标用户

| 维度 | 描述 |
|------|------|
| 核心用户 | 中国大陆 18-50 岁男性垂钓爱好者（台钓、路亚、传统钓均覆盖） |
| 核心痛点 | 不知道去哪里钓、什么时候去、用什么饵 |
| 差异化壁垒 | 气象×地形×历史钓获数据三维融合，非单一维度推荐 |
| 载体形式 | **微信小程序**（主）+ **iOS/Android App**（后期） |

---

## 二、技术栈选型

### 前端
- **微信小程序**：Taro（React 语法）跨端框架，同时生成小程序与 H5
- **地图 SDK**：腾讯地图 JavaScript SDK（微信生态原生支持）
- **可视化**：ECharts for 小程序（钓鱼指数图表）

### 后端
- **语言/框架**：Python 3.12 + FastAPI
- **大模型**：
  - 通义千问（Qwen-72B-Instruct）—— 钓鱼知识问答、饵料推荐
  - 阿里云百炼平台 RAG —— 挂载钓鱼论坛语料（鱼库、钓鱼123）
- **图像识别**：
  - 鱼种识别：微调 EfficientNet-B4（基于 iNaturalist 淡水鱼数据集）
  - 水色/水质分析：CLIP 零样本分类 + GPT-4o Vision / Qwen-VL
- **卫星/遥感**：
  - 钓点地形分析：Google Earth Engine（Python API）
  - 水域矢量数据：OpenStreetMap Overpass API + 全国第三次水利普查数据
- **地理特征识别 AI 模型**（详见第五节）：
  - 水体/植被分割：**GeoSAM**（SAM 遥感改造版，Meta）
  - 语义理解/零样本分类：**RemoteCLIP**（中科院，HuggingFace 开源）
  - 高压线塔/障碍物检测：**RingMo**（华为，SAR 场景预训练）
  - 多任务基础模型备选：**SkySense**（旷视）/ **Prithvi**（NASA+IBM）

### 数据库
- **PostGIS**（PostgreSQL 16）：存储水域、钓点、障碍物空间数据
- **Redis**：气象数据缓存（TTL 30 分钟）、用户 Session
- **MinIO**（对象存储）：用户上传照片、爆护海报、瓦片缓存

### 气象接口
- **彩云天气 API**：分钟级降水预报、逐小时气压/温度/风向（精度到县级）
- **和风天气 API**：月相、潮汐、农历（用于传统钓友）
- **溶氧量**：基于水温+气压的经验公式推算（暂无公开实时接口）

### 基础设施
- **部署**：阿里云 ECS（2C4G 起步）+ 弹性伸缩
- **CDN**：阿里云 OSS + CDN（海报图片分发）
- **容器化**：Docker + docker-compose（开发）/ Kubernetes（生产）

---

## 三、系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户端（小程序）                           │
│  定位/地图  │  拍照上传  │  问答 Chat  │  钓获日志  │  钓鱼指数  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS / WebSocket
┌─────────────────────────▼───────────────────────────────────────┐
│                      API 网关（FastAPI）                          │
│   /fishing-spot  │  /weather-window  │  /ai-chat  │  /catch-log │
└──────┬──────────────────┬──────────────────┬────────────────────┘
       │                  │                  │
┌──────▼──────┐  ┌────────▼────────┐  ┌─────▼──────────────────┐
│ 钓点分析服务 │  │  窗口期预测服务  │  │   大模型 Agent 服务     │
│ (PostGIS +  │  │ (彩云天气 API + │  │  (Qwen + RAG 钓鱼语料) │
│ 遥感模型)   │  │  气压/月相模型) │  │  + CV 鱼种识别          │
└──────┬──────┘  └────────┬────────┘  └────────────────────────┘
       │                  │
┌──────▼──────────────────▼────────────────────────────────────┐
│                    数据层                                      │
│   PostGIS（水域空间数据）  │  Redis（气象缓存）  │  MinIO（图片）│
│   瓦片缓存（天地图/GEE）  │  训练集（OSM标注）                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 四、核心数据来源与处理

### 水域空间数据

| 数据 | 来源 | 处理方式 |
|------|------|----------|
| 河流/湖泊轮廓 | OpenStreetMap（`waterway=*`） | Overpass API 拉取 → PostGIS 导入 |
| 水下地形/坡度 | NASA SRTM 30m / ALOS 12.5m DEM | GEE 计算坡度矩阵 + 岸坡推算 |
| 草区/湿地 | Sentinel-2 NDVI + NDWI | GEE Python API 批量分析 |
| 高压线/危险区 | OpenStreetMap (`power=line`) | 导入 PostGIS，缓冲区分析（50m 预警） |
| 卫星影像底图 | 天地图（0.5-1m 分辨率） | TMS 瓦片下载 → 本地缓存 → 模型输入 |

### DEM 数据源对比

| 数据 | 分辨率 | 免费 | 获取方式 |
|------|--------|------|---------|
| SRTM GL1 | 30m | 是 | GEE / NASA EarthData |
| ALOS AW3D30 | 12.5m | 是（学术） | JAXA 官网 |
| Copernicus DEM | 30m | 是 | ESA Open Access |

### 气象数据（彩云天气）

关键字段：`precipitation`、`pressure`、`wind`、`temperature`、`humidity`

钓鱼指数算法（简版）：

```python
def fishing_index(pressure, temp, wind_speed, precip_1h):
    """
    气压：1013-1020 hPa 为最佳，偏低（低气压）鱼不活跃
    气温：10-25°C 最佳，冬夏两季权重降低
    风速：2-4 级（3.4-7.9 m/s）最佳，有风但不大
    降水：小雨前后好钓，大雨/雷暴禁止出钓
    """
    score = 100
    if pressure < 1005 or pressure > 1025:
        score -= 30
    if temp < 8 or temp > 30:
        score -= 20
    if wind_speed > 8:
        score -= 20
    if precip_1h > 10:
        score -= 40  # 大雨
    return max(0, score)
```

---

## 五、地理特征识别技术方案

> 本节详述六类关键钓鱼地理特征的识别原理与实现方案，是热力图的核心算法基础。

### 5.1 回湾（凹形岸线）识别

**原理**：水域多边形的实际边界与其凸包之间的凹陷区域即为回湾，用计算几何直接求解，无需模型。

```python
from shapely.geometry import Polygon
from shapely.ops import unary_union

def find_back_bays(water_polygon, min_area_m2=500):
    """返回所有回湾候选点（凸包差值法）"""
    convex_hull = water_polygon.convex_hull
    # 凸包 - 实际边界 = 所有凹陷区域
    concave_areas = convex_hull.difference(water_polygon)
    bays = []
    geoms = (concave_areas.geoms
             if concave_areas.geom_type == 'MultiPolygon'
             else [concave_areas])
    for geom in geoms:
        if geom.area > min_area_m2:
            bays.append({
                "centroid": geom.centroid,
                "area_m2": geom.area,
                "score_bonus": min(30, int(geom.area / 100))  # 面积越大加分越多
            })
    return sorted(bays, key=lambda x: -x["area_m2"])
```

**数据来源**：OSM `natural=water` / `waterway=riverbank` 面数据  
**精度说明**：OSM 在农村水域描摹精度约 5-20m，开口 <30m 的小回湾可能漏识别，天地图高清底图可辅助人工补录。

---

### 5.2 水下地形（最难，分层方案）

**方案 A：陆地 DEM 岸坡推算（通用，立即可用）**

核心思想：岸边陆地坡度 ≈ 水下延伸坡度，岸上陡处水下也深。

```python
import ee
ee.Initialize()

dem = ee.Image("USGS/SRTMGL1_003")          # 30m SRTM
slope = ee.Terrain.slope(dem)

water_buffer = water_polygon_ee.buffer(50)  # 水域边缘 50m 缓冲区
edge_slope = slope.clip(water_buffer)

# 坡度 > 15° → 水下存在陡坎（深浅交替点，藏鱼首选）
steep_edge = edge_slope.gt(15)
```

**方案 B：Sentinel-2 卫星水深反演（仅清水，0.5-8m）**

```python
s2 = (ee.ImageCollection("COPERNICUS/S2_SR")
        .filterBounds(roi)
        .filterDate('2024-04-01', '2024-10-01')
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
        .median())

B3 = s2.select('B3')  # 绿光 559nm
B4 = s2.select('B4')  # 红光 665nm

# Stumpf 比值法：适用于清澈水体，浑水失效
depth_proxy = B3.log().divide(B4.log())
```

> ⚠️ **局限**：中国大多数钓场为浑水，此方案覆盖率约 20%，仅供参考。

**方案 C：ICESat-2 激光测深（大型清水湖库）**

NASA 的 ICESat-2 绿色激光（532nm）可穿透水面获取真实水深点云，适合太湖、千岛湖等大型清水水体。

```python
import icepyx as ipx
region = ipx.Query(
    dataset="ATL03",
    spatial_extent=[119.5, 30.5, 121.5, 32.0],  # 太湖区域示例
    date_range=["2023-01-01", "2024-12-01"]
)
region.download_files(path="./icesat2_data/")
```

**方案 D：众包鱼探仪数据（长期护城河）**

让钓友上传 Deeper / Garmin 鱼探仪导出的 GPX/CSV，积累真实水深点，反哺热力图。

```
用户上传鱼探 GPX → 解析 (lng, lat, depth) 点云
→ 入库 PostGIS → 克里金插值生成水深栅格
→ 私密版只对贡献者可见，贡献积分兑换会员
```

**各方案适用范围总结**：

| 方案 | 适用场景 | 精度 | 开发成本 |
|------|---------|------|---------|
| 岸坡推算 | 所有水域 | 低（代理指标） | 低 |
| 卫星水深反演 | 清水湖泊 | 中（±1m） | 中 |
| ICESat-2 | 大型清水湖 | 高（±0.3m） | 中 |
| 众包鱼探 | 活跃钓点 | 极高 | 高（需运营） |

---

### 5.3 坡度识别

**完全基于 DEM 计算，精度稳定，无需模型。**

```python
import ee
ee.Initialize()

# 优先使用高精度 ALOS DEM（12.5m）
dem = ee.Image("JAXA/ALOS/AW3D30/V3_2").select('DSM')
slope  = ee.Terrain.slope(dem)   # 坡度（度）
aspect = ee.Terrain.aspect(dem)  # 坡向（判断阴/阳坡影响水温）

# 分级标注
grade_map = (slope.lt(8).multiply(1)           # 1 = 缓坡（浅滩，适合台钓）
             .add(slope.gte(8).And(slope.lt(20)).multiply(2))   # 2 = 中坡（深浅交替）
             .add(slope.gte(20).And(slope.lt(30)).multiply(3))  # 3 = 陡坡（障碍区）
             .add(slope.gte(30).multiply(4)))                   # 4 = 危险坡（禁止区）

# 导出为 GeoTIFF → 入库 PostGIS raster
task = ee.batch.Export.image.toDrive(
    image=grade_map.clip(roi),
    description='slope_grade',
    scale=12,
    region=roi
)
task.start()
```

---

### 5.4 草区 / 水生植被识别

**使用 Sentinel-2 多光谱影像的 NDVI + NDWI 联合判断。**

```python
s2 = (ee.ImageCollection("COPERNICUS/S2_SR")
        .filterBounds(water_roi)
        .filterDate('2024-05-01', '2024-09-30')   # 植被旺季
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5))
        .median())

# NDVI：识别挺水植物（芦苇/香蒲）和浮叶植物（荷叶）
NDVI = s2.normalizedDifference(['B8', 'B4'])

# NDWI：精确提取水体边界
NDWI = s2.normalizedDifference(['B3', 'B8'])

# 水生植被 = 在水体内部且 NDVI > 0.2
aquatic_veg = NDVI.gt(0.2).And(NDWI.gt(0))

# FAI（浮藻指数）：识别蓝藻/浮萍（影响鱼口）
FAI = s2.select('B8').subtract(
    s2.select('B6').add(s2.select('B4')).multiply(0.5)
)
algae_bloom = FAI.gt(0.02)
```

**障碍物（枯树/石堆/桥墩）**：10m 分辨率 Sentinel-2 无法分辨 <10m 的目标。替代方案：
- **Sentinel-1 SAR**：雷达后向散射对水面金属/混凝土突出物敏感，可识别桥墩、大型礁石
- **高分二号（0.8m）**：清晰可见，需商业采购
- **用户众包标注**：钓友在地图打点记录"此处有沉船/大石/桥墩"，最实用

---

### 5.5 高压线识别

**三层方案，按覆盖率递进：**

**层一：OSM 矢量数据（城镇覆盖率 70%，立即可用）**

```python
import overpy
from shapely.geometry import LineString

api = overpy.API()
result = api.query("""
    [out:json];
    way["power"="line"]
        (30.5, 119.5, 32.0, 122.0);
    out geom;
""")

power_lines = []
for way in result.ways:
    coords = [(float(node.lon), float(node.lat)) for node in way.nodes]
    power_lines.append({
        "geometry": LineString(coords),
        "voltage": way.tags.get("voltage", "unknown"),
        "danger_buffer_m": 100 if "220" in way.tags.get("voltage","") else 50
    })
# 导入 PostGIS，按电压等级设置差异化缓冲区
```

**层二：Sentinel-1 SAR 自动检测铁塔（补充农村盲区）**

高压线铁塔是金属目标，在 SAR 影像中呈现强反射亮点，通过目标检测可定位塔位再连线推算线路走向。

```python
import numpy as np
from scipy import ndimage

def detect_power_towers(sar_db_array, threshold_sigma=3.5):
    """在 SAR dB 影像中检测高压线铁塔候选点"""
    mean, std = np.mean(sar_db_array), np.std(sar_db_array)
    bright_mask = sar_db_array > (mean + threshold_sigma * std)
    # 连通域分析，过滤噪点（铁塔面积约 2-5 像素）
    labeled, n = ndimage.label(bright_mask)
    towers = []
    for i in range(1, n + 1):
        region = np.where(labeled == i)
        if 2 <= len(region[0]) <= 20:   # 面积过滤
            cy = int(np.mean(region[0]))
            cx = int(np.mean(region[1]))
            towers.append((cx, cy))
    return towers
```

**层三：商业电网 GIS 数据（中期）**

国家电网官方 GIS 数据不公开，可通过地信网等数据服务商商业采购，或与地方电力部门合作获取。

---

### 5.6 危险区综合判定（PostGIS 空间叠加）

将以上各特征在 PostGIS 中做空间叠加，生成统一的危险区视图：

```sql
CREATE MATERIALIZED VIEW danger_zones AS
SELECT
    geom,
    string_agg(danger_type, '，') AS danger_types,
    MAX(danger_level)             AS max_level
FROM (
    -- 高压线缓冲区（按电压等级差异化）
    SELECT ST_Buffer(geom::geography,
               CASE WHEN voltage >= 220000 THEN 100 ELSE 50 END
           )::geometry AS geom,
           '高压线' AS danger_type,
           3         AS danger_level
    FROM power_lines

    UNION ALL

    -- 陡坡区（坡度 > 30°，距水域 20m 内）
    SELECT geom, '陡坡滑落风险' AS danger_type, 2 AS danger_level
    FROM slope_zones
    WHERE slope_degree > 30
      AND ST_DWithin(geom,
              (SELECT ST_Union(geom) FROM water_bodies), 20)

    UNION ALL

    -- OSM 洪泛区标注
    SELECT geom, '洪水风险' AS danger_type, 2 AS danger_level
    FROM osm_features
    WHERE tags->>'flood_prone' = 'yes'
) sub
GROUP BY geom;

-- 前端查询接口：返回钓点附近 500m 内所有危险信息
SELECT danger_types, max_level,
       ST_Distance(geom::geography,
           ST_Point(:lng, :lat)::geography) AS dist_m
FROM danger_zones
WHERE ST_DWithin(geom::geography,
          ST_Point(:lng, :lat)::geography, 500)
ORDER BY dist_m;
```

### 5.7 各特征方案总览

| 特征 | 推荐方案 | 标注来源 | 预期精度 | 开发工期 |
|------|---------|---------|---------|---------|
| 回湾 | Shapely 凸包差值 | 无需标注 | ~85% | 1 天 |
| 坡度危险区 | GEE DEM 直接计算 | 无需标注 | ~95% | 1 天 |
| 水体轮廓 | GeoSAM 零样本 | 无需标注 | ~92% IoU | 2 天 |
| 草区/湿地 | Sentinel-2 NDVI | OSM `natural=wetland` | ~78% IoU | 3 天 |
| 高压线 | OSM + SAR 检测 | OSM `power=tower` | ~80% mAP | 2 天 |
| 水下地形 | 岸坡推算 + 众包 | 鱼探仪上传 | 低→高（渐进） | 长期 |
| 水中障碍物 | 众包标注为主 | 用户打点 | 依赖运营 | 中期 |

---

## 六、遥感模型微调方案

> 以天地图卫星瓦片为影像输入，以 OSM 矢量数据为自动标注，在遥感基础模型上微调，无需手工打标。

### 6.1 整体技术路线

```
天地图卫星瓦片 (RGB, 0.5-1m)       OSM 矢量数据
        +                  →    自动生成像素级标注 mask
SRTM/ALOS 高程瓦片 (DEM)           （水体/草区/高压线/危险区）
        ↓
  4 通道融合输入 [R, G, B, Elev]
        ↓
  遥感基础模型（已在卫星图预训练）
        ↓
   任务头微调（分割/检测）
        ↓
  输出：各特征 GeoJSON 热力图
```

### 6.2 基础模型选型

| 模型 | 机构 | 预训练数据 | 最适合任务 | 获取 |
|------|------|-----------|---------|------|
| **GeoSAM** | UMD | 多源卫星图 | 水体/植被分割（零样本可用） | GitHub |
| **RemoteCLIP** | 中科院 | Sentinel/Landsat | 语义理解、零样本分类 | HuggingFace |
| **RingMo** | 华为 | 2000万遥感图 | SAR目标检测（高压线塔） | GitHub |
| **Prithvi** | NASA+IBM | HLS时序卫星 | 植被变化检测 | HuggingFace |
| **SkySense** | 旷视 | 多模态遥感 | 多任务泛化 | GitHub |

### 6.3 天地图瓦片下载

天地图提供国内最高 0.5m 分辨率卫星影像（zoom=18 时约 0.6m/像素，每张 256×256 瓦片覆盖约 150m×150m 真实区域）。

```python
import requests, math, io
from PIL import Image
import numpy as np

TIANDITU_TOKEN = "your_token"   # 申请：lbs.tianditu.gov.cn

def lng_lat_to_tile(lng: float, lat: float, zoom: int):
    n = 2 ** zoom
    x = int((lng + 180) / 360 * n)
    lat_rad = math.radians(lat)
    y = int((1 - math.asinh(math.tan(lat_rad)) / math.pi) / 2 * n)
    return x, y, zoom

def download_tile(layer: str, z: int, x: int, y: int) -> np.ndarray:
    """
    layer: 'img' = 卫星影像(RGB)  |  'ter' = 地形晕渲
    """
    server = (x + y) % 8
    url = (f"https://t{server}.tianditu.gov.cn/{layer}_w/wmts?"
           f"SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0"
           f"&LAYER={layer}&STYLE=default&TILEMATRIXSET=w"
           f"&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"
           f"&FORMAT=tiles&tk={TIANDITU_TOKEN}")
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    return np.array(Image.open(io.BytesIO(resp.content)).convert("RGB"))

def download_area_tiles(center_lng, center_lat, radius=5, zoom=17):
    """批量下载区域内所有瓦片（RGB + 地形双通道）"""
    cx, cy, z = lng_lat_to_tile(center_lng, center_lat, zoom)
    tiles = []
    for dx in range(-radius, radius + 1):
        for dy in range(-radius, radius + 1):
            rgb = download_tile("img", z, cx + dx, cy + dy)
            dem = download_tile("ter", z, cx + dx, cy + dy)
            tiles.append({
                "xyz": (cx + dx, cy + dy, z),
                "rgb": rgb,   # H×W×3
                "dem": dem,   # H×W×3（需解码为单通道高程值）
            })
    return tiles
```

### 6.4 用 OSM 自动生成训练标注

OSM 矢量数据叠加到卫星瓦片上，**自动产生像素级标注 mask**，无需人工打标——这是整个方案最核心的工程技巧。

```python
import overpy
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from shapely.geometry import shape, mapping
import numpy as np

# 标签定义
LABELS = {
    "background":  0,
    "water":       1,   # OSM natural=water / waterway=riverbank
    "power_line":  2,   # OSM power=line（缓冲区栅格化）
    "wetland":     3,   # OSM natural=wetland
    "danger":      4,   # 高压线缓冲区 + 陡坡区
}

def tile_to_bbox(x, y, z):
    n = 2 ** z
    lon_left  = x / n * 360 - 180
    lon_right = (x + 1) / n * 360 - 180
    lat_top   = math.degrees(math.atan(math.sinh(math.pi * (1 - 2*y/n))))
    lat_bot   = math.degrees(math.atan(math.sinh(math.pi * (1 - 2*(y+1)/n))))
    return lat_bot, lon_left, lat_top, lon_right  # min_lat,min_lon,max_lat,max_lon

def generate_label_mask(x, y, z, tile_shape=(256, 256)):
    s, w, n, e = tile_to_bbox(x, y, z)
    transform = from_bounds(w, s, e, n, *tile_shape)
    api = overpy.API()
    bbox_str = f"{s},{w},{n},{e}"

    mask = np.zeros(tile_shape, dtype=np.uint8)

    # 水体
    r = api.query(f'[out:json];(way["natural"="water"]({bbox_str});relation["natural"="water"]({bbox_str}););out geom;')
    water_geoms = [shape({"type":"Polygon","coordinates":[[(nd.lon,nd.lat) for nd in way.nodes]]}) for way in r.ways]
    if water_geoms:
        mask = np.maximum(mask, rasterize([(g, LABELS["water"]) for g in water_geoms], out_shape=tile_shape, transform=transform))

    # 高压线（膨胀 5 像素模拟缓冲区）
    r = api.query(f'[out:json];way["power"="line"]({bbox_str});out geom;')
    power_geoms = [shape({"type":"LineString","coordinates":[(nd.lon,nd.lat) for nd in way.nodes]}) for way in r.ways]
    if power_geoms:
        raw = rasterize([(g, 1) for g in power_geoms], out_shape=tile_shape, transform=transform)
        from scipy.ndimage import binary_dilation
        dilated = binary_dilation(raw, iterations=5).astype(np.uint8)
        mask = np.where(dilated, LABELS["power_line"], mask)

    return mask  # shape: (256, 256)，每像素为类别 ID

# 批量构建训练集
dataset = []
for tile in tiles:
    x, y, z = tile["xyz"]
    mask = generate_label_mask(x, y, z)
    dataset.append({"rgb": tile["rgb"], "dem": tile["dem"], "label": mask})
```

### 6.5 多通道模型（RGB + 高程）

将卫星影像 RGB 与高程数据合并为 4 通道输入，让模型同时感知视觉纹理和地形起伏：

```python
import torch
import torch.nn as nn
from torchvision.models import swin_t, Swin_T_Weights

class FishingFeatureNet(nn.Module):
    """
    输入：4 通道 [R, G, B, elevation]，256×256
    输出：6 类语义分割 mask（水体/草区/回湾/坡度变化/高压线/安全区）
    """
    def __init__(self, num_classes=6):
        super().__init__()
        # 加载预训练 Swin-T 骨干
        backbone = swin_t(weights=Swin_T_Weights.IMAGENET1K_V1)
        old_conv = backbone.features[0][0]

        # 将第一层卷积改为接受 4 通道输入
        self.backbone = backbone
        self.backbone.features[0][0] = nn.Conv2d(
            4, old_conv.out_channels,
            kernel_size=old_conv.kernel_size,
            stride=old_conv.stride,
            padding=old_conv.padding,
            bias=False,
        )
        with torch.no_grad():
            # 前 3 通道复用 ImageNet 预训练权重，第 4 通道（高程）随机初始化
            self.backbone.features[0][0].weight[:, :3] = old_conv.weight
            nn.init.kaiming_normal_(self.backbone.features[0][0].weight[:, 3:])

        # 上采样分割头
        self.seg_head = nn.Sequential(
            nn.ConvTranspose2d(768, 256, kernel_size=4, stride=4),
            nn.BatchNorm2d(256), nn.ReLU(),
            nn.ConvTranspose2d(256, 64, kernel_size=4, stride=4),
            nn.BatchNorm2d(64),  nn.ReLU(),
            nn.Conv2d(64, num_classes, kernel_size=1),
        )

    def forward(self, rgb, dem_normalized):
        """
        rgb:            [B, 3, H, W]  float32，归一化到 [0,1]
        dem_normalized: [B, 1, H, W]  float32，高程值归一化到 [0,1]
        """
        x = torch.cat([rgb, dem_normalized], dim=1)   # [B, 4, H, W]
        feats = self.backbone(x)
        return self.seg_head(feats)                    # [B, num_classes, H, W]
```

### 6.6 VLM 零样本快速验证（MVP 阶段降本方案）

微调模型之前，可先用大视觉语言模型做零样本分析，成本极低，适合 MVP 阶段验证需求：

```python
import anthropic, base64

def analyze_tile_zero_shot(tile_image_path: str) -> dict:
    client = anthropic.Anthropic()
    with open(tile_image_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()

    resp = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image",
                 "source": {"type": "base64",
                            "media_type": "image/jpeg",
                            "data": img_b64}},
                {"type": "text",
                 "text": """分析这张卫星图，返回严格的 JSON，不要多余文字：
{
  "water_bodies": [{"shape": "河流/湖泊/水库", "has_bay": true/false, "bay_count": 0}],
  "vegetation": {"aquatic_plants": true/false, "coverage_pct": 0},
  "terrain": {"slope": "平坦/缓坡/陡坡", "has_depth_change": true/false},
  "hazards": ["高压线","陡坡","无"],
  "fishing_score": 0
}"""}
            ]
        }]
    )
    import json
    return json.loads(resp.content[0].text)
```

### 6.7 模型迭代路线

```
阶段 1（第 1-8 周，MVP）
  VLM 零样本 API（Qwen-VL / Claude）→ 结果存缓存，按需调用
       ↓ 数据积累 + 用户验证需求真实

阶段 2（第 9-14 周）
  GeoSAM 零样本部署 → 水体/植被分割，不需要任何标注，精度 ~85%
  + Sentinel-2 NDVI → 替代 VLM 做草区识别，成本降 90%
       ↓ 积累 500-1000 张用户反馈的错误样本

阶段 3（第 15-20 周）
  OSM 自动标注生成 10000 张训练对
  → 微调 FishingFeatureNet（Swin-T 4 通道）
  → 精度提升至回湾 85% / 草区 82% / 高压线 79%
       ↓ 用户上传鱼获照片成为持续训练数据

阶段 4（持续）
  用户众包鱼探仪数据 → 水下地形插值
  用户打点障碍物 → 扩充检测类别
  → 模型每季度迭代，钓点预测越来越准（真正护城河）
```

---

## 七、功能模块实现方案

### 模块一：黄金钓点热力图

**触发**：用户打开小程序 → 自动定位 → 拉取周围 5km 水域

**后端流程**：
1. 根据经纬度查询 PostGIS，返回周边水域几何信息
2. 调用遥感分析结果（草区 NDVI 热点、坡度变化点、回湾位置）
3. 规则引擎打分：回水湾 +20 分 / 草洞 +15 分 / 深浅交替 +25 分 / 两汇处 +30 分
4. 叠加危险区扣分：高压线 50m 内 -50 分 / 陡坡区 -30 分
5. 返回 GeoJSON，前端叠加热力图层

**前端**：腾讯地图热力图 API + 自定义 Marker（鱼钩图标标注 Top5 点位）

---

### 模块二：动态窗口期预测

**触发**：用户点击"今天什么时候去最好？"

**后端流程**：
1. 调用彩云天气逐小时预报（未来 24 小时）
2. 逐小时计算 `fishing_index()`
3. 合并月相数据（和风天气）—— 新月/满月前后 3 天鱼类活跃度更高
4. 返回 24 小时指数曲线 + 自然语言总结（Qwen 生成）

**示例输出**：
> "今天下午 14:00-17:00 钓鱼指数 87 分（优），气压 1016 hPa 稳定上升，偏南风 3 级，适合钓鲫鲤。今晚 19:00 后有小雨，鱼口会开，有经验可守到 20:30 前收竿。明天全天气压偏低，建议休息。"

---

### 模块三：钓组与饵料推荐

**触发**：用户描述目标鱼种 / AI 根据钓点自动推断

**Prompt 工程**（RAG 增强）：
```
系统角色：你是一位有 30 年经验的职业钓手，熟悉台钓、路亚、传统钓。
上下文：{水域类型}，{当前水温}，{目标鱼种}，{水深估算}，{季节}
用户问题：{user_input}
知识库检索：{从钓鱼123/鱼库论坛检索到的相关帖子片段}
```

**输出结构化数据**：
```json
{
  "rod": "4.5m 手竿 / 2.7m 路亚竿",
  "line": "主线 1.2 号 + 子线 0.6 号",
  "hook": "袖钩 3 号",
  "float": "吃铅 1.0g，立漂",
  "bait": [
    {"name": "蓝鲫", "ratio": "60%"},
    {"name": "速攻", "ratio": "40%"}
  ],
  "technique": "搓饵钓底，调四钓二",
  "reasoning": "当前水温 15°C，鲫鱼口轻，建议腥香型饵..."
}
```

---

### 模块四：拍照识鱼 & 爆护海报

**流程**：
1. 用户上传鱼的照片
2. EfficientNet-B4 推理 → 鱼种 + 置信度
3. 用户确认体长（或 AI 根据参照物估算）→ 查表计算体重
4. 自动抓取当前 GPS、气压、温度
5. 使用 Pillow + 模板生成精美海报（可一键保存/分享朋友圈）

**海报内容**：鱼种 + 重量 + 钓点（可模糊化/私密） + 时间 + 今日钓鱼指数 + 所用饵料

---

### 模块五：私密钓点管理

- 用户标记的钓点**加密存储**，服务端无法读取坐标（使用用户密钥加密后存储）
- 支持"导出/备份"：生成加密二维码，只有原用户可扫描还原
- **绝不纳入公共热力图计算**（这是信任基石）

---

### 模块六：安全警示（高压线 / 陡坡）

- 导入 OSM 高压线矢量数据（`power=line`）到 PostGIS
- 当用户标记的钓点或导航路线经过高压线 50m 缓冲区时，**红色强弹窗**提示
- 识别 DEM 坡度 > 30° 区域，标注为"滑坡风险区"
- 提示文案需保守："此处附近可能存在高压线，仅供参考，请以现场实际情况为准"

---

## 八、开发路线图

### Phase 1 — MVP（第 1-8 周）

**目标**：上线核心两功能，跑通冷启动

| 周次 | 任务 |
|------|------|
| 1-2 | 基础架构搭建：FastAPI + PostGIS + 微信小程序骨架 |
| 3-4 | OSM 水域数据导入 + 腾讯地图展示 + 简单钓点 Marker |
| 5-6 | 接入彩云天气 API + 钓鱼指数算法 + 逐小时图表 |
| 7-8 | 接入 Qwen API + 基础问答功能 + VLM 零样本钓点分析 + 小程序上线 |

**MVP 交付物**：能看附近钓点地图 + 能查今日钓鱼指数 + 能问基础钓鱼问题

---

### Phase 2 — 增长期（第 9-16 周）

| 周次 | 任务 |
|------|------|
| 9-10 | GeoSAM 部署：水体分割 + 回湾识别（凸包差值法） |
| 11-12 | Sentinel-2 NDVI 草区识别 + GEE 坡度分析 → 热力图上线 |
| 13-14 | 鱼种图像识别模型部署 + 爆护海报生成 |
| 15-16 | 私密钓点功能 + OSM 高压线安全警示 + 危险区 PostGIS 叠加 |

---

### Phase 3 — 模型自研（第 17-22 周）

| 周次 | 任务 |
|------|------|
| 17-18 | 天地图瓦片批量下载 + OSM 自动标注生成 10000 训练对 |
| 19-20 | FishingFeatureNet（Swin-T 4 通道）微调训练 + A/B 测试 |
| 21-22 | 鱼探仪数据上传入口 + 众包水深众包障碍物功能 |

---

### Phase 4 — 商业化（第 23-28 周）

| 周次 | 任务 |
|------|------|
| 23-24 | 会员体系 + 钓具周边电商接口（CPS 分成） |
| 25-26 | 路亚专项：Sentinel-1 SAR 水中障碍物识别 |
| 27-28 | iOS/Android App 版本开发 |

---

## 九、冷启动策略

1. **种子用户**：在钓鱼123、鱼库 App、抖音"钓鱼"话题找 KOL 合作，送 3 个月会员
2. **钓点共建激励**：用户上报新钓点/障碍物 → 获得积分 → 兑换会员时长（UGC 驱动数据增长）
3. **鱼探仪导入激励**：上传鱼探数据解锁该水域精准水深图（自己也受益）
4. **爆护海报裂变**：每张海报底部带二维码，朋友圈传播带来自然增长
5. **本地化运营**：按省份/城市建立钓友群，群管理员享分润

---

## 十、商业化路径

| 模式 | 详情 | 预估收入 |
|------|------|----------|
| 会员订阅 | 月卡 18 元 / 年卡 128 元（解锁遥感热力图、精准窗口期、私密钓点） | 主要收入 |
| 钓具导购 CPS | 接入京东/淘宝联盟，AI 推荐后跳转购买 | 补充收入 |
| 数据 B 端 | 向钓具品牌提供脱敏的区域鱼情报告、热门钓点分布 | 中长期 |
| 私域钓点 NFT | 用户"认领"独家钓点（实验性，中后期） | 探索收入 |

---

## 十一、风险与对策

| 风险 | 等级 | 对策 |
|------|------|------|
| 遥感数据覆盖不足（偏远地区无卫星高清图） | 中 | 降级方案：仅展示 OSM 矢量水域，不显示热力图 |
| 天地图瓦片调用量超限/费用 | 中 | 本地缓存 + MinIO 存储，重复区域不重复下载 |
| 彩云天气 API 调用成本 | 低 | 缓存 + 按需调用，非付费用户降低刷新频率 |
| 微信小程序审核（地图/定位类） | 中 | 申请"出行/导航"类目，准备材料说明合规用途 |
| 用户私密钓点数据泄露 | 高 | 前端加密（AES-256），服务端存密文，零知识架构 |
| LLM 输出不准确的钓鱼建议 | 中 | RAG 限定权威语料，输出增加"仅供参考"免责声明 |
| 高压线数据不完整导致安全事故 | 高 | 安全警示标注为"参考"级别，不承诺完整性；用户协议明确免责 |
| OSM 自动标注质量差导致模型偏差 | 中 | 人工抽检 5% 样本，置信度低的预测结果降级展示 |

---

## 十二、目录结构（建议）

```
fishing-ai/
├── frontend/                   # Taro 小程序
│   ├── pages/
│   │   ├── map/                # 钓点地图 + 热力图
│   │   ├── forecast/           # 窗口期预测
│   │   ├── chat/               # AI 问答
│   │   └── log/                # 钓获日志
│   └── components/
├── backend/                    # FastAPI 服务
│   ├── api/
│   │   ├── fishing_spot.py
│   │   ├── weather.py
│   │   ├── ai_chat.py
│   │   └── catch_log.py
│   ├── services/
│   │   ├── gee_service.py          # Google Earth Engine
│   │   ├── weather_service.py      # 彩云天气
│   │   ├── llm_service.py          # Qwen + RAG
│   │   ├── cv_service.py           # 鱼种识别
│   │   ├── geo_feature_service.py  # 地理特征识别（回湾/草区等）
│   │   └── tile_service.py         # 天地图瓦片管理
│   ├── models/                     # SQLAlchemy ORM
│   └── db/                         # PostGIS 迁移脚本
├── ml/                         # 模型训练
│   ├── fish_classifier/        # EfficientNet 微调（鱼种识别）
│   ├── fishing_feature_net/    # Swin-T 4通道分割模型
│   │   ├── model.py
│   │   ├── dataset.py          # OSM 自动标注数据集
│   │   ├── train.py
│   │   └── infer.py
│   └── geosam/                 # GeoSAM 零样本推理封装
├── data/                       # 原始数据 & 导入脚本
│   ├── osm_import.py           # OSM 水域数据导入 PostGIS
│   ├── power_line_import.py    # OSM 高压线导入
│   ├── dem_download.py         # SRTM/ALOS DEM 批量下载
│   ├── tile_downloader.py      # 天地图瓦片批量下载
│   └── auto_labeling.py        # OSM → 像素级标注生成
└── docker-compose.yml
```

---

## 十三、第一步行动清单

- [ ] 申请天地图 API Token（`lbs.tianditu.gov.cn`，免费额度够 MVP）
- [ ] 注册彩云天气 API（有免费额度，够 MVP 用）
- [ ] 申请腾讯地图 SDK 密钥（微信小程序需单独申请）
- [ ] 开通阿里云百炼，测试 Qwen-72B-Instruct 接口
- [ ] 本地搭建 PostGIS + 导入华东地区 OSM 水域及高压线数据（先跑通一个省）
- [ ] 在 Google Earth Engine Code Editor 验证 Sentinel-2 草区 NDVI 识别效果
- [ ] 下载 GeoSAM 并跑通一张天地图瓦片的水体分割演示
- [ ] 注册微信小程序（"工具"类目），完成基础配置
