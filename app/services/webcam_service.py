"""
Webcam Service for Client-Side Camera Integration
Handles snapshot uploads and processing from browser webcam
Architecturally separate from ESP32-CAM system
"""

from datetime import datetime
from typing import Optional, Dict, Any
import base64
import io
from PIL import Image


class WebcamService:
    """
    Manages client-side webcam snapshot processing.
    Distinct from ESP32 streaming - processes single frames uploaded from browser.
    """
    
    def __init__(self):
        self.is_active: bool = False
        self.last_snapshot: Optional[bytes] = None
        self.last_snapshot_time: Optional[datetime] = None
        self.session_id: Optional[str] = None
        
        # Processing settings
        self.max_image_size = (1920, 1080)  # Max resolution
        self.jpeg_quality = 85
        self.max_file_size = 5 * 1024 * 1024  # 5MB
        
    def activate_webcam(self, session_id: str) -> Dict[str, Any]:
        """
        Activate webcam mode for a session.
        Enforces single-source rule - cannot activate if ESP32 is active.
        
        Args:
            session_id: DM session identifier
            
        Returns:
            dict: Activation status
        """
        # TODO: Check if ESP32 camera is active for this session
        # from app.services.camera_service import get_camera_service
        # esp32_service = get_camera_service()
        # if esp32_service.is_connected:
        #     return {
        #         'status': 'error',
        #         'message': 'ESP32 camera is currently active. Disconnect it first.'
        #     }
        
        self.is_active = True
        self.session_id = session_id
        self.last_snapshot = None
        self.last_snapshot_time = None
        
        print(f"✅ Webcam mode activated for session: {session_id}")
        
        return {
            'status': 'success',
            'message': 'Webcam mode activated',
            'session_id': session_id
        }
    
    def deactivate_webcam(self) -> Dict[str, Any]:
        """
        Deactivate webcam mode and cleanup.
        
        Returns:
            dict: Deactivation status
        """
        if not self.is_active:
            return {
                'status': 'info',
                'message': 'Webcam not active'
            }
        
        self.is_active = False
        self.session_id = None
        self.last_snapshot = None
        self.last_snapshot_time = None
        
        print("⏹️ Webcam mode deactivated")
        
        return {
            'status': 'success',
            'message': 'Webcam deactivated successfully'
        }
    
    def process_snapshot(self, image_data: str) -> Dict[str, Any]:
        """
        Process a base64-encoded snapshot from client webcam.
        Validates, optimizes, and stores the image.
        
        Args:
            image_data: Base64-encoded JPEG image (with or without data URI prefix)
            
        Returns:
            dict: Processing status and metadata
        """
        if not self.is_active:
            return {
                'status': 'error',
                'message': 'Webcam mode not active'
            }
        
        try:
            # Remove data URI prefix if present
            if ',' in image_data:
                image_data = image_data.split(',', 1)[1]
            
            # Decode base64
            image_bytes = base64.b64decode(image_data)
            
            # Check file size
            if len(image_bytes) > self.max_file_size:
                return {
                    'status': 'error',
                    'message': f'Image too large. Max size: {self.max_file_size / 1024 / 1024}MB'
                }
            
            # Open and validate image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Resize if needed
            if image.size[0] > self.max_image_size[0] or image.size[1] > self.max_image_size[1]:
                image.thumbnail(self.max_image_size, Image.Resampling.LANCZOS)
            
            # Convert to JPEG if not already
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Compress to bytes
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=self.jpeg_quality, optimize=True)
            processed_bytes = output.getvalue()
            
            # Store snapshot
            self.last_snapshot = processed_bytes
            self.last_snapshot_time = datetime.utcnow()
            
            print(f"📸 Snapshot processed: {len(processed_bytes)} bytes, {image.size}")
            
            # TODO: Add game logic processing here
            # self._process_game_logic(processed_bytes)
            
            return {
                'status': 'success',
                'message': 'Snapshot processed successfully',
                'size': len(processed_bytes),
                'dimensions': f"{image.size[0]}x{image.size[1]}",
                'timestamp': self.last_snapshot_time.isoformat()
            }
            
        except Exception as e:
            print(f"❌ Error processing snapshot: {e}")
            return {
                'status': 'error',
                'message': f'Failed to process snapshot: {str(e)}'
            }
    
    def get_latest_snapshot(self) -> Optional[bytes]:
        """
        Retrieve the most recent processed snapshot.
        
        Returns:
            bytes: JPEG image data, or None if no snapshot available
        """
        return self.last_snapshot
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get current webcam status.
        
        Returns:
            dict: Status information
        """
        return {
            'active': self.is_active,
            'session_id': self.session_id,
            'has_snapshot': self.last_snapshot is not None,
            'last_snapshot_time': self.last_snapshot_time.isoformat() if self.last_snapshot_time else None,
            'max_image_size': f"{self.max_image_size[0]}x{self.max_image_size[1]}",
            'jpeg_quality': self.jpeg_quality
        }
    
    def _process_game_logic(self, image_bytes: bytes) -> None:
        """
        Placeholder for future game logic integration.
        Will analyze the image for game state (minis, grid, etc.)
        
        Args:
            image_bytes: Processed JPEG image
        """
        # TODO: Implement mini detection, grid analysis, etc.
        pass


# Singleton instance
_webcam_service_instance: Optional[WebcamService] = None


def get_webcam_service() -> WebcamService:
    """
    Get or create the singleton webcam service instance.
    
    Returns:
        WebcamService: The webcam service instance
    """
    global _webcam_service_instance
    
    if _webcam_service_instance is None:
        _webcam_service_instance = WebcamService()
    
    return _webcam_service_instance