import json
from typing import Dict, Any


class FeatureEngine:
    """
    Converts raw batch submission inputs into a structured, normalised
    feature vector for downstream engines.
    """

    SUPPORTED_DEVICE_TYPES = {
        "smartphone", "laptop", "tablet", "desktop", "server", "monitor", "printer"
    }

    SUPPORTED_CONDITIONS = {
        "excellent", "good", "fair", "poor", "damaged"
    }

    def build_vector(
        self,
        device_type: str,
        weight: float,
        condition: str,
        specs: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        """
        Build and return a normalised feature vector.

        Args:
            device_type: Type of e-waste device (e.g. 'smartphone').
            weight: Batch weight in kg.
            condition: Physical condition label.
            specs: Optional dict with additional spec fields:
                   - age_years (int)
                   - battery_health (int, 0-100)
                   - quantity (int, number of units in batch)

        Returns:
            Dict containing normalised feature vector.

        Raises:
            ValueError: If device_type, condition, or weight are invalid.
        """
        device_type = device_type.lower().strip()
        condition = condition.lower().strip()
        specs = specs or {}

        # --- Validation ---
        if device_type not in self.SUPPORTED_DEVICE_TYPES:
            raise ValueError(
                f"Unsupported device_type '{device_type}'. "
                f"Supported: {sorted(self.SUPPORTED_DEVICE_TYPES)}"
            )
        if condition not in self.SUPPORTED_CONDITIONS:
            raise ValueError(
                f"Unsupported condition '{condition}'. "
                f"Supported: {sorted(self.SUPPORTED_CONDITIONS)}"
            )
        if weight <= 0:
            raise ValueError(f"Weight must be positive. Got: {weight}")

        age_years = max(0, int(specs.get("age_years", 3)))
        battery_health = max(0, min(100, int(specs.get("battery_health", 70))))
        quantity = max(1, int(specs.get("quantity", 1)))

        return {
            "device_type": device_type,
            "weight_kg": float(weight),
            "condition": condition,
            "age_years": age_years,
            "battery_health": battery_health,
            "quantity": quantity,
            "raw_specs": specs,
        }
