import React, { useState } from 'react';
import {
  EuiButton, EuiButtonEmpty, EuiButtonIcon,
  EuiBadge, EuiPanel,
  EuiIcon, EuiText, EuiTitle,
  EuiFlexGroup, EuiFlexItem, EuiSpacer,
  EuiModal, EuiModalHeader, EuiModalHeaderTitle,
  EuiModalBody, EuiModalFooter,
  EuiTextArea, EuiFieldText, EuiToolTip,
  EuiGlobalToastList,
  EuiCallOut,
  useEuiTheme,
} from '@elastic/eui';
import type { Toast } from '@elastic/eui/src/components/toast/global_toast_list';
import { useAppStore } from '../../../store/useAppStore';
import { KibanaHeader } from '../../../components/KibanaHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
type Skill = 'Alert Analysis' | 'Detection Rule Edit' | 'Attack Discovery' | 'Cases';
type ItemStatus = 'pending' | 'approved' | 'modified' | 'rejected' | 'autonomous';
type ActiveNav =
  | 'get_started' | 'siem_readiness' | 'value_report' | 'ai_briefing'
  | 'auto_migrations' | 'translated_rules' | 'translated_dashboards'
  | 'discover' | 'dashboards' | 'rules' | 'detections'
  | 'workflows' | 'agents' | 'attack_discovery' | 'more';

interface BriefingItem {
  id: string;
  rank: number;
  severity: Severity;
  skill: Skill;
  confidence: number;
  whatWeFound: string;
  whyItMattersNow: string;
  whatWePropose: string;
  evidence: { label: string; type: string; detail?: string; severity?: Severity; confidence?: number; actionLabel?: string; assignees?: string[]; similarCount?: number }[];
  titleChips?: { label: string; bg: string; color: string; detail: string }[];
  proposedAction: string;
  approveLabel: string;       // specific action label for this item
  approvalText: string;       // "This item needs your approval to…" copy
  agentIntro: string;         // conversational intro for v2 chat view
  status: ItemStatus;
  isNew?: boolean;             // unviewed by current analyst
  assignees?: string[];         // analysts assigned
  rejectionReason?: string;
  modifiedAction?: string;
  resolvedAt?: string;
}

interface ResolvedHistoryItem {
  item: BriefingItem;
  actionLabel: string;
  by: 'user' | 'ai';
  resolvedAt: string;
  status: 'approved' | 'modified' | 'rejected';
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_ITEMS: BriefingItem[] = [
  // ── CRITICAL — 1 attack + 2 alerts ──────────────────────────────────────────
  {
    id: 'item-1', rank: 1, severity: 'Critical', skill: 'Attack Discovery', confidence: 94,
    whatWeFound: 'Active attack chain on SRVWIN03 — Initial Access → Credential Access → Lateral Movement across 2 critical hosts',
    titleChips: [
      { label: 'SRVWIN03', bg: '#E6F2FF', color: '#006BB4', detail: 'Host: SRVWIN03\nOS: Windows Server 2019\nAsset criticality: Extreme impact\nRunning: Active Directory, SAP connector\nLast seen: 03:21 UTC' },
      { label: 'Initial Access', bg: '#FFF0EE', color: '#BD271E', detail: 'Tactic: Initial Access (TA0001)\nTechnique: Valid Accounts (T1078)\nSource IP: 185.220.101.47 (Tor exit node)\nTime: 03:14 UTC' },
      { label: 'Credential Access', bg: '#FFF8E6', color: '#CA8500', detail: 'Tactic: Credential Access (TA0006)\nTechnique: Pass-the-Hash (T1550.002)\nUser: svc-admin@corp\nSession jump: Romania → US East in 12 min' },
      { label: 'Lateral Movement', bg: '#FFF1E5', color: '#AD4800', detail: 'Tactic: Lateral Movement (TA0008)\nTechnique: SMB/Windows Admin Shares (T1021.002)\nSource: SRVWIN03 → Destination: SRVWIN07\nTime: 03:21 UTC' },
    ],
    whyItMattersNow: '',
    whatWePropose: 'Isolate SRVWIN03 immediately to cut lateral movement. On-call Tier 2 team will be paged automatically.',
    evidence: [
      {
        label: 'Kill-chain correlated: 3 stages across 2 hosts',
        type: 'attack', confidence: 94, actionLabel: 'Isolate SRVWIN03',
        assignees: ['K. Yamamoto'],
        detail: 'Stage 1: Valid Accounts via Tor (T1078)\nStage 2: Pass-the-Hash (T1550.002)\nStage 3: SMB lateral move to SRVWIN07 (T1021.002)\nTime span: 03:14–03:21 UTC',
      },
      {
        label: 'svc-admin@corp session active from Tor exit node 185.220.101.47',
        type: 'alert', confidence: 97, actionLabel: 'Kill session',
        assignees: ['James R.'],
        detail: 'Source IP: 185.220.101.47 (Tor exit node)\nUser: svc-admin@corp · Host: SRVWIN03\nTime: 03:14 UTC · Tactic: Initial Access (TA0001)',
      },
      {
        label: 'svc-admin@corp reused from 2 geos in 12 min — credential compromise',
        type: 'alert', confidence: 93, actionLabel: 'Reset credentials',
        assignees: [],
        detail: 'Session 1: Romania 03:02 UTC\nSession 2: US East 03:14 UTC · Δ12 min\nTactic: Credential Access (TA0006) · T1550.002',
      },
    ],
    proposedAction: 'Isolate SRVWIN03',
    approveLabel: 'Isolate SRVWIN03',
    approvalText: 'immediately disconnects SRVWIN03 from the network, halting lateral movement to SRVWIN07. On-call Tier 2 will be paged automatically. The host remains accessible for forensic analysis via out-of-band management.',
    agentIntro: 'I correlated 3 alerts on SRVWIN03 into a confirmed kill-chain. An admin account was accessed from a Tor exit node at 03:14 UTC, credentials were reused via Pass-the-Hash 12 minutes later, then the attacker pivoted to SRVWIN07 via SMB. The attack is still active — isolating SRVWIN03 now will cut lateral movement before further spread.',
    status: 'pending', isNew: true, assignees: ['James R.'],
  },

  // ── HIGH — 2 alerts ──────────────────────────────────────────────────────────
  {
    id: 'item-3', rank: 2, severity: 'High', skill: 'Alert Analysis', confidence: 81,
    whatWeFound: 'Cobalt Strike C2 activity on SRVWIN07 — post-exploitation foothold, active beaconing to Tor exit node',
    titleChips: [
      { label: 'SRVWIN07', bg: '#E6F2FF', color: '#006BB4', detail: 'Host: SRVWIN07\nOS: Windows Server 2019\nAsset criticality: High impact\nRunning: File server, internal shares\nLast seen: 04:02 UTC' },
      { label: 'Cobalt Strike', bg: '#FFF0EE', color: '#BD271E', detail: 'Profile: cs-default-https\nMatch score: 81/100\nKill-chain: Command & Control (TA0011)\nTime: 04:02 UTC' },
    ],
    whyItMattersNow: 'SRVWIN07 was the lateral movement target from the critical attack chain. It is now running a Cobalt Strike beacon every 60 seconds — the attacker has an active foothold and may be staging further movement.',
    whatWePropose: 'Add this host to the active case and block the C2 beacon IP immediately.',
    evidence: [
      {
        label: 'Cobalt Strike beacon active on SRVWIN07 — C2 every 60s',
        type: 'alert', confidence: 81, actionLabel: 'Isolate SRVWIN07',
        assignees: ['Ana L.'],
        detail: 'Profile: cs-default-https · Match score: 81/100\nHost: SRVWIN07 · Time: 04:02 UTC\nTactic: Command & Control (TA0011)',
      },
      {
        label: 'Outbound C2 to 185.220.101.x (Tor) — 2.4 MB exfiltrated, port 443',
        type: 'alert', confidence: 76, actionLabel: 'Block C2 IP',
        assignees: [],
        detail: 'Destination: 185.220.101.x (Tor exit node)\nPort: 443 · Bytes out: 2.4 MB\nFrequency: Every 60s · First seen: 04:02 UTC',
      },
    ],
    proposedAction: 'Isolate SRVWIN07',
    approveLabel: 'Isolate SRVWIN07',
    approvalText: 'disconnects SRVWIN07 from the network, severing the active C2 channel and halting further data exfiltration. The host is linked to CASE-2025-0087 and assigned analysts are notified.',
    agentIntro: 'SRVWIN07 is the host the attacker reached via lateral movement from SRVWIN03. It is now running a Cobalt Strike C2 beacon every 60 seconds and has already exfiltrated 2.4 MB to a Tor exit node. Isolating it now will sever the C2 channel and stop further data loss.',
    status: 'pending', isNew: true, assignees: ['Ana L.'],
  },

  // ── MEDIUM — 1 case + 1 rule ─────────────────────────────────────────────────
  {
    id: 'item-5', rank: 3, severity: 'Medium', skill: 'Cases', confidence: 82,
    whatWeFound: 'Open investigation unassigned + detection gap for active CVE — two items need attention before next shift',
    whyItMattersNow: 'The central investigation case (CASE-2025-0087) has no owner on the current shift and a forensic memory dump uploaded 47 minutes ago is unreviewed. Separately, no rule covers CVE-2025-31324 — the vulnerability actively exploited in your environment.',
    whatWePropose: 'Assign the case to yourself and enable the draft detection rule. Both can be done in under 2 minutes.',
    evidence: [
      {
        label: 'SAP Exploitation case unassigned — memory dump pending review',
        type: 'case', confidence: 82, actionLabel: 'Assign to me',
        assignees: [],
        detail: 'Case ID: CASE-2025-0087\nStatus: Open · Assigned: Unassigned\nNew evidence: memory_dump_SRVDB01_0430.zip (840 MB)\nUploaded: 47 min ago · No acknowledgment this shift',
      },
      {
        label: 'CVE-2025-31324 detection rule — Draft, 0 FP in 30-day backtest',
        type: 'rule', confidence: 91, actionLabel: 'Enable rule',
        assignees: [],
        detail: 'Rule: SAP NetWeaver Visual Composer RCE\nStatus: Draft · Backtest: 0 FP, 3 TP (30 days)\nWould have caught the SRVDB01 exploit at 03:44 UTC\nAffected hosts in scope: 4',
      },
    ],
    proposedAction: 'Assign to me',
    approveLabel: 'Assign to me',
    approvalText: 'assigns you as case owner, sets status to In Progress, and enables the CVE-2025-31324 detection rule.',
    agentIntro: 'Two medium-priority items need attention before handoff: the SAP Exploitation case has no owner and a new memory dump is unreviewed; and the CVE-2025-31324 rule is drafted but not yet enabled. Both are low-effort, high-value actions.',
    status: 'pending', isNew: true, assignees: [],
  },

  // ── LOW — 1 alert, 80 similar false positives ────────────────────────────────
  {
    id: 'item-6', rank: 4, severity: 'Low', skill: 'Alert Analysis', confidence: 62,
    whatWeFound: '80 identical false positive alerts — PSScheduler v2.x on developer workstations, suppression recommended',
    whyItMattersNow: 'A single detection rule is generating 80 identical low-confidence alerts from developer workstations. All match the PSScheduler v2.x admin automation tool — no threat indicators. This noise is burying real alerts.',
    whatWePropose: 'Close all 80 as false positives and add a host-group exception to suppress this pattern permanently.',
    evidence: [
      {
        label: 'Scheduled task creation — PSScheduler v2.x (dev workstations)',
        type: 'alert', confidence: 62, actionLabel: 'Close all (FP)',
        similarCount: 80,
        detail: 'Hosts: DEVWRK01–DEVWRK12 (developer workstations)\nTask: PSScheduler auto-update · Confidence: 62%\nAll 80 instances: no threat indicators · Pattern: admin automation\nRecommendation: Add group exception to suppress permanently',
      },
    ],
    proposedAction: 'Close (FP)',
    approveLabel: 'Close all (FP)',
    approvalText: 'closes all 80 alerts as false positives and adds a workstation-group exception to suppress future PSScheduler matches.',
    agentIntro: 'Eighty identical low-confidence alerts from developer workstations — all from the same PSScheduler v2.x admin tool. No threat indicators in any of them. The noise is significant. I recommend closing all and adding a group exception.',
    status: 'pending', isNew: false,
  },
];

// ─── Autonomous (no-approval) items for history ───────────────────────────────

const AUTONOMOUS_ITEMS: { id: string; severity: Severity; skill: Skill; label: string; detail: string; resolvedAt: string; actionTaken: string }[] = [
  {
    id: 'auto-1', severity: 'Low', skill: 'Alert Analysis',
    label: '23 scanner noise alerts suppressed — internal vuln scan on 10.0.4.x',
    detail: 'Source: Qualys scanner v10.x · Confidence: 84%\nScan window: 02:00–02:41 UTC · Threshold met: >80%',
    resolvedAt: 'Today at 02:41',
    actionTaken: 'Auto-closed as false positive',
  },
  {
    id: 'auto-2', severity: 'Medium', skill: 'Cases',
    label: 'CASE-2025-0087 auto-enriched with CVE-2025-31324 IOCs and MITRE mappings',
    detail: 'Added: 3 IOCs, 2 MITRE techniques, attacker IPs\nSource: CISA KEV + internal threat intel feed',
    resolvedAt: 'Today at 04:17',
    actionTaken: 'Case enrichment applied',
  },
  {
    id: 'auto-3', severity: 'High', skill: 'Alert Analysis',
    label: 'Credential reset triggered for svc-backup — unused privileged account with active session anomaly',
    detail: 'Account: svc-backup@corp · Last used: 90 days ago\nAnomaly: login from new geo (Singapore 04:05 UTC)\nAction: password reset + session revoke',
    resolvedAt: 'Today at 04:09',
    actionTaken: 'Password reset + session revoke',
  },
  {
    id: 'auto-4', severity: 'Low', skill: 'Detection Rule Edit',
    label: 'Noisy rule auto-tuned — "Office macro execution" reduced 94% FP rate after threshold adjustment',
    detail: 'Rule: Office Macro Execution (SIGMA-0042)\nBefore: 140 alerts/day · FP rate: 94%\nAfter tuning: 8 alerts/day · FP rate: ~12%',
    resolvedAt: 'Yesterday at 23:15',
    actionTaken: 'Rule threshold adjusted',
  },
  {
    id: 'auto-5', severity: 'Critical', skill: 'Alert Analysis',
    label: 'C2 IP 91.108.4.x blocked at perimeter firewall — active beacon from SRVDB01 interrupted',
    detail: 'IP: 91.108.4.x · Classification: Known threat actor\nAction: Perimeter block via SOAR · Beacon stopped at 03:52 UTC',
    resolvedAt: 'Today at 03:52',
    actionTaken: 'Firewall block applied',
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const SEV_COLOR: Record<Severity, string> = {
  Critical: '#BD271E', High: '#C44600', Medium: '#7D6700', Low: '#1A7348',
};
const SEV_BG: Record<Severity, string> = {
  Critical: '#FFF0EE', High: '#FFF3EC', Medium: '#FFFBEA', Low: '#E3F8F1',
};
const SKILL_ICON: Record<Skill, string> = {
  'Alert Analysis': 'warning',
  'Detection Rule Edit': 'indexEdit', 'Attack Discovery': 'bullseye', 'Cases': 'casesApp',
};
// Evidence types: Alert, Attack, Case, Rule — only these 4 exist
const EVIDENCE_ICON: Record<string, string> = {
  alert: 'warning',
  attack: 'bullseye',
  case: 'casesApp',
  rule: 'indexEdit',
};
const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  alert: 'Alert',
  attack: 'Attack',
  case: 'Case',
  rule: 'Rule',
};

// ─── Expand icon (custom SVG) ─────────────────────────────────────────────────
const IcExpand: React.FC<{ color?: string }> = ({ color = '#69707D' }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M4.35355 12.3536L12.3536 4.35355C12.5488 4.15829 12.5488 3.84171 12.3536 3.64645C12.1583 3.45118 11.8417 3.45118 11.6464 3.64645L3.64645 11.6464C3.45118 11.8417 3.45118 12.1583 3.64645 12.3536C3.84171 12.5488 4.15829 12.5488 4.35355 12.3536ZM1 10.5C1 10.2239 1.22386 10 1.5 10C1.77614 10 2 10.2239 2 10.5L2 13.5C2 13.7761 2.22386 14 2.5 14H5.5C5.77614 14 6 14.2239 6 14.5C6 14.7761 5.77614 15 5.5 15H2.5C1.67157 15 1 14.3284 1 13.5L1 10.5ZM15 5.5C15 5.77614 14.7761 6 14.5 6C14.2239 6 14 5.77614 14 5.5V2.5C14 2.22386 13.7761 2 13.5 2H10.5C10.2239 2 10 1.77614 10 1.5C10 1.22386 10.2239 1 10.5 1L13.5 1C14.3284 1 15 1.67157 15 2.5V5.5Z" fill={color}/>
  </svg>
);

// ─── Anthropic logo icon ──────────────────────────────────────────────────────

const IcAnthropic: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 6.603 1192.672 1193.397" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="m233.96 800.215 234.684-131.678 3.947-11.436-3.947-6.363h-11.436l-39.221-2.416-134.094-3.624-116.296-4.832-112.67-6.04-28.35-6.04-26.577-35.035 2.738-17.477 23.84-16.027 34.147 2.98 75.463 5.155 113.235 7.812 82.147 4.832 121.692 12.644h19.329l2.738-7.812-6.604-4.832-5.154-4.832-117.182-79.41-126.845-83.92-66.443-48.321-35.92-24.484-18.12-22.953-7.813-50.093 32.618-35.92 43.812 2.98 11.195 2.98 44.375 34.147 94.792 73.37 123.786 91.167 18.12 15.06 7.249-5.154.886-3.624-8.135-13.61-67.329-121.692-71.838-123.785-31.974-51.302-8.456-30.765c-2.98-12.645-5.154-23.275-5.154-36.242l37.127-50.416 20.537-6.604 49.53 6.604 20.86 18.121 30.765 70.39 49.852 110.818 77.315 150.684 22.631 44.698 12.08 41.396 4.51 12.645h7.813v-7.248l6.362-84.886 11.759-104.215 11.436-134.094 3.946-37.772 18.685-45.262 37.127-24.482 28.994 13.852 23.839 34.148-3.303 22.067-14.174 92.134-27.785 144.323-18.121 96.644h10.55l12.08-12.08 48.887-64.913 82.147-102.685 36.242-40.752 42.282-45.02 27.14-21.423h51.303l37.772 56.135-16.913 57.986-52.832 67.007-43.812 56.779-62.82 84.563-39.22 67.651 3.623 5.396 9.343-.886 141.906-30.201 76.671-13.852 91.49-15.705 41.396 19.329 4.51 19.65-16.269 40.189-97.852 24.16-114.764 22.954-170.9 40.43-2.093 1.53 2.416 2.98 76.993 7.248 32.94 1.771h80.617l150.12 11.195 39.222 25.933 23.517 31.732-3.946 24.16-60.403 30.766-81.503-19.33-190.228-45.26-65.235-16.27h-9.02v5.397l54.362 53.154 99.624 89.96 124.752 115.973 6.362 28.671-16.027 22.63-16.912-2.415-109.611-82.47-42.282-37.127-95.758-80.618h-6.363v8.456l22.067 32.296 116.537 175.167 6.04 53.719-8.456 17.476-30.201 10.55-33.181-6.04-68.215-95.758-70.39-107.84-56.778-96.644-6.926 3.947-33.503 360.886-15.705 18.443-36.243 13.852-30.201-22.953-16.027-37.127 16.027-73.37 19.329-95.758 15.704-76.107 14.175-94.55 8.456-31.41-.563-2.094-6.927.886-71.275 97.852-108.402 146.497-85.772 91.812-20.537 8.134-35.597-18.443 3.301-32.94 19.893-29.315 118.712-151.007 71.597-93.583 46.228-54.04-.322-7.813h-2.738l-315.302 204.725-56.135 7.248-24.16-22.63 2.98-37.128 11.435-12.08 94.792-65.236-.322.323z" fill="#d97757"/>
  </svg>
);

// ─── Icon Nav ─────────────────────────────────────────────────────────────────

const NAV_WIDTH = 64;

// Custom SVG icon components — pixel-perfect from design source
const IcDiscover: React.FC<{color: string}> = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1ZM8.5 3.5H7.5V2.02246C4.58523 2.263 2.263 4.58523 2.02246 7.5H3.5V8.5H2.02246C2.263 11.4147 4.58527 13.736 7.5 13.9766V12.5H8.5V13.9766C11.4147 13.736 13.737 11.4147 13.9775 8.5H12.5V7.5H13.9775C13.737 4.58523 11.4148 2.263 8.5 2.02246V3.5ZM10.293 5.04492C10.4827 4.95868 10.7061 4.99911 10.8535 5.14648C11.0009 5.29386 11.0413 5.51729 10.9551 5.70703L8.45508 11.207C8.36524 11.4045 8.15791 11.5219 7.94238 11.4971C7.72698 11.4721 7.5523 11.3103 7.50977 11.0977L7.0752 8.9248L4.90234 8.49023C4.68968 8.4477 4.5279 8.27302 4.50293 8.05762C4.47812 7.84209 4.5955 7.63476 4.79297 7.54492L10.293 5.04492ZM6.61719 7.81348L7.59766 8.00977L7.66992 8.03027C7.83269 8.08911 7.95559 8.22915 7.99023 8.40234L8.18555 9.38184L9.49316 6.50684L6.61719 7.81348Z" fill={color}/>
  </svg>
);

const IcDashboard: React.FC<{color: string}> = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M6 11C6.55228 11 7 11.4477 7 12V13L6.99512 13.1025C6.94379 13.6067 6.51768 14 6 14H2C1.44772 14 1 13.5523 1 13V12C1 11.4477 1.44772 11 2 11H6ZM2 13H6V12H2V13Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M14 7C14.5523 7 15 7.44772 15 8V13C15 13.5523 14.5523 14 14 14H9C8.44772 14 8 13.5523 8 13V8C8 7.44772 8.44772 7 9 7H14ZM9 13H14V8H9V13Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M6 7C6.55228 7 7 7.44772 7 8V9L6.99512 9.10254C6.94379 9.60667 6.51768 10 6 10H2C1.44772 10 1 9.55229 1 9V8C1 7.44772 1.44772 7 2 7H6ZM2 9H6V8H2V9Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M14 2C14.5177 2 14.9438 2.39333 14.9951 2.89746L15 3V5C15 5.55228 14.5523 6 14 6H2C1.44772 6 1 5.55228 1 5V3C1 2.44772 1.44772 2 2 2H14ZM2 5H14V3H2V5Z" fill={color}/>
  </svg>
);

const IcRules: React.FC<{color: string}> = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M8 1C9.75277 1 11.354 1.6454 12.582 2.70996L13.6465 1.64648L14.3535 2.35352L13.2891 3.41699C14.3542 4.64511 15 6.24674 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1ZM8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 6.52292 13.4652 5.17138 12.5801 4.12598L8.96484 7.74121C8.98695 7.82386 9 7.91038 9 8C9 8.55228 8.55228 9 8 9C7.44772 9 7 8.55228 7 8C7 7.44772 7.44772 7 8 7C8.0892 7 8.17551 7.01227 8.25781 7.03418L9.01367 6.27832C8.24687 5.82614 7.24458 5.92731 6.58594 6.58594C5.80489 7.36698 5.8049 8.63301 6.58594 9.41406L5.87891 10.1211C4.70735 8.94952 4.70734 7.05047 5.87891 5.87891C6.92982 4.828 8.56575 4.72023 9.7373 5.55469L10.4512 4.84082C8.88199 3.62015 6.61402 3.72974 5.17188 5.17188C3.60978 6.73397 3.60979 9.26603 5.17188 10.8281C5.95302 11.6093 6.97554 12 8 12V12.999C6.72116 12.999 5.44106 12.5114 4.46484 11.5352C2.51223 9.58253 2.51223 6.41746 4.46484 4.46484C6.29799 2.63171 9.20007 2.51913 11.1641 4.12793L11.873 3.41895C10.8278 2.53434 9.47658 2 8 2Z" fill={color}/>
  </svg>
);

const IcAgents: React.FC<{color: string}> = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.4473 11.5234C9.82554 12.7669 8.58926 13 8 13C7.41074 13 6.17446 12.7669 5.55273 11.5234L6.44727 11.0762C6.82554 11.8327 7.58926 12 8 12C8.41074 12 9.17446 11.8327 9.55273 11.0762L10.4473 11.5234Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M5.5 7C6.32843 7 7 7.67157 7 8.5C7 9.32843 6.32843 10 5.5 10C4.67157 10 4 9.32843 4 8.5C4 7.67157 4.67157 7 5.5 7ZM5.5 8C5.22386 8 5 8.22386 5 8.5C5 8.77614 5.22386 9 5.5 9C5.77614 9 6 8.77614 6 8.5C6 8.22386 5.77614 8 5.5 8Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M10.5 7C11.3284 7 12 7.67157 12 8.5C12 9.32843 11.3284 10 10.5 10C9.67157 10 9 9.32843 9 8.5C9 7.67157 9.67157 7 10.5 7ZM10.5 8C10.2239 8 10 8.22386 10 8.5C10 8.77614 10.2239 9 10.5 9C10.7761 9 11 8.77614 11 8.5C11 8.22386 10.7761 8 10.5 8Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M8 0C8.82843 0 9.5 0.671573 9.5 1.5C9.5 2.15281 9.08218 2.70597 8.5 2.91211V4H11C12.6569 4 14 5.34315 14 7H15L15.1025 7.00488C15.6067 7.05621 16 7.48232 16 8V11C16 11.5523 15.5523 12 15 12H14V14C14 14.5523 13.5523 15 13 15H3C2.44772 15 2 14.5523 2 14V12H1C0.447715 12 0 11.5523 0 11V8C0 7.44772 0.447715 7 1 7H2C2 5.34315 3.34315 4 5 4H7.5V2.91211C6.91782 2.70597 6.5 2.15281 6.5 1.5C6.5 0.671573 7.17157 0 8 0ZM5 5C3.89543 5 3 5.89543 3 7V14H13V7C13 5.89543 12.1046 5 11 5H5ZM1 11H2V8H1V11ZM14 11H15V8H14V11ZM8 1C7.72386 1 7.5 1.22386 7.5 1.5C7.5 1.77614 7.72386 2 8 2C8.27614 2 8.5 1.77614 8.5 1.5C8.5 1.22386 8.27614 1 8 1Z" fill={color}/>
  </svg>
);

const IcWorkflow: React.FC<{color: string}> = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 6.94434V8.94434H9V6.94434H7ZM2 1.94434V3.94434H4V1.94434H2ZM5 2.44434H12C13.6569 2.44434 15 3.78748 15 5.44434C15 7.10119 13.6569 8.44434 12 8.44434H10V8.94434C10 9.49662 9.55228 9.94434 9 9.94434H7C6.44772 9.94434 6 9.49662 6 8.94434V8.44434H4C2.89543 8.44434 2 9.33977 2 10.4443C2 11.5489 2.89543 12.4443 4 12.4443H13.293L11.6465 10.7979L12.3535 10.0908L15.207 12.9443L12.3535 15.7979L11.6465 15.0908L13.293 13.4443H4C2.34315 13.4443 1 12.1012 1 10.4443C1 8.78748 2.34315 7.44434 4 7.44434H6V6.94434C6 6.39205 6.44772 5.94434 7 5.94434H9C9.55228 5.94434 10 6.39205 10 6.94434V7.44434H12C13.1046 7.44434 14 6.54891 14 5.44434C14 4.33977 13.1046 3.44434 12 3.44434H5V3.94434C5 4.49662 4.55228 4.94434 4 4.94434H2C1.44772 4.94434 1 4.49662 1 3.94434V1.94434C1 1.39205 1.44772 0.944336 2 0.944336H4C4.55228 0.944336 5 1.39205 5 1.94434V2.44434Z" fill={color}/>
  </svg>
);

const IcBolt: React.FC<{color: string}> = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 1L9.99905 5H13C13.4152 5 13.787 5.25652 13.9346 5.64453C14.0821 6.03261 13.9744 6.47124 13.6641 6.74707L4.66408 14.7471C4.30581 15.0655 3.7721 15.0855 3.39162 14.7939C3.01114 14.5024 2.89111 13.9815 3.10549 13.5527L5.38186 9H3.00002C2.63123 9 2.29221 8.79684 2.11819 8.47168C1.94429 8.14656 1.96346 7.7521 2.16799 7.44531L6.46487 1H13ZM3.00002 8H7.00002L4.00002 14L13 6H8.00002L11 2H7.00002L3.00002 8Z" fill={color}/>
  </svg>
);

const IcLaunchpad: React.FC<{color: string}> = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.8535 5.85352L9.20703 7.5H13V8.5H9.20703L10.8535 10.1465L10.1465 10.8535L7.29297 8L10.1465 5.14648L10.8535 5.85352Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M14 1C14.5523 1 15 1.44772 15 2V14C15 14.5523 14.5523 15 14 15H2C1.44771 15 1 14.5523 1 14V2C1 1.44771 1.44772 1 2 1H14ZM2 13.207V14H2.79297L5 11.793V10.207L2 13.207ZM4.20703 14H5V13.207L4.20703 14ZM6 14H14V2H6V14ZM2 10.207V11.793L5 8.79297V7.20703L2 10.207ZM2 7.20703V8.79297L5 5.79297V4.20703L2 7.20703ZM2 4.20703V5.79297L5 2.79297V2H4.20703L2 4.20703ZM2 2.79297L2.79297 2H2V2.79297Z" fill={color}/>
  </svg>
);

const IcDevTools: React.FC<{color: string}> = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.49193 13.5895L9.49193 2.58947L8.50806 2.41058L6.50806 13.4106L7.49193 13.5895Z" fill={color}/>
    <path d="M4.85351 5.35353L2.20706 7.99998L4.85351 10.6464L4.1464 11.3535L0.792847 7.99998L4.1464 4.64642L4.85351 5.35353Z" fill={color}/>
    <path d="M15.2071 7.99998L11.8535 4.64642L11.1464 5.35353L13.7928 7.99998L11.1464 10.6464L11.8535 11.3535L15.2071 7.99998Z" fill={color}/>
  </svg>
);

const IcManage: React.FC<{color: string}> = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 10.9414C12.7256 11.1103 12.4067 11.2576 12.0596 11.3838C10.9965 11.7703 9.56129 12 8 12C6.43871 12 5.00347 11.7703 3.94043 11.3838C3.59331 11.2576 3.27442 11.1103 3 10.9414V12.5C3 12.5756 3.04036 12.7124 3.25781 12.8994C3.4738 13.0851 3.8164 13.2749 4.28223 13.4443C5.20974 13.7815 6.52405 14 8 14C9.47595 14 10.7903 13.7815 11.7178 13.4443C12.1836 13.2749 12.5262 13.0851 12.7422 12.8994C12.9596 12.7124 13 12.5756 13 12.5V10.9414ZM13 7.94141C12.7256 8.11027 12.4067 8.25757 12.0596 8.38379C10.9965 8.77031 9.56129 9 8 9C6.43871 9 5.00347 8.77031 3.94043 8.38379C3.59331 8.25757 3.27442 8.11027 3 7.94141V9.5C3 9.57557 3.04036 9.7124 3.25781 9.89941C3.4738 10.0851 3.8164 10.2749 4.28223 10.4443C5.20974 10.7815 6.52405 11 8 11C9.47595 11 10.7903 10.7815 11.7178 10.4443C12.1836 10.2749 12.5262 10.0851 12.7422 9.89941C12.9596 9.7124 13 9.57557 13 9.5V7.94141ZM13 4.94141C12.7256 5.11027 12.4067 5.25757 12.0596 5.38379C10.9965 5.77031 9.56129 6 8 6C6.43871 6 5.00347 5.77031 3.94043 5.38379C3.59331 5.25757 3.27442 5.11027 3 4.94141V6.5C3 6.57557 3.04036 6.7124 3.25781 6.89941C3.4738 7.08511 3.8164 7.27494 4.28223 7.44434C5.20974 7.78154 6.52405 8 8 8C9.47595 8 10.7903 7.78154 11.7178 7.44434C12.1836 7.27494 12.5262 7.08511 12.7422 6.89941C12.9596 6.7124 13 6.57557 13 6.5V4.94141ZM13 3.5C13 3.42443 12.9596 3.2876 12.7422 3.10059C12.5262 2.91489 12.1836 2.72506 11.7178 2.55566C10.7903 2.21846 9.47595 2 8 2C6.52405 2 5.20974 2.21846 4.28223 2.55566C3.8164 2.72506 3.4738 2.91489 3.25781 3.10059C3.04036 3.2876 3 3.42443 3 3.5C3 3.57557 3.04036 3.7124 3.25781 3.89941C3.4738 4.08511 3.8164 4.27494 4.28223 4.44434C5.20974 4.78154 6.52405 5 8 5C9.47595 5 10.7903 4.78154 11.7178 4.44434C12.1836 4.27494 12.5262 4.08511 12.7422 3.89941C12.9596 3.7124 13 3.57557 13 3.5ZM14 12.5C14 12.9767 13.7325 13.3658 13.3936 13.6572C13.0529 13.9501 12.589 14.1913 12.0596 14.3838C10.9965 14.7703 9.56129 15 8 15C6.43871 15 5.00347 14.7703 3.94043 14.3838C3.41095 14.1913 2.94709 13.9501 2.60645 13.6572C2.26747 13.3658 2 12.9767 2 12.5V3.5C2 3.02335 2.26747 2.63423 2.60645 2.34277C2.94709 2.04991 3.41095 1.80875 3.94043 1.61621C5.00347 1.22969 6.43871 1 8 1C9.56129 1 10.9965 1.22969 12.0596 1.61621C12.589 1.80875 13.0529 2.04991 13.3936 2.34277C13.7325 2.63423 14 3.02335 14 3.5V12.5Z" fill={color}/>
  </svg>
);

const IcSettings: React.FC<{color: string}> = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M8 5C6.34315 5 5 6.34315 5 8C5 9.65685 6.34315 11 8 11C9.65685 11 11 9.65685 11 8C11 6.34315 9.65685 5 8 5ZM6 8C6 6.89543 6.89543 6 8 6C9.10457 6 10 6.89543 10 8C10 9.10457 9.10457 10 8 10C6.89543 10 6 9.10457 6 8Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M7.00007 0C6.44778 0 6.00007 0.447715 6.00007 1V1.79904C6.00007 2.36358 5.6989 2.88525 5.21001 3.16755C4.72106 3.44988 4.11862 3.4499 3.62966 3.16759L2.93781 2.76816C2.45952 2.49202 1.84793 2.65589 1.57179 3.13418L0.571789 4.86623C0.295646 5.34453 0.459521 5.95612 0.937814 6.23226L1.62973 6.63174C2.11865 6.91402 2.41983 7.4357 2.41979 8.00026C2.41976 8.56475 2.11859 9.08635 1.62973 9.3686L0.937667 9.76816C0.459375 10.0443 0.295499 10.6559 0.571641 11.1342L1.57164 12.8662C1.84778 13.3445 2.45937 13.5084 2.93767 13.2323L3.62976 12.8327C4.11862 12.5504 4.72091 12.5504 5.2098 12.8326C5.69881 13.1148 6.00007 13.6366 6.00007 14.2012V15C6.00007 15.5523 6.44778 16 7.00007 16H9.00006C9.55235 16 10.0001 15.5523 10.0001 15V14.201C10.0001 13.6365 10.3012 13.1148 10.7901 12.8326C11.279 12.5504 11.8812 12.5504 12.37 12.8327L13.0622 13.2323C13.5405 13.5084 14.1521 13.3445 14.4282 12.8662L15.4282 11.1342C15.7043 10.6559 15.5405 10.0443 15.0622 9.76816L14.3701 9.3686C13.8812 9.08635 13.5801 8.56475 13.58 8.00026C13.58 7.4357 13.8812 6.91402 14.3701 6.63174L15.062 6.23226C15.5403 5.95612 15.7042 5.34453 15.428 4.86624L14.428 3.13418C14.1519 2.65589 13.5403 2.49202 13.062 2.76816L12.3701 3.16762C11.8812 3.4499 11.2788 3.44986 10.7899 3.16752C10.3011 2.88525 10.0001 2.36368 10.0001 1.79925V1C10.0001 0.447716 9.55235 0 9.00006 0H7.00007ZM7.00007 1.79904V1H9.00006V1.79925C9.00006 2.7209 9.4917 3.57256 10.2898 4.03348C11.0881 4.49452 12.0718 4.49458 12.8701 4.03364L13.562 3.63418L14.562 5.36624L13.8701 5.76571C13.0718 6.22664 12.58 7.07848 12.58 8.00033C12.5801 8.92206 13.0719 9.77376 13.8701 10.2346L14.5622 10.6342L13.5622 12.3662L12.87 11.9666C12.0718 11.5058 11.0884 11.5058 10.2902 11.9666C9.49187 12.4274 9.00006 13.2792 9.00006 14.201V15H7.00007V14.2012C7.00007 13.2792 6.50816 12.4274 5.70969 11.9665C4.91142 11.5057 3.92798 11.5058 3.12976 11.9667L2.43767 12.3662L1.43767 10.6342L2.12973 10.2346C2.92797 9.77376 3.41973 8.92206 3.41979 8.00033C3.41985 7.07848 2.92807 6.22663 2.12973 5.76571L1.43781 5.36623L2.43781 3.63418L3.12966 4.03362C3.92804 4.49457 4.9117 4.49454 5.71006 4.03354C6.50833 3.5726 7.00007 2.72082 7.00007 1.79904Z" fill={color}/>
  </svg>
);

const IcDetections: React.FC<{color: string}> = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 12C9 12.5523 8.55228 13 8 13C7.44772 13 7 12.5523 7 12C7 11.4477 7.44772 11 8 11C8.55228 11 9 11.4477 9 12Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M7.5 10V5H8.5V10H7.5Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M8 1C8.35567 1 8.68457 1.18891 8.86378 1.49613L15.8638 13.4961C16.0442 13.8054 16.0455 14.1876 15.8671 14.4981C15.6888 14.8086 15.3581 15 15 15H1C0.641935 15 0.311196 14.8086 0.132858 14.4981C-0.0454804 14.1876 -0.0441976 13.8054 0.136221 13.4961L7.13622 1.49613C7.31543 1.18891 7.64433 1 8 1ZM1 14H15L8 2L1 14Z" fill={color}/>
  </svg>
);

// Queue toolbar icons — extracted paths from Figma SVGs
const IcQueueFilter: React.FC<{color?: string}> = ({ color = '#1D2A3E' }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="3"   y1="5.5"  x2="17"  y2="5.5"  stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="5.5" y1="9.5"  x2="14.5" y2="9.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8"   y1="13.5" x2="12"  y2="13.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IcQueueHistory: React.FC<{color?: string}> = ({ color = '#1D2A3E' }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Counter-clockwise arc (≈270°) */}
    <path d="M10 17C13.866 17 17 13.866 17 10C17 6.134 13.866 3 10 3C7.197 3 4.748 4.567 3.5 6.878"
      stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    {/* Arrow head at start of arc */}
    <path d="M3 5L3.5 8H6.5"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Clock hands */}
    <path d="M10 7V10.5L12.5 12"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IcAIBriefing: React.FC<{color: string}> = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1.5C4.41 1.5 1.5 4.41 1.5 8C1.5 9.38 1.93 10.66 2.66 11.71L1.5 14.5L4.29 13.34C5.34 14.07 6.62 14.5 8 14.5C11.59 14.5 14.5 11.59 14.5 8C14.5 4.41 11.59 1.5 8 1.5Z" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 6.5H11M5 8.5H9" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="12" cy="4" r="2.5" fill={color}/>
    <path d="M11.5 4H12.5M12 3.5V4.5" stroke="white" strokeWidth="0.8" strokeLinecap="round"/>
  </svg>
);

// Map of custom icon id → component
const CUSTOM_ICONS: Record<string, React.FC<{color: string}>> = {
  ai_briefing:     IcAIBriefing,
  discover:        IcDiscover,
  dashboards:      IcDashboard,
  rules:           IcRules,
  detections:      IcDetections,
  agents:          IcAgents,
  workflows:       IcWorkflow,
  attack_discovery:IcBolt,
  launchpad:       IcLaunchpad,
  dev_tools:       IcDevTools,
  manage:          IcManage,
  settings:        IcSettings,
};

interface NavItem { id: string; icon: string; label: string; }

const topItems: NavItem[] = [
  { id: 'discover',        icon: 'discover',        label: 'Discover'         },
  { id: 'dashboards',      icon: 'dashboards',      label: 'Dashboards'       },
  { id: 'rules',           icon: 'rules',           label: 'Rules'            },
  { id: 'detections',      icon: 'detections',      label: 'Detections'       },
  { id: 'workflows',       icon: 'workflows',       label: 'Workflows'        },
  { id: 'agents',          icon: 'agents',          label: 'Agents'           },
  { id: 'attack_discovery',icon: 'attack_discovery',label: 'Attack\ndiscovery'},
  { id: 'more',            icon: 'boxesVertical',   label: 'More'             },
];

const bottomItems: NavItem[] = [
  { id: 'dev_tools', icon: 'dev_tools', label: 'Dev Tools' },
  { id: 'manage',    icon: 'manage',    label: 'Manage'    },
  { id: 'settings',  icon: 'settings',  label: 'Settings'  },
];

const SecurityIconNav: React.FC<{
  active: string;
  onSelect: (id: string) => void;
  showSecondary: boolean;
  onToggleSecondary: () => void;
  onSecurityLogoClick: () => void;
}> = ({ active, onSelect, showSecondary, onToggleSecondary, onSecurityLogoClick }) => {
  const { euiTheme } = useEuiTheme();
  const PAD = 4;

  const renderItem = (item: NavItem, iconOnly = false) => {
    const LAUNCHPAD_ALL = ['get_started','siem_readiness','value_report','auto_migrations','translated_rules','translated_dashboards'];
    const isActive = active === item.id || (item.id === 'launchpad' && LAUNCHPAD_ALL.includes(active));
    return (
      <div key={item.id} style={{ width: '100%' }}>
        <EuiToolTip content={item.label.replace('\n', ' ')} position="right" display="block">
          <button
            onClick={() => onSelect(item.id)}
            aria-label={item.label}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              width: '100%', minHeight: iconOnly ? 36 : 48, padding: iconOnly ? `4px ${PAD}px` : `8px ${PAD}px`,
              border: 'none', borderRadius: euiTheme.border.radius.small, cursor: 'pointer',
              background: isActive ? euiTheme.colors.backgroundBaseInteractiveSelect : 'transparent',
              transition: 'background 0.15s', gap: 4, marginBottom: 6, boxSizing: 'border-box',
            }}
            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade; }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {CUSTOM_ICONS[item.id]
              ? React.createElement(CUSTOM_ICONS[item.id], { color: isActive ? euiTheme.colors.primary : '#1D2A3F' })
              : <EuiIcon type={item.icon} size="m" color={isActive ? euiTheme.colors.primary : '#1D2A3F'} />
            }
            {!iconOnly && (
              <span style={{
                fontSize: 9, lineHeight: '11px', textAlign: 'center', whiteSpace: 'pre-line',
                color: isActive ? euiTheme.colors.primaryText : '#1D2A3F',
                fontFamily: euiTheme.font.family, width: '100%', display: 'block',
              }}>
                {item.label}
              </span>
            )}
          </button>
        </EuiToolTip>
      </div>
    );
  };

  return (
    <div style={{
      width: NAV_WIDTH, height: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'stretch',
      flexShrink: 0,
      background: '#F6F8FB', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box',
    }}>
      {/* Security logo — clickable, navigates to AI Briefing (default Security page) */}
      <EuiToolTip content="AI Briefing" position="right" display="block">
        <button
          onClick={onSecurityLogoClick}
          title="Security — AI Briefing"
          style={{
            height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer', width: '100%',
            borderRadius: euiTheme.border.radius.small,
            background: active === 'ai_briefing' ? euiTheme.colors.backgroundBaseInteractiveSelect : 'transparent',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (active !== 'ai_briefing') (e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade; }}
          onMouseLeave={e => { if (active !== 'ai_briefing') (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <EuiIcon type="logoSecurity" size="l" />
        </button>
      </EuiToolTip>

      {/* Nav items — padded inside the scrollable body */}
      <div style={{ flex: 1, padding: `4px ${PAD}px`, overflowY: 'auto' }}>
        {topItems.map(item => renderItem(item, !showSecondary))}
      </div>

      {/* Divider — short and centered */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
        <div style={{ width: 32, height: 1, background: euiTheme.colors.lightShade }} />
      </div>

      <div style={{ padding: `0 ${PAD}px 6px` }}>
        {bottomItems.map(item => renderItem(item, true))}
        {/* Toggle nav2 — last item in the nav */}
        <EuiToolTip content={showSecondary ? 'Collapse menu' : 'Expand menu'} position="right" display="block">
          <button
            onClick={onToggleSecondary}
            aria-label={showSecondary ? 'Collapse menu' : 'Expand menu'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', minHeight: 36, padding: `4px ${PAD}px`,
              border: 'none', borderRadius: euiTheme.border.radius.small,
              cursor: 'pointer', background: 'transparent', transition: 'background 0.15s',
              marginBottom: 2, boxSizing: 'border-box',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <IcLaunchpad color={showSecondary ? euiTheme.colors.primary : '#1D2A3F'} />
          </button>
        </EuiToolTip>
      </div>
    </div>
  );
};

// ─── Launchpad secondary panel ────────────────────────────────────────────────

const launchpadItems = [
  { id: 'get_started',    label: 'Get started'    },
  { id: 'siem_readiness', label: 'SIEM Readiness' },
  { id: 'value_report',   label: 'Value report'   },
  // AI Briefing lives under Security icon (default page), not in Launchpad
];

const migrationItems = [
  { id: 'auto_migrations',       label: 'Manage automatic migrations' },
  { id: 'translated_rules',      label: 'Translated rules'           },
  { id: 'translated_dashboards', label: 'Translated dashboards'      },
];

const LaunchpadPanel: React.FC<{
  active: string;
  onSelect: (id: string) => void;
  pendingCount?: number;
  onCollapse: () => void;
}> = ({ active, onSelect, pendingCount = 0, onCollapse }) => {
  const { euiTheme } = useEuiTheme();

  const renderItem = (item: { id: string; label: string }, badge?: number) => {
    const isActive = active === item.id;
    return (
      <button
        key={item.id}
        onClick={() => onSelect(item.id)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', textAlign: 'left',
          padding: `6px ${euiTheme.size.m}`, border: 'none',
          borderRadius: euiTheme.border.radius.medium, cursor: 'pointer',
          fontSize: 14, fontFamily: euiTheme.font.family,
          background: isActive ? euiTheme.colors.backgroundBaseInteractiveSelect : 'transparent',
          color: isActive ? euiTheme.colors.primaryText : euiTheme.colors.text,
          fontWeight: isActive ? 600 : 400, marginBottom: 2, transition: 'background 0.15s',
          boxSizing: 'border-box',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade; }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <span>{item.label}</span>
        {badge != null && badge > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
            fontSize: 11, fontWeight: 700, background: '#BD271E', color: '#fff',
          }}>{badge}</span>
        )}
      </button>
    );
  };

  return (
    <div style={{
      width: 220, height: '100%', flexShrink: 0,
      background: euiTheme.colors.emptyShade,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header — white, no divider, no collapse button */}
      <div style={{
        height: 48, flexShrink: 0, display: 'flex', alignItems: 'center',
        padding: `0 16px`,
        background: euiTheme.colors.emptyShade,
      }}>
        <EuiText size="s"><strong>Launchpad</strong></EuiText>
      </div>

      {/* Scrollable nav items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `${euiTheme.size.s} ${euiTheme.size.s}` }}>
        {launchpadItems.map(item =>
          renderItem(item, item.id === 'ai_briefing' ? pendingCount : undefined)
        )}

        <div style={{ marginTop: 20, marginBottom: 6, paddingLeft: 8 }}>
          <EuiText size="xs" color="subdued" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Migrations
          </EuiText>
        </div>
        {migrationItems.map(item => renderItem(item))}
      </div>
    </div>
  );
};

// ─── Briefing sub-components ──────────────────────────────────────────────────

const SeverityBadge: React.FC<{ severity: Severity }> = ({ severity }) => (
  <EuiBadge style={{ background: SEV_BG[severity], color: SEV_COLOR[severity], fontWeight: 700 }}>
    {severity}
  </EuiBadge>
);

const ConfidenceBadge: React.FC<{ score: number }> = ({ score }) => (
  <EuiBadge color="hollow">
    {score}% confidence
  </EuiBadge>
);

const SKILL_LABEL: Record<Skill, string> = {
  'Alert Analysis': 'Alert',
  'Detection Rule Edit': 'Rule',
  'Attack Discovery': 'Attack',
  'Cases': 'Case',
};

const SkillTag: React.FC<{ skill: Skill }> = ({ skill }) => (
  <EuiBadge color="hollow" iconType={SKILL_ICON[skill]}>
    {SKILL_LABEL[skill]}
  </EuiBadge>
);

// Avatar colors cycle for multiple assignees
const AVATAR_COLORS = ['#006BB4', '#00756F', '#9170B8', '#CA8500', '#BD271E'];

const AssignedTag: React.FC<{ assignees?: string[] }> = ({ assignees }) => {
  const { euiTheme } = useEuiTheme();
  const [open, setOpen] = React.useState(false);
  const [assigned, setAssigned] = React.useState(assignees ?? []);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { setAssigned(assignees ?? []); }, [assignees]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const count = assigned.length;

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
      <span
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 500,
          border: `1px solid ${euiTheme.colors.lightShade}`,
          background: open ? euiTheme.colors.lightestShade : euiTheme.colors.body,
          color: euiTheme.colors.subduedText, cursor: 'pointer', userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <EuiIcon type="users" size="s" /> {count}
      </span>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          background: euiTheme.colors.emptyShade,
          border: `1px solid ${euiTheme.colors.lightShade}`,
          borderRadius: 8, padding: '10px 12px', minWidth: 180,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>
          {count > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: euiTheme.colors.subduedText, marginBottom: 8 }}>Assigned</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                {assigned.map((name, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#fff',
                    }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, fontFamily: euiTheme.font.family, color: euiTheme.colors.text }}>
                      {name}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ height: 1, background: euiTheme.colors.lightShade, margin: '0 -12px 10px' }} />
            </>
          )}
          {count === 0 && (
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: euiTheme.colors.subduedText, marginBottom: 10 }}>Not assigned</div>
          )}
          <button
            onClick={() => { setAssigned(['Andrea D.']); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '7px 8px', border: 'none', borderRadius: 6, cursor: 'pointer',
              background: 'transparent', fontFamily: euiTheme.font.family, textAlign: 'left',
              fontSize: 13, color: euiTheme.colors.primary, fontWeight: 500,
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = `${euiTheme.colors.primary}12`)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <EuiIcon type="user" size="s" color="primary" />
            Assign to me
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Action map helper — returns secondary actions per type/severity ──────────

const getSecondaryActions = (item: BriefingItem): { icon: string; label: string; danger?: boolean }[] => {
  const { skill, severity, approveLabel } = item;
  const exclude = (a: { label: string }) => a.label.toLowerCase() !== approveLabel.toLowerCase();

  let options: { icon: string; label: string; danger?: boolean }[] = [];

  if (skill === 'Attack Discovery') {
    options = [
      { icon: 'compute',       label: 'Isolate host' },
      { icon: 'globe',         label: 'Block IP / Domain' },
      { icon: 'key',           label: 'Reset credentials' },
      { icon: 'casesApp',      label: 'Open case' },
    ];
  } else if (skill === 'Alert Analysis') {
    if (severity === 'Critical') options = [
      { icon: 'compute',       label: 'Isolate host' },
      { icon: 'playFilled',    label: 'Kill process' },
      { icon: 'casesApp',      label: 'Add to case' },
      { icon: 'minusInCircle', label: 'Add exception → Close (FP)' },
    ]; else if (severity === 'High') options = [
      { icon: 'casesApp',      label: 'Add to case' },
      { icon: 'compute',       label: 'Isolate host' },
      { icon: 'minusInCircle', label: 'Add exception → Close (FP)' },
    ]; else if (severity === 'Medium') options = [
      { icon: 'casesApp',      label: 'Add to case' },
      { icon: 'minusInCircle', label: 'Add exception → Close (FP)' },
      { icon: 'check',         label: 'Acknowledge' },
    ]; else options = [
      { icon: 'minusInCircle', label: 'Add exception → Close (FP)' },
      { icon: 'check',         label: 'Acknowledge' },
      { icon: 'cross',         label: 'Close (FP)' },
    ];
  } else if (skill === 'Detection Rule Edit') {
    options = [
      { icon: 'playFilled',    label: 'Enable rule' },
      { icon: 'pencil',        label: 'Edit threshold' },
      { icon: 'minusInCircle', label: 'Add exception' },
    ];
  } else if (skill === 'Cases') {
    options = [
      { icon: 'user',          label: 'Assign to me' },
      { icon: 'refresh',       label: 'Update status' },
      { icon: 'editorComment', label: 'Add note' },
      { icon: 'cross',         label: 'Close case' },
    ];
  }

  return [
    ...options.filter(exclude),
    { icon: 'cross', label: 'Reject', danger: true },
  ];
};

// ─── Item Card ────────────────────────────────────────────────────────────────

const ItemCard: React.FC<{
  item: BriefingItem;
  onApprove: (item: BriefingItem) => void;
  onModify: (item: BriefingItem) => void;
  onReject: (item: BriefingItem) => void;
  onViewed: (id: string) => void;
  onSelect?: (id: string) => void;
}> = ({ item, onApprove, onModify, onReject, onViewed, onSelect }) => {
  const { euiTheme } = useEuiTheme();
  const [expanded, setExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  React.useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(`[data-more-actions="${item.id}"]`)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen, item.id]);

  const handleExpand = () => {
    if (item.isNew) onViewed(item.id);
    if (onSelect) { onSelect(item.id); return; }
    setExpanded(e => !e);
  };

  return (
    <div style={{
      border: `1px solid ${euiTheme.colors.lightShade}`,
      borderRadius: euiTheme.border.radius.medium,
      background: euiTheme.colors.emptyShade,
      marginBottom: 12,
    }}>
      {/* Card header — bullet · collapse · tags · [title + assigned flex:1] · [more actions · CTA] */}
      <div
        style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        onClick={handleExpand}
      >
        {/* New bullet — no placeholder, layout shifts naturally when gone */}
        {item.isNew && (
          <span title="New — not yet reviewed" style={{ width: 7, height: 7, borderRadius: '50%', background: '#006BB4', flexShrink: 0 }} />
        )}

        {/* Collapse toggle */}
        <span style={{
          flexShrink: 0, width: 18, height: 18, borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: euiTheme.colors.subduedText,
        }}>
          <EuiIcon type={expanded ? 'arrowDown' : 'arrowRight'} size="s" />
        </span>

        {/* Title · severity · assignees — take remaining space */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            flexShrink: 1, minWidth: 0, fontSize: 13, fontWeight: 600,
            fontFamily: euiTheme.font.family, color: euiTheme.colors.title,
            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          }}>
            {item.whatWeFound}
          </span>
          <SkillTag skill={item.skill} />
          <ConfidenceBadge score={item.confidence} />
          <AssignedTag assignees={item.assignees} />
        </div>

        {/* Action buttons — stopPropagation so they don't trigger card expand */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <EuiButton size="s" fill style={{ fontSize: 13 }} onClick={() => onApprove(item)}>{item.approveLabel}</EuiButton>
          {/* More actions — icon only */}
          <div style={{ position: 'relative' }} data-more-actions={item.id}>
            <button
              onClick={() => setMoreOpen(o => !o)}
              style={{
                padding: '0 6px', height: 28, borderRadius: 6,
                border: `1px solid ${euiTheme.colors.lightShade}`,
                background: 'transparent', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center',
              }}
            >
              <EuiIcon type="boxesHorizontal" size="s" />
            </button>
            {moreOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
                background: euiTheme.colors.emptyShade,
                border: `1px solid ${euiTheme.colors.lightShade}`,
                borderRadius: 8, overflow: 'hidden', minWidth: 180,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}>
                {getSecondaryActions(item).map(action => (
                  <button
                    key={action.label}
                    onClick={() => { action.danger ? onReject(item) : setMoreOpen(false); setMoreOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '8px 14px', border: 'none', background: 'transparent',
                      cursor: 'pointer', fontSize: 13, fontFamily: euiTheme.font.family,
                      color: action.danger ? '#BD271E' : euiTheme.colors.text, textAlign: 'left',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = action.danger ? '#FFF0EE' : euiTheme.colors.lightestShade)}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <EuiIcon type={action.icon} size="s" color={action.danger ? 'danger' : 'subdued'} /> {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded section — description + evidence */}
      {expanded && (
        <div style={{ padding: '12px 16px 14px', borderTop: `1px solid ${euiTheme.colors.lightestShade}` }}>
          {/* Action description — AI-generated highlighted box */}
          <div style={{
            marginBottom: 12,
            borderRadius: 8,
            background: `${euiTheme.colors.primary}0D`,
            border: `1px solid ${euiTheme.colors.primary}33`,
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <EuiIcon type="sparkles" size="m" color="primary" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12, fontFamily: euiTheme.font.family, color: euiTheme.colors.subduedText, lineHeight: 1.6 }}>
              <strong style={{ color: euiTheme.colors.text, fontWeight: 600 }}>{item.proposedAction}</strong>
              {' — '}{item.approvalText}
            </span>
          </div>
          {/* Evidence */}
          <EuiText size="xs" color="subdued" style={{ marginBottom: 6 }}>
            <strong style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evidence</strong>
          </EuiText>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {item.evidence.map((e, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 4, fontSize: 12,
                border: `1px solid ${euiTheme.colors.lightShade}`,
                background: euiTheme.colors.body, color: euiTheme.colors.primaryText, cursor: 'pointer',
              }}>
                <EuiIcon type={EVIDENCE_ICON[e.type] || 'document'} size="s" color="primary" />
                {e.label}
                <EuiIcon type="popout" size="s" color="subdued" />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Score circle (confidence gauge, Nightshift-style) ────────────────────────

const ScoreCircle: React.FC<{ score: number; color: string }> = ({ score, color }) => {
  const r = 22;
  const cx = 28;
  const cy = 28;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <svg width={56} height={56} viewBox="0 0 56 56">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E4E8EF" strokeWidth={5} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={5}
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          fontSize={13} fontWeight={700} fill={color} fontFamily="Inter, sans-serif">
          {score}
        </text>
      </svg>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6A7587', fontFamily: 'Inter, sans-serif' }}>Risk</span>
    </div>
  );
};

// ─── Featured item card (top priority, Nightshift-style) ──────────────────────

const AGENT_PANEL_WIDTH = 408;

const FeaturedItemCard: React.FC<{
  item: BriefingItem;
  onModify: (item: BriefingItem) => void;
  onReject: (item: BriefingItem) => void;
  onAskAgent?: (query: string) => void;
  readonly?: boolean;
  agentPanelOpen?: boolean;
  executingId?: string | null;
  onExecuteDirect?: (item: BriefingItem) => void;
  noBox?: boolean;
  hideHeader?: boolean;
  hideChips?: boolean;
  featuredFirst?: boolean;
  noQueueDivider?: boolean;
  maxRows?: number;
  showSeverity?: boolean;
  onEvidenceExecute?: (item: BriefingItem) => void;
}> = ({ item, onModify, onReject, onAskAgent, readonly, agentPanelOpen, executingId, onExecuteDirect, noBox, hideHeader, hideChips, featuredFirst, noQueueDivider, maxRows, showSeverity, onEvidenceExecute }) => {
  const { euiTheme } = useEuiTheme();
  // flyoutEvIdx: which evidence row's detail panel is open (null = closed)
  const [flyoutEvIdx, setFlyoutEvIdx] = React.useState<number | null>(null);
  const [moreOpenIdx, setMoreOpenIdx] = React.useState<number | null>(null);
  const [confirmingEvIdx, setConfirmingEvIdx] = React.useState<number | null>(null);
  const [removedEvIndices, setRemovedEvIndices] = React.useState<Set<number>>(new Set());

  const accentColor = SEV_COLOR[item.severity];
  const isExecuting = executingId === item.id;

  // Reset all local UI state whenever a new item is featured
  React.useEffect(() => {
    setConfirmingEvIdx(null);
    setFlyoutEvIdx(null);
    setMoreOpenIdx(null);
    setRemovedEvIndices(new Set());
  }, [item.id]);

  // Close inline confirmation panel when spinner starts
  React.useEffect(() => {
    if (isExecuting) setConfirmingEvIdx(null);
  }, [isExecuting]);

  // Close more-actions dropdown on outside click
  React.useEffect(() => {
    if (moreOpenIdx === null) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-more-ev]')) setMoreOpenIdx(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpenIdx]);

  // Close evidence detail flyout on outside click
  React.useEffect(() => {
    if (flyoutEvIdx === null) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-ev-flyout]') || t.closest('[data-persistent-panel]')) return;
      setFlyoutEvIdx(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [flyoutEvIdx]);

  const cardInnerContent = (children: React.ReactNode) => noBox ? (
    <div style={{ padding: '8px 14px 14px', position: 'relative' }}>
      {children}
    </div>
  ) : (
    <EuiPanel hasShadow={false} hasBorder paddingSize="l" style={{ position: 'relative' }}>
      {children}
    </EuiPanel>
  );

  const cardInner = cardInnerContent(
    <>
        {/* Header: score · [Critical] [Attack] tags + title + kill-chain chips */}
        {!hideHeader && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
          <ScoreCircle score={item.confidence} color={accentColor} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Meta line — severity tag + skill tag, same pattern as queue items */}
            <div style={{ fontSize: 11, fontWeight: 600, color: euiTheme.colors.subduedText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {readonly ? 'Handled autonomously' : 'Top priority'}
            </div>
            {/* Title with inline chip tags for named entities */}
            <div style={{ fontSize: 18, fontWeight: 700, color: euiTheme.colors.title, lineHeight: 1.4, marginBottom: 10, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {(!hideChips && item.titleChips) ? (() => {
                type Part = string | { chip: NonNullable<typeof item.titleChips>[0] };
                let parts: Part[] = [item.whatWeFound];
                for (const chip of item.titleChips) {
                  const next: Part[] = [];
                  for (const part of parts) {
                    if (typeof part === 'string') {
                      const idx = part.indexOf(chip.label);
                      if (idx !== -1) {
                        if (idx > 0) next.push(part.slice(0, idx));
                        next.push({ chip });
                        if (idx + chip.label.length < part.length) next.push(part.slice(idx + chip.label.length));
                      } else { next.push(part); }
                    } else { next.push(part); }
                  }
                  parts = next;
                }
                return parts.map((part, pi) => {
                  if (typeof part === 'string') return <React.Fragment key={pi}>{part}</React.Fragment>;
                  const { chip } = part as { chip: NonNullable<typeof item.titleChips>[0] };
                  return (
                    <span key={pi} style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '1px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500,
                      fontFamily: euiTheme.font.family,
                      background: euiTheme.colors.lightestShade,
                      color: euiTheme.colors.text,
                      border: `1px solid ${euiTheme.colors.lightShade}`,
                      verticalAlign: 'middle', lineHeight: 1.7,
                    }}>
                      {chip.label}
                    </span>
                  );
                });
              })() : item.whatWeFound}
            </div>
          </div>
        </div>}

        {/* Evidence rows — always visible */}
        <EuiPanel hasShadow={false} hasBorder paddingSize="none" style={{ borderRadius: 8, overflow: 'visible' }}>
          {((hideHeader || featuredFirst)
            ? [...item.evidence].sort((a, b) => (a.type === 'attack' ? -1 : b.type === 'attack' ? 1 : 0))
            : item.evidence
          ).slice(0, maxRows ?? undefined).map((e, displayIdx) => {
            const origIdx = item.evidence.indexOf(e);
            if (removedEvIndices.has(origIdx)) return null;
            // visibleDisplay: sorted/display order minus removed items
            const displayOrder = (hideHeader || featuredFirst)
              ? [...item.evidence].sort((a, b) => (a.type === 'attack' ? -1 : b.type === 'attack' ? 1 : 0))
              : item.evidence;
            const visibleDisplay = displayOrder
              .slice(0, maxRows ?? undefined)
              .filter(ev => !removedEvIndices.has(item.evidence.indexOf(ev)));
            const visibleIdx = visibleDisplay.indexOf(e);
            const isLast = visibleIdx === visibleDisplay.length - 1;
            const isExpanded = flyoutEvIdx === origIdx;
            const isMoreOpen = moreOpenIdx === origIdx;
            const isConfirming = confirmingEvIdx === origIdx;
            const actionLabel = e.actionLabel || item.approveLabel;
            return (
              <React.Fragment key={origIdx}>
                {/* "Next in queue" label — only when not suppressed by noQueueDivider */}
                {featuredFirst && !noQueueDivider && visibleIdx === 1 && (
                  <div style={{ padding: '6px 14px', fontSize: 10, fontWeight: 700, color: euiTheme.colors.subduedText, textTransform: 'uppercase', letterSpacing: '0.08em', background: euiTheme.colors.lightestShade, borderBottom: `1px solid ${euiTheme.colors.lightShade}` }}>
                    Next in queue
                  </div>
                )}
                <div style={{
                  borderBottom: isLast ? 'none' : `1px solid ${euiTheme.colors.lightShade}`,
                  ...(featuredFirst && visibleIdx === 0 && !noBox ? { borderLeft: `3px solid ${accentColor}` } : {}),
                }}>
                  {/* Row — featured gets left accent + tinted bg; normal is plain; noBox is clean white */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', minWidth: 0,
                    background: isConfirming ? `${euiTheme.colors.primary}08` : (featuredFirst && visibleIdx === 0 && !noBox ? `${accentColor}0D` : 'transparent'),
                    transition: 'background 0.15s',
                  }}>
                  {/* Expand icon — opens detail flyout */}
                  <button
                    data-ev-flyout
                    onClick={() => setFlyoutEvIdx(isExpanded ? null : origIdx)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center', flexShrink: 0, opacity: isExpanded ? 1 : 0.45, transition: 'opacity 0.15s' }}
                    onMouseEnter={ev => ((ev.currentTarget as HTMLElement).style.opacity = '1')}
                    onMouseLeave={ev => ((ev.currentTarget as HTMLElement).style.opacity = isExpanded ? '1' : '0.45')}
                  >
                    <IcExpand color={isExpanded ? '#1D2A3E' : '#69707D'} />
                  </button>

                  {/* Severity badge · Type tag · title · "Top priority" badge · assignees */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
                    {/* Severity badge — solid pill in noBox (Top Priority), light tint otherwise */}
                    {showSeverity && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: noBox ? '2px 10px' : '2px 8px',
                        borderRadius: noBox ? 20 : 4,
                        fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
                        background: noBox ? SEV_COLOR[item.severity] : SEV_BG[item.severity],
                        color: noBox ? '#fff' : SEV_COLOR[item.severity],
                      }}>
                        {item.severity}
                      </span>
                    )}
                    {/* Type tag */}
                    <EuiBadge color="hollow" iconType={EVIDENCE_ICON[e.type] || 'document'} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {EVIDENCE_TYPE_LABEL[e.type] || e.type}
                    </EuiBadge>
                    {/* Label — blue in noBox (Top Priority), default otherwise */}
                    <span style={{ fontSize: 13, fontWeight: featuredFirst && visibleIdx === 0 ? 600 : 500, color: noBox && featuredFirst && visibleIdx === 0 ? euiTheme.colors.primary : euiTheme.colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>
                      {e.label}
                    </span>
                    {e.assignees !== undefined && <AssignedTag assignees={e.assignees} />}
                    {e.similarCount !== undefined && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600, border: `1px solid ${euiTheme.colors.lightShade}`, background: euiTheme.colors.lightestShade, color: euiTheme.colors.subduedText, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        ×{e.similarCount} similar
                      </span>
                    )}
                  </div>

                  {/* Action button — disabled while confirm panel is open */}
                  {!readonly && actionLabel && (
                    <EuiButton
                      size="s"
                      color="primary"
                      isDisabled={isConfirming}
                      onClick={() => { if (!isConfirming) setConfirmingEvIdx(origIdx); }}
                      style={{ flexShrink: 0, fontSize: 12, height: 26, minHeight: 26 }}
                    >
                      {actionLabel}
                    </EuiButton>
                  )}

                  {/* More actions — hidden while a confirmation panel is open */}
                  {!readonly && actionLabel && !isConfirming && (
                    <div style={{ position: 'relative', flexShrink: 0 }} data-more-ev>
                      <button
                        onClick={() => setMoreOpenIdx(isMoreOpen ? null : origIdx)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          padding: '0 6px', height: 26, borderRadius: 6, cursor: 'pointer',
                          border: `1px solid ${euiTheme.colors.lightShade}`,
                          background: euiTheme.colors.emptyShade,
                        }}
                      >
                        <EuiIcon type="boxesHorizontal" size="s" color="subdued" />
                      </button>
                      {isMoreOpen && (
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 300,
                          background: euiTheme.colors.emptyShade,
                          border: `1px solid ${euiTheme.colors.lightShade}`,
                          borderRadius: 8, overflow: 'hidden', minWidth: 140,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        }}>
                          {[
                            { icon: 'pencil', label: 'Modify', color: euiTheme.colors.text, action: () => { onModify(item); setMoreOpenIdx(null); } },
                            { icon: 'cross', label: 'Reject', color: euiTheme.colors.danger, action: () => { onReject(item); setMoreOpenIdx(null); } },
                          ].map(opt => (
                            <button key={opt.label} onClick={opt.action} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, fontFamily: euiTheme.font.family, color: opt.color, textAlign: 'left' }}
                              onMouseEnter={ev => ((ev.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade)}
                              onMouseLeave={ev => ((ev.currentTarget as HTMLElement).style.background = 'transparent')}
                            >
                              <EuiIcon type={opt.icon} size="s" color={opt.label === 'Reject' ? 'danger' : 'subdued'} /> {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Inline collapse — confirmation panel, expands below the row */}
                {isConfirming && (
                  <div style={{
                    padding: '12px 14px 14px 38px',
                    borderTop: `1px solid ${euiTheme.colors.primary}33`,
                    background: `${euiTheme.colors.primary}06`,
                    animation: 'rowExpand 0.2s cubic-bezier(0.4,0,0.2,1) forwards',
                    overflow: 'hidden',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                      <EuiIcon type="sparkles" size="s" color="primary" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 12, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family, lineHeight: 1.55 }}>
                        <strong style={{ color: euiTheme.colors.text }}>{actionLabel}</strong>
                        {' — '}
                        {item.approvalText}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <EuiButtonEmpty size="s" onClick={() => setConfirmingEvIdx(null)}>Cancel</EuiButtonEmpty>
                      <EuiButton size="s" fill onClick={() => {
                        setConfirmingEvIdx(null);
                        setRemovedEvIndices(prev => new Set([...prev, origIdx]));
                        onEvidenceExecute?.(item);
                      }}>Confirm action</EuiButton>
                    </div>
                  </div>
                )}

                </div> {/* end borderBottom row wrapper */}
              </React.Fragment>
            );
          })}

        </EuiPanel>


        {/* Executing overlay */}
        {isExecuting && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: euiTheme.border.radius.medium,
            background: 'rgba(255,255,255,0.82)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
            zIndex: 10,
          }}>
            <div style={{
              border: '3px solid #E0E5EE', borderTop: '3px solid #1750BA',
              borderRadius: '50%', width: 24, height: 24,
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1750BA', fontFamily: 'Inter, sans-serif' }}>
              Executing — {item.approveLabel}...
            </span>
          </div>
        )}
      </>
  );

  return (
    <>
    {noBox ? cardInner : <div style={{ marginBottom: 24 }}>{cardInner}</div>}

    {/* Evidence detail flyout — right-side panel overlaying content */}
    {flyoutEvIdx !== null && (() => {
      const ev = item.evidence[flyoutEvIdx];
      if (!ev?.detail) return null;
      return (
        <>
          {/* Flyout panel — no backdrop, shadow only. Starts below 48px header. Shifts left when agent panel is open. */}
          <div
            data-ev-flyout
            style={{
              position: 'fixed', zIndex: 499,
              top: 48, right: agentPanelOpen ? AGENT_PANEL_WIDTH : 0, bottom: 0,
              width: 420,
              transition: 'right 0.25s cubic-bezier(0.4,0,0.2,1)',
              background: euiTheme.colors.emptyShade,
              borderLeft: `1px solid ${euiTheme.colors.lightShade}`,
              boxShadow: '-12px 0 40px rgba(0,0,0,0.18)',
              fontFamily: euiTheme.font.family,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* ── Top bar: type tag + title + close ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${euiTheme.colors.lightShade}`, flexShrink: 0, gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <EuiBadge color="hollow" iconType={EVIDENCE_ICON[ev.type] || 'document'} style={{ marginBottom: 8 }}>
                  {EVIDENCE_TYPE_LABEL[ev.type] || ev.type}
                </EuiBadge>
                <div style={{ fontSize: 16, fontWeight: 600, color: euiTheme.colors.title, lineHeight: 1.4 }}>
                  {ev.label}
                </div>
              </div>
              <button onClick={() => setFlyoutEvIdx(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center', flexShrink: 0, marginTop: 2 }}>
                <EuiIcon type="cross" size="m" color="subdued" />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* AI description box — top priority */}
              {item.approvalText && (
                <div style={{ margin: '16px 20px 0', padding: '12px 14px', borderRadius: 8, background: `${euiTheme.colors.primary}0D`, border: `1px solid ${euiTheme.colors.primary}33` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <EuiIcon type="sparkles" size="s" color="primary" />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: euiTheme.colors.primary }}>AI suggested action</span>
                  </div>
                  <span style={{ fontSize: 13, color: euiTheme.colors.text, lineHeight: 1.6 }}>
                    <strong>{ev.actionLabel || item.approveLabel}</strong>{' — '}{item.approvalText}
                  </span>
                </div>
              )}

              {/* Details section */}
              <div style={{ padding: '16px 20px 0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: euiTheme.colors.subduedText, marginBottom: 10 }}>
                  Details
                </div>
                <EuiPanel hasShadow={false} hasBorder paddingSize="none" style={{ borderRadius: 8, overflow: 'hidden' }}>
                  {ev.detail.split('\n').map((line, li) => {
                    const colonIdx = line.indexOf(':');
                    const lines = ev.detail!.split('\n');
                    if (colonIdx > 0 && colonIdx < 28) {
                      const key = line.slice(0, colonIdx);
                      const val = line.slice(colonIdx + 1).trim();
                      return (
                        <div key={li} style={{ display: 'flex', borderBottom: li < lines.length - 1 ? `1px solid ${euiTheme.colors.lightShade}` : 'none', background: li % 2 === 0 ? euiTheme.colors.emptyShade : euiTheme.colors.lightestShade }}>
                          <span style={{ fontWeight: 600, fontSize: 12, color: euiTheme.colors.subduedText, padding: '9px 14px', minWidth: 120, flexShrink: 0, borderRight: `1px solid ${euiTheme.colors.lightShade}` }}>{key}</span>
                          <span style={{ fontSize: 12, color: euiTheme.colors.text, padding: '9px 14px', lineHeight: 1.5 }}>{val}</span>
                        </div>
                      );
                    }
                    return <div key={li} style={{ fontSize: 12, color: euiTheme.colors.subduedText, padding: '9px 14px' }}>{line}</div>;
                  })}
                </EuiPanel>
              </div>

              {/* Evidence section — all evidence items for this item */}
              <div style={{ padding: '16px 20px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: euiTheme.colors.subduedText, marginBottom: 10 }}>
                  Evidence
                </div>
                <EuiPanel hasShadow={false} hasBorder paddingSize="none" style={{ borderRadius: 8, overflow: 'hidden' }}>
                  {item.evidence.map((e, ei) => (
                    <div key={ei} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: ei < item.evidence.length - 1 ? `1px solid ${euiTheme.colors.lightShade}` : 'none', background: ei === flyoutEvIdx ? `${euiTheme.colors.primary}08` : euiTheme.colors.emptyShade }}>
                      <EuiBadge color="hollow" iconType={EVIDENCE_ICON[e.type] || 'document'} style={{ flexShrink: 0, fontSize: 10 }}>
                        {EVIDENCE_TYPE_LABEL[e.type] || e.type}
                      </EuiBadge>
                      <span style={{ fontSize: 12, color: ei === flyoutEvIdx ? euiTheme.colors.primary : euiTheme.colors.text, fontWeight: ei === flyoutEvIdx ? 600 : 400, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.label}
                      </span>
                      {e.confidence !== undefined && (
                        <span style={{ fontSize: 11, color: euiTheme.colors.subduedText, flexShrink: 0 }}>{e.confidence}%</span>
                      )}
                    </div>
                  ))}
                </EuiPanel>
              </div>

            </div>{/* /scrollable body */}

            {/* ── Footer — action buttons ── */}
            {!readonly && ev.actionLabel && (
              <div style={{ padding: '12px 20px', borderTop: `1px solid ${euiTheme.colors.lightShade}`, flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: 8, background: euiTheme.colors.lightestShade }}>
                <EuiButtonEmpty size="s" onClick={() => setFlyoutEvIdx(null)}>Cancel</EuiButtonEmpty>
                <EuiButton size="s" fill onClick={() => { setFlyoutEvIdx(null); onExecuteDirect?.(item); }}>
                  {ev.actionLabel}
                </EuiButton>
              </div>
            )}
          </div>
        </>
      );
    })()}
    </>
  );
};

// ─── History row — same visual pattern as CompactRow ─────────────────────────

const HISTORY_SKILL_ICON: Record<string, string> = {
  'Attack Discovery': 'securitySignal', 'Alert Analysis': 'warning',
  'Detection Rule Edit': 'indexEdit', 'Cases': 'casesApp',
};

const HistoryRow: React.FC<{ item: BriefingItem; showExpandedDetail?: boolean }> = ({ item, showExpandedDetail }) => {
  const { euiTheme } = useEuiTheme();
  const [expanded, setExpanded] = useState(false);
  const handleToggle = () => { if (showExpandedDetail) setExpanded(e => !e); };

  return (
    <div style={{ borderBottom: `1px solid ${euiTheme.colors.lightShade}` }}>
      {/* Collapsed row — mirrors CompactRow */}
      <div
        onClick={handleToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', cursor: showExpandedDetail ? 'pointer' : 'default' }}
        onMouseEnter={e => { if (showExpandedDetail) (e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <EuiIcon type={HISTORY_SKILL_ICON[item.skill] || 'sparkles'} size="s" color="subdued" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, color: euiTheme.colors.text, lineHeight: 1.4 }}>
          {item.whatWeFound}
        </span>
        <span style={{ fontSize: 11, color: euiTheme.colors.subduedText, flexShrink: 0, marginRight: 4 }}>
          {item.resolvedAt}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 600, color: '#006BB4', flexShrink: 0,
          padding: '2px 8px', borderRadius: 4,
          background: '#006BB414', border: '1px solid #006BB430',
        }}>
          <EuiIcon type="sparkles" size="s" color="#006BB4" />
          Auto
        </span>
        {showExpandedDetail && (
          <EuiIcon type={expanded ? 'arrowUp' : 'arrowDown'} size="s" color="subdued" style={{ flexShrink: 0 }} />
        )}
      </div>
      {/* Expanded detail */}
      {showExpandedDetail && expanded && (
        <div style={{ padding: '0 14px 14px 30px', borderTop: `1px solid ${euiTheme.colors.lightShade}` }}>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: euiTheme.colors.text, margin: '12px 0 10px' }}>
            {item.whyItMattersNow}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {item.evidence.map((e, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 4, fontSize: 12,
                border: `1px solid ${euiTheme.colors.lightShade}`,
                background: euiTheme.colors.body, color: euiTheme.colors.primaryText,
              }}>
                <EuiIcon type={EVIDENCE_ICON[e.type] || 'document'} size="s" color="subdued" />
                {e.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Modals ───────────────────────────────────────────────────────────────────

const ApproveModal: React.FC<{ item: BriefingItem; onConfirm: () => void; onCancel: () => void }> = ({ item, onConfirm, onCancel }) => {
  const { euiTheme } = useEuiTheme();
  // Split approvalText into bullet points by ". " — filter out empty entries
  const bulletPoints = item.approvalText
    .split(/\.\s+/)
    .map(s => s.trim().replace(/\.$/, ''))
    .filter(s => s.length > 0)
    .slice(0, 2);

  return (
    <EuiModal onClose={onCancel} style={{ maxWidth: 520 }}>
      <EuiModalHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${euiTheme.colors.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <EuiIcon type="checkInCircleFilled" color="primary" size="m" />
          </div>
          <EuiModalHeaderTitle>Confirm action</EuiModalHeaderTitle>
        </div>
      </EuiModalHeader>
      <EuiModalBody>
        {/* Item title */}
        <p style={{ fontSize: 13, fontWeight: 500, fontFamily: euiTheme.font.family, color: euiTheme.colors.text, margin: '0 0 14px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.whatWeFound}
        </p>

        {/* Proposed action highlight */}
        <div style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${euiTheme.colors.primary}44`, background: `${euiTheme.colors.primary}09`, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, #1750BA 0%, #6B3C9F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <EuiIcon type="sparkles" size="s" style={{ color: '#fff' }} />
          </div>
          <strong style={{ fontSize: 14, fontFamily: euiTheme.font.family, color: euiTheme.colors.text }}>{item.proposedAction}</strong>
        </div>

        {/* What will happen */}
        <div style={{ marginBottom: 4 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: euiTheme.colors.subduedText, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: euiTheme.font.family, margin: '0 0 8px' }}>
            What will happen
          </p>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontFamily: euiTheme.font.family }}>
            {bulletPoints.map((point, i) => (
              <li key={i} style={{ fontSize: 13, color: euiTheme.colors.text, lineHeight: 1.6, marginBottom: 2 }}>{point}</li>
            ))}
            <li style={{ fontSize: 13, color: euiTheme.colors.text, lineHeight: 1.6, marginBottom: 2 }}>The item will exit your queue</li>
            <li style={{ fontSize: 13, color: euiTheme.colors.subduedText, lineHeight: 1.6 }}>This action cannot be undone</li>
          </ul>
        </div>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>Cancel</EuiButtonEmpty>
        <EuiButton fill iconType="arrowRight" iconSide="right" onClick={onConfirm}>Confirm &amp; Execute</EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

const RejectModal: React.FC<{ onConfirm: (reason: string) => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  return (
    <EuiModal onClose={onCancel} style={{ maxWidth: 480 }}>
      <EuiModalHeader><EuiModalHeaderTitle>Reject recommendation</EuiModalHeaderTitle></EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued" style={{ marginBottom: 10 }}><p>Optionally tell us why — this helps improve future recommendations.</p></EuiText>
        <EuiTextArea fullWidth placeholder="e.g. False positive, already handled, low priority..." value={reason} onChange={e => setReason(e.target.value)} rows={3} />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>Cancel</EuiButtonEmpty>
        <EuiButton fill color="danger" onClick={() => onConfirm(reason)}>Reject</EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

const ModifyModal: React.FC<{ item: BriefingItem; onConfirm: (action: string) => void; onCancel: () => void }> = ({ item, onConfirm, onCancel }) => {
  const [action, setAction] = useState(item.proposedAction);
  return (
    <EuiModal onClose={onCancel} style={{ maxWidth: 520 }}>
      <EuiModalHeader><EuiModalHeaderTitle>Modify & Approve</EuiModalHeaderTitle></EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued" style={{ marginBottom: 10 }}><p>Edit the proposed action before approving.</p></EuiText>
        <EuiFieldText fullWidth value={action} onChange={e => setAction(e.target.value)} />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>Cancel</EuiButtonEmpty>
        <EuiButton fill onClick={() => onConfirm(action)} isDisabled={!action.trim()}>Approve Modified Action</EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

// ─── Detail Flyout ────────────────────────────────────────────────────────────

const SKILL_DESTINATION: Record<Skill, string> = {
  'Attack Discovery': 'Security',
  'Alert Analysis': 'Alerts',
  'Cases': 'Cases',
  'Detection Rule Edit': 'Rules',
};

const DetailFlyout: React.FC<{
  item: BriefingItem;
  onClose: () => void;
  onApprove: (item: BriefingItem) => void;
}> = ({ item, onClose, onApprove }) => {
  const { euiTheme } = useEuiTheme();
  const destination = SKILL_DESTINATION[item.skill];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.18)',
        }}
      />
      {/* Panel */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 480, zIndex: 401,
        background: euiTheme.colors.emptyShade,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.14)',
        display: 'flex', flexDirection: 'column',
        fontFamily: euiTheme.font.family,
      }}>
        {/* Header */}
        <div style={{
          flexShrink: 0, padding: '14px 16px',
          borderBottom: `1px solid ${euiTheme.colors.lightShade}`,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <SkillTag skill={item.skill} />
              <ConfidenceBadge score={item.confidence} />
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: SEV_BG[item.severity], color: SEV_COLOR[item.severity] }}>
                {item.severity}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: euiTheme.colors.title, lineHeight: 1.4 }}>
              {item.whatWeFound}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <EuiIcon type="cross" size="m" color="subdued" />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

          {/* Why it matters */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: euiTheme.colors.subduedText, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
              Why it matters now
            </p>
            <EuiText size="s" style={{ lineHeight: 1.65, color: euiTheme.colors.text }}>{item.whyItMattersNow || item.whatWePropose}</EuiText>
          </div>

          {/* Proposed action */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: euiTheme.colors.subduedText, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
              Proposed action
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: `${euiTheme.colors.primary}09`, border: `1px solid ${euiTheme.colors.primary}33` }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, #1750BA 0%, #6B3C9F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <EuiIcon type="sparkles" size="s" style={{ color: '#fff' }} />
              </div>
              <strong style={{ fontSize: 14, color: euiTheme.colors.text }}>{item.proposedAction}</strong>
            </div>
          </div>

          {/* Evidence */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: euiTheme.colors.subduedText, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
              Evidence ({item.evidence.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {item.evidence.map((ev, i) => (
                <div key={i} style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${euiTheme.colors.lightShade}`, background: euiTheme.colors.body }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <EuiIcon type={EVIDENCE_ICON[ev.type] || 'document'} size="s" color="subdued" />
                    <span style={{ fontSize: 12, fontWeight: 500, color: euiTheme.colors.text }}>{ev.label}</span>
                  </div>
                  {ev.detail && (
                    <p style={{ margin: '4px 0 0 22px', fontSize: 11, color: euiTheme.colors.subduedText, lineHeight: 1.55, whiteSpace: 'pre-line' }}>{ev.detail}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* What will happen if approved */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: euiTheme.colors.subduedText, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
              What will happen if approved
            </p>
            <EuiText size="s" style={{ lineHeight: 1.65, color: euiTheme.colors.text }}>{item.approvalText}</EuiText>
          </div>

        </div>

        {/* Sticky footer */}
        <div style={{
          flexShrink: 0, padding: '12px 16px',
          borderTop: `1px solid ${euiTheme.colors.lightShade}`,
          display: 'flex', alignItems: 'center', gap: 10,
          background: euiTheme.colors.emptyShade,
        }}>
          <EuiButtonEmpty iconType="popout" iconSide="right" size="s" href="#" target="_blank">
            Review in {destination}
          </EuiButtonEmpty>
          <div style={{ flex: 1 }} />
          <EuiButton fill size="s" onClick={() => { onApprove(item); onClose(); }}>
            Approve &amp; Execute
          </EuiButton>
        </div>
      </div>
    </>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <EuiIcon type="checkInCircleFilled" size="xxl" color="success" style={{ marginBottom: 16 }} />
      <EuiTitle size="s"><h3>You're all caught up</h3></EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">No items need your attention right now.</EuiText>
    </div>
  );
};

// ─── Agent Side Panel ─────────────────────────────────────────────────────────

// ── Query-aware canned responses ─────────────────────────────────────────────

const CANNED_RESPONSES: Record<string, { text: string; followUps: string[] }> = {
  default: {
    text: `Here's your shift summary for **05:00–13:00 UTC**:

**1 active attack** on SRVWIN03 — kill-chain confirmed across 3 stages. This is your top priority right now. The attacker used a Tor exit node for initial access, moved laterally via Pass-the-Hash, and reached SRVWIN07 at 03:21 UTC.

**2 high alerts** pending — Cobalt Strike beacon on SRVWIN07 beaconing every 60 seconds, and a C2 outbound to the same Tor IP cluster.

**2 medium items** — the SAP exploitation case is unassigned and a detection rule for CVE-2025-31324 is drafted but not enabled.

**5 items handled autonomously** by the platform overnight — all below the 70% confidence threshold. Logged in History.

Where do you want to start?`,
    followUps: ['Walk me through the attack on SRVWIN03', 'What did the platform handle overnight?', 'Should I approve the isolation now?'],
  },
  brief: {
    text: `Good morning. Here's what happened while you were away:

**Active threat (still unresolved):** A kill-chain was correlated on SRVWIN03 starting at 03:14 UTC — Initial Access via Tor, credential theft via Pass-the-Hash, then lateral movement to SRVWIN07. The attacker has an active Cobalt Strike C2 beacon on SRVWIN07 as of 04:02 UTC.

**What needs your decision:**
- **Isolate SRVWIN03** — cuts lateral movement, pages Tier 2 automatically
- **Isolate SRVWIN07** — severs the active C2 channel (2.4 MB already exfiltrated)
- **Assign CASE-2025-0087** — unassigned, forensic dump uploaded 47 min ago, unreviewed
- **Enable CVE-2025-31324 rule** — 0 false positives in 30-day backtest

**Platform handled overnight:** 5 items autonomously — suppressed 23 scanner alerts, enriched the SAP case with IOCs, reset svc-backup credentials, tuned the Office macro rule.

Ready to walk you through any of these?`,
    followUps: ['Start with SRVWIN03', 'Tell me about the C2 on SRVWIN07', 'What\'s the risk of the CVE rule?'],
  },
  item1: {
    text: `Let me walk you through **Item #1 — the active attack on SRVWIN03**.

**What we found:**
An admin account \`svc-admin@corp\` was accessed from a Tor exit node (185.220.101.47) at 03:14 UTC — classic Initial Access via Valid Accounts (T1078). Twelve minutes later, the same credentials were reused from a US East IP, indicating Pass-the-Hash (T1550.002). By 03:21 UTC, the attacker had moved laterally to SRVWIN07 via SMB admin shares (T1021.002).

**Why it matters:**
SRVWIN03 runs Active Directory and an SAP connector. SRVWIN07 is a file server with internal shares. Both are Extreme/High impact assets. The C2 beacon is still active — every 60 seconds.

**What I'm proposing:**
Approve **Isolate SRVWIN03** — this disconnects the host from the network, stops lateral movement, and pages the on-call Tier 2 team. Forensics remain accessible via out-of-band management.

Do you want to approve it now, or do you need more context first?`,
    followUps: ['Approve isolation now', 'What happens after isolation?', 'Show me the evidence in detail'],
  },
  prioritize: {
    text: `Based on your queue, here's the priority order I'd recommend:

**1. Approve: Isolate SRVWIN03** — Active attack, still spreading. Every minute counts. This is the only action that stops the kill-chain right now.

**2. Approve: Isolate SRVWIN07** — The C2 beacon is live and already exfiltrated 2.4 MB. Severing it prevents further data loss.

**3. Enable: CVE-2025-31324 rule** — Zero FP in backtest. Takes 10 seconds and closes the detection gap that let the SAP exploit through.

**4. Assign: CASE-2025-0087** — The forensic dump is unreviewed. No analyst has touched it this shift. Assign to yourself in one click.

**5. Close: 80 PSScheduler FP alerts** — Low effort, high noise reduction. Do this last.

Items 1 and 2 are time-sensitive. Want me to walk you through the first one?`,
    followUps: ['Yes, walk me through #1', 'What\'s the risk if I skip isolation?', 'Can I approve both isolations at once?'],
  },
};

const getAgentResponse = (query: string) => {
  const q = query.toLowerCase();
  if (q.includes('brief me') || q === '') return CANNED_RESPONSES.brief;
  if (q.includes('item #1') || q.includes('walk me through item')) return CANNED_RESPONSES.item1;
  if (q.includes('prioritize') || q.includes('priority')) return CANNED_RESPONSES.prioritize;
  return CANNED_RESPONSES.default;
};

const AgentSidePanel: React.FC<{ query: string; onClose: () => void }> = ({ query, onClose }) => {
  const { euiTheme } = useEuiTheme();
  const [mode, setMode] = useState<'brief' | 'chat'>(query ? 'chat' : 'brief');
  const [activeQuery, setActiveQuery] = useState(query);
  const [typed, setTyped] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; text: string; followUps?: string[] }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  // Action card state
  const [actionExecuted, setActionExecuted] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDone, setActionDone] = useState(false);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC';

  // When external query prop changes, switch to chat
  React.useEffect(() => {
    if (!query) return;
    setActiveQuery(query);
    setMode('chat');
  }, [query]);

  // Simulate agent response when entering chat mode
  React.useEffect(() => {
    if (mode !== 'chat' || !activeQuery) return;
    setMessages([{ role: 'user', text: activeQuery }]);
    setIsTyping(true);
    setTyped('');
    const response = getAgentResponse(activeQuery);
    const timer = setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'agent', text: response.text, followUps: response.followUps }]);
    }, 1200);
    return () => clearTimeout(timer);
  }, [activeQuery, mode]);

  // Scroll to bottom on new content
  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [typed, messages]);

  // Seamless branch: clicking [chat] on a brief item feels continuous
  const handleBriefChat = (itemQuery: string) => {
    setActiveQuery(itemQuery);
    setMode('chat');
  };

  const handleSend = (text?: string) => {
    const msg = text ?? followUp;
    if (!msg.trim()) return;
    if (msg.toLowerCase().includes('brief me') || msg.toLowerCase().includes('/brief')) {
      setMode('brief');
      setMessages([]);
      setFollowUp('');
      return;
    }
    const response = getAgentResponse(msg);
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setFollowUp('');
    setIsTyping(true);
    setTyped('');
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'agent', text: response.text, followUps: response.followUps }]);
    }, 1200);
  };

  const renderAgentText = (text: string) =>
    text.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return <p key={i} style={{ margin: '2px 0', lineHeight: 1.6 }}>{parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}</p>;
    });

  // Dashed pivot button — the core Agent Brief affordance
  const PivotBtn: React.FC<{ label: string; primary?: boolean; onClick: () => void }> = ({ label, primary, onClick }) => (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 500,
      fontFamily: euiTheme.font.family, cursor: 'pointer', lineHeight: 1.4,
      border: `1px dashed ${primary ? euiTheme.colors.primary : euiTheme.colors.subduedText}`,
      color: primary ? euiTheme.colors.primary : euiTheme.colors.subduedText,
      background: 'transparent', transition: 'all 0.12s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = primary ? `${euiTheme.colors.primary}12` : euiTheme.colors.lightestShade; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {label}
    </button>
  );

  // ── Shared header ──────────────────────────────────────────────────────────
  const Header = (
    <div style={{
      padding: '0 8px 0 4px', height: 48, flexShrink: 0,
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      display: 'flex', alignItems: 'center', gap: 4,
      background: euiTheme.colors.emptyShade,
    }}>
      <button style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, flexShrink: 0 }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade)}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
        <EuiIcon type="menu" size="m" color="subdued" />
      </button>
      <div style={{ flex: 1, marginLeft: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 600, fontFamily: euiTheme.font.family, lineHeight: 1.2, color: euiTheme.colors.title }}>
          {mode === 'brief' ? 'Agent Brief' : 'Conversation'}
        </div>
        <div style={{ fontSize: 11, fontFamily: euiTheme.font.family, color: euiTheme.colors.subduedText, lineHeight: 1.2 }}>
          Elastic Security · Default · {now}
        </div>
      </div>
      {mode === 'chat' && (
        <button onClick={() => { setMode('brief'); setMessages([]); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontFamily: euiTheme.font.family, color: euiTheme.colors.subduedText, display: 'flex', alignItems: 'center', gap: 3 }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade)}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          title="Return to brief">
          <EuiIcon type="sparkles" size="s" /> Brief
        </button>
      )}
      <button style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, flexShrink: 0 }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade)}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
        <EuiIcon type="boxesVertical" size="m" color="subdued" />
      </button>
      <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, flexShrink: 0 }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade)}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
        <EuiIcon type="cross" size="m" color="subdued" />
      </button>
    </div>
  );

  // ── Footer input — shared by both modes ────────────────────────────────────
  const Footer = (
    <div style={{ borderTop: `1px solid ${euiTheme.colors.lightShade}`, padding: '12px 16px 14px', flexShrink: 0 }}>
      <div style={{ border: `1px solid ${euiTheme.colors.lightShade}`, borderRadius: 8, background: euiTheme.colors.body, padding: '10px 12px 8px' }}>
        <textarea
          placeholder="Ask, or pick something above"
          value={followUp}
          rows={2}
          onChange={e => setFollowUp(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', background: 'transparent', fontSize: 14, fontFamily: euiTheme.font.family, color: euiTheme.colors.text, lineHeight: 1.5 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IcAnthropic size={14} />
            <span style={{ fontSize: 11, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family }}>Claude Opus 4.6</span>
          </div>
          <button onClick={() => handleSend()} disabled={!followUp.trim()} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: followUp.trim() ? euiTheme.colors.primary : euiTheme.colors.lightShade, cursor: followUp.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
            <EuiIcon type="arrowUp" size="s" style={{ color: followUp.trim() ? '#fff' : euiTheme.colors.subduedText }} />
          </button>
        </div>
      </div>
    </div>
  );

  // ── Agent Brief view ───────────────────────────────────────────────────────
  const pendingItems = INITIAL_ITEMS.filter(i => i.status === 'pending');
  const criticalItems = pendingItems.filter(i => i.severity === 'Critical');
  const highItems = pendingItems.filter(i => i.severity === 'High');
  const mediumItems = pendingItems.filter(i => i.severity === 'Medium');
  const lowItems = pendingItems.filter(i => i.severity === 'Low');

  const BriefView = (
    <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 0 0' }}>

      {/* Shift summary banner */}
      <div style={{ margin: '10px 12px 0', padding: '10px 14px', borderRadius: 8, background: `${euiTheme.colors.primary}0D`, border: `1px solid ${euiTheme.colors.primary}33` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, background: 'linear-gradient(135deg, #1750BA 0%, #6B3C9F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <EuiIcon type="sparkles" size="s" style={{ color: '#fff' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: euiTheme.colors.primary, fontFamily: euiTheme.font.family, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent Brief · Shift 05:00–13:00 UTC</span>
        </div>
        <p style={{ fontSize: 12.5, color: euiTheme.colors.text, fontFamily: euiTheme.font.family, margin: 0, lineHeight: 1.55 }}>
          <strong>1 active attack</strong> is still in progress. You have <strong>{pendingItems.length} items</strong> requiring a decision and <strong>{AUTONOMOUS_ITEMS.length} handled autonomously</strong> overnight.
        </p>
        <button onClick={() => handleBriefChat('Brief me on this shift')} style={{
          marginTop: 8, padding: '4px 12px', borderRadius: 14, fontSize: 12,
          border: `1px solid ${euiTheme.colors.primary}`, background: 'transparent',
          color: euiTheme.colors.primary, cursor: 'pointer', fontFamily: euiTheme.font.family,
          fontWeight: 600,
        }}>
          Brief me
        </button>
      </div>

      {/* Brief title line */}
      <div style={{ padding: '12px 16px 8px', marginTop: 10, borderTop: `1px solid ${euiTheme.colors.lightestShade}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <EuiIcon type="sparkles" size="s" color="primary" />
          <span style={{ fontSize: 12, fontWeight: 600, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            /agent_brief
          </span>
        </div>
        <p style={{ fontSize: 12, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family, margin: '4px 0 0', lineHeight: 1.4 }}>
          Authored by agents · open and active events only
        </p>
      </div>

      {/* ── Section 1: What needs attention now ── */}
      <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${euiTheme.colors.lightestShade}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: euiTheme.colors.title, fontFamily: euiTheme.font.family, marginBottom: 2 }}>What needs attention now</div>
        <div style={{ fontSize: 11, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family, marginBottom: 10, fontStyle: 'italic' }}>open · active · imminent only</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pendingItems.slice(0, 4).map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              {/* Severity dot */}
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: SEV_COLOR[item.severity], flexShrink: 0, marginTop: 5 }} />
              {/* Label */}
              <span style={{ flex: 1, fontSize: 12.5, color: euiTheme.colors.text, fontFamily: euiTheme.font.family, lineHeight: 1.45 }}>
                {item.whatWeFound.length > 60 ? item.whatWeFound.slice(0, 58) + '…' : item.whatWeFound}
              </span>
              {/* Pivot buttons */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginTop: 1 }}>
                <PivotBtn label="view" onClick={() => {}} />
                <PivotBtn label="chat" primary onClick={() => handleBriefChat(`Tell me about: ${item.whatWeFound}`)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Grouped objects ── */}
      <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${euiTheme.colors.lightestShade}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: euiTheme.colors.title, fontFamily: euiTheme.font.family, marginBottom: 2 }}>Grouped objects</div>
        <div style={{ fontSize: 11, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family, marginBottom: 10, fontStyle: 'italic' }}>alerts · attacks · rules · cases</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Active attacks', count: criticalItems.length + highItems.filter(i => i.skill === 'Attack Discovery').length, color: SEV_COLOR.Critical, query: 'Summarize all active attacks in my environment' },
            { label: 'High alerts', count: highItems.filter(i => i.skill === 'Alert Analysis').length, color: SEV_COLOR.High, query: 'Walk me through the high severity alerts' },
            { label: 'AI handled', count: AUTONOMOUS_ITEMS.length, color: '#006BB4', query: 'What did the AI handle autonomously?' },
          ].map(group => (
            <div key={group.label} style={{ border: `1px solid ${euiTheme.colors.lightShade}`, borderRadius: 6, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, display: 'inline-block' }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: euiTheme.colors.title, fontFamily: euiTheme.font.family, lineHeight: 1 }}>{group.count}</div>
              <div style={{ fontSize: 11, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family, lineHeight: 1.3 }}>{group.label}</div>
              <PivotBtn label="view more" onClick={() => handleBriefChat(group.query)} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 3: Suggested next actions ── */}
      <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${euiTheme.colors.lightestShade}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: euiTheme.colors.title, fontFamily: euiTheme.font.family, marginBottom: 10 }}>Suggested next actions</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            { label: 'Isolate SRVWIN03', query: 'Help me isolate SRVWIN03 and explain what that means for the active attack' },
            { label: 'Block C2 IP', query: 'Walk me through blocking the C2 IP on SRVDB01' },
            { label: 'Enable SAP rule', query: 'What does enabling the SAP NetWeaver rule do and what are the risks?' },
            { label: 'Assign case', query: 'Help me take ownership of the open forensics case' },
            { label: 'Explain kill-chain', query: 'Explain the full kill-chain on SRVWIN03 in plain language' },
          ].map(action => (
            <button key={action.label} onClick={() => handleBriefChat(action.query)} style={{
              padding: '5px 12px', borderRadius: 4, fontSize: 12, fontFamily: euiTheme.font.family,
              border: `1px dashed ${euiTheme.colors.primary}`,
              color: euiTheme.colors.primary, background: 'transparent', cursor: 'pointer',
              transition: 'background 0.12s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${euiTheme.colors.primary}10`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Callable footer ── */}
      <div style={{ padding: '10px 16px 16px' }}>
        <p style={{ fontSize: 11, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family, fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
          Callable: say <strong style={{ fontStyle: 'normal' }}>"brief me"</strong> inside any chat to render it again.
        </p>
      </div>
    </div>
  );

  // Detect if latest agent message warrants an action card
  const lastAgentMsg = [...messages].reverse().find(m => m.role === 'agent');
  const actionKeywords = ['isolate', 'execute', 'block', 'suppress', 'close', 'reset', 'kill session', 'assign'];
  const lastMsgHasAction = lastAgentMsg
    ? actionKeywords.some(kw => lastAgentMsg.text.toLowerCase().includes(kw))
    : false;
  // Derive action label from the last agent message
  const getActionLabelFromMsg = (text: string): string => {
    if (text.toLowerCase().includes('isolate srvwin03')) return 'Isolate SRVWIN03';
    if (text.toLowerCase().includes('isolate srvwin07')) return 'Isolate SRVWIN07';
    if (text.toLowerCase().includes('block')) return 'Block C2 IP';
    if (text.toLowerCase().includes('close all') || text.toLowerCase().includes('close')) return 'Close all (FP)';
    if (text.toLowerCase().includes('kill session') || text.toLowerCase().includes('kill-session')) return 'Kill session';
    if (text.toLowerCase().includes('assign')) return 'Assign to me';
    return 'Execute action';
  };
  const actionLabel = lastAgentMsg ? getActionLabelFromMsg(lastAgentMsg.text) : 'Execute action';
  const showActionCard = !isTyping && lastMsgHasAction && !actionExecuted && messages.length > 0;

  const handleActionExecute = () => {
    setActionLoading(true);
    setTimeout(() => {
      setActionLoading(false);
      setActionDone(true);
      setActionExecuted(true);
      setMessages(prev => [...prev, {
        role: 'agent',
        text: `Done. I've executed **${actionLabel}**. The item has been removed from your queue.`,
        followUps: ['What should I do next?', 'Show me the queue'],
      }]);
    }, 1500);
  };

  // ── Chat view ──────────────────────────────────────────────────────────────
  const ChatView = (
    <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
      {messages.map((msg, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'user' ? (
              <div style={{ maxWidth: '82%', padding: '9px 13px', borderRadius: '16px 16px 4px 16px', background: euiTheme.colors.primary, color: '#fff', fontSize: 13, fontFamily: euiTheme.font.family, lineHeight: 1.5 }}>
                {msg.text}
              </div>
            ) : (
              <div style={{ width: '100%', fontSize: 13, fontFamily: euiTheme.font.family, color: euiTheme.colors.text }}>
                {/* Agent avatar + label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, #1750BA 0%, #6B3C9F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <EuiIcon type="sparkles" size="s" style={{ color: '#fff' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: euiTheme.colors.subduedText, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Elastic Agent</span>
                </div>
                {renderAgentText(msg.text)}
                {/* Follow-up suggestion chips */}
                {msg.followUps && msg.followUps.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                    {msg.followUps.map(fu => (
                      <button key={fu} onClick={() => handleSend(fu)} style={{
                        padding: '4px 11px', borderRadius: 14, fontSize: 12,
                        border: `1px solid ${euiTheme.colors.lightShade}`,
                        background: euiTheme.colors.body, color: euiTheme.colors.text,
                        cursor: 'pointer', fontFamily: euiTheme.font.family,
                        transition: 'border-color 0.12s, color 0.12s',
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = euiTheme.colors.primary; (e.currentTarget as HTMLElement).style.color = euiTheme.colors.primary; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = euiTheme.colors.lightShade; (e.currentTarget as HTMLElement).style.color = euiTheme.colors.text; }}
                      >{fu}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Action card — only on last agent message, only when action keyword is detected */}
      {showActionCard && !actionDone && (
        <div style={{
          marginBottom: 16, marginTop: 4,
          border: `1.5px solid ${euiTheme.colors.primary}55`,
          borderRadius: 10, overflow: 'hidden',
          background: `${euiTheme.colors.primary}07`,
        }}>
          {/* Header row */}
          <div style={{ padding: '10px 14px 8px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${euiTheme.colors.primary}22` }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: 'linear-gradient(135deg, #1750BA 0%, #6B3C9F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <EuiIcon type="sparkles" size="s" style={{ color: '#fff' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: euiTheme.colors.primary, fontFamily: euiTheme.font.family }}>Ready to execute</span>
          </div>
          {/* Body */}
          <div style={{ padding: '10px 14px 12px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: euiTheme.colors.title, fontFamily: euiTheme.font.family }}>{actionLabel}</p>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family, lineHeight: 1.55 }}>
              {actionLabel.toLowerCase().includes('isolate')
                ? 'Network isolation will cut lateral movement immediately. Tier 2 team will be paged.'
                : actionLabel.toLowerCase().includes('block')
                ? 'The C2 IP will be blocked at perimeter. Beaconing will stop immediately.'
                : actionLabel.toLowerCase().includes('close')
                ? 'All matching alerts will be closed as false positives. A group exception will be added.'
                : 'The agent will execute this action on your behalf.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <EuiButtonEmpty size="s" onClick={() => setActionExecuted(true)}>Cancel</EuiButtonEmpty>
              <EuiButton
                size="s"
                fill
                isLoading={actionLoading}
                onClick={handleActionExecute}
              >
                Execute action
              </EuiButton>
            </div>
          </div>
        </div>
      )}

      {/* Success banner — replaces action card after execution */}
      {actionDone && !messages[messages.length - 1]?.text.includes('Done. I') && (
        <div style={{
          marginBottom: 16,
          padding: '10px 14px',
          borderRadius: 8,
          background: '#E3F8F1',
          border: '1px solid #1A7348',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <EuiIcon type="checkInCircleFilled" color="success" size="m" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#006959', fontFamily: euiTheme.font.family }}>
            Action executed — {actionLabel}
          </span>
        </div>
      )}
      {isTyping && typed && (
        <div style={{ marginBottom: 16, fontSize: 13, fontFamily: euiTheme.font.family, color: euiTheme.colors.text }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, #1750BA 0%, #6B3C9F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EuiIcon type="sparkles" size="s" style={{ color: '#fff' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: euiTheme.colors.subduedText, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Elastic Agent</span>
          </div>
          {renderAgentText(typed)}
        </div>
      )}
      {isTyping && !typed && (
        <div style={{ display: 'flex', gap: 4, padding: '8px 0', alignItems: 'center' }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, #1750BA 0%, #6B3C9F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
            <EuiIcon type="sparkles" size="s" style={{ color: '#fff' }} />
          </div>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: euiTheme.colors.subduedText, opacity: 0.6, display: 'inline-block' }} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ width: 400, height: '100%', flexShrink: 0, background: euiTheme.colors.emptyShade, borderRadius: 8, border: '1px solid rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {Header}
      {mode === 'brief' ? BriefView : ChatView}
      {Footer}
    </div>
  );
};

// ─── Stat cards ───────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string; value: string | number; icon: string;
  color: string; bg: string; sub?: string;
  onClick?: () => void; isActive?: boolean;
}> = ({ label, value, icon, color, bg, sub, onClick, isActive }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, minWidth: 0,
        padding: '16px 20px', borderRadius: euiTheme.border.radius.medium,
        border: isActive ? `2px solid ${euiTheme.colors.primary}` : `1px solid ${euiTheme.colors.lightShade}`,
        background: isActive ? euiTheme.colors.backgroundBaseInteractiveSelect : euiTheme.colors.emptyShade,
        display: 'flex', flexDirection: 'column', gap: 6,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => { if (onClick && !isActive) { (e.currentTarget as HTMLElement).style.borderColor = euiTheme.colors.primary; } }}
      onMouseLeave={e => { if (onClick && !isActive) { (e.currentTarget as HTMLElement).style.borderColor = euiTheme.colors.lightShade; } }}
    >
      {/* Icon + number + label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 5, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <EuiIcon type={icon} size="s" color={color} />
        </div>
        <span style={{ fontSize: 22, fontWeight: 700, color: euiTheme.colors.title, fontFamily: euiTheme.font.family, lineHeight: 1 }}>
          {value}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color, fontFamily: euiTheme.font.family, lineHeight: 1 }}>
          {label}
        </span>
      </div>
      {/* Descriptive sub */}
      {sub && (
        <div style={{ fontSize: 11, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family, lineHeight: 1.3 }}>
          {sub}
        </div>
      )}
    </div>
  );
};

// ─── V2: Chat-first item card ─────────────────────────────────────────────────

const ChatItemCard: React.FC<{
  item: BriefingItem;
  onApprove: (item: BriefingItem) => void;
  onModify: (item: BriefingItem) => void;
  onReject: (item: BriefingItem) => void;
}> = ({ item, onApprove, onModify, onReject }) => {
  const { euiTheme } = useEuiTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
      {/* Agent avatar */}
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 16,
          background: 'linear-gradient(135deg, #0077CC, #00BFB3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <EuiIcon type="sparkles" size="s" style={{ color: '#fff' }} />
        </div>
      </div>

      {/* Bubble */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Agent label + skill + confidence */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: euiTheme.font.family }}>AI Agent</span>
          <SkillTag skill={item.skill} />
          <ConfidenceBadge score={item.confidence} />
        </div>

        {/* Conversational intro */}
        <div style={{
          padding: '14px 16px', borderRadius: '2px 16px 16px 16px',
          border: `1px solid ${euiTheme.colors.lightShade}`,
          background: euiTheme.colors.emptyShade,
          marginBottom: 10,
        }}>
          <EuiText size="s" style={{ lineHeight: 1.65 }}>{item.agentIntro}</EuiText>

          {/* Expand details */}
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 14,
              border: `1px solid ${euiTheme.colors.lightShade}`,
              background: expanded ? euiTheme.colors.lightestShade : 'transparent',
              cursor: 'pointer', fontSize: 12, fontFamily: euiTheme.font.family,
              color: euiTheme.colors.subduedText,
            }}
          >
            <EuiIcon type={expanded ? 'arrowUp' : 'arrowDown'} size="s" />
            {expanded ? 'Hide details' : 'See evidence & proposed action'}
          </button>

          {expanded && (
            <div style={{ marginTop: 14 }}>
              {/* Evidence */}
              <div>
                <EuiText size="xs" color="subdued" style={{ marginBottom: 4 }}>
                  <strong style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evidence</strong>
                </EuiText>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {item.evidence.map((e, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 4, fontSize: 12,
                      border: `1px solid ${euiTheme.colors.lightShade}`,
                      background: euiTheme.colors.body, color: euiTheme.colors.primaryText, cursor: 'pointer',
                    }}>
                      <EuiIcon type={EVIDENCE_ICON[e.type] || 'document'} size="s" color="primary" />
                      {e.label}
                      <EuiIcon type="popout" size="s" color="subdued" />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action bar — outside the bubble */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }} />
          <EuiButtonEmpty size="s" color="danger" iconType="cross" onClick={() => onReject(item)}>Reject</EuiButtonEmpty>
          <EuiButtonEmpty size="s" iconType="pencil" onClick={() => onModify(item)}>Modify</EuiButtonEmpty>
          <EuiButton size="s" fill iconType="check" onClick={() => onApprove(item)}>{item.approveLabel}</EuiButton>
        </div>
      </div>
    </div>
  );
};

// ─── Segmented control ────────────────────────────────────────────────────────

const ABControl: React.FC<{
  value: 'A' | 'B';
  onChange: (v: 'A' | 'B') => void;
}> = ({ value, onChange }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div style={{ display: 'inline-flex', padding: 3, borderRadius: 8, background: euiTheme.colors.lightestShade, border: `1px solid ${euiTheme.colors.lightShade}` }}>
      {(['A', 'B'] as const).map(v => (
        <button key={v} onClick={() => onChange(v)} style={{
          padding: '4px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, fontFamily: euiTheme.font.family,
          background: value === v ? euiTheme.colors.emptyShade : 'transparent',
          color: value === v ? euiTheme.colors.primaryText : euiTheme.colors.subduedText,
          boxShadow: value === v ? `0 1px 3px ${euiTheme.colors.lightShade}` : 'none',
          transition: 'all 0.15s',
        }}>
          {v}
        </button>
      ))}
    </div>
  );
};

const SegmentedControl: React.FC<{
  value: 'v1' | 'v2' | 'v3';
  onChange: (v: 'v1' | 'v2' | 'v3') => void;
}> = ({ value, onChange }) => {
  const { euiTheme } = useEuiTheme();
  const options: { v: 'v1' | 'v2' | 'v3'; label: string }[] = [
    { v: 'v1', label: 'v1 · Queue' },
    { v: 'v2', label: 'v2 · Chat' },
  ];
  return (
    <div style={{ display: 'inline-flex', padding: 3, borderRadius: 8, background: euiTheme.colors.lightestShade, border: `1px solid ${euiTheme.colors.lightShade}` }}>
      {options.map(({ v, label }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          style={{
            padding: '4px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: euiTheme.font.family,
            background: value === v ? euiTheme.colors.emptyShade : 'transparent',
            color: value === v ? euiTheme.colors.primaryText : euiTheme.colors.subduedText,
            boxShadow: value === v ? `0 1px 3px ${euiTheme.colors.lightShade}` : 'none',
            transition: 'all 0.15s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

// ─── V2: Table item row ───────────────────────────────────────────────────────

const V2ItemRow: React.FC<{
  item: BriefingItem;
  isLast: boolean;
  onApprove: (item: BriefingItem) => void;
  onModify: (item: BriefingItem) => void;
  onReject: (item: BriefingItem) => void;
  onViewed: (id: string) => void;
}> = ({ item, isLast, onApprove, onModify, onReject, onViewed }) => {
  const { euiTheme } = useEuiTheme();
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded(e => !e);
    if (item.isNew) onViewed(item.id);
  };

  return (
    <div style={{ borderBottom: isLast ? 'none' : `1px solid ${euiTheme.colors.lightShade}` }}>
      {/* Summary row */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: '1fr auto',
          padding: '14px 20px', gap: 16, alignItems: 'center',
          background: expanded ? euiTheme.colors.lightestShade : euiTheme.colors.emptyShade,
          cursor: 'pointer', transition: 'background 0.15s',
        }}
        onClick={handleToggle}
        onMouseEnter={e => { if (!expanded) (e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade; }}
        onMouseLeave={e => { if (!expanded) (e.currentTarget as HTMLElement).style.background = euiTheme.colors.emptyShade; }}
      >
        {/* Event summary */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            {item.isNew && (
              <span title="New — not yet reviewed" style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#006BB4', display: 'inline-block', flexShrink: 0,
              }} />
            )}
            <SkillTag skill={item.skill} />
            {item.assignees && item.assignees.length > 0 && <AssignedTag assignees={item.assignees} />}
            <ConfidenceBadge score={item.confidence} />
          </div>
          <EuiText size="s" style={{ fontWeight: 500, lineHeight: 1.4 }}>
            <span style={{
              display: '-webkit-box',
              WebkitLineClamp: expanded ? undefined : 1,
              WebkitBoxOrient: 'vertical' as const,
              overflow: expanded ? 'visible' : 'hidden',
            }}>
              {item.whatWeFound}
            </span>
          </EuiText>
        </div>

        {/* Expand toggle */}
        <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={handleToggle}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            style={{
              width: 28, height: 28, border: `1px solid ${euiTheme.colors.lightShade}`,
              borderRadius: 6, background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightShade)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <EuiIcon type={expanded ? 'arrowUp' : 'arrowDown'} size="s" color="subdued" />
          </button>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div style={{
          padding: '20px 20px 20px 68px',
          borderTop: `1px solid ${euiTheme.colors.lightestShade}`,
          background: euiTheme.colors.body,
        }}>
          {/* Why it matters */}
          <div style={{ marginBottom: 16 }}>
            <EuiText size="xs" color="subdued" style={{ marginBottom: 6 }}>
              <strong style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Why it matters now</strong>
            </EuiText>
            <EuiText size="s" style={{ lineHeight: 1.6 }}>{item.whyItMattersNow}</EuiText>
          </div>

          {/* Evidence chips */}
          <div style={{ marginBottom: 16 }}>
            <EuiText size="xs" color="subdued" style={{ marginBottom: 6 }}>
              <strong style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evidence</strong>
            </EuiText>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {item.evidence.map((e, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 4, fontSize: 12,
                  border: `1px solid ${euiTheme.colors.lightShade}`,
                  background: euiTheme.colors.emptyShade, color: euiTheme.colors.primaryText, cursor: 'pointer',
                }}>
                  <EuiIcon type={EVIDENCE_ICON[e.type] || 'document'} size="s" color="primary" />
                  {e.label}
                  <EuiIcon type="popout" size="s" color="subdued" />
                </span>
              ))}
            </div>
          </div>

          {/* Approval block */}
          <div style={{
            borderRadius: 8,
            background: `${euiTheme.colors.primary}0D`,
            border: `1px solid ${euiTheme.colors.primary}33`,
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ flex: 1, fontSize: 12, fontFamily: euiTheme.font.family, color: euiTheme.colors.subduedText, lineHeight: 1.5 }}>
              <strong style={{ color: euiTheme.colors.text, fontWeight: 600 }}>{item.proposedAction}</strong>
              {' — '}{item.approvalText}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <EuiButtonEmpty size="s" color="danger" iconType="cross" onClick={() => onReject(item)}>Reject</EuiButtonEmpty>
              <EuiButtonEmpty size="s" iconType="pencil" onClick={() => onModify(item)}>Modify</EuiButtonEmpty>
              <EuiButton size="s" fill onClick={() => onApprove(item)}>{item.approveLabel}</EuiButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── V3: Focus mode (master-detail) ──────────────────────────────────────────

const V3ConfidenceBar: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 90 ? '#00756F' : score >= 75 ? '#CA8500' : '#8A8A8A';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 48, height: 3, borderRadius: 2, background: '#E4E4E4', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{score}%</span>
    </div>
  );
};

const V3Layout: React.FC<{
  pending: BriefingItem[];
  onApprove: (item: BriefingItem) => void;
  onModify: (item: BriefingItem) => void;
  onReject: (item: BriefingItem) => void;
  protoVersion: 'v1' | 'v2' | 'v3';
  onVersionChange: (v: 'v1' | 'v2' | 'v3') => void;
  agentInputBar: (placeholder: string) => JSX.Element;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  autonomousCount: number;
  refreshing: boolean;
  onRefresh: () => void;
  now: string;
  viewedIds: Set<string>;
  onViewed: (id: string) => void;
}> = ({ pending, onApprove, onModify, onReject, protoVersion, onVersionChange, agentInputBar, criticalCount, highCount, mediumCount, autonomousCount, refreshing, onRefresh, now, viewedIds, onViewed }) => {
  const { euiTheme } = useEuiTheme();
  const [selectedIdx, setSelectedIdx] = useState(0);

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
    const item = pending[idx];
    if (item?.isNew && !viewedIds.has(item.id)) onViewed(item.id);
  };

  const selected = pending[selectedIdx] ?? pending[0];

  if (!selected) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState />
      </div>
    );
  }

  // Status strip tint based on highest severity
  const stripBg = criticalCount > 0 ? '#FFF5F5' : highCount > 0 ? '#FFFBF0' : '#F0FAF8';
  const stripAccent = criticalCount > 0 ? '#BD271E' : highCount > 0 ? '#CA8500' : '#00756F';

  const summaryParts: string[] = [];
  if (criticalCount > 0) summaryParts.push(`${criticalCount} critical`);
  if (highCount > 0) summaryParts.push(`${highCount} high`);
  if (mediumCount > 0) summaryParts.push(`${mediumCount} medium`);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Status strip ── */}
      <div style={{
        flexShrink: 0, background: stripBg,
        borderBottom: `1px solid ${euiTheme.colors.lightShade}`,
        padding: '0 28px', height: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: stripAccent, display: 'inline-block' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: stripAccent, fontFamily: euiTheme.font.family }}>
              {summaryParts.join(' · ')} need your decision
            </span>
          </div>
          <span style={{ fontSize: 12, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family }}>
            · {autonomousCount} handled autonomously
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family }}>
            {refreshing ? 'Refreshing…' : `As of ${now}`}
          </span>
          <button
            onClick={onRefresh}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family, padding: '2px 6px', borderRadius: 4 }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightShade)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <EuiIcon type="refresh" size="s" /> Refresh
          </button>
          <SegmentedControl value={protoVersion} onChange={onVersionChange} />
        </div>
      </div>

      {/* ── Main split ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left: item navigator ── */}
        <div style={{
          width: 300, flexShrink: 0, overflowY: 'auto',
          borderRight: `1px solid ${euiTheme.colors.lightShade}`,
          background: euiTheme.colors.emptyShade,
        }}>
          <div style={{ padding: '16px 16px 10px', borderBottom: `1px solid ${euiTheme.colors.lightestShade}` }}>
            <EuiText size="xs" color="subdued">
              <strong style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Needs your review ({pending.length})
              </strong>
            </EuiText>
          </div>

          {pending.map((item, idx) => {
            const isSelected = idx === selectedIdx;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(idx)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '14px 13px 14px 17px',
                  borderTop: 'none', borderRight: 'none',
                  borderBottom: `1px solid ${euiTheme.colors.lightestShade}`,
                  borderLeft: `3px solid ${isSelected ? SEV_COLOR[item.severity] : 'transparent'}`,
                  background: isSelected ? euiTheme.colors.body : 'transparent',
                  cursor: 'pointer', transition: 'background 0.12s, border-color 0.12s',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {item.isNew && !viewedIds.has(item.id) && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: '#E6F2FF', color: '#006BB4', marginLeft: 2 }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#006BB4', display: 'inline-block' }} />
                      New
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 13, fontFamily: euiTheme.font.family, lineHeight: 1.45,
                  color: isSelected ? euiTheme.colors.title : euiTheme.colors.text,
                  fontWeight: isSelected ? 600 : 400,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                  marginBottom: 8,
                }}>
                  {item.whatWeFound}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family }}>
                    <EuiIcon type={SKILL_ICON[item.skill]} size="s" style={{ marginRight: 3, verticalAlign: 'middle' }} />
                    {item.skill}
                  </span>
                  <V3ConfidenceBar score={item.confidence} />
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Right: detail panel ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: euiTheme.colors.body }}>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px 24px' }}>

            {/* Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  disabled={selectedIdx === 0}
                  onClick={() => setSelectedIdx(i => i - 1)}
                  style={{
                    width: 28, height: 28, borderRadius: 6, border: `1px solid ${euiTheme.colors.lightShade}`,
                    background: 'transparent', cursor: selectedIdx > 0 ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: selectedIdx === 0 ? 0.35 : 1,
                  }}
                >
                  <EuiIcon type="arrowLeft" size="s" color="subdued" />
                </button>
                <span style={{ fontSize: 12, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family, padding: '0 4px' }}>
                  {selectedIdx + 1} of {pending.length}
                </span>
                <button
                  disabled={selectedIdx === pending.length - 1}
                  onClick={() => setSelectedIdx(i => i + 1)}
                  style={{
                    width: 28, height: 28, borderRadius: 6, border: `1px solid ${euiTheme.colors.lightShade}`,
                    background: 'transparent', cursor: selectedIdx < pending.length - 1 ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: selectedIdx === pending.length - 1 ? 0.35 : 1,
                  }}
                >
                  <EuiIcon type="arrowRight" size="s" color="subdued" />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SkillTag skill={selected.skill} />
                <ConfidenceBadge score={selected.confidence} />
              </div>
            </div>

            {/* Headline */}
            <div style={{ marginBottom: 32 }}>
              <EuiTitle size="m"><h2 style={{ margin: 0, lineHeight: 1.3 }}>{selected.whatWeFound}</h2></EuiTitle>
            </div>

            {/* Why it matters */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <EuiIcon type="iInCircle" size="s" color="subdued" />
                <EuiText size="xs" color="subdued">
                  <strong style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>Why it matters now</strong>
                </EuiText>
              </div>
              <EuiText size="s" style={{ lineHeight: 1.7, color: euiTheme.colors.text }}>
                {selected.whyItMattersNow}
              </EuiText>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: euiTheme.colors.lightShade, marginBottom: 28 }} />

            {/* Evidence */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <EuiIcon type="link" size="s" color="subdued" />
                <EuiText size="xs" color="subdued">
                  <strong style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>Evidence</strong>
                </EuiText>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selected.evidence.map((e, i) => (
                  <button key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 6, fontSize: 13,
                    border: `1px solid ${euiTheme.colors.lightShade}`,
                    background: euiTheme.colors.emptyShade, cursor: 'pointer',
                    color: euiTheme.colors.text, fontFamily: euiTheme.font.family,
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                    onMouseEnter={e2 => { (e2.currentTarget as HTMLElement).style.borderColor = euiTheme.colors.primary; (e2.currentTarget as HTMLElement).style.background = euiTheme.colors.backgroundBaseInteractiveSelect; }}
                    onMouseLeave={e2 => { (e2.currentTarget as HTMLElement).style.borderColor = euiTheme.colors.lightShade; (e2.currentTarget as HTMLElement).style.background = euiTheme.colors.emptyShade; }}
                  >
                    <EuiIcon type={EVIDENCE_ICON[e.type] || 'document'} size="s" color="primary" />
                    {e.label}
                    <EuiIcon type="popout" size="s" color="subdued" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Sticky action footer ── */}
          <div style={{
            flexShrink: 0, borderTop: `1px solid ${euiTheme.colors.lightShade}`,
            padding: '12px 48px', background: euiTheme.colors.emptyShade,
          }}>
            <div style={{
              borderRadius: 8,
              background: `${euiTheme.colors.primary}0D`,
              border: `1px solid ${euiTheme.colors.primary}33`,
              padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ flex: 1, fontSize: 12, fontFamily: euiTheme.font.family, color: euiTheme.colors.subduedText, lineHeight: 1.5 }}>
                <strong style={{ color: euiTheme.colors.text, fontWeight: 600 }}>{selected.proposedAction}</strong>
                {' — '}{selected.approvalText}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <EuiButtonEmpty size="s" color="danger" iconType="cross" onClick={() => onReject(selected)}>Reject</EuiButtonEmpty>
                <EuiButtonEmpty size="s" iconType="pencil" onClick={() => onModify(selected)}>Modify</EuiButtonEmpty>
                <EuiButton size="m" fill onClick={() => onApprove(selected)}>{selected.approveLabel}</EuiButton>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};



// ─── History Flyout ───────────────────────────────────────────────────────────

const HistoryFlyout: React.FC<{
  open: boolean;
  onClose: () => void;
  tab: 'history' | 'settings';
  onTabChange: (t: 'history' | 'settings') => void;
  resolvedHistory: ResolvedHistoryItem[];
  confidenceThreshold: number;
  onThresholdChange: (v: number) => void;
  agentPanelOpen?: boolean;
}> = ({ open, onClose, tab, onTabChange, resolvedHistory, confidenceThreshold, onThresholdChange, agentPanelOpen }) => {
  const { euiTheme } = useEuiTheme();
  const [activeSkills, setActiveSkills] = React.useState<Record<string, boolean>>({
    'Alert Analysis': true, 'Attack Discovery': true, 'Detection Rule Edit': true, 'Cases': true,
  });

  if (!open) return null;

  const statusBadge = (status: ResolvedHistoryItem['status'] | 'ai') => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      approved: { bg: '#E3F8F1', color: '#1A7348', label: 'Approved' },
      rejected: { bg: '#FFF0EE', color: '#BD271E', label: 'Rejected' },
      modified: { bg: '#FFF3EC', color: '#C44600', label: 'Modified' },
      ai:       { bg: '#E6F2FF', color: '#006BB4', label: 'AI' },
    };
    const s = map[status] ?? map.ai;
    return (
      <EuiBadge style={{ background: s.bg, color: s.color, fontWeight: 600, flexShrink: 0 }}>
        {s.label}
      </EuiBadge>
    );
  };

  const allHistory = [
    ...resolvedHistory.map(h => ({
      id: h.item.id,
      severity: h.item.severity,
      title: h.item.whatWeFound,
      actionLabel: h.actionLabel,
      by: h.by,
      resolvedAt: h.resolvedAt,
      status: h.status as ResolvedHistoryItem['status'] | 'ai',
    })),
    ...AUTONOMOUS_ITEMS.map(a => ({
      id: a.id,
      severity: a.severity,
      title: a.label,
      actionLabel: a.actionTaken || 'Handled by AI',
      by: 'ai' as const,
      resolvedAt: a.resolvedAt ?? '',
      status: 'ai' as const,
    })),
  ];

  return (
    <div data-persistent-panel style={{
      position: 'fixed', top: 48, right: agentPanelOpen ? 408 : 0, bottom: 0,
      width: 420, zIndex: 499,
      background: euiTheme.colors.emptyShade,
      borderLeft: `1px solid ${euiTheme.colors.lightShade}`,
      boxShadow: '-12px 0 40px rgba(0,0,0,0.14)',
      fontFamily: euiTheme.font.family,
      display: 'flex', flexDirection: 'column',
      transition: 'right 0.25s cubic-bezier(0.4,0,0.2,1)',
    }}>
      {/* Header */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${euiTheme.colors.lightShade}`, padding: '0 16px', height: 48, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: euiTheme.colors.title, flex: 1 }}>Resolved items</span>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade)}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <EuiIcon type="cross" size="m" color="subdued" />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'history' && (
          allHistory.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40, textAlign: 'center' }}>
              <EuiIcon type="clock" size="xl" color="subdued" style={{ marginBottom: 12 }} />
              <EuiText size="s" color="subdued">No activity yet this shift</EuiText>
            </div>
          ) : (
            <div>
              {allHistory.map((h, idx) => (
                <div key={h.id + idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${euiTheme.colors.lightShade}` }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade)}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  {/* Severity dot */}
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: SEV_COLOR[h.severity], flexShrink: 0 }} />
                  {/* Center */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: euiTheme.colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.title.length > 52 ? h.title.slice(0, 50) + '…' : h.title}
                    </div>
                    <div style={{ fontSize: 11, color: euiTheme.colors.subduedText, marginTop: 2 }}>
                      {h.actionLabel} · {h.by === 'ai' ? 'by AI' : 'by you'}
                    </div>
                  </div>
                  {/* Right: time + badge */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: euiTheme.colors.subduedText }}>{h.resolvedAt}</span>
                    {statusBadge(h.status)}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'settings' && (
          <div style={{ padding: '20px 20px' }}>
            {/* Autonomous actions section */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: euiTheme.colors.title, marginBottom: 16 }}>Autonomous actions</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: euiTheme.colors.text, fontFamily: euiTheme.font.family }}>
                    Confidence threshold
                  </label>
                  <span style={{ fontSize: 13, fontWeight: 700, color: euiTheme.colors.primary, fontFamily: euiTheme.font.family }}>
                    {confidenceThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  value={confidenceThreshold}
                  onChange={e => onThresholdChange(Number(e.target.value))}
                  style={{ width: '100%', accentColor: euiTheme.colors.primary, marginBottom: 8 }}
                />
                <p style={{ margin: 0, fontSize: 12, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family, lineHeight: 1.5 }}>
                  AI will act autonomously on items above this confidence score without requiring approval.
                </p>
              </div>
            </div>

            {/* Active skills section */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: euiTheme.colors.title, marginBottom: 12 }}>Active skills</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(['Alert Analysis', 'Attack Discovery', 'Detection Rule Edit', 'Cases'] as const).map(skill => (
                  <div key={skill} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, border: `1px solid ${euiTheme.colors.lightShade}`, background: euiTheme.colors.emptyShade }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <EuiIcon type={SKILL_ICON[skill]} size="s" color={activeSkills[skill] ? 'primary' : 'subdued'} />
                      <span style={{ fontSize: 13, color: euiTheme.colors.text, fontFamily: euiTheme.font.family }}>{skill}</span>
                    </div>
                    <button
                      onClick={() => setActiveSkills(prev => ({ ...prev, [skill]: !prev[skill] }))}
                      style={{
                        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: activeSkills[skill] ? euiTheme.colors.primary : euiTheme.colors.lightShade,
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: 2,
                        left: activeSkills[skill] ? 18 : 2,
                        width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        transition: 'left 0.2s',
                        display: 'block',
                      }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── AI Briefing content ──────────────────────────────────────────────────────

const AIBriefingContent: React.FC<{
  onPendingChange?: (count: number) => void;
  protoVersion: 'v1' | 'v2' | 'v3';
  setProtoVersion: (v: 'v1' | 'v2' | 'v3') => void;
  onOpenAgent: (query: string) => void;
  agentInputBar: (placeholder: string) => JSX.Element;
  agentPanelOpen?: boolean;
  filterVersion: 'v1' | 'v2';
  setFilterVersion: (v: 'v1' | 'v2') => void;
}> = ({ onPendingChange, protoVersion, setProtoVersion, onOpenAgent, agentInputBar, agentPanelOpen, filterVersion, setFilterVersion }) => {
  const { euiTheme } = useEuiTheme();
  const [items, setItems] = useState<BriefingItem[]>(INITIAL_ITEMS);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const markViewed = (id: string) => setViewedIds(prev => new Set([...prev, id]));
  const [refreshing, setRefreshing] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<BriefingItem | null>(null);
  const [modifyTarget, setModifyTarget] = useState<BriefingItem | null>(null);
  const [skillFilter, setSkillFilter] = useState<Skill | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [resolvedHistory, setResolvedHistory] = useState<ResolvedHistoryItem[]>([]);
  const [historyFlyoutOpen, setHistoryFlyoutOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<'history' | 'settings'>('history');
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [featuredItemId, setFeaturedItemId] = useState<string | null>(INITIAL_ITEMS[0]?.id ?? null);
  // Top-priority mini flow
  const [tpOffset, setTpOffset] = useState(0);       // which evidence row is current top priority
  const [tpConfirming, setTpConfirming] = useState(false);
  const [tpLoading, setTpLoading] = useState(false);
  const [tpSuccess, setTpSuccess] = useState(false);
  // Queue row "…" menu
  const [queueMenuKey, setQueueMenuKey] = useState<string | null>(null);
  // Queue row inline confirm panel
  const [queueConfirmKey, setQueueConfirmKey] = useState<string | null>(null);
  const [queueExecutingKey, setQueueExecutingKey] = useState<string | null>(null);
  const [queueSuccessKey, setQueueSuccessKey] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [approveTarget, setApproveTarget] = useState<BriefingItem | null>(null);
  const [detailFlyoutItem, setDetailFlyoutItem] = useState<BriefingItem | null>(null);
  const addToast = (toast: Omit<Toast, 'id'>) =>
    setToasts(prev => [...prev, { ...toast, id: String(Date.now()) }]);
  const removeToast = (t: Toast) => setToasts(prev => prev.filter(x => x.id !== t.id));

  // Close queue row "…" menu on outside click
  React.useEffect(() => {
    if (!queueMenuKey) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-queue-menu]')) setQueueMenuKey(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [queueMenuKey]);

  const pending = items.filter(i => i.status === 'pending');
  const filteredPending = pending.filter(i => {
    if (skillFilter && i.skill !== skillFilter) return false;
    return true;
  });
  const history = items.filter(i => i.status !== 'pending' && i.status !== 'autonomous');
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const pendingOnly = items.filter(i => i.status === 'pending');
  const criticalCount = pendingOnly.filter(i => i.severity === 'Critical').length;
  const highCount = pendingOnly.filter(i => i.severity === 'High').length;
  const mediumCount = pendingOnly.filter(i => i.severity === 'Medium').length;

  React.useEffect(() => { onPendingChange?.(pendingOnly.length); }, [pendingOnly.length]);

  // Auto-clear skill filter when no more pending items match it
  React.useEffect(() => {
    if (skillFilter && !pending.some(i => i.skill === skillFilter)) {
      setSkillFilter(null);
    }
  }, [pending.length, skillFilter]);

  const resolveItem = (id: string, updates: Partial<BriefingItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates, isNew: false, resolvedAt: `Today at ${now}` } : i));
  };

  // Execute action — removes item, no auto-promotion (queue count simply decreases by 1)
  const handleExecuteDirect = (item: BriefingItem) => {
    const capturedAction = { itemId: item.id, actionLabel: item.approveLabel };

    setExecutingId(item.id);
    setTimeout(() => {
      setExecutingId(null);
      setItems(prev => prev.filter(i => i.id !== item.id));
      setFeaturedItemId(null);
      setResolvedHistory(prev => [{
        item,
        actionLabel: capturedAction.actionLabel,
        by: 'user',
        resolvedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: 'approved',
      }, ...prev]);
      addToast({
        title: capturedAction.actionLabel,
        text: <span>Action executed successfully on <strong>{item.whatWeFound.split('—')[0].trim()}</strong>.</span>,
        color: 'success',
        iconType: 'check',
        toastLifeTimeMs: 6000,
      });
    }, 1500);
  };

  // Subtitle — split into directive line + compact context line
  const topItem = pending[0];
  const urgentCount = criticalCount + highCount;

  const subtitleDirective = (() => {
    if (pending.length === 0) return `You're all caught up. No decisions needed right now.`;
    // Build queue summary for non-critical severities
    const queueParts: string[] = [];
    const hCount = pending.filter(i => i.severity === 'High').reduce((a, i) => a + i.evidence.length, 0);
    const mCount = pending.filter(i => i.severity === 'Medium').reduce((a, i) => a + i.evidence.length, 0);
    const lCount = pending.filter(i => i.severity === 'Low').reduce((a, i) => a + i.evidence.length, 0);
    if (hCount > 0) queueParts.push(`${hCount} high`);
    if (mCount > 0) queueParts.push(`${mCount} medium`);
    if (lCount > 0) queueParts.push(`${lCount} low`);
    const queueSuffix = queueParts.length > 0 ? ` Also in queue: ${queueParts.join(', ')}.` : '';
    if (criticalCount > 0 && topItem) {
      const narrative = topItem.skill === 'Attack Discovery'
        ? `Top priority: An active attack is targeting your critical infrastructure`
        : topItem.skill === 'Alert Analysis'
        ? `Top priority: A critical alert on your highest-impact host needs immediate action`
        : `Top priority: A critical event requires your immediate action`;
      return `${narrative}.`;
    }
    if (urgentCount >= 2) {
      return `${urgentCount} high-priority events need your attention. Your most urgent is highlighted below.${queueSuffix}`;
    }
    if (topItem) return `${pending.length} event${pending.length > 1 ? 's' : ''} need your review. Starting with the highest priority.`;
    return `${pending.length} decision${pending.length > 1 ? 's' : ''} await your review.`;
  })();


  // Featured item is pinned by ID — never auto-promotes, always requires explicit selection
  const featuredItem = featuredItemId ? (pending.find(i => i.id === featuredItemId) ?? null) : null;
  const featuredSeverity = featuredItem?.severity;
  const displayFeaturedItem = skillFilter
    ? (filteredPending[0] ?? null)
    : featuredItem;

  // Skill type counts for filter tags
  const SKILL_TYPES: { skill: Skill; label: string; icon: string }[] = [
    { skill: 'Attack Discovery', label: 'Attack', icon: 'bullseye' },
    { skill: 'Alert Analysis',   label: 'Alert',  icon: 'warning'  },
    { skill: 'Cases',            label: 'Case',   icon: 'casesApp' },
    { skill: 'Detection Rule Edit', label: 'Rule', icon: 'indexEdit' },
  ];


  const modals = (
    <>
      {rejectTarget && (
        <RejectModal
          onConfirm={reason => {
            const nextId = items
              .filter(i => i.id !== rejectTarget.id && i.status === 'pending')
              .sort((a, b) => a.rank - b.rank)[0]?.id ?? null;
            resolveItem(rejectTarget.id, { status: 'rejected', rejectionReason: reason });
            if (rejectTarget.id === featuredItemId) setFeaturedItemId(nextId);
            setRejectTarget(null);
          }}
          onCancel={() => setRejectTarget(null)} />
      )}
      {modifyTarget && (
        <ModifyModal item={modifyTarget}
          onConfirm={action => {
            const nextId = items
              .filter(i => i.id !== modifyTarget.id && i.status === 'pending')
              .sort((a, b) => a.rank - b.rank)[0]?.id ?? null;
            resolveItem(modifyTarget.id, { status: 'modified', modifiedAction: action });
            if (modifyTarget.id === featuredItemId) setFeaturedItemId(nextId);
            setModifyTarget(null);
          }}
          onCancel={() => setModifyTarget(null)} />
      )}
      {approveTarget && (
        <ApproveModal
          item={approveTarget}
          onConfirm={() => { handleExecuteDirect(approveTarget); setApproveTarget(null); }}
          onCancel={() => setApproveTarget(null)}
        />
      )}
    </>
  );

  // ── Severity grouping ─────────────────────────────────────────────────────────

  // ── V1 layout ─────────────────────────────────────────────────────────────────
  if (protoVersion === 'v1') {
    return (
      <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
        {/* Main column: scrollable content + footer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '28px 24px 0', flexShrink: 0 }}>
            {/* Greeting */}
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} style={{ marginBottom: 6 }}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="l"><h1 style={{ margin: 0 }}>{greeting}, James</h1></EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 12, fontSize: 12, border: '1.5px solid #00BFB3', color: '#00756F', background: '#F0FAFA', marginLeft: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00BFB3', display: 'inline-block' }} />
                  {`As of ${now}`}
                </span>
              </EuiFlexItem>
            </EuiFlexGroup>
            <div style={{ marginBottom: 24 }}>
              <EuiText size="m" style={{ fontWeight: 500, lineHeight: 1.5 }}>
                {subtitleDirective}
              </EuiText>
            </div>
            {/* Overview cells — always on top */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {OVERVIEW_CELLS.map(cell => (
                <div key={cell.label} onClick={cell.onClick} style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                  borderRadius: 6, cursor: 'pointer',
                  border: cell.isActive ? `2px solid ${cell.color}` : `1px solid ${euiTheme.colors.lightShade}`,
                  background: cell.isActive ? `${cell.color}0F` : euiTheme.colors.emptyShade,
                }}>
                  <EuiIcon type={cell.icon} size="s" color={cell.color} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 18, fontWeight: 700, color: cell.color, fontFamily: euiTheme.font.family }}>{cell.count}</span>
                  <span style={{ fontSize: 11, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family, lineHeight: 1.3 }}>{cell.label}</span>
                </div>
              ))}
            </div>

            {/* Featured item — top priority, always pinned */}
            {featuredItem && (
              <FeaturedItemCard
                item={featuredItem}
                onModify={setModifyTarget}
                onReject={setRejectTarget}
                onAskAgent={onOpenAgent}
                agentPanelOpen={agentPanelOpen}
                executingId={executingId}
                onExecuteDirect={handleExecuteDirect}
              />
            )}

          </div>
          <div style={{ flex: 1, padding: '0 24px 32px' }}>
            <>
              {/* Queue shows remaining pending items (skip featured + resolved) */}
              {filteredPending.filter(i => i.id !== featuredItem?.id && i.status === 'pending').map(item => (
                <ItemCard
                  key={item.id}
                  item={{ ...item, isNew: item.isNew && !viewedIds.has(item.id) }}
                  onApprove={setApproveTarget}
                  onModify={setModifyTarget}
                  onReject={setRejectTarget}
                  onViewed={markViewed}
                />
              ))}
            </>
          </div>
          </div>{/* end scrollable */}

        </div>{/* end main column */}

        <HistoryFlyout
          open={historyFlyoutOpen}
          onClose={() => setHistoryFlyoutOpen(false)}
          tab={historyTab}
          onTabChange={setHistoryTab}
          resolvedHistory={resolvedHistory}
          confidenceThreshold={confidenceThreshold}
          onThresholdChange={setConfidenceThreshold}
          agentPanelOpen={agentPanelOpen}
        />
        {modals}
      </div>
    );
  }

  // ── V3 layout (master-detail focus mode) ─────────────────────────────────────
  if (protoVersion === 'v3') {
    return (
      <>
        <V3Layout
          pending={pending}
          onApprove={handleExecuteDirect}
          onModify={setModifyTarget}
          onReject={setRejectTarget}
          protoVersion={protoVersion}
          onVersionChange={setProtoVersion}
          agentInputBar={agentInputBar}
          criticalCount={criticalCount}
          highCount={highCount}
          mediumCount={mediumCount}
          autonomousCount={AUTONOMOUS_ITEMS.length}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1500); }}
          now={now}
          viewedIds={viewedIds}
          onViewed={markViewed}
        />
        {modals}
      </>
    );
  }

  // ── V2 layout ─────────────────────────────────────────────────────────────────
  // Nightshift-style contextual headline
  const nsIllustrationBg = criticalCount > 0 ? '#FFF0EE' : highCount > 0 ? '#FFF3EC' : '#E3F8F1';
  const nsIllustrationIcon = criticalCount > 0 ? 'securitySignal' : highCount > 0 ? 'warning' : 'checkInCircleFilled';
  const nsIllustrationColor = criticalCount > 0 ? SEV_COLOR.Critical : highCount > 0 ? SEV_COLOR.High : SEV_COLOR.Low;
  // Count by evidence type across all critical items
  const criticalEvidence = pendingOnly.filter(i => i.severity === 'Critical').flatMap(i => i.evidence);
  const attackEvidenceCount = criticalEvidence.filter(e => e.type === 'attack').length;
  const alertEvidenceCount = criticalEvidence.filter(e => e.type !== 'attack').length;
  const nsHeadline = tpOffset === 1
    ? 'SRVWIN03 isolated. Active Tor session on svc-admin@corp still requires action.'
    : criticalCount > 0
    ? attackEvidenceCount > 0 && alertEvidenceCount > 0
      ? `You have ${attackEvidenceCount} attack and ${alertEvidenceCount} critical alert${alertEvidenceCount !== 1 ? 's' : ''} that require your action`
      : attackEvidenceCount > 0
      ? `You have ${attackEvidenceCount > 1 ? `${attackEvidenceCount} active attacks` : 'an active attack'} that require${attackEvidenceCount === 1 ? 's' : ''} your action`
      : `You have ${criticalCount} critical alert${criticalCount !== 1 ? 's' : ''} that require your action`
    : highCount > 0
    ? 'You have high-severity alerts that require your action'
    : pending.length > 0
    ? 'You have no critical events — low priority items to review'
    : 'Your shift is clear — no alerts to action';

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes rowExpand { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 200px; } }
      `}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '32px 24px 0' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>

            {/* ── Nightshift hero ── */}
            <div style={{ textAlign: 'center', marginBottom: 28, position: 'relative' }}>
              {/* Illustration circle */}
              <div style={{
                width: 64, height: 64, borderRadius: 32,
                background: nsIllustrationBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                border: `1.5px solid ${nsIllustrationColor}33`,
              }}>
                <EuiIcon type={nsIllustrationIcon} size="l" color={nsIllustrationColor} />
              </div>
              <h1 style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 24, color: euiTheme.colors.title, fontFamily: euiTheme.font.family, lineHeight: 1.3 }}>{nsHeadline}</h1>
              <p style={{ margin: 0, fontSize: 13, color: '#798EAF', lineHeight: 1.5 }}>
                {subtitleDirective}
              </p>
            </div>

            {/* ── Box 2: Top priority — FeaturedItemCard + mini flow overlay ── */}
            {pending.length > 0 && (() => {
              const tpItem = pending[0];
              const sortedEvidence = [...tpItem.evidence].sort((a, b) => a.type === 'attack' ? -1 : b.type === 'attack' ? 1 : 0);
              // Pass item with evidence sliced from tpOffset so FeaturedItemCard always shows the right row
              const tpItemForCard = { ...tpItem, evidence: sortedEvidence.slice(tpOffset) };

              const tpSuccessTexts: Record<number, string> = {
                0: 'SRVWIN03 isolated. Lateral movement to SRVWIN07 halted.',
                1: 'Session terminated. svc-admin@corp disconnected from Tor exit node.',
              };
              const successText = tpSuccessTexts[tpOffset] ?? 'Action completed successfully.';

              // Mini flow execute: loading → success → advance tpOffset
              const handleTpExecute = (item: BriefingItem) => {
                setExecutingId(item.id);
                setTimeout(() => {
                  setExecutingId(null);
                  setTpSuccess(true);
                  setTimeout(() => {
                    setTpOffset(prev => prev + 1);
                    setTpSuccess(false);
                  }, 2200);
                }, 1500);
              };

              return (
                <div style={{
                  border: '1px solid #E3E8F2',
                  borderRadius: euiTheme.border.radius.medium,
                  background: '#F6F9FC',
                  marginBottom: 12,
                  overflow: 'visible',
                }}>
                  <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: euiTheme.colors.subduedText }}>
                      Top priority
                    </span>
                  </div>
                  <div>
                    <FeaturedItemCard
                      key={tpOffset}
                      noBox hideHeader featuredFirst noQueueDivider maxRows={1} showSeverity
                      item={tpItemForCard}
                      onModify={setModifyTarget} onReject={setRejectTarget}
                      onAskAgent={onOpenAgent} agentPanelOpen={agentPanelOpen}
                      executingId={executingId} onExecuteDirect={handleTpExecute}
                      onEvidenceExecute={handleTpExecute}
                    />
                    {/* Success callout — shown after execute completes */}
                    {tpSuccess && (
                      <div style={{ margin: '0 14px 12px' }}>
                        <EuiCallOut title={successText} color="success" iconType="checkInCircleFilled" size="s" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── Box 3: Metrics + filter pills + queue list ── */}
            <div style={{
              border: `1px solid ${euiTheme.colors.lightShade}`,
              borderRadius: euiTheme.border.radius.medium,
              background: '#F6F9FC',
              marginBottom: 24,
              overflow: 'hidden',
            }}>
              {/* Queue header — label + filters + v1/v2 control + history */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px 10px 16px', gap: 6, flexWrap: 'wrap', borderBottom: `1px solid ${euiTheme.colors.lightShade}` }}>
                <span style={{ fontSize: 12, color: euiTheme.colors.subduedText, fontWeight: 500, marginRight: 4 }}>
                  Items in your queue
                </span>

                {/* v1 — severity filter cards */}
                {filterVersion === 'v1' && (
                  <>
                    {([
                      { sev: 'Critical' as Severity, color: SEV_COLOR.Critical, bg: SEV_BG.Critical },
                      { sev: 'High'     as Severity, color: SEV_COLOR.High,     bg: SEV_BG.High     },
                      { sev: 'Medium'   as Severity, color: SEV_COLOR.Medium,   bg: SEV_BG.Medium   },
                      { sev: 'Low'      as Severity, color: SEV_COLOR.Low,      bg: SEV_BG.Low      },
                    ]).map(({ sev, color, bg }) => {
                      const count = pendingOnly.filter(i => i.severity === sev).length;
                      if (count === 0) return null;
                      const isActive = severityFilter === sev;
                      return (
                        <button
                          key={sev}
                          onClick={() => setSeverityFilter(prev => prev === sev ? null : sev)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 9px', borderRadius: 12, fontSize: 12, fontWeight: isActive ? 700 : 400,
                            border: `1px solid ${isActive ? color : euiTheme.colors.lightShade}`,
                            background: isActive ? bg : euiTheme.colors.emptyShade,
                            color: isActive ? color : euiTheme.colors.text,
                            cursor: 'pointer', fontFamily: euiTheme.font.family, transition: 'all 0.12s',
                          }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = color; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = euiTheme.colors.lightShade; }}
                        >
                          {sev}
                          <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? color : euiTheme.colors.subduedText }}>{count}</span>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* v2 — skill type filter tags */}
                {filterVersion === 'v2' && SKILL_TYPES.map(({ skill, label, icon }) => {
                  const count = pendingOnly.filter(i => i.skill === skill).length;
                  if (count === 0) return null;
                  const isActive = skillFilter === skill;
                  return (
                    <button
                      key={skill}
                      onClick={() => setSkillFilter(prev => prev === skill ? null : skill)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 9px', borderRadius: 12, fontSize: 12, fontWeight: isActive ? 600 : 400,
                        border: `1px solid ${isActive ? euiTheme.colors.primary : euiTheme.colors.lightShade}`,
                        background: isActive ? euiTheme.colors.backgroundBaseInteractiveSelect : euiTheme.colors.emptyShade,
                        color: isActive ? euiTheme.colors.primaryText : euiTheme.colors.text,
                        cursor: 'pointer', fontFamily: euiTheme.font.family, transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.borderColor = euiTheme.colors.primary; (e.currentTarget as HTMLElement).style.color = euiTheme.colors.primary; } }}
                      onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.borderColor = euiTheme.colors.lightShade; (e.currentTarget as HTMLElement).style.color = euiTheme.colors.text; } }}
                    >
                      <EuiIcon type={icon} size="s" color={isActive ? 'primary' : 'subdued'} />
                      {label}
                      <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? euiTheme.colors.primaryText : euiTheme.colors.subduedText }}>{count}</span>
                    </button>
                  );
                })}

                <div style={{ flex: 1 }} />

                {/* History icon */}
                <EuiToolTip content="Resolved items" position="top">
                  <button
                    onClick={() => { setHistoryTab('history'); setHistoryFlyoutOpen(true); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer',
                      background: historyFlyoutOpen ? euiTheme.colors.backgroundBaseInteractiveSelect : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!historyFlyoutOpen) (e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade; }}
                    onMouseLeave={e => { if (!historyFlyoutOpen) (e.currentTarget as HTMLElement).style.background = historyFlyoutOpen ? euiTheme.colors.backgroundBaseInteractiveSelect : 'transparent'; }}
                  >
                    <IcQueueHistory color={historyFlyoutOpen ? euiTheme.colors.primary : euiTheme.colors.subduedText} />
                  </button>
                </EuiToolTip>
              </div>


            {/* ── Queue items — flat evidence rows ── */}
            {(() => {
              // Flat evidence list: all items except top-priority evidence (first of pending[0] sorted by attack first)
              const queueEvidenceRows = pending.flatMap((item, itemIdx) =>
                [...item.evidence]
                  .sort((a, b) => a.type === 'attack' ? -1 : b.type === 'attack' ? 1 : 0)
                  .map((ev, evIdx) => ({ ev, item, itemIdx, evIdx }))
              ).filter(({ itemIdx, evIdx }) => !(itemIdx === 0 && evIdx <= tpOffset))
               .filter(({ item }) => filterVersion === 'v1'
                 ? (severityFilter ? item.severity === severityFilter : true)
                 : (skillFilter ? item.skill === skillFilter : true)
               );

              if (queueEvidenceRows.length === 0) return (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: euiTheme.colors.subduedText, fontSize: 13 }}>
                  No items in this queue.
                </div>
              );

              return (
                <div>
                  {queueEvidenceRows.map(({ ev, item, itemIdx, evIdx }, rowIdx) => {
                    const isLast = rowIdx === queueEvidenceRows.length - 1;
                    const actionLabel = ev.actionLabel || item.approveLabel;
                    const rowKey = `${itemIdx}-${evIdx}`;
                    const isConfirming = queueConfirmKey === rowKey;
                    const isExecuting = queueExecutingKey === rowKey;
                    const isSuccess = queueSuccessKey === rowKey;

                    const handleQueueConfirm = () => {
                      setQueueConfirmKey(null);
                      setQueueExecutingKey(rowKey);
                      setTimeout(() => {
                        setQueueExecutingKey(null);
                        setQueueSuccessKey(rowKey);
                        setTimeout(() => {
                          setQueueSuccessKey(null);
                          handleExecuteDirect(item);
                        }, 1800);
                      }, 1500);
                    };

                    return (
                      <div key={rowKey} style={{
                        borderBottom: isLast ? 'none' : `1px solid ${euiTheme.colors.lightShade}`,
                        background: isConfirming ? `${euiTheme.colors.primary}06` : euiTheme.colors.emptyShade,
                        transition: 'background 0.15s',
                      }}>
                        {/* Main row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
                          {/* Expand icon */}
                          <button
                            onClick={() => setDetailFlyoutItem(item)}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center', flexShrink: 0, opacity: 1 }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          >
                            <IcExpand color="#69707D" />
                          </button>
                          {/* Left group: label + type tag + severity — takes all available space */}
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: euiTheme.colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flexShrink: 1 }}>
                              {ev.label}
                            </span>
                            {/* Type tag */}
                            <EuiBadge color="hollow" iconType={EVIDENCE_ICON[ev.type] || 'document'} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {EVIDENCE_TYPE_LABEL[ev.type] || ev.type}
                            </EuiBadge>
                            {/* Severity badge — only for alerts and cases */}
                            {(ev.type === 'alert' || ev.type === 'case') && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: SEV_BG[item.severity], color: SEV_COLOR[item.severity], whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {item.severity}
                              </span>
                            )}
                          </div>
                          {/* Assignees */}
                          {ev.assignees !== undefined && <AssignedTag assignees={ev.assignees} />}
                          {/* Action button — disabled while confirm panel is open */}
                          {actionLabel && !isExecuting && !isSuccess && (
                            <EuiButton size="s" color="primary" isDisabled={isConfirming} style={{ flexShrink: 0, fontSize: 12, height: 26, minHeight: 26 }}
                              onClick={() => { if (!isConfirming) { setQueueConfirmKey(rowKey); setQueueMenuKey(null); } }}>
                              {actionLabel}
                            </EuiButton>
                          )}
                          {isExecuting && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: euiTheme.colors.subduedText, flexShrink: 0 }}>
                              <span style={{ width: 14, height: 14, border: '2px solid #CAD3E2', borderTopColor: euiTheme.colors.primary, borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                              Executing...
                            </span>
                          )}
                          {isSuccess && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#006959', fontWeight: 500, flexShrink: 0 }}>
                              <EuiIcon type="checkInCircleFilled" color="success" size="s" />
                              Done
                            </span>
                          )}
                          {/* More button + dropdown */}
                          {!isExecuting && !isSuccess && (
                            <div style={{ position: 'relative', flexShrink: 0 }} data-queue-menu>
                              <button
                                onClick={() => { if (!isConfirming) setQueueMenuKey(prev => prev === rowKey ? null : rowKey); }}
                                style={{ padding: '0 6px', height: 28, borderRadius: 6, border: `1px solid ${euiTheme.colors.lightShade}`, background: queueMenuKey === rowKey ? euiTheme.colors.lightestShade : 'transparent', cursor: isConfirming ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', opacity: isConfirming ? 0.4 : 1 }}>
                                <EuiIcon type="boxesHorizontal" size="s" />
                              </button>
                              {queueMenuKey === rowKey && (
                                <div style={{
                                  position: 'absolute', top: 32, right: 0, zIndex: 300,
                                  background: euiTheme.colors.emptyShade,
                                  border: `1px solid ${euiTheme.colors.lightShade}`,
                                  borderRadius: euiTheme.border.radius.medium,
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                  minWidth: 140, padding: '4px 0',
                                }}>
                                  {[
                                    { label: 'Modify', icon: 'pencil', color: euiTheme.colors.text, action: () => { setModifyTarget(item); setQueueMenuKey(null); } },
                                    { label: 'Reject', icon: 'trash', color: euiTheme.colors.danger, action: () => { setRejectTarget(item); setQueueMenuKey(null); } },
                                  ].map(opt => (
                                    <button
                                      key={opt.label}
                                      onClick={opt.action}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        width: '100%', padding: '8px 12px', border: 'none',
                                        background: 'transparent', cursor: 'pointer',
                                        fontFamily: euiTheme.font.family, textAlign: 'left',
                                      }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade; }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                    >
                                      <EuiIcon type={opt.icon} size="s" color={opt.label === 'Reject' ? 'danger' : 'subdued'} />
                                      <span style={{ fontSize: 13, color: opt.color }}>{opt.label}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Inline confirm panel — same style as FeaturedItemCard */}
                        {isConfirming && (
                          <div style={{
                            padding: '12px 14px 14px 38px',
                            borderTop: `1px solid ${euiTheme.colors.primary}33`,
                            background: `${euiTheme.colors.primary}06`,
                            animation: 'rowExpand 0.2s cubic-bezier(0.4,0,0.2,1) forwards',
                            overflow: 'hidden',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                              <EuiIcon type="sparkles" size="s" color="primary" style={{ flexShrink: 0, marginTop: 2 }} />
                              <span style={{ fontSize: 12, color: euiTheme.colors.subduedText, fontFamily: euiTheme.font.family, lineHeight: 1.55 }}>
                                <strong style={{ color: euiTheme.colors.text }}>{actionLabel}</strong>
                                {' — '}
                                {item.approvalText}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                              <EuiButtonEmpty size="s" onClick={() => setQueueConfirmKey(null)}>Cancel</EuiButtonEmpty>
                              <EuiButton size="s" fill onClick={handleQueueConfirm}>Confirm action</EuiButton>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}


            </div>{/* /box 3 */}

            <div style={{ height: 24 }} />
          </div>
          </div>
        </div>
      </div>

      <HistoryFlyout
        open={historyFlyoutOpen}
        onClose={() => setHistoryFlyoutOpen(false)}
        tab={historyTab}
        onTabChange={setHistoryTab}
        resolvedHistory={resolvedHistory}
        confidenceThreshold={confidenceThreshold}
        onThresholdChange={setConfidenceThreshold}
        agentPanelOpen={agentPanelOpen}
      />
      {detailFlyoutItem && (
        <DetailFlyout
          item={detailFlyoutItem}
          onClose={() => setDetailFlyoutItem(null)}
          onApprove={(item) => { setDetailFlyoutItem(null); setApproveTarget(item); }}
        />
      )}
      {modals}
      <EuiGlobalToastList toasts={toasts} dismissToast={removeToast} toastLifeTimeMs={6000} />
    </div>
  );
};

// ─── Placeholder for other sections ──────────────────────────────────────────

const Placeholder: React.FC<{ title: string }> = ({ title }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: euiTheme.colors.subduedText, fontSize: 18 }}>
      {title}
    </div>
  );
};

// ─── AI Briefing conversations sidebar (B variant full-screen agent) ─────────

const AIBriefingConversationsPanel: React.FC<{
  currentQuery: string;
  onBack: () => void;
}> = ({ currentQuery, onBack }) => {
  const { euiTheme } = useEuiTheme();
  const [selectedId, setSelectedId] = React.useState('current');

  const threads = [
    { id: 'current', label: currentQuery || 'Brief me on this shift', time: 'Just now' },
    { id: 'prev1', label: 'Walk me through item #1', time: '2h ago' },
    { id: 'prev2', label: 'What should I prioritize?', time: 'Yesterday' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: euiTheme.font.family }}>
      {/* Header */}
      <div style={{ flexShrink: 0, padding: '12px 14px 10px', borderBottom: `1px solid ${euiTheme.colors.lightShade}` }}>
        <button onClick={onBack} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent',
          cursor: 'pointer', fontSize: 12, color: euiTheme.colors.subduedText, padding: '2px 0', marginBottom: 10,
          fontFamily: euiTheme.font.family,
        }}>
          <EuiIcon type="arrowLeft" size="s" /> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #1750BA 0%, #6B3C9F 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <EuiIcon type="sparkles" size="s" style={{ color: '#fff' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: euiTheme.colors.title }}>AI Briefing</span>
        </div>
      </div>

      {/* Section label */}
      <div style={{ padding: '12px 14px 6px', fontSize: 11, fontWeight: 600, color: euiTheme.colors.subduedText, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
        Conversations
      </div>

      {/* Thread list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
        {threads.map(t => (
          <button key={t.id} onClick={() => setSelectedId(t.id)} style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '9px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: selectedId === t.id ? `${euiTheme.colors.primary}10` : 'transparent',
            marginBottom: 2, fontFamily: euiTheme.font.family,
            transition: 'background 0.12s',
          }}
          onMouseEnter={ev => { if (selectedId !== t.id) (ev.currentTarget as HTMLElement).style.background = euiTheme.colors.lightestShade; }}
          onMouseLeave={ev => { if (selectedId !== t.id) (ev.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <div style={{ fontSize: 12, fontWeight: selectedId === t.id ? 600 : 400, color: selectedId === t.id ? euiTheme.colors.primary : euiTheme.colors.text, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.label}
            </div>
            <div style={{ fontSize: 11, color: euiTheme.colors.subduedText }}>{t.time}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── App entry point ──────────────────────────────────────────────────────────

const AIBriefingApp: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { colorMode, setColorMode } = useAppStore();
  const [activeNav, setActiveNav] = useState<ActiveNav>('ai_briefing');
  const [showSecondary, setShowSecondary] = useState(true);
  const protoVersion: 'v1' | 'v2' | 'v3' = 'v2';
  const setProtoVersion = (_v: 'v1' | 'v2' | 'v3') => {};
  const [filterVersion, setFilterVersion] = useState<'v1' | 'v2'>('v2');
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentFullScreen, setAgentFullScreen] = useState(false);
  const [sentQuery, setSentQuery] = useState('');
  const [agentQuery, setAgentQuery] = useState('');
  const onOpenAgent = (query: string) => {
    setSentQuery(query);
    setAgentOpen(true);
  };
  // Reset when closing
  React.useEffect(() => { if (!agentOpen) setSentQuery(''); }, [agentOpen]);
  React.useEffect(() => { if (!agentFullScreen) setSentQuery(''); }, [agentFullScreen]);
  const handleSendQuery = () => { if (!agentQuery.trim()) return; onOpenAgent(agentQuery); setAgentQuery(''); };

  const LAUNCHPAD_IDS = ['get_started', 'siem_readiness', 'value_report',
    'auto_migrations', 'translated_rules', 'translated_dashboards'];
  const isLaunchpad = LAUNCHPAD_IDS.includes(activeNav);

  // Count pending items for the badge — we pass 5 initially; AIBriefingContent manages its own state
  const [pendingCount, setPendingCount] = useState(5);

  // Security logo click → AI Briefing is the default Security page
  // If user has no AI license, this would open Get Started instead (simulated: always AI Briefing here)
  const handleSecurityLogoClick = () => {
    setActiveNav('ai_briefing');
  };

  const handleIconNavSelect = (id: string) => {
    if (id === 'launchpad') {
      setActiveNav('get_started');
      setShowSecondary(true);
    } else if (id === 'ai_briefing') {
      setActiveNav('ai_briefing');
      setShowSecondary(false);
    } else {
      setActiveNav(id as ActiveNav);
      setShowSecondary(false);
    }
  };

  const agentInputBar = (placeholder: string) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px 10px 14px',
      border: `1px solid ${euiTheme.colors.lightShade}`,
      borderRadius: 28, background: euiTheme.colors.body,
      boxShadow: agentQuery ? `0 0 0 2px ${euiTheme.colors.primary}22` : 'none',
      transition: 'box-shadow 0.2s',
    }}>
      <EuiIcon type="sparkles" color="primary" size="m" style={{ flexShrink: 0 }} />
      <input
        placeholder={placeholder}
        value={agentQuery}
        onChange={e => setAgentQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSendQuery(); }}
        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontFamily: euiTheme.font.family, color: euiTheme.colors.text }}
      />
      <button onClick={handleSendQuery} disabled={!agentQuery.trim()} style={{
        width: 32, height: 32, borderRadius: 16, border: 'none',
        background: agentQuery.trim() ? euiTheme.colors.primary : euiTheme.colors.lightShade,
        cursor: agentQuery.trim() ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s',
      }}>
        <EuiIcon type="arrowRight" size="s" style={{ color: agentQuery.trim() ? '#fff' : euiTheme.colors.subduedText }} />
      </button>
    </div>
  );

  const renderContent = () => {
    if (agentFullScreen) return <AgentSidePanel query={sentQuery} onClose={() => { setAgentFullScreen(false); }} />;
    if (activeNav === 'ai_briefing') return <AIBriefingContent onPendingChange={setPendingCount} protoVersion={protoVersion} setProtoVersion={setProtoVersion} onOpenAgent={onOpenAgent} agentInputBar={agentInputBar} agentPanelOpen={agentOpen} filterVersion={filterVersion} setFilterVersion={setFilterVersion} />;
    const labels: Record<string, string> = {
      get_started: 'Get started', siem_readiness: 'SIEM Readiness', value_report: 'Value report',
      auto_migrations: 'Manage automatic migrations', translated_rules: 'Translated rules',
      translated_dashboards: 'Translated dashboards',
      discover: 'Discover', dashboards: 'Dashboards', rules: 'Rules', detections: 'Detections',
      workflows: 'Workflows', agents: 'Agents', attack_discovery: 'Attack discovery', more: 'More',
    };
    return <Placeholder title={labels[activeNav] ?? activeNav} />;
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: euiTheme.colors.emptyShade }}>
      {/* Top bar — unified chrome zone with SegmentedControl injected on the right */}
      <div style={{ flexShrink: 0, background: '#F6F8FB' }}>
        <KibanaHeader
          colorMode={colorMode}
          onToggleColorMode={() => setColorMode(colorMode === 'light' ? 'dark' : 'light')}
          onAssistantClick={() => {}}
          rightContent={activeNav === 'ai_briefing' ? (
            <div style={{ display: 'inline-flex', padding: 2, borderRadius: 6, background: euiTheme.colors.lightestShade, border: `1px solid ${euiTheme.colors.lightShade}` }}>
              {(['v1', 'v2'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setFilterVersion(v)}
                  style={{
                    padding: '3px 12px', borderRadius: 4, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, fontFamily: euiTheme.font.family,
                    background: filterVersion === v ? euiTheme.colors.emptyShade : 'transparent',
                    color: filterVersion === v ? euiTheme.colors.primaryText : euiTheme.colors.subduedText,
                    boxShadow: filterVersion === v ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          ) : undefined}
          onAgentClick={() => onOpenAgent('Brief me on this shift')}
          agentOpen={agentOpen}
        />
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#F6F8FB', gap: 8, padding: '8px 8px 8px 0' }}>
        {/* Nav level 1 — icon sidebar */}
        <SecurityIconNav
          active={activeNav}
          onSelect={handleIconNavSelect}
          showSecondary={showSecondary}
          onToggleSecondary={() => setShowSecondary(s => !s)}
          onSecurityLogoClick={handleSecurityLogoClick}
        />

        {/* Nav level 2 — launchpad or AI Briefing conversations */}
        <div style={{
          width: (agentFullScreen || (isLaunchpad && showSecondary)) ? 228 : 0,
          flexShrink: 0, overflow: 'hidden',
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}>
          <div style={{ width: 220, height: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.10)' }}>
            {agentFullScreen ? (
              <AIBriefingConversationsPanel
                currentQuery={sentQuery}
                onBack={() => setAgentFullScreen(false)}
              />
            ) : isLaunchpad ? (
              <LaunchpadPanel
                active={activeNav}
                onSelect={id => setActiveNav(id as ActiveNav)}
                pendingCount={pendingCount}
                onCollapse={() => setShowSecondary(false)}
              />
            ) : null}
          </div>
        </div>

        {/* Main + input card column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
          {/* Main content card */}
          <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: euiTheme.colors.emptyShade, borderRadius: 8, border: '1px solid rgba(0,0,0,0.10)' }}>
            {renderContent()}
          </main>

          {/* Input bar — separate card, same column as the brief above — hidden in full-screen agent mode */}
          {!agentFullScreen && <div style={{
            flexShrink: 0, borderRadius: 8, border: '1px solid rgba(0,0,0,0.10)',
            background: euiTheme.colors.emptyShade, padding: '10px 24px 12px',
          }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            {/* Helpful actions — Nightshift style, solid chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: euiTheme.colors.subduedText, flexShrink: 0 }}>Helpful actions:</span>
              {[
                { label: 'Brief me', query: '__brief__' },
                { label: 'Walk me through item #1', query: 'Walk me through item #1' },
                { label: 'What should I prioritize?', query: 'What should I prioritize?' },
              ].map(({ label, query: q }) => (
                <button
                  key={label}
                  onClick={() => { if (q === '__brief__') { onOpenAgent(''); } else { onOpenAgent(q); } }}
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '4px 11px', borderRadius: 14, fontSize: 12,
                    border: `1px solid ${euiTheme.colors.lightShade}`,
                    background: euiTheme.colors.body, color: euiTheme.colors.text,
                    cursor: 'pointer', fontFamily: euiTheme.font.family,
                    transition: 'border-color 0.12s, background 0.12s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = euiTheme.colors.primary;
                    (e.currentTarget as HTMLElement).style.color = euiTheme.colors.primary;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = euiTheme.colors.lightShade;
                    (e.currentTarget as HTMLElement).style.color = euiTheme.colors.text;
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {agentInputBar('Welcome to Nightshift, you can start by asking questions or giving tasks')}
          </div>{/* /maxWidth centering */}
          </div>}
        </div>{/* /main+input column */}

        {/* Agent panel card — same pattern as nav2, pushes main content */}
        <div data-persistent-panel style={{
          width: agentOpen ? 408 : 0,
          flexShrink: 0, overflow: 'hidden',
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}>
          <div style={{ width: 400, height: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.10)', background: euiTheme.colors.emptyShade }}>
            {agentOpen && <AgentSidePanel query={sentQuery} onClose={() => setAgentOpen(false)} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIBriefingApp;
