export interface GoogleCredentialsInfo {
  configured: boolean;
  clientEmail: string | null;
  projectId: string | null;
  privateKey: string | null;
  credentials: any | null;
  source: 'env_json' | 'env_email' | 'none';
}

/**
 * Robustly loads Google Service Account credentials:
 * 1. Process environment GOOGLE_SERVICE_ACCOUNT_KEY (single line JSON string)
 * 2. Process environment GOOGLE_SERVICE_ACCOUNT_EMAIL
 */
export function getGoogleServiceAccountCredentials(): GoogleCredentialsInfo {
  // 1. Direct environment variable JSON string
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (rawKey && typeof rawKey === 'string') {
    const trimmed = rawKey.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.client_email && (parsed.private_key || parsed.project_id)) {
          return {
            configured: true,
            clientEmail: parsed.client_email,
            projectId: parsed.project_id || null,
            privateKey: parsed.private_key || null,
            credentials: parsed,
            source: 'env_json',
          };
        }
      } catch (err) {
        console.warn('Warning: Could not parse GOOGLE_SERVICE_ACCOUNT_KEY:', err);
      }
    }
  }

  // 2. Fallback: check GOOGLE_SERVICE_ACCOUNT_EMAIL
  const fallbackEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (fallbackEmail) {
    return {
      configured: true,
      clientEmail: fallbackEmail,
      projectId: null,
      privateKey: null,
      credentials: null,
      source: 'env_email',
    };
  }

  return {
    configured: false,
    clientEmail: null,
    projectId: null,
    privateKey: null,
    credentials: null,
    source: 'none',
  };
}
