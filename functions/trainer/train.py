"""
Train a small Keras MLP on Forex features and export model weights and training metrics as JSON.

Usage: python3 trainer/train.py --pair EUR USD --days 365 --out-dir ../artifacts

This script has minimal dependencies: tensorflow, numpy, pandas, requests.
It writes two files to out_dir:
- model_artifact.json: contains layer weights/biases and model metadata
- train_metrics.json: contains training/validation metrics

Note: This script is designed to be executed by the Node Cloud Function runner (trainRunner.ts)
which will pick up artifacts and persist them to Firestore.
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import requests

# Use tensorflow with CPU
try:
    import tensorflow as tf
    from tensorflow import keras
except Exception as e:
    print('TensorFlow import failed:', e, file=sys.stderr)
    raise


def fetch_timeseries(base, quote, days=365):
    end = datetime.utcnow().date()
    start = end - timedelta(days=days)
    url = f'https://api.exchangerate.host/timeseries?start_date={start}&end_date={end}&base={base}&symbols={quote}'
    print('Fetching timeseries:', url)
    r = requests.get(url, timeout=20)
    r.raise_for_status()
    j = r.json()
    rates = j.get('rates', {})
    rows = []
    for d in sorted(rates.keys()):
        rows.append({'date': d, 'rate': float(rates[d][quote])})
    df = pd.DataFrame(rows)
    return df


def compute_features(df):
    df['rate'] = df['rate'].astype(float)
    df['r1'] = df['rate'].pct_change().fillna(0)
    df['sma7'] = df['rate'].rolling(7).mean().fillna(method='bfill')
    df['sma21'] = df['rate'].rolling(21).mean().fillna(method='bfill')
    df['momentum'] = df['rate'] - df['rate'].shift(1)
    df['vol'] = df['r1'].rolling(7).std().fillna(method='bfill')
    df['target'] = df['rate'].shift(-1) / df['rate'] - 1.0  # next day return
    df = df.dropna().reset_index(drop=True)
    return df


def build_dataset(df):
    features = df[['rate', 'r1', 'sma7', 'sma21', 'momentum', 'vol']].values
    targets = df['target'].values
    return features, targets


def build_model(input_dim):
    model = keras.Sequential([
        keras.layers.Input(shape=(input_dim,)),
        keras.layers.Dense(64, activation='relu'),
        keras.layers.Dropout(0.1),
        keras.layers.Dense(32, activation='relu'),
        keras.layers.Dense(1, activation='linear')
    ])
    model.compile(optimizer='adam', loss='mse', metrics=['mae'])
    return model


def export_model_to_json(model, out_path):
    # Extract weights and biases layer-by-layer and store as lists
    artifact = {
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'keras_version': tf.__version__,
        'layers': []
    }
    for layer in model.layers:
        weights = layer.get_weights()
        if weights:
            w = [w.tolist() for w in weights]
        else:
            w = []
        artifact['layers'].append({'name': layer.name, 'class_name': layer.__class__.__name__, 'weights': w})
    with open(out_path, 'w') as f:
        json.dump(artifact, f)
    print('Exported model artifact to', out_path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', default='EUR')
    parser.add_argument('--quote', default='USD')
    parser.add_argument('--days', type=int, default=365)
    parser.add_argument('--out-dir', default='artifacts')
    args = parser.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)

    df = fetch_timeseries(args.base, args.quote, days=args.days)
    df = compute_features(df)
    X, y = build_dataset(df)

    # Train/validation split
    split = int(len(X) * 0.8)
    X_train, X_val = X[:split], X[split:]
    y_train, y_val = y[:split], y[split:]

    model = build_model(X.shape[1])

    history = model.fit(X_train, y_train, validation_data=(X_val, y_val), epochs=20, batch_size=16, verbose=2)

    # Save artifacts
    model_json_path = os.path.join(args.out_dir, f'model_artifact_{args.base}{args.quote}.json')
    metrics_path = os.path.join(args.out_dir, f'train_metrics_{args.base}{args.quote}.json')

    export_model_to_json(model, model_json_path)

    metrics = {
        'loss': [float(x) for x in history.history['loss']],
        'val_loss': [float(x) for x in history.history['val_loss']],
        'mae': [float(x) for x in history.history['mae']],
        'val_mae': [float(x) for x in history.history['val_mae']],
        'trained_at': datetime.utcnow().isoformat() + 'Z',
        'pair': f'{args.base}/{args.quote}'
    }
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f)
    print('Wrote metrics to', metrics_path)

    print('Training complete')


if __name__ == '__main__':
    main()
