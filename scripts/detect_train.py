from ultralytics import YOLO

if __name__ == "__main__":
    model = YOLO("yolo_detector.pt")

    model.train(
        data="detectds/data.yaml",
        epochs=75,
        imgsz=640,
        batch=8,
        workers=0,
        cache=False,
        device=0,
        patience=20,
        project="runs",
        name="muzzle_detector"
    )