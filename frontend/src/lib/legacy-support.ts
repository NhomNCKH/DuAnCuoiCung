// Legacy Support Layer - Ensures backward compatibility
import { apiClient } from '@/lib/api-client';

// Re-export old API for backward compatibility
export { apiClient as api };

// Legacy hook support
export { useAuth } from '@/hooks/useAuth';

// Legacy paths support
export const legacyPaths = {
  '/services/api': '@/lib/api-client',
  '/hooks/useAuth': '@/lib/hooks/useAuth',
  '/contexts/AuthContext': '@/lib/contexts/AuthContext'
};

// Ensure old imports still work
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.__LEGACY_API__ = apiClient;
}