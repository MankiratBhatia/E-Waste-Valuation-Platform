import json
import os
from typing import Dict, Tuple


CONFIG_PATH = os.path.join(os.path.dirname(__file__), "../../config")


def _load(filename: str) -> dict:
    with open(os.path.join(CONFIG_PATH, filename), "r") as f:
        return json.load(f)


class ValuationEngine:
    """
    Computes the Expected Recovery Value (ERV) using:

        ERV = Σ( m_i × P_i × R_c_i )

    where:
        m_i   = estimated weight of material i (kg)
        P_i   = market price of material i (INR/kg)
        R_c_i = recovery coefficient for material i (0-1)

    NOTE: market_prices.json is reloaded on every call so live edits
    to the config file are reflected immediately without a restart.
    """

    def compute_erv(
        self, material_weights: Dict[str, float]
    ) -> Tuple[float, Dict[str, float]]:
        """
        Compute total ERV and per-material recovery value.
        Prices are read fresh from market_prices.json on every call.
        """
        # Reload config fresh on every call — picks up any file edits
        prices_data = _load("market_prices.json")
        prices: Dict[str, float] = prices_data["prices_inr_per_kg"]
        recovery_coefficients: Dict[str, float] = prices_data["recovery_coefficients"]

        breakdown: Dict[str, float] = {}
        total = 0.0

        for material, weight_kg in material_weights.items():
            price = prices.get(material, 0.0)
            recovery_coeff = recovery_coefficients.get(material, 0.80)
            value = weight_kg * price * recovery_coeff
            breakdown[material] = round(value, 4)
            total += value

        return round(total, 2), breakdown
