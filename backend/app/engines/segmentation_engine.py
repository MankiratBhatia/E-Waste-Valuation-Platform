import json
import os


CONFIG_PATH = os.path.join(os.path.dirname(__file__), "../../config")


def _load(filename: str) -> dict:
    with open(os.path.join(CONFIG_PATH, filename), "r") as f:
        return json.load(f)


class SegmentationEngine:
    """
    Classifies a batch into HIGH / MEDIUM / LOW tier based on ERV.
    thresholds.json is reloaded on every call so live edits reflect immediately.
    """

    def classify(self, erv: float) -> dict:
        """Classify ERV into a segment. Reads thresholds fresh from config."""
        cfg = _load("thresholds.json")
        seg = cfg["segmentation"]
        high_threshold   = seg["high_threshold_inr"]
        medium_threshold = seg["medium_threshold_inr"]
        labels   = seg["labels"]
        priority = seg["processing_priority"]

        if erv >= high_threshold:
            segment = labels["high"]
        elif erv >= medium_threshold:
            segment = labels["medium"]
        else:
            segment = labels["low"]

        return {
            "segment":  segment,
            "priority": priority[segment],
            "erv":      erv,
        }
