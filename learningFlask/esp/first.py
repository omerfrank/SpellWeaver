import serial
import serial.tools.list_ports
import time
import sys

# --- CONFIGURATION ---
BAUD_RATE = 115200 

def list_serial_ports():
    ports = serial.tools.list_ports.comports()
    if not ports:
        return None
    print("\nAvailable Ports:")
    for i, port in enumerate(ports):
        print(f"{i}: {port.device} - {port.description}")
    return ports

def start_monitor():
    ports = list_serial_ports()
    if not ports:
        print("No ports found.")
        return

    if len(ports) == 1:
        selected_port = ports[0].device
        print(f"\nAuto-selecting: {selected_port}")
    else:
        try:
            selection = int(input("\nEnter port index: "))
            selected_port = ports[selection].device
        except:
            return

    print(f"\n--- Opening {selected_port} at {BAUD_RATE} ---")
    print("If you still see nothing, press the RESET button on the ESP32-CAM once.")

    try:
        # Open Serial Port
        # dsrdtr=None prevents PySerial from aggressively holding lines
        ser = serial.Serial(selected_port, BAUD_RATE, timeout=1, dsrdtr=None)
        
        # --- THE FIX: CONTROL DTR/RTS ---
        # Many ESP32 boards stay in "Reset" if these are not handled.
        # This sequence releases the board from reset.
        ser.dtr = False
        ser.rts = False
        
        # OPTIONAL: Trigger a reset (mimics Arduino IDE behavior)
        print("Resetting board...")
        ser.dtr = False # IO0 High (Run mode)
        ser.rts = True  # EN Low (Reset active)
        time.sleep(0.1)
        ser.rts = False # EN High (Release Reset)
        # -------------------------------

        ser.reset_input_buffer()

        while True:
            if ser.in_waiting > 0:
                try:
                    line = ser.readline().decode('utf-8', errors='replace').strip()
                    if line:
                        print(f">> {line}")
                except Exception as e:
                    print(e)
                    
    except serial.SerialException as e:
        print(f"Error: {e}")
    except KeyboardInterrupt:
        print("\nClosed.")

if __name__ == "__main__":
    start_monitor()