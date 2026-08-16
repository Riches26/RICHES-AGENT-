import * as admin from 'firebase-admin';

// Simple inference loader that reads a JSON model artifact stored in Firestore under brain_models/<id>
// and performs forward pass for Dense layers exported by the Python trainer.

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

type Layer = { name: string; class_name: string; weights: any[] };

function dot(a: number[], b: number[][]) {
  // a: [n], b: [n][m] -> returns [m]
  const m = b[0].length;
  const out = new Array(m).fill(0);
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    for (let j = 0; j < m; j++) out[j] += ai * b[i][j];
  }
  return out;
}

function addBias(v: number[], bias: number[]) {
  return v.map((x, i) => x + (bias[i] ?? 0));
}

function relu(v: number[]) {
  return v.map(x => Math.max(0, x));
}

export async function loadModel(modelId: string) {
  const snap = await db.collection('brain_models').doc(modelId).get();
  if (!snap.exists) throw new Error('Model artifact not found: ' + modelId);
  const data = snap.data() as any;
  const layers: Layer[] = data.artifact?.layers || data.layers || [];
  return { modelId, layers };
}

export function predictWithArtifact(layers: Layer[], input: number[]) {
  let x = input.slice();
  for (const layer of layers) {
    if (!layer.weights || layer.weights.length === 0) continue;
    // weights layout: for Dense layer Keras: [kernel, bias]
    const kernel = layer.weights[0]; // 2D array [in][out]
    const bias = layer.weights[1] || new Array((kernel[0] || []).length).fill(0);
    const y = dot(x, kernel);
    const yb = addBias(y, bias);
    if (layer.class_name === 'Dense') {
      // apply activation if layer name suggests relu; we don't have activation info in artifact; assume hidden layers relu, final linear
      if (!layer.name.toLowerCase().includes('dense') || layer === layers[layers.length - 1]) {
        x = yb; // final linear
      } else {
        x = relu(yb);
      }
    } else {
      x = yb;
    }
  }
  // return scalar (first element)
  return x[0] ?? x;
}

// Convenience wrapper to predict by modelId and feature vector
export async function predict(modelId: string, input: number[]) {
  const m = await loadModel(modelId);
  return predictWithArtifact(m.layers, input);
}
