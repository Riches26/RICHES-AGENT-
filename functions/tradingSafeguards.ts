import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

// Scheduled function to ensure trading safeguards document exists
// and to perform lightweight monitoring/alerting checks.

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const DEFAULT_SAFEGUARDS = {
  maxExposureUSD: 1000, // maximum notional exposure allowed for automated trades
  cooldownSeconds: 300, // minimum seconds between automated trades
  globalStop: false, // emergency stop switch
  lastTradeTimestamp: null,
  legalNotice: `Automated trading is provided for testing and educational purposes only. The system may produce erroneous signals; do not trade real capital without proper risk management, paper trading validation, and compliance review. By enabling automated trading you acknowledge and accept all risks.`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const ensureTradingSafeguards = onSchedule({ schedule: 'every 24 hours', timeZone: 'UTC', retryCount: 1 }, async (event) => {
  console.log('[TradingSafeguards] Ensuring safeguards doc exists');
  try {
    const ref = db.collection('brain_settings').doc('trading_safeguards');
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set(DEFAULT_SAFEGUARDS, { merge: true });
      console.log('[TradingSafeguards] Created default safeguards');
    } else {
      // ensure required fields exist and update timestamp
      const data = snap.data() || {};
      const updated = Object.assign({}, DEFAULT_SAFEGUARDS, data, { updatedAt: new Date().toISOString() });
      await ref.set(updated, { merge: true });
      console.log('[TradingSafeguards] Safeguards present; updated timestamp');
    }

    // Basic monitoring: if globalStop enabled, write alert into brain_alerts
    const current = (await ref.get()).data() as any;
    if (current && current.globalStop) {
      await db.collection('brain_alerts').add({ level: 'critical', message: 'Global trading stop is active', timestamp: new Date().toISOString() });
      console.log('[TradingSafeguards] Global stop active — alert recorded');
    }
  } catch (err) {
    console.error('[TradingSafeguards] ensure error', err);
    throw err;
  }
});
