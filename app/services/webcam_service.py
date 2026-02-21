"""
Webcam Service for Client-Side Camera Integration
Handles snapshot uploads and processing from browser webcam
Architecturally separate from ESP32-CAM system
"""

from datetime import datetime
from typing import Optional, Dict, Any, Tuple
import base64
import io
from PIL import Image
import os
import numpy as np


# ============================================
# CV PIPELINE  (mirrors grid.js CONFIG)
# ============================================
GRID_ROWS     = 8
GRID_COLS     = 12
OUTPUT_WIDTH  = 1000
OUTPUT_HEIGHT = 600


# ---- ArUco / Figure helpers ------------------------------------------------

def _find_orange_figure(image_bgr) -> Optional[Tuple[int, int, int]]:
    """Detect the largest orange blob. Returns (cx, cy, radius) or None."""
    import cv2
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    lower_orange = np.array([5,  150, 150])
    upper_orange = np.array([25, 255, 255])
    mask = cv2.inRange(hsv, lower_orange, upper_orange)
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    largest = max(contours, key=cv2.contourArea)
    if cv2.contourArea(largest) < 500:
        return None
    (cx, cy), radius = cv2.minEnclosingCircle(largest)
    return int(cx), int(cy), int(radius)


def _get_inner_corner(corners_pts, grid_centroid) -> Tuple[float, float]:
    """Return the marker corner closest to the grid centroid (= playable boundary)."""
    dists     = [np.linalg.norm(np.array(pt) - grid_centroid) for pt in corners_pts]
    inner_idx = int(np.argmin(dists))
    pt        = corners_pts[inner_idx]
    return float(pt[0]), float(pt[1])


def _get_outer_corner(corners_pts, marker_role):
    """Pick the geometrically outermost corner (for annotation only)."""
    pts = [np.array(pt) for pt in corners_pts]
    if marker_role == 'TL':
        return min(pts, key=lambda p: p[0] + p[1])
    elif marker_role == 'TR':
        return max(pts, key=lambda p: p[0] - p[1])
    elif marker_role == 'BR':
        return max(pts, key=lambda p: p[0] + p[1])
    elif marker_role == 'BL':
        return max(pts, key=lambda p: p[1] - p[0])
    raise ValueError(f"Unknown role: {marker_role}")


def _get_figure_grid_cell(
    fig_cx: float, fig_cy: float,
    matrix,
    output_width: int, output_height: int,
    rows: int, cols: int,
) -> Tuple[int, int, float, float]:
    """Perspective-transform figure coords → grid cell. Returns (row, col, wx, wy)."""
    import cv2
    pt = np.array([[[float(fig_cx), float(fig_cy)]]], dtype=np.float32)
    warped_pt = cv2.perspectiveTransform(pt, matrix)
    wx, wy = warped_pt[0][0]
    cell_w = output_width  / cols
    cell_h = output_height / rows
    col = int(np.clip(int(wx / cell_w), 0, cols - 1))
    row = int(np.clip(int(wy / cell_h), 0, rows - 1))
    return row, col, wx, wy


def _draw_figure_indicator(canvas, cx, cy, radius):
    """Draw the cyan targeting reticle + 'Figure detected' label."""
    import cv2
    color       = (0, 255, 255)
    ring_radius = radius + 20
    cv2.circle(canvas, (cx, cy), ring_radius,      color, 2, cv2.LINE_AA)
    cv2.circle(canvas, (cx, cy), ring_radius + 10, color, 1, cv2.LINE_AA)
    arm = ring_radius + 25
    cv2.line(canvas, (cx - arm, cy),             (cx - ring_radius + 5, cy), color, 2, cv2.LINE_AA)
    cv2.line(canvas, (cx + ring_radius - 5, cy), (cx + arm, cy),             color, 2, cv2.LINE_AA)
    cv2.line(canvas, (cx, cy - arm),             (cx, cy - ring_radius + 5), color, 2, cv2.LINE_AA)
    cv2.line(canvas, (cx, cy + ring_radius - 5), (cx, cy + arm),             color, 2, cv2.LINE_AA)
    label = "Figure detected"
    fs, th = 0.65, 2
    (tw, tth), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, fs, th)
    tx, ty = cx - tw // 2, cy - ring_radius - 12
    pad = 4
    cv2.rectangle(canvas, (tx - pad, ty - tth - pad), (tx + tw + pad, ty + pad), color, -1)
    cv2.putText(canvas, label, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, fs, (0, 0, 0), th)


# ---- Main CV pipeline -------------------------------------------------------

def run_grid_vision(image_bgr) -> Dict[str, Any]:
    """
    Full ArUco + figure-detection pipeline.
    Returns a dict with status, message, row, col, warped_x/y, and all
    intermediate data needed to re-render the annotated image.
    """
    import cv2

    aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    detector   = cv2.aruco.ArucoDetector(aruco_dict, cv2.aruco.DetectorParameters())
    corners, ids, _ = detector.detectMarkers(image_bgr)

    if ids is None:
        return {'status': 'error', 'message': 'No ArUco markers detected', 'markers_found': []}

    ids = ids.flatten().tolist()
    required_ids   = [1, 2, 3, 4]
    marker_centers: Dict[int, list] = {}
    marker_corners: Dict[int, Any]  = {}

    for i, marker_id in enumerate(ids):
        c = corners[i][0]
        marker_centers[marker_id] = [float(np.mean(c[:, 0])), float(np.mean(c[:, 1]))]
        marker_corners[marker_id] = c

    missing = [mid for mid in required_ids if mid not in marker_centers]
    if missing:
        return {'status': 'error', 'message': f'Missing marker IDs: {missing}', 'markers_found': ids}

    grid_centroid = np.mean([marker_centers[mid] for mid in required_ids], axis=0)

    src_points = np.array([
        _get_inner_corner(marker_corners[1], grid_centroid),
        _get_inner_corner(marker_corners[2], grid_centroid),
        _get_inner_corner(marker_corners[3], grid_centroid),
        _get_inner_corner(marker_corners[4], grid_centroid),
    ], dtype=np.float32)

    dst_points = np.array([
        [0,            0            ],
        [OUTPUT_WIDTH, 0            ],
        [OUTPUT_WIDTH, OUTPUT_HEIGHT],
        [0,            OUTPUT_HEIGHT],
    ], dtype=np.float32)

    matrix = cv2.getPerspectiveTransform(src_points, dst_points)

    # Shared payload for re-use in the annotated renderer
    base_payload = {
        'markers_found':  ids,
        'marker_centers': marker_centers,
        'marker_corners': {k: v.tolist() for k, v in marker_corners.items()},
        'grid_centroid':  grid_centroid.tolist(),
        'matrix':         matrix.tolist(),
    }

    fig = _find_orange_figure(image_bgr)
    if not fig:
        return {**base_payload, 'status': 'error', 'message': 'Markers found but no orange figure detected'}

    fig_cx, fig_cy, fig_r = fig
    row, col, wx, wy = _get_figure_grid_cell(
        fig_cx, fig_cy, matrix,
        OUTPUT_WIDTH, OUTPUT_HEIGHT, GRID_ROWS, GRID_COLS,
    )

    return {
        **base_payload,
        'status':        'success',
        'message':       f'Figure at row={row}, col={col}',
        'row':           row,
        'col':           col,
        'warped_x':      round(float(wx), 1),
        'warped_y':      round(float(wy), 1),
        'figure_px':     [fig_cx, fig_cy],
        'figure_radius': fig_r,
    }


# ---- Annotated image renderer ----------------------------------------------

def render_annotated_image(image_bgr, vision_result: Dict[str, Any]) -> Optional[bytes]:
    """
    Draw the "Original with Markers" overlay onto image_bgr.

    Renders:
      • Coloured polylines + centre dots per ArUco marker
      • Cyan inner-corner dots  (warp anchors)
      • Cyan inner-corner quad  (exact playable grid boundary)
      • Pale-yellow outer-corner quad
      • Cyan figure reticle + "Figure detected" label
      • Semi-transparent cell label (r#, c#) in top-left corner

    Returns JPEG bytes, or None on failure.
    """
    import cv2

    canvas       = image_bgr.copy()
    required_ids = [1, 2, 3, 4]
    role_map     = {1: 'TL', 2: 'TR', 3: 'BR', 4: 'BL'}
    colors       = {1: (255, 80, 80), 2: (80, 255, 80), 3: (80, 80, 255), 4: (255, 200, 0)}

    # Re-hydrate numpy arrays (JSON serialisation turns int keys to str)
    marker_centers = {int(k): v for k, v in vision_result.get('marker_centers', {}).items()}
    marker_corners = {
        int(k): np.array(v, dtype=np.float32)
        for k, v in vision_result.get('marker_corners', {}).items()
    }
    grid_centroid = np.array(vision_result.get('grid_centroid', [0, 0]))

    # ── Per-marker outlines ──────────────────────────────────────────────────
    for mid in required_ids:
        if mid not in marker_centers:
            continue
        c      = marker_corners[mid]
        color  = colors[mid]
        cx, cy = int(marker_centers[mid][0]), int(marker_centers[mid][1])

        cv2.polylines(canvas, [c.astype(np.int32).reshape(-1, 1, 2)],
                      isClosed=True, color=color, thickness=2)
        for pt in c.astype(np.int32):
            cv2.circle(canvas, tuple(pt), 4, color, -1)
        cv2.circle(canvas, (cx, cy), 6, color, -1)

        # Cyan inner-corner dot (warp anchor)
        ix, iy = _get_inner_corner(c, grid_centroid)
        cv2.circle(canvas, (int(ix), int(iy)), 8, (0, 255, 255), 2)

        # ID label with filled background
        label = f"ID {mid} ({role_map[mid]})"
        fs, th = 0.65, 2
        (tw, tth), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, fs, th)
        pad = 4
        cv2.rectangle(canvas,
                      (cx - pad, cy - tth - pad * 2),
                      (cx + tw + pad, cy + pad), color, -1)
        cv2.putText(canvas, label, (cx, cy - pad),
                    cv2.FONT_HERSHEY_SIMPLEX, fs, (0, 0, 0), th)

    # ── Boundary quads ───────────────────────────────────────────────────────
    if all(mid in marker_corners for mid in required_ids):
        inner_pts = np.array([
            _get_inner_corner(marker_corners[mid], grid_centroid)
            for mid in required_ids
        ], dtype=np.int32)
        cv2.polylines(canvas, [inner_pts.reshape(-1, 1, 2)],
                      isClosed=True, color=(0, 255, 255), thickness=2, lineType=cv2.LINE_AA)

        outer_pts = np.array([
            _get_outer_corner(marker_corners[mid], role_map[mid])
            for mid in required_ids
        ], dtype=np.int32)
        cv2.polylines(canvas, [outer_pts.reshape(-1, 1, 2)],
                      isClosed=True, color=(0, 200, 255), thickness=1, lineType=cv2.LINE_AA)

    # ── Figure reticle + cell label ──────────────────────────────────────────
    if vision_result.get('status') == 'success':
        fig_cx, fig_cy = vision_result['figure_px']
        fig_r          = vision_result['figure_radius']
        _draw_figure_indicator(canvas, int(fig_cx), int(fig_cy), fig_r)

        cell_label = f"r{vision_result['row']}, c{vision_result['col']}"
        fs, th = 0.8, 2
        (tw, tth), _ = cv2.getTextSize(cell_label, cv2.FONT_HERSHEY_SIMPLEX, fs, th)
        pad = 6
        overlay = canvas.copy()
        cv2.rectangle(overlay, (8, 8), (8 + tw + pad * 2, 8 + tth + pad * 2), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.55, canvas, 0.45, 0, canvas)
        cv2.putText(canvas, cell_label, (8 + pad, 8 + tth + pad),
                    cv2.FONT_HERSHEY_SIMPLEX, fs, (0, 255, 255), th)

    ok, buf = cv2.imencode('.jpg', canvas, [cv2.IMWRITE_JPEG_QUALITY, 88])
    return bytes(buf) if ok else None


# ============================================
# WEBCAM SERVICE
# ============================================

class WebcamService:
    """
    Manages client-side webcam snapshot processing.
    Distinct from ESP32 streaming - processes single frames uploaded from browser.
    """

    def __init__(self):
        self.is_active: bool = False
        self.last_snapshot: Optional[bytes] = None
        self.last_annotated_snapshot: Optional[bytes] = None
        self.last_snapshot_time: Optional[datetime] = None
        self.session_id: Optional[str] = None
        self.last_vision_result: Optional[Dict[str, Any]] = None

        # Processing settings
        self.max_image_size = (1920, 1080)
        self.jpeg_quality   = 85
        self.max_file_size  = 5 * 1024 * 1024  # 5 MB

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def activate_webcam(self, session_id: str) -> Dict[str, Any]:
        self.is_active               = True
        self.session_id              = session_id
        self.last_snapshot           = None
        self.last_annotated_snapshot = None
        self.last_snapshot_time      = None
        self.last_vision_result      = None
        print(f"✅ Webcam activated for session: {session_id}")
        return {'status': 'success', 'message': 'Webcam mode activated', 'session_id': session_id}

    def deactivate_webcam(self) -> Dict[str, Any]:
        if not self.is_active:
            return {'status': 'info', 'message': 'Webcam not active'}
        self.is_active               = False
        self.session_id              = None
        self.last_snapshot           = None
        self.last_annotated_snapshot = None
        self.last_snapshot_time      = None
        self.last_vision_result      = None
        print("⏹️ Webcam deactivated")
        return {'status': 'success', 'message': 'Webcam deactivated successfully'}

    # ------------------------------------------------------------------
    # Snapshot ingestion + CV pipeline
    # ------------------------------------------------------------------

    def process_snapshot(self, image_data: str) -> Dict[str, Any]:
        """
        Validate → store → run CV pipeline → render annotated image.
        Returns processing status with nested vision result.
        """
        if not self.is_active:
            return {'status': 'error', 'message': 'Webcam mode not active'}

        try:
            # Decode
            if ',' in image_data:
                image_data = image_data.split(',', 1)[1]
            image_bytes = base64.b64decode(image_data)

            if len(image_bytes) > self.max_file_size:
                return {'status': 'error', 'message': f'Image too large (max {self.max_file_size // (1024*1024)} MB)'}

            # Validate / resize / recompress
            pil_image = Image.open(io.BytesIO(image_bytes))
            if pil_image.size[0] > self.max_image_size[0] or pil_image.size[1] > self.max_image_size[1]:
                pil_image.thumbnail(self.max_image_size, Image.Resampling.LANCZOS)
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')

            output = io.BytesIO()
            pil_image.save(output, format='JPEG', quality=self.jpeg_quality, optimize=True)
            processed_bytes = output.getvalue()

            # Store raw snapshot
            self.last_snapshot      = processed_bytes
            self.last_snapshot_time = datetime.utcnow()

            # Optional debug save
            try:
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                with open(f"webcam_debug_{ts}.jpg", "wb") as f:
                    f.write(processed_bytes)
            except Exception as e:
                print(f"⚠️ DEBUG save failed: {e}")

            # CV pipeline
            vision_result = self._run_vision_pipeline(processed_bytes)
            self.last_vision_result = vision_result

            # Annotated image
            self.last_annotated_snapshot = self._render_annotated(processed_bytes, vision_result)

            if vision_result['status'] == 'success':
                print(f"🎯 Figure → row={vision_result['row']}, col={vision_result['col']}")
            else:
                print(f"⚠️  Vision: {vision_result['message']}")

            return {
                'status':     'success',
                'message':    'Snapshot processed successfully',
                'size':       len(processed_bytes),
                'dimensions': f"{pil_image.size[0]}x{pil_image.size[1]}",
                'timestamp':  self.last_snapshot_time.isoformat(),
                'vision':     vision_result,
            }

        except Exception as e:
            print(f"❌ process_snapshot error: {e}")
            return {'status': 'error', 'message': f'Failed to process snapshot: {e}'}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _run_vision_pipeline(self, image_bytes: bytes) -> Dict[str, Any]:
        try:
            import cv2
            nparr = np.frombuffer(image_bytes, np.uint8)
            bgr   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if bgr is None:
                return {'status': 'error', 'message': 'Could not decode image for CV'}
            return run_grid_vision(bgr)
        except ImportError:
            return {'status': 'error', 'message': 'OpenCV (cv2) not installed'}
        except Exception as e:
            return {'status': 'error', 'message': f'CV pipeline error: {e}'}

    def _render_annotated(self, image_bytes: bytes, vision_result: Dict[str, Any]) -> Optional[bytes]:
        try:
            import cv2
            nparr = np.frombuffer(image_bytes, np.uint8)
            bgr   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if bgr is None:
                return None
            return render_annotated_image(bgr, vision_result)
        except Exception as e:
            print(f"❌ Annotation render error: {e}")
            return None

    # ------------------------------------------------------------------
    # Accessors
    # ------------------------------------------------------------------

    def get_latest_snapshot(self) -> Optional[bytes]:
        return self.last_snapshot

    def get_latest_annotated_snapshot(self) -> Optional[bytes]:
        """Return the most recent annotated JPEG (markers + reticle overlay)."""
        return self.last_annotated_snapshot

    def get_latest_vision_result(self) -> Optional[Dict[str, Any]]:
        return self.last_vision_result

    def get_status(self) -> Dict[str, Any]:
        return {
            'active':             self.is_active,
            'session_id':         self.session_id,
            'has_snapshot':       self.last_snapshot is not None,
            'has_annotated':      self.last_annotated_snapshot is not None,
            'last_snapshot_time': self.last_snapshot_time.isoformat() if self.last_snapshot_time else None,
            'last_vision_result': self.last_vision_result,
            'max_image_size':     f"{self.max_image_size[0]}x{self.max_image_size[1]}",
            'jpeg_quality':       self.jpeg_quality,
        }


# ============================================
# Singleton
# ============================================
_webcam_service_instance: Optional[WebcamService] = None


def get_webcam_service() -> WebcamService:
    global _webcam_service_instance
    if _webcam_service_instance is None:
        _webcam_service_instance = WebcamService()
    return _webcam_service_instance