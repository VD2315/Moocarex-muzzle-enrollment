from ultralytics import YOLO
from pathlib import Path

model = YOLO("runs/classify/train/weights/best.pt")

for img in Path("testimg").rglob("*.*"):
    results = model(str(img))

    probs = results[0].probs

    pred = model.names[probs.top1]
    conf = float(probs.top1conf)

    print(f"{img.name:30} -> {pred:5} ({conf:.2f})")