// Google Workspace API Service Helpers

export interface GmailMessage {
  id: string;
  snippet?: string;
  from?: string;
  subject?: string;
  date?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
}

export interface ChatSpace {
  name: string; // e.g. "spaces/AAAA..."
  displayName?: string;
  type?: string;
}

export interface ChatMessageItem {
  name: string;
  text: string;
  senderName?: string;
  createTime?: string;
}

// Helper to handle API responses and detect unauthorized/expired token
async function handleApiResponse(res: Response, serviceName: string) {
  if (res.status === 401) {
    throw new Error('Google Workspace session expired or unauthorized. Please sign in again.');
  }
  if (!res.ok) {
    let detail = '';
    try {
      const errJson = await res.json();
      detail = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      detail = res.statusText;
    }
    throw new Error(`${serviceName} API error: ${detail}`);
  }
  return res;
}

// --- GMAIL API ---
export async function listGmailMessages(accessToken: string, maxResults = 10): Promise<GmailMessage[]> {
  try {
    const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    await handleApiResponse(listRes, 'Gmail');
    const data = await listRes.json();
    if (!data.messages) return [];

    const details = await Promise.all(
      data.messages.slice(0, maxResults).map(async (m: { id: string }) => {
        try {
          const itemRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (!itemRes.ok) return { id: m.id, snippet: 'Message details unavailable' };
          const itemData = await itemRes.json();
          const headers = itemData.payload?.headers || [];
          const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
          const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
          const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

          return {
            id: m.id,
            snippet: itemData.snippet,
            from,
            subject,
            date
          };
        } catch {
          return { id: m.id, snippet: 'Message details unavailable' };
        }
      })
    );
    return details;
  } catch (err) {
    console.error('listGmailMessages error:', err);
    throw err;
  }
}

export async function sendGmailMessage(accessToken: string, to: string, subject: string, body: string): Promise<any> {
  const emailContent = [
    `To: ${to}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body
  ].join('\r\n');

  // Base64url encode
  const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedEmail })
  });

  await handleApiResponse(res, 'Gmail');
  return await res.json();
}

// --- GOOGLE CALENDAR API ---
export async function listCalendarEvents(accessToken: string, maxResults = 10): Promise<CalendarEvent[]> {
  try {
    const now = new Date().toISOString();
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    await handleApiResponse(res, 'Calendar');
    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      id: item.id,
      summary: item.summary || '(Untitled Event)',
      description: item.description,
      start: item.start,
      end: item.end,
      htmlLink: item.htmlLink
    }));
  } catch (err) {
    console.error('listCalendarEvents error:', err);
    throw err;
  }
}

export async function createCalendarEvent(
  accessToken: string,
  summary: string,
  description: string,
  startDateTime: string,
  endDateTime: string
): Promise<CalendarEvent> {
  const event = {
    summary,
    description,
    start: { dateTime: new Date(startDateTime).toISOString() },
    end: { dateTime: new Date(endDateTime).toISOString() }
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });

  await handleApiResponse(res, 'Calendar');
  return await res.json();
}

// --- GOOGLE DRIVE API ---
export async function listDriveFiles(accessToken: string, pageSize = 15): Promise<DriveFile[]> {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&fields=files(id,name,mimeType,modifiedTime,size,webViewLink)`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    await handleApiResponse(res, 'Drive');
    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('listDriveFiles error:', err);
    throw err;
  }
}

// --- GOOGLE TASKS API ---
export async function listTasks(accessToken: string): Promise<TaskItem[]> {
  try {
    // Get task lists for current user using @me endpoint
    const listRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    await handleApiResponse(listRes, 'Google Tasks');
    const listsData = await listRes.json();
    const primaryListId = listsData.items?.[0]?.id || '@default';

    const tasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(primaryListId)}/tasks?showCompleted=true`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    await handleApiResponse(tasksRes, 'Google Tasks');
    const data = await tasksRes.json();
    return (data.items || []).map((t: any) => ({
      id: t.id,
      title: t.title || '(Untitled Task)',
      notes: t.notes,
      status: t.status,
      due: t.due
    }));
  } catch (err) {
    console.error('listTasks error:', err);
    throw err;
  }
}

export async function createGoogleTask(accessToken: string, title: string, notes?: string, due?: string): Promise<TaskItem> {
  const taskBody: any = { title };
  if (notes) taskBody.notes = notes;
  if (due) taskBody.due = new Date(due).toISOString();

  // Find primary list
  let listId = '@default';
  try {
    const listRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (listRes.ok) {
      const listsData = await listRes.json();
      if (listsData.items?.[0]?.id) {
        listId = listsData.items[0].id;
      }
    }
  } catch {
    listId = '@default';
  }

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(taskBody)
  });

  await handleApiResponse(res, 'Google Tasks');
  return await res.json();
}

export async function updateGoogleTaskStatus(accessToken: string, taskId: string, completed: boolean): Promise<any> {
  const status = completed ? 'completed' : 'needsAction';

  let listId = '@default';
  try {
    const listRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (listRes.ok) {
      const listsData = await listRes.json();
      if (listsData.items?.[0]?.id) {
        listId = listsData.items[0].id;
      }
    }
  } catch {
    listId = '@default';
  }

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status })
  });

  await handleApiResponse(res, 'Google Tasks');
  return await res.json();
}

// --- GOOGLE CHAT API ---
export async function listChatSpaces(accessToken: string): Promise<ChatSpace[]> {
  try {
    const res = await fetch('https://chat.googleapis.com/v1/spaces', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    await handleApiResponse(res, 'Google Chat');
    const data = await res.json();
    return (data.spaces || []).map((s: any) => ({
      name: s.name,
      displayName: s.displayName || s.name,
      type: s.type
    }));
  } catch (err) {
    console.error('listChatSpaces error:', err);
    throw err;
  }
}

export async function sendChatMessage(accessToken: string, spaceName: string, text: string): Promise<any> {
  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  });

  await handleApiResponse(res, 'Google Chat');
  return await res.json();
}
