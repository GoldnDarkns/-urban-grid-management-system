"""
Train DistilBERT for incident category classification.
Uses MongoDB incidents + synthetic data from templates. Saves to src/models/transformer_incident_model.
Run: python -m src.models.transformer_incident_train
"""
import random
from pathlib import Path

import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    get_linear_schedule_with_warmup,
)

from src.nlp.incident_processor import INCIDENT_CATEGORIES
from src.db.seed_incidents import INCIDENT_TEMPLATES

# Output dir (must match src/nlp/transformer_classifier.MODEL_DIR)
MODEL_DIR = Path(__file__).resolve().parent / "transformer_incident_model"
BASE_MODEL = "distilbert-base-uncased"

# Synthetic templates for "other" (not in INCIDENT_TEMPLATES)
OTHER_TEMPLATES = [
    "General service inquiry in {zone_name} ({zone_id}).",
    "Feedback and comment from resident in {zone_id}. No specific fault.",
    "Miscellaneous report for {zone_name}. No clear category.",
    "Customer query about billing and service in {zone_id}.",
    "Info request and general concern in {zone_name} ({zone_id}).",
]

# Placeholders for synthetic generation (no DB needed)
ZONE_IDS = [f"Z_{i:03d}" for i in range(1, 26)]
ZONE_NAMES = [
    "Downtown", "North District", "South Side", "Industrial Park", "Riverside",
    "Hillcrest", "Central", "East End", "West Sector", "Midtown",
    "Harbor", "University", "Tech Park", "Greenfield", "Old Town",
]


def fetch_real_data(limit=2000):
    """Fetch (description, category) from MongoDB. Returns list of (text, label_str)."""
    try:
        from src.db.mongo_client import get_db
        db = get_db()
        if not db:
            return []
        cursor = db.incident_reports.find(
            {},
            {"description": 1, "nlp_analysis.category": 1}
        ).limit(limit)
        out = []
        for d in cursor:
            desc = (d.get("description") or "").strip()
            cat = (d.get("nlp_analysis") or {}).get("category") or "other"
            if not desc or cat not in INCIDENT_CATEGORIES:
                continue
            out.append((desc, cat))
        return out
    except Exception:
        return []


def generate_synthetic(n_per_category=40):
    """Generate synthetic (text, category) from templates. n_per_category for non-other; other gets n_per_category too."""
    out = []
    for cat in INCIDENT_CATEGORIES:
        if cat == "other":
            templates = OTHER_TEMPLATES
        else:
            templates = INCIDENT_TEMPLATES.get(cat) or []
        if not templates:
            continue
        for _ in range(n_per_category):
            t = random.choice(templates)
            zid = random.choice(ZONE_IDS)
            zname = random.choice(ZONE_NAMES)
            try:
                text = t.format(zone_id=zid, zone_name=zname)
            except KeyError:
                text = t.replace("{zone_id}", zid).replace("{zone_name}", zname)
            out.append((text, cat))
    return out


class IncidentDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_length=256):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, i):
        enc = self.tokenizer(
            self.texts[i],
            truncation=True,
            max_length=self.max_length,
            padding="max_length",
            return_tensors="pt",
        )
        return {
            "input_ids": enc["input_ids"].squeeze(0),
            "attention_mask": enc["attention_mask"].squeeze(0),
            "labels": torch.tensor(self.labels[i], dtype=torch.long),
        }


def main():
    print("DistilBERT Incident Classification – Training")
    print("=" * 56)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    label2id = {c: i for i, c in enumerate(INCIDENT_CATEGORIES)}
    id2label = {i: c for i, c in enumerate(INCIDENT_CATEGORIES)}

    # Data
    real = fetch_real_data()
    print(f"Real incidents from MongoDB: {len(real)}")

    synthetic = generate_synthetic(n_per_category=35)
    print(f"Synthetic from templates: {len(synthetic)}")

    # Combine and ensure enough
    all_data = real + synthetic
    if len(all_data) < 150:
        extra = generate_synthetic(n_per_category=50)
        all_data = all_data + extra
        print(f"Extra synthetic: {len(extra)}")
    random.shuffle(all_data)

    texts = [x[0] for x in all_data]
    labels = [label2id[x[1]] for x in all_data]
    print(f"Total samples: {len(texts)}")

    # Split
    n = len(texts)
    n_val = max(20, n // 5)
    n_train = n - n_val
    X_tr, X_val = texts[:n_train], texts[n_train:]
    y_tr, y_val = labels[:n_train], labels[n_train:]

    # Tokenizer & datasets
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    train_ds = IncidentDataset(X_tr, y_tr, tokenizer)
    val_ds = IncidentDataset(X_val, y_val, tokenizer)
    train_loader = DataLoader(train_ds, batch_size=16, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=16)

    # Model
    model = AutoModelForSequenceClassification.from_pretrained(
        BASE_MODEL,
        num_labels=len(INCIDENT_CATEGORIES),
        id2label=id2label,
        label2id=label2id,
    )
    model = model.to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-5)
    total = len(train_loader) * 4  # 4 epochs
    scheduler = get_linear_schedule_with_warmup(optimizer, num_warmup_steps=total // 10, num_training_steps=total)

    # Train
    model.train()
    for epoch in range(4):
        total_loss = 0.0
        for batch in train_loader:
            batch = {k: v.to(device) for k, v in batch.items()}
            optimizer.zero_grad()
            out = model(
                input_ids=batch["input_ids"],
                attention_mask=batch["attention_mask"],
                labels=batch["labels"],
            )
            out.loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()
            total_loss += out.loss.item()
        print(f"Epoch {epoch+1}/4  loss={total_loss/len(train_loader):.4f}")

    # Eval
    model.eval()
    correct, total = 0, 0
    with torch.no_grad():
        for batch in val_loader:
            batch = {k: v.to(device) for k, v in batch.items()}
            logits = model(
                input_ids=batch["input_ids"],
                attention_mask=batch["attention_mask"],
            ).logits
            pred = logits.argmax(dim=-1)
            correct += (pred == batch["labels"]).sum().item()
            total += batch["labels"].size(0)
    acc = correct / total if total else 0
    print(f"Val accuracy: {acc:.2%}")

    # Save
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(MODEL_DIR)
    tokenizer.save_pretrained(MODEL_DIR)
    print(f"Model saved to {MODEL_DIR}")

    # Ensure config has id2label (some versions need it explicitly)
    import json
    cfg_path = MODEL_DIR / "config.json"
    if cfg_path.exists():
        with open(cfg_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        cfg["id2label"] = {str(k): v for k, v in id2label.items()}
        cfg["label2id"] = {k: int(v) for k, v in label2id.items()}
        with open(cfg_path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)

    print("Done.")


if __name__ == "__main__":
    main()
