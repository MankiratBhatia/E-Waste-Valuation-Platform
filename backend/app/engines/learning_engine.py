import json
import os
import logging

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "../../config")
logger = logging.getLogger(__name__)


def _load(filename: str) -> dict:
    with open(os.path.join(CONFIG_PATH, filename), "r") as f:
        return json.load(f)


class LearningEngine:
    """
    Updates system intelligence based on prediction error.

    Strategy (rule-based):
    - Compute error_ratio = (actual - predicted) / predicted
    - If |error_ratio| > error_threshold → flag for learning
    - Adjust supplier reliability_score up/down
    - Return learning report for persistence
    """

    def __init__(self):
        cfg = _load("thresholds.json")
        self._cfg = cfg["learning"]

    def compute_error(self, predicted: float, actual: float) -> dict:
        """
        Compute prediction error and determine if learning is triggered.

        Args:
            predicted: ERV that was predicted at submission.
            actual: Actual recovery value logged post-processing.

        Returns:
            Dict with error_ratio, abs_error_pct, trigger_learning flag.
        """
        if predicted == 0:
            error_ratio = 0.0
        else:
            error_ratio = (actual - predicted) / predicted

        abs_error_pct = abs(error_ratio) * 100
        trigger = abs(error_ratio) > self._cfg.get("error_threshold_pct", 0.10)

        logger.info(
            "LearningEngine | predicted=%.2f actual=%.2f error_ratio=%.4f trigger=%s",
            predicted, actual, error_ratio, trigger,
        )

        return {
            "predicted_value": predicted,
            "actual_value": actual,
            "error_ratio": round(error_ratio, 6),
            "abs_error_pct": round(abs_error_pct, 2),
            "trigger_learning": trigger,
        }

    def compute_reliability_adjustment(self, error_ratio: float) -> float:
        """
        Returns signed delta to apply to supplier reliability_score.
        - If prediction was accurate (small error) → small positive boost.
        - If prediction was far off → penalty.
        """
        decay = self._cfg.get("reliability_decay_on_error", 0.05)
        boost = self._cfg.get("reliability_boost_on_accuracy", 0.03)
        threshold = self._cfg.get("error_threshold_pct", 0.10)

        if abs(error_ratio) <= threshold:
            return boost
        elif error_ratio > 0:
            # We under-estimated — moderate penalty
            return -decay * 0.5
        else:
            # We over-estimated — full penalty
            return -decay
