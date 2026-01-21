# Training Transformer NLP (DistilBERT + Summarization)

## Overview

- **DistilBERT** is fine-tuned for **incident category classification** (transformer_fault, outage, pollution_complaint, etc.). It is used when the model exists; otherwise the pipeline falls back to rule-based classification.
- **Summarization** uses a pre-trained model (DistilBART) as-is; no training. It is loaded on first use when `transformers` and `torch` are installed.

## Dependencies

```bash
pip install torch transformers
# or
pip install -r requirements.txt
```

## 1. Train DistilBERT (Category Classification)

### Data

- **MongoDB**: `incident_reports` with `description` and `nlp_analysis.category`.
- **Synthetic**: Templates from `src.db.seed_incidents.INCIDENT_TEMPLATES` plus "other" templates. If you have few real incidents, synthetic data is used to reach a sufficient training set.

### Run

From the project root:

```bash
python -m src.models.transformer_incident_train
```

This will:

1. Fetch real incidents from MongoDB (if available).
2. Generate synthetic samples from templates.
3. Fine-tune `distilbert-base-uncased` for 4 epochs.
4. Save the model and tokenizer to `src/models/transformer_incident_model/`.

### Output

- `src/models/transformer_incident_model/config.json`
- `src/models/transformer_incident_model/pytorch_model.bin` (or `model.safetensors`)
- `src/models/transformer_incident_model/tokenizer_config.json`, `vocab.txt`, etc.

### Using the model

`src.nlp.incident_processor.classify_incident()` will use the transformer when:

- `src/models/transformer_incident_model/` exists and contains a valid model, and  
- `transformers` and `torch` are installed.

Otherwise it uses the rule-based keyword classifier.

## 2. Summarization (No Training)

Summarization uses **DistilBART** (`sshleifer/distilbart-cnn-12-6`). It is downloaded on first use.

- **When it runs**: `generate_summary()` in `incident_processor` calls `src.nlp.summarization.summarize_incident()` when `transformers` and `torch` are available. If that fails or returns nothing, the rule-based summary is used.
- **Device**: Uses GPU (`device=0`) when `torch.cuda.is_available()`, else CPU (`device=-1`).

## 3. Expanded Rules (No Training)

Rule-based classification, urgency, entity extraction, and sentiment use expanded keyword lists in `src/nlp/incident_processor.py`:

- **ENERGY_KEYWORDS**: More terms per category (e.g. brownout, sag, swell, arc flash, downed line).
- **URGENCY_KEYWORDS**: More terms for critical/high/medium/low.
- **Equipment**: relay, recloser, fuse, inverter, switchgear, etc.
- **Sentiment**: More negative and positive phrases.

These are always in effect and act as fallback when the transformer or summarizer is not used.

## Categories (Transformer and Rules)

`INCIDENT_CATEGORIES` in `incident_processor.py`:

1. transformer_fault  
2. voltage_issue  
3. outage  
4. high_demand  
5. pollution_complaint  
6. safety_hazard  
7. equipment_failure  
8. cable_damage  
9. weather_damage  
10. other  

The transformer’s `id2label` / `label2id` in the saved config must match this order.

## Quick Check

```bash
# Ensure MongoDB has incidents (optional; synthetic will be used if not)
python -m src.db.seed_incidents 100 30

# Train DistilBERT
python -m src.models.transformer_incident_train
```

Then create an incident via the API or Report Incident UI; classification will use the transformer when the model is present.
