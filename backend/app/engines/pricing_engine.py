import json
import os


CONFIG_PATH = os.path.join(os.path.dirname(__file__), "../../config")


def _load(filename: str) -> dict:
    with open(os.path.join(CONFIG_PATH, filename), "r") as f:
        return json.load(f)


class PricingEngine:
    """
    Computes the dynamic supplier offer price using the SVI:

        Offer = ERV × (base_margin + svi × svi_uplift_factor)

    A higher SVI (trusted supplier) earns a better offer.
    A floor is enforced: Offer >= ERV × min_offer_floor_pct

    thresholds.json is reloaded on every call so live edits reflect immediately.
    """

    def compute_offer(self, erv: float, svi: float) -> dict:
        """Compute the offer price. Reads pricing config fresh from thresholds.json."""
        cfg = _load("thresholds.json")
        pricing    = cfg["pricing"]
        base_margin = pricing["base_margin"]
        svi_uplift  = pricing["svi_uplift_factor"]
        floor_pct   = pricing["min_offer_floor_pct"]

        svi = max(0.0, min(1.0, svi))
        effective_margin = base_margin + svi * svi_uplift
        offer = erv * effective_margin
        floor = erv * floor_pct
        offer = max(offer, floor)

        return {
            "offer_price":      round(offer, 2),
            "effective_margin": round(effective_margin, 4),
            "erv":              erv,
        }
