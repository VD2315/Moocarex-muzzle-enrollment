from ultralytics import YOLO

def main():
    model = YOLO("yolo_classifier.pt")

    model.train(
        data="Qualityds",
        epochs=30,
        imgsz=384,
        batch=16,
        workers=0,
        device=0
    )

if __name__ == "__main__":
    main()