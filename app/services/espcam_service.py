"""
ESP32-CAM Service - Firebase-based Discovery
Client-side streaming with server-side snapshot processing
"""

from datetime import datetime
from typing import Optional, Dict, Any
import base64
import io
from PIL import Image
from firebase_admin import db


class ESPCamService:
    """
    Manages ESP32-CAM connection via Firebase discovery.
    Client connects directly to stream, server processes snapshots.
    """
    
    def __init__(self):
        self.is_active: bool = False
        self.camera_ip: Optional[str] = None
        self.last_snapshot: Optional[bytes] = None
        self.last_snapshot_time: Optional[datetime] = None
        self.session_id: Optional[str] = None
        
        # Processing settings
        self.max_image_size = (1920, 1080)
        self.jpeg_quality = 85
        self.max_file_size = 5 * 1024 * 1024  # 5MB
        
    def get_camera_ip(self) -> Dict[str, Any]:
        """
        Retrieve ESP32-CAM IP address from Firebase.
        
        Returns:
            dict: Status and IP information
        """
        try:
            # Read from Firebase: /espcam/ip
            ref = db.reference('espcam/ip')
            data = ref.get()
            
            if not data:
                return {
                    'status': 'error',
                    'message': 'No ESP32-CAM found in Firebase. Make sure camera is powered on and connected to WiFi.'
                }
            
            # Handle both string (just IP) and dict formats
            if isinstance(data, str):
                # Simple format: just the IP address string
                ip = data
                status = 'online'
                timestamp = 0
            elif isinstance(data, dict):
                # Complex format: {ip: "x.x.x.x", status: "online", timestamp: 123}
                ip = data.get('ip')
                status = data.get('status', 'unknown')
                timestamp = data.get('timestamp', 0)
            else:
                return {
                    'status': 'error',
                    'message': f'Unexpected data format in Firebase: {type(data)}'
                }
            
            if not ip:
                return {
                    'status': 'error',
                    'message': 'Invalid camera data in Firebase'
                }
            
            # Check if camera is stale (older than 10 minutes) - only if we have timestamp
            if timestamp > 0:
                current_time = datetime.utcnow().timestamp() * 1000  # Convert to milliseconds
                if current_time - timestamp > 600000:  # 10 minutes
                    return {
                        'status': 'warning',
                        'message': 'Camera data is stale. Camera may be offline.',
                        'camera_ip': ip,
                        'stream_url': f'http://{ip}/',
                        'last_seen': timestamp
                    }
            
            self.camera_ip = ip
            
            print(f"✅ Found ESP32-CAM at: {ip}")
            
            return {
                'status': 'success',
                'message': 'Camera found successfully',
                'camera_ip': ip,
                'stream_url': f'http://{ip}/',
                'last_seen': timestamp if timestamp > 0 else 'unknown'
            }
            
        except Exception as e:
            print(f"❌ Error getting camera IP: {e}")
            import traceback
            traceback.print_exc()
            return {
                'status': 'error',
                'message': f'Failed to retrieve camera IP: {str(e)}'
            }
    
    def activate_espcam(self, session_id: str) -> Dict[str, Any]:
        """
        Activate ESP32-CAM mode for a session.
        
        Args:
            session_id: DM session identifier
            
        Returns:
            dict: Activation status
        """
        # Check for camera IP first
        ip_result = self.get_camera_ip()
        
        if ip_result['status'] != 'success':
            return ip_result
        
        self.is_active = True
        self.session_id = session_id
        self.camera_ip = ip_result['camera_ip']
        self.last_snapshot = None
        self.last_snapshot_time = None
        
        print(f"✅ ESP32-CAM mode activated for session: {session_id}")
        
        return {
            'status': 'success',
            'message': 'ESP32-CAM mode activated',
            'session_id': session_id,
            'camera_ip': self.camera_ip,
            'stream_url': f'http://{self.camera_ip}/'
        }
    
    def deactivate_espcam(self) -> Dict[str, Any]:
        """
        Deactivate ESP32-CAM mode and cleanup.
        
        Returns:
            dict: Deactivation status
        """
        if not self.is_active:
            return {
                'status': 'info',
                'message': 'ESP32-CAM not active'
            }
        
        self.is_active = False
        self.session_id = None
        self.camera_ip = None
        self.last_snapshot = None
        self.last_snapshot_time = None
        
        print("⏹️ ESP32-CAM mode deactivated")
        
        return {
            'status': 'success',
            'message': 'ESP32-CAM deactivated successfully'
        }
    
    def process_snapshot(self, image_data: str) -> Dict[str, Any]:
        """
        Process a base64-encoded snapshot from ESP32-CAM.
        Validates, optimizes, and stores the image.
        
        Args:
            image_data: Base64-encoded JPEG image
            
        Returns:
            dict: Processing status and metadata
        """
        if not self.is_active:
            return {
                'status': 'error',
                'message': 'ESP32-CAM mode not active'
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
            
            print(f"📸 ESP32-CAM snapshot processed: {len(processed_bytes)} bytes, {image.size}")
            
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
        Get current ESP32-CAM status.
        
        Returns:
            dict: Status information
        """
        return {
            'active': self.is_active,
            'session_id': self.session_id,
            'camera_ip': self.camera_ip,
            'has_snapshot': self.last_snapshot is not None,
            'last_snapshot_time': self.last_snapshot_time.isoformat() if self.last_snapshot_time else None,
            'max_image_size': f"{self.max_image_size[0]}x{self.max_image_size[1]}",
            'jpeg_quality': self.jpeg_quality
        }
    
    def _process_game_logic(self, image_bytes: bytes) -> None:
        """
        Placeholder for future game logic integration.
        
        Args:
            image_bytes: Processed JPEG image
        """
        # TODO: Implement mini detection, grid analysis, etc.
        pass


# Singleton instance
_espcam_service_instance: Optional[ESPCamService] = None


def get_espcam_service() -> ESPCamService:
    """
    Get or create the singleton ESP32-CAM service instance.
    
    Returns:
        ESPCamService: The service instance
    """
    global _espcam_service_instance
    
    if _espcam_service_instance is None:
        _espcam_service_instance = ESPCamService()
    
    return _espcam_service_instance