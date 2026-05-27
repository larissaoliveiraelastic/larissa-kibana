import React from 'react';
import { createRoot } from 'react-dom/client';
import { EuiProvider } from '@elastic/eui';
import createCache from '@emotion/cache';
import { useAppStore } from './store/useAppStore';
import AIBriefingApp from './pages/ai-briefing/v1.0';

const euiCache = createCache({ key: 'eui', prepend: true });

const Root: React.FC = () => {
  const { colorMode } = useAppStore();
  return (
    <EuiProvider colorMode={colorMode} cache={euiCache}>
      <AIBriefingApp />
    </EuiProvider>
  );
};

const container = document.getElementById('root')!;
createRoot(container).render(<Root />);
