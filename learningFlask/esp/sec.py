import cv2
import requests
import numpy as np

# הכתובת שעבדה לך בבדיקה
URL = "http://10.72.36.225:80/"

def run_camera():
    print(f"📡 Connecting to {URL} using requests...")
    
    try:
        # פותח את החיבור ומוריד את הזרם בחלקים (Chunks)
        stream = requests.get(URL, stream=True, timeout=5)
        
        if stream.status_code == 200:
            print("✅ Stream opened! Starting video...")
            bytes_buffer = b''
            
            # קורא את המידע שמגיע מהמצלמה בחתיכות קטנות
            for chunk in stream.iter_content(chunk_size=1024):
                bytes_buffer += chunk
                
                # מחפש את הסוף וההתחלה של תמונת JPEG בתוך הזרם
                # 0xff 0xd8 = התחלה, 0xff 0xd9 = סוף
                a = bytes_buffer.find(b'\xff\xd8')
                b = bytes_buffer.find(b'\xff\xd9')
                
                if a != -1 and b != -1:
                    # בודדנו תמונה אחת שלמה!
                    jpg = bytes_buffer[a:b+2]
                    
                    # נקה את הבאפר לתמונה הבאה
                    bytes_buffer = bytes_buffer[b+2:]
                    
                    # המרת המידע הבינארי לתמונה ש-OpenCV מבין
                    img = cv2.imdecode(np.frombuffer(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
                    
                    if img is not None:
                        cv2.imshow('ESP32 Stream (Robust)', img)
                    
                    # יציאה בלחיצה על 'q'
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
        else:
            print(f"❌ Error: Status code {stream.status_code}")

    except Exception as e:
        print(f"❌ Connection error: {e}")
    
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_camera()