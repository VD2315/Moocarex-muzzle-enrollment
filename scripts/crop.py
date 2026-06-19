from ultralytics import YOLO
import cv2
import os

# Load trained model
model = YOLO("runs/detect/runs/muzzle_detector-7/weights/best.pt")

# Create save folder
os.makedirs("cropped_muzzles", exist_ok=True)

# Start webcam
cap = cv2.VideoCapture(0)

img_count = 0

while True:
    ret, frame = cap.read()

    if not ret:
        print("Failed to read camera.")
        break

    # Run detection
    results = model(frame, conf=0.5)

    muzzle_crop = None

    for box in results[0].boxes:

        # Bounding box coordinates
        x1, y1, x2, y2 = map(int, box.xyxy[0])

        # Confidence
        conf = float(box.conf[0])

        # Padding around muzzle
        padding = 20

        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(frame.shape[1], x2 + padding)
        y2 = min(frame.shape[0], y2 + padding)

        # Crop muzzle
        muzzle_crop = frame[y1:y2, x1:x2]

        # Draw bounding box
        cv2.rectangle(
            frame,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            2
        )

        cv2.putText(
            frame,
            f"Muzzle {conf:.2f}",
            (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 0),
            2
        )

    # Show detection feed
    cv2.imshow("Muzzle Detection", frame)

    # Show cropped muzzle if detected
    if muzzle_crop is not None:
        cv2.imshow("Muzzle Crop", muzzle_crop)

    key = cv2.waitKey(1) & 0xFF

    # Press S to save crop
    if key == ord("s") and muzzle_crop is not None:

        save_path = f"cropped_muzzles/muzzle_{img_count}.jpg"

        cv2.imwrite(save_path, muzzle_crop)

        print(f"Saved: {save_path}")

        img_count += 1

    # Press Q to quit
    elif key == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()