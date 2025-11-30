"""
Camera Service for ESP32-CAM Integration
Handles connection, streaming, and image processing via Serial Port
"""

import requests
import threading
import time
import serial
import serial.tools.list_ports
import re
from typing import Optional, Dict, Any
from datetime import datetime


class CameraService:
    """
    Manages ESP32-CAM connection and streaming.
    Automatically discovers camera IP from Firebase and maintains connection.
    """
    
    def __init__(self):
        self.camera_ip: Optional[str] = None
        self.stream_url: Optional[str] = None
        self.is_connected: bool = False
        self.is_streaming: bool = False
        self.last_frame: Optional[bytes] = None
        self.last_update: Optional[datetime] = None
        self.stream_thread: Optional[threading.Thread] = None
        self.should_stop: bool = False
        
        # Serial port settings
        self.serial_port: Optional[serial.Serial] = None
        self.serial_monitor_thread: Optional[threading.Thread] = None
        self.baud_rate = 115200
        
        # Connection settings
        self.connection_timeout = 5  # seconds
        self.stream_endpoint = "/"  # ESP32-CAM root endpoint for streaming
        self.quality = 10  # JPEG quality (0-63, lower is better)
        self.frame_rate = 2  # frames per second
        
    def find_camera(self) -> Dict[str, Any]:
        """
        Automatically detect ESP32-CAM via serial port and extract IP address.
        Monitors serial output for "Camera Stream Ready! Go to: http://X.X.X.X"
        
        Returns:
            dict: Status and camera information
        """
        try:
            print("🔍 Searching for ESP32-CAM on serial ports...")
            
            # List available serial ports
            ports = list(serial.tools.list_ports.comports())
            
            if not ports:
                return {
                    'status': 'error',
                    'message': 'No serial ports found. Connect ESP32-CAM via USB.'
                }
            
            print(f"📡 Found {len(ports)} serial port(s)")
            for i, port in enumerate(ports):
                print(f"  {i}: {port.device} - {port.description}")
            
            # Try to find ESP32-CAM on each port
            for port_info in ports:
                port_name = port_info.device
                print(f"🔌 Trying port: {port_name}")
                
                ip_address = self._scan_port_for_ip(port_name)
                
                if ip_address:
                    print(f"✅ Found camera at IP: {ip_address}")
                    
                    # Test connection to camera
                    if self._test_connection(ip_address):
                        self.camera_ip = ip_address
                        self.stream_url = f"http://{ip_address}{self.stream_endpoint}"
                        self.is_connected = True
                        
                        return {
                            'status': 'success',
                            'message': 'Camera connected successfully',
                            'camera_ip': ip_address,
                            'stream_url': '/api/camera/stream'
                        }
                    else:
                        return {
                            'status': 'error',
                            'message': f'Camera found at {ip_address} but not responding'
                        }
            
            return {
                'status': 'error',
                'message': 'ESP32-CAM not found on any serial port. Try resetting the device.'
            }
                
        except Exception as e:
            print(f"❌ Error finding camera: {e}")
            return {
                'status': 'error',
                'message': f'Failed to find camera: {str(e)}'
            }
    
    def _scan_port_for_ip(self, port_name: str, timeout: int = 10) -> Optional[str]:
        """
        Scan a specific serial port for ESP32-CAM IP address.
        Looks for pattern: "Camera Stream Ready! Go to: http://X.X.X.X"
        
        Args:
            port_name: Serial port device name
            timeout: Maximum seconds to wait for IP
            
        Returns:
            str: IP address if found, None otherwise
        """
        try:
            # Open serial port
            ser = serial.Serial(
                port_name, 
                self.baud_rate, 
                timeout=1,
                dsrdtr=None
            )
            
            # Release board from reset
            ser.dtr = False
            ser.rts = False
            
            # Trigger reset to get fresh boot output
            print(f"  Resetting ESP32-CAM on {port_name}...")
            ser.dtr = False  # IO0 High (Run mode)
            ser.rts = True   # EN Low (Reset active)
            time.sleep(0.1)
            ser.rts = False  # EN High (Release Reset)
            
            # Clear any existing data
            ser.reset_input_buffer()
            
            # Pattern to match IP address
            # Looks for: "Camera Stream Ready! Go to: http://192.168.1.100"
            ip_pattern = re.compile(r'Camera Stream Ready! Go to: http://([\d.]+)')
            
            start_time = time.time()
            buffer = ""
            
            print(f"  Listening for IP address...")
            
            while time.time() - start_time < timeout:
                if ser.in_waiting > 0:
                    try:
                        # Read line from serial
                        line = ser.readline().decode('utf-8', errors='replace').strip()
                        
                        if line:
                            print(f"  >> {line}")
                            buffer += line + "\n"
                            
                            # Check if line contains IP address
                            match = ip_pattern.search(line)
                            if match:
                                ip_address = match.group(1)
                                print(f"  ✅ IP found: {ip_address}")
                                ser.close()
                                return ip_address
                                
                    except Exception as e:
                        print(f"  ⚠️ Error reading line: {e}")
                        
                time.sleep(0.1)
            
            print(f"  ⏱️ Timeout waiting for IP address")
            ser.close()
            return None
            
        except serial.SerialException as e:
            print(f"  ❌ Serial error on {port_name}: {e}")
            return None
        except Exception as e:
            print(f"  ❌ Unexpected error: {e}")
            return None
    
    def _test_connection(self, ip: str) -> bool:
        """
        Test if camera is responding at given IP.
        
        Args:
            ip: IP address to test
            
        Returns:
            bool: True if camera responds
        """
        try:
            test_url = f"http://{ip}{self.stream_endpoint}"
            response = requests.get(test_url, timeout=self.connection_timeout)
            return response.status_code == 200
        except Exception as e:
            print(f"❌ Connection test failed: {e}")
            return False
    
    def start_streaming(self) -> Dict[str, Any]:
        """
        Start continuous frame capture from camera.
        Runs in separate thread to avoid blocking.
        
        Returns:
            dict: Status of stream start
        """
        if not self.is_connected:
            return {
                'status': 'error',
                'message': 'Camera not connected. Call find_camera() first.'
            }
        
        if self.is_streaming:
            return {
                'status': 'info',
                'message': 'Stream already running'
            }
        
        try:
            self.should_stop = False
            self.stream_thread = threading.Thread(target=self._stream_loop, daemon=True)
            self.stream_thread.start()
            self.is_streaming = True
            
            print("▶️ Camera stream started")
            return {
                'status': 'success',
                'message': 'Stream started successfully'
            }
        except Exception as e:
            print(f"❌ Error starting stream: {e}")
            return {
                'status': 'error',
                'message': f'Failed to start stream: {str(e)}'
            }
    
    def _stream_loop(self):
        """
        Continuous loop to fetch frames from camera.
        Runs in separate thread.
        """
        print("🎥 Stream loop started")
        frame_interval = 1.0 / self.frame_rate
        
        while not self.should_stop:
            try:
                # Fetch frame from ESP32-CAM
                response = requests.get(
                    self.stream_url,
                    timeout=self.connection_timeout,
                    params={'quality': self.quality}
                )
                
                if response.status_code == 200:
                    self.last_frame = response.content
                    self.last_update = datetime.utcnow()
                else:
                    print(f"⚠️ Frame fetch failed: {response.status_code}")
                
            except Exception as e:
                print(f"❌ Error in stream loop: {e}")
                time.sleep(1)  # Wait before retry
                
            # Control frame rate
            time.sleep(frame_interval)
        
        print("⏹️ Stream loop stopped")
    
    def get_latest_frame(self) -> Optional[bytes]:
        """
        Get the most recent frame captured from camera.
        
        Returns:
            bytes: JPEG image data, or None if no frame available
        """
        return self.last_frame
    
    def stop_streaming(self) -> Dict[str, Any]:
        """
        Stop the camera stream.
        
        Returns:
            dict: Status of stream stop
        """
        if not self.is_streaming:
            return {
                'status': 'info',
                'message': 'Stream not running'
            }
        
        try:
            self.should_stop = True
            
            if self.stream_thread and self.stream_thread.is_alive():
                self.stream_thread.join(timeout=3)
            
            self.is_streaming = False
            print("⏹️ Camera stream stopped")
            
            return {
                'status': 'success',
                'message': 'Stream stopped successfully'
            }
        except Exception as e:
            print(f"❌ Error stopping stream: {e}")
            return {
                'status': 'error',
                'message': f'Failed to stop stream: {str(e)}'
            }
    
    def disconnect(self) -> Dict[str, Any]:
        """
        Disconnect from camera and clean up resources.
        
        Returns:
            dict: Status of disconnection
        """
        try:
            # Stop streaming if active
            if self.is_streaming:
                self.stop_streaming()
            
            # Close serial port if open
            if self.serial_port and self.serial_port.is_open:
                self.serial_port.close()
                print("🔌 Serial port closed")
            
            # Clear connection data
            self.camera_ip = None
            self.stream_url = None
            self.is_connected = False
            self.last_frame = None
            
            print("🔌 Camera disconnected")
            return {
                'status': 'success',
                'message': 'Camera disconnected successfully'
            }
        except Exception as e:
            print(f"❌ Error disconnecting: {e}")
            return {
                'status': 'error',
                'message': f'Failed to disconnect: {str(e)}'
            }
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get current camera status information.
        
        Returns:
            dict: Complete status information
        """
        return {
            'connected': self.is_connected,
            'streaming': self.is_streaming,
            'camera_ip': self.camera_ip,
            'stream_url': '/api/camera/stream' if self.is_connected else None,
            'last_update': self.last_update.isoformat() if self.last_update else None,
            'frame_rate': self.frame_rate,
            'quality': self.quality
        }
    
    def capture_single_frame(self) -> Optional[bytes]:
        """
        Capture a single frame without starting continuous streaming.
        Useful for testing or one-time captures.
        
        Returns:
            bytes: JPEG image data, or None on failure
        """
        if not self.is_connected:
            print("❌ Camera not connected")
            return None
        
        try:
            response = requests.get(
                self.stream_url,
                timeout=self.connection_timeout,
                params={'quality': self.quality}
            )
            
            if response.status_code == 200:
                return response.content
            else:
                print(f"❌ Frame capture failed: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ Error capturing frame: {e}")
            return None
    
    def set_quality(self, quality: int) -> Dict[str, Any]:
        """
        Adjust JPEG quality for streaming.
        
        Args:
            quality: Quality level (0-63, lower is better)
            
        Returns:
            dict: Status of quality change
        """
        if not 0 <= quality <= 63:
            return {
                'status': 'error',
                'message': 'Quality must be between 0 and 63'
            }
        
        self.quality = quality
        return {
            'status': 'success',
            'message': f'Quality set to {quality}'
        }
    
    def set_frame_rate(self, fps: float) -> Dict[str, Any]:
        """
        Adjust frame rate for streaming.
        
        Args:
            fps: Frames per second (0.5 - 10)
            
        Returns:
            dict: Status of frame rate change
        """
        if not 0.5 <= fps <= 10:
            return {
                'status': 'error',
                'message': 'Frame rate must be between 0.5 and 10 FPS'
            }
        
        self.frame_rate = fps
        return {
            'status': 'success',
            'message': f'Frame rate set to {fps} FPS'
        }


# Singleton instance
_camera_service_instance: Optional[CameraService] = None


def get_camera_service() -> CameraService:
    """
    Get or create the singleton camera service instance.
    
    Returns:
        CameraService: The camera service instance
    """
    global _camera_service_instance
    
    if _camera_service_instance is None:
        _camera_service_instance = CameraService()
    
    return _camera_service_instance