import cv2

def view_webcam():
    # '0' is usually the default camera. 
    # If you have multiple cameras, try changing this to 1 or 2.
    camera_index = 1
    cap = cv2.VideoCapture(camera_index)

    # Check if camera opened successfully
    if not cap.isOpened():
        print(f"Error: Could not open video device {camera_index}.")
        print("Try changing 'camera_index' in the code to 1.")
        return

    print(f"--- Accessing Camera {camera_index} ---")
    print("Press 'q' to quit the window.")

    while True:
        # Capture frame-by-frame
        ret, frame = cap.read()

        # If frame is read correctly, ret is True
        if not ret:
            print("Error: Can't receive frame (stream end?). Exiting ...")
            break

        # Display the resulting frame
        cv2.imshow('Local Webcam Feed', frame)

        # Press 'q' on the keyboard to exit the loop
        # cv2.waitKey(1) returns the key code of the key pressed
        if cv2.waitKey(1) == ord('q'):
            break

    # When everything done, release the capture
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    view_webcam()