import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { ExplorerShell } from '@graph/ui';
import { createCatalogClient } from '@graph/api-client';

const client = createCatalogClient(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1');
const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');
createRoot(root).render(<ExplorerShell client={client} hostLabel="Standalone website" />);
