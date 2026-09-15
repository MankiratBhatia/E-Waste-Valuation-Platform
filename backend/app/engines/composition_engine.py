import json
import os
from typing import Dict


CONFIG_PATH = os.path.join(os.path.dirname(__file__), "../../config")


def _load(filename: str) -> dict:
    with open(os.path.join(CONFIG_PATH, filename), "r") as f:
        return json.load(f)


class CompositionEngine:
    """
    Estimates the per-material weight breakdown of a batch using:
      m_adjusted = m_base + delta_rules

    Where delta_rules are driven by device condition and age.
    """

    def __init__(self):
        self._base = _load("base_composition.json")
        self._rules = _load("heuristic_rules.json")

    def estimate(self, feature_vector: Dict) -> Dict[str, float]:
        """
        Returns per-material weight (kg) for the batch.

        Args:
            feature_vector: Output dict from FeatureEngine.build_vector()

        Returns:
            Dict mapping material name → estimated weight in kg.
        """
        device_type = feature_vector["device_type"]
        weight_kg = feature_vector["weight_kg"]
        condition = feature_vector["condition"]
        age_years = feature_vector["age_years"]

        # --- Base fractions ---
        base_fractions = dict(self._base.get(device_type, self._base["smartphone"]))

        # --- Condition multiplier ---
        cond_mult = self._rules["condition_multipliers"].get(condition, 1.0)

        # --- Material-level condition deltas ---
        material_deltas = self._rules.get("material_deltas", {}).get(condition, {})
        for mat, delta in material_deltas.items():
            if mat in base_fractions:
                base_fractions[mat] = max(0.0, base_fractions[mat] + delta)

        # --- Age penalty applied uniformly ---
        age_penalty = self._get_age_penalty(age_years)
        age_mult = 1.0 + age_penalty  # age_penalty is negative

        # --- Convert fractions → weights ---
        material_weights: Dict[str, float] = {}
        for material, fraction in base_fractions.items():
            adjusted_fraction = fraction * cond_mult * age_mult
            material_weights[material] = round(adjusted_fraction * weight_kg, 6)

        return material_weights

    def _get_age_penalty(self, age_years: int) -> float:
        brackets = self._rules.get("age_adjustments", {})
        if age_years <= 2:
            return brackets.get("0-2", 0.0)
        elif age_years <= 5:
            return brackets.get("3-5", -0.05)
        elif age_years <= 8:
            return brackets.get("6-8", -0.10)
        elif age_years <= 12:
            return brackets.get("9-12", -0.15)
        else:
            return brackets.get("13+", -0.20)
