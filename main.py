from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from pydantic import BaseModel
from fastapi import Request


import cv2
import numpy as np
import os
import time

import json
import uuid
from datetime import datetime
from pathlib import Path

from pydantic import BaseModel

class FeedbackRequest(BaseModel):
    scan_id: str
    feedback: bool

# =====================================================
# CONFIG
# =====================================================

DETECTOR_WEIGHTS = "Backend/models/detector_best.pt"
CLASSIFIER_WEIGHTS = "Backend/models/classify_best.pt"

SAVE_DIR = Path("storage/cropped_muzzles")

METADATA_DIR = Path("storage/metadata")
METADATA_DIR.mkdir(parents=True, exist_ok=True)

DETECT_CONF = 0.45
PADDING = 20

os.makedirs(SAVE_DIR, exist_ok=True)

# =====================================================
# APP
# =====================================================

app = FastAPI(title="BovineID API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# LOAD MODELS
# =====================================================

print("Loading detector...")
detector = YOLO(DETECTOR_WEIGHTS)

print("Loading classifier...")
classifier = YOLO(CLASSIFIER_WEIGHTS)

print("Models loaded.")

# =====================================================
# ROUTES
# =====================================================

@app.get("/")
def root():
    return {"message": "BovineID API Running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/feedback")
async def save_feedback(data: FeedbackRequest):

    metadata_file = (
        METADATA_DIR /
        f"{data.scan_id}.json"
    )

    if not metadata_file.exists():
        return {
            "success": False,
            "message": "Scan not found"
        }

    with open(metadata_file, "r") as f:
        metadata = json.load(f)

    metadata["feedback"] = data.feedback

    with open(metadata_file, "w") as f:
        json.dump(
            metadata,
            f,
            indent=4
        )
    
    return {
        "success": True
    }

async def save_feedback(request: Request):

    data = await request.json()
    print(data)

    return {"success": True}

@app.post("/api/scan")
async def scan(file: UploadFile = File(...)):
    # ----------------------------------
    # Read image
    # ----------------------------------
   
    contents = await file.read()

    image = cv2.imdecode(
        np.frombuffer(contents, np.uint8),
        cv2.IMREAD_COLOR
    )
    
    

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid image"
        )

    # ----------------------------------
    # Detect muzzle
    # ----------------------------------

    results = detector(
        image,
        conf=DETECT_CONF,
        verbose=False
    )

    boxes = results[0].boxes

    if boxes is None or len(boxes) == 0:
        return {
            "success": False,
            "message": "No muzzle detected"
        }

    # Highest confidence box
    confs = boxes.conf.cpu().numpy()

    best_idx = int(np.argmax(confs))

    x1, y1, x2, y2 = map(
        int,
        boxes.xyxy[best_idx].cpu().numpy()
    )

    det_conf = float(confs[best_idx])

    # ----------------------------------
    # Padding
    # ----------------------------------

    h, w = image.shape[:2]

    x1 = max(0, x1 - PADDING)
    y1 = max(0, y1 - PADDING)

    x2 = min(w, x2 + PADDING)
    y2 = min(h, y2 + PADDING)

    # ----------------------------------
    # Crop
    # ----------------------------------

    crop = image[y1:y2, x1:x2]
  
    if crop.size == 0:
        return {
            "success": False,
            "message": "Crop failed"
        }

    # ----------------------------------
    # Classify
    # ----------------------------------

    cls_result = classifier(
        crop,
        verbose=False
    )[0]

    top_class = int(cls_result.probs.top1)

    cls_conf = float(cls_result.probs.top1conf)

    class_name = classifier.names[top_class]

    print(
        f"Detection={det_conf:.3f} | "
        f"Class={class_name} | "
        f"Conf={cls_conf:.3f}"
    )

    is_viable = class_name.lower() == "good"

    filename = None

    if is_viable:

        scan_id = str(uuid.uuid4())

        filename = f"{scan_id}.png"

        save_path = os.path.join(
            SAVE_DIR,
            filename
        )
        
    # ----------------------------------
    # Classify
    # ----------------------------------

    cls_result = classifier(
        crop,
        verbose=False
    )[0]

    top_class = int(cls_result.probs.top1)

    cls_conf = float(cls_result.probs.top1conf)

    class_name = classifier.names[top_class]

    print(
        f"Detection={det_conf:.3f} | "
        f"Class={class_name} | "
        f"Conf={cls_conf:.3f}"
    )

    is_viable = class_name.lower() == "good"

    filename = None

    if is_viable:

        scan_id = str(uuid.uuid4())

        filename = f"{scan_id}.png"

        save_path = os.path.join(
            SAVE_DIR,
            filename
        )

        cv2.imwrite(
        save_path,
        crop,
        [cv2.IMWRITE_PNG_COMPRESSION, 0]
        )

        class FeedbackRequest(BaseModel):
            scan_id: str
            feedback: bool

        metadata = {
    "scan_id": scan_id,
    "timestamp": datetime.now().isoformat(),

    "filename": filename,

    "det_confidence": round(det_conf, 4),
    "cls_confidence": round(cls_conf, 4),

    "class_name": class_name,
    "is_viable": is_viable,

    "feedback": None
}
        
        metadata_path = (
            METADATA_DIR /
            f"{scan_id}.json"
        )

        with open(metadata_path, "w") as f:
            json.dump(
                metadata,
                f,
                indent=4
            )

        saved = cv2.imwrite(
            save_path,
            crop,
            [cv2.IMWRITE_PNG_COMPRESSION, 0]
            )

        print("SAVE PATH:", save_path)
        print("SAVE SUCCESS:", saved)

        metadata = {
    "scan_id": scan_id,
    "timestamp": datetime.now().isoformat(),

    "filename": filename,

    "det_confidence": round(det_conf, 4),
    "cls_confidence": round(cls_conf, 4),

    "class_name": class_name,
    "is_viable": is_viable,

    "feedback": None
}
        
        metadata_path = (
            METADATA_DIR /
            f"{scan_id}.json"
        )

        with open(metadata_path, "w") as f:
            json.dump(
                metadata,
                f,
                indent=4
            )

    print("=" * 50)
    print("CLASS NAME:", class_name)
    print("IS VIABLE:", is_viable)
    print("CLS CONF:", cls_conf)
    print("=" * 50)

    return {
        "success": True,
        "scan_id": scan_id,
        "det_confidence": round(det_conf, 3),
        "class_name": class_name,
        "cls_confidence": round(cls_conf, 3),
        "is_viable": is_viable,
        "filename": filename
    }

