import React from 'react';
import {
  EuiAvatar,
  EuiBreadcrumbs,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  useEuiTheme,
} from '@elastic/eui';

interface KibanaHeaderProps {
  colorMode: 'light' | 'dark';
  onToggleColorMode: () => void;
  onAssistantClick: () => void;
  rightContent?: React.ReactNode;
  onAgentClick?: () => void;
  agentOpen?: boolean;
}

export const KibanaHeader: React.FC<KibanaHeaderProps> = ({
  colorMode,
  onToggleColorMode,
  onAssistantClick,
  rightContent,
  onAgentClick,
  agentOpen,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      style={{
        paddingLeft: 0,
        paddingRight: '16px',
        height: '48px',
        flexShrink: 0,
      }}
    >
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="m"
        wrap={false}
        style={{ height: '100%' }}
      >
        {/* Left */}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m" wrap={false}>
            <EuiFlexItem grow={false}>
              <div style={{ height: '48px', paddingTop: '12px', paddingBottom: '12px', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '1px', height: '24px', backgroundColor: euiTheme.colors.borderBaseSubdued }} />
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type="logoElastic" size="l" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBreadcrumbs
                breadcrumbs={[
                  { text: <EuiAvatar type="space" name="D" size="s" /> },
                  { text: 'AI Briefing' },
                ]}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Right */}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false}>
            {rightContent && <EuiFlexItem grow={false}>{rightContent}</EuiFlexItem>}
            {onAgentClick && (
              <EuiFlexItem grow={false}>
                <button
                  onClick={onAgentClick}
                  data-persistent-panel
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '0 14px', height: 32, borderRadius: 6,
                    border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(90deg, #1750BA 0%, #6B3C9F 100%)',
                    boxShadow: agentOpen ? 'inset 0 0 0 1000px rgba(0,0,0,0.12)' : 'none',
                    transition: 'box-shadow 0.15s',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10.4473 11.5234C9.82554 12.7669 8.58926 13 8 13C7.41074 13 6.17446 12.7669 5.55273 11.5234L6.44727 11.0762C6.82554 11.8327 7.58926 12 8 12C8.41074 12 9.17446 11.8327 9.55273 11.0762L10.4473 11.5234Z" fill="white"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M5.5 7C6.32843 7 7 7.67157 7 8.5C7 9.32843 6.32843 10 5.5 10C4.67157 10 4 9.32843 4 8.5C4 7.67157 4.67157 7 5.5 7ZM5.5 8C5.22386 8 5 8.22386 5 8.5C5 8.77614 5.22386 9 5.5 9C5.77614 9 6 8.77614 6 8.5C6 8.22386 5.77614 8 5.5 8Z" fill="white"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M10.5 7C11.3284 7 12 7.67157 12 8.5C12 9.32843 11.3284 10 10.5 10C9.67157 10 9 9.32843 9 8.5C9 7.67157 9.67157 7 10.5 7ZM10.5 8C10.2239 8 10 8.22386 10 8.5C10 8.77614 10.2239 9 10.5 9C10.7761 9 11 8.77614 11 8.5C11 8.22386 10.7761 8 10.5 8Z" fill="white"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M8 0C8.82843 0 9.5 0.671573 9.5 1.5C9.5 2.15281 9.08218 2.70597 8.5 2.91211V4H11C12.6569 4 14 5.34315 14 7H15C15.5523 7 16 7.44772 16 8V11C16 11.5523 15.5523 12 15 12H14V14C14 14.5523 13.5523 15 13 15H3C2.44772 15 2 14.5523 2 14V12H1C0.447715 12 0 11.5523 0 11V8C0 7.44772 0.447715 7 1 7H2C2 5.34315 3.34315 4 5 4H7.5V2.91211C6.91782 2.70597 6.5 2.15281 6.5 1.5C6.5 0.671573 7.17157 0 8 0ZM5 5C3.89543 5 3 5.89543 3 7V14H13V7C13 5.89543 12.1046 5 11 5H5ZM1 11H2V8H1V11ZM14 11H15V8H14V11ZM8 1C7.72386 1 7.5 1.22386 7.5 1.5C7.5 1.77614 7.72386 2 8 2C8.27614 2 8.5 1.77614 8.5 1.5C8.5 1.22386 8.27614 1 8 1Z" fill="white"/>
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '0.01em' }}>AI Agent</span>
                </button>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType={colorMode === 'light' ? 'moon' : 'sun'}
                onClick={onToggleColorMode}
                aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div
                onClick={onAssistantClick}
                style={{ width: 29, height: 29, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 56 64" fill="none">
                  <path d="M32 28H56V64H32V28Z" fill="#F04E98" />
                  <path d="M0 46C0 36.0589 8.05888 28 18 28H24V64H18C8.05888 64 0 55.9411 0 46Z" fill="#00BFB3" />
                  <path d="M56 12C56 18.6274 50.6274 24 44 24C37.3726 24 32 18.6274 32 12C32 5.37258 37.3726 0 44 0C50.6274 0 56 5.37258 56 12Z" fill="#0B64DD" />
                  <path d="M2 23C2 10.8497 11.8497 1 24 1V23H2Z" fill="#FEC514" />
                </svg>
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiAvatar name="Larissa Oliveira" size="s" color={euiTheme.colors.vis.euiColorVis1} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
