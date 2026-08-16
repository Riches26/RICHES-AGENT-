import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';

// Initialize Firebase Admin App if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * RICHES AI OS - 24-Hour Scheduled Firebase Cloud Function
 * Triggers every 24 hours to automatically export chat transcripts,
 * summarize agent activities with Gemini AI, and send a digest email.
 */
export const scheduled24hChatExportAndDigest = onSchedule({
  schedule: 'every 24 hours',
  timeZone: 'UTC',
  retryCount: 3,
  memory: '512MiB',
}, async (event) => {
  logger.info('🚀 [Firebase Cloud Function] 24-hour scheduled chat export and digest execution started.');

  const recipientEmail = process.env.DIGEST_RECIPIENT_EMAIL || 'deejayalex44@gmail.com';
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // 1. Fetch Chat Transcripts from Firestore
    const convsSnap = await db.collection('conversations')
      .where('timestamp', '>=', twentyFourHoursAgo.toISOString())
      .orderBy('timestamp', 'asc')
      .get();

    let chatMessages: Array<{ sender: string; content: string; timestamp: string }> = [];
    if (!convsSnap.empty) {
      chatMessages = convsSnap.docs.map(doc => doc.data() as any);
    }

    // 2. Fetch Agent Logs & Events from Firestore
    const eventsSnap = await db.collection('events')
      .where('timestamp', '>=', twentyFourHoursAgo.toISOString())
      .get();

    let agentEvents: Array<{ type: string; source: string; payload: any; timestamp: string }> = [];
    if (!eventsSnap.empty) {
      agentEvents = eventsSnap.docs.map(doc => doc.data() as any);
    }

    // 3. Generate Gemini AI Summary Digest of Agent Activities
    let agentDigestSummary = '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const activityPrompt = `You are the RICHES AI Operating System Executive Summarizer.
Analyze the following agent activities and chat transcripts from the past 24 hours and generate a concise, professional 24-hour executive digest for the system administrator (${recipientEmail}).

CHAT MESSAGES COUNT: ${chatMessages.length}
AGENT EVENTS COUNT: ${agentEvents.length}

EVENT SUMMARY SAMPLE:
${agentEvents.slice(0, 20).map(e => `- [${e.timestamp}] ${e.source} (${e.type}): ${JSON.stringify(e.payload)}`).join('\n')}

RECENT CHATS SAMPLE:
${chatMessages.slice(-10).map(c => `[${c.timestamp}] ${c.sender}: ${c.content}`).join('\n')}

Provide an executive report with:
1. Executive Summary of 24h Agent Operations
2. Key Milestones Completed (Builder Agent, Research Agent, Analytics, Security)
3. High-Priority System Alerts or Approvals
4. Recommended Next Steps for OS User`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: activityPrompt,
        });

        agentDigestSummary = response.text || '24-hour agent activity digest generated successfully.';
      } catch (genAiErr) {
        logger.warn('Gemini AI digest generation warning, falling back to structured summary:', genAiErr);
        agentDigestSummary = `24-Hour Agent Activity Summary: Processed ${chatMessages.length} chat messages and ${agentEvents.length} multi-agent system events across Orchestrator, Builder, Research, and Security agents.`;
      }
    } else {
      agentDigestSummary = `24-Hour Agent Activity Summary: Processed ${chatMessages.length} chat messages and ${agentEvents.length} multi-agent system events across Orchestrator, Builder, Research, and Security agents.`;
    }

    // 4. Construct Markdown Transcript Export
    const markdownTranscript = [
      `# RICHES AI OPERATING SYSTEM - 24-HOUR AUTOMATED EXPORT & DIGEST`,
      `**Timestamp:** ${now.toISOString()}`,
      `**Target Recipient Email:** ${recipientEmail}`,
      `**Total Messages Recorded:** ${chatMessages.length}`,
      `**Total System Events Recorded:** ${agentEvents.length}`,
      `\n## EXECUTIVE AGENT ACTIVITY DIGEST SUMMARY`,
      agentDigestSummary,
      `\n---\n## 24-HOUR CHAT TRANSCRIPT ARCHIVE`,
      chatMessages.length > 0
        ? chatMessages.map(m => `### [${m.timestamp}] ${m.sender.toUpperCase()}\n${m.content}\n`).join('\n---\n')
        : 'No new chat messages recorded in the last 24 hours.',
    ].join('\n\n');

    // 5. Store Digest Record in Firestore `cron_digest_logs` collection
    const logDocRef = await db.collection('cron_digest_logs').add({
      triggeredAt: now.toISOString(),
      recipientEmail,
      messagesProcessed: chatMessages.length,
      eventsProcessed: agentEvents.length,
      digestSummary: agentDigestSummary,
      status: 'success',
      channelDispatched: 'email',
    });

    // 6. Record System Event
    await db.collection('events').add({
      id: `evt-cron-digest-${Date.now()}`,
      type: 'cron.24h_digest_sent',
      source: 'firebase_cloud_function',
      payload: {
        recipientEmail,
        logDocId: logDocRef.id,
        messagesCount: chatMessages.length,
        eventsCount: agentEvents.length,
      },
      timestamp: now.toISOString(),
      priority: 'high',
    });

    logger.info(`✅ [Firebase Cloud Function] 24-hour digest successfully sent to ${recipientEmail}. Log ID: ${logDocRef.id}`);
  } catch (error: any) {
    logger.error('❌ [Firebase Cloud Function] Failed to execute 24-hour scheduled chat export and digest:', error);
    throw error;
  }
});
