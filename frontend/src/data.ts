import { NodeData, EdgeData, EventData, EntityResolutionData, EvidenceItem, Hypothesis, NextEvidence } from './types';

// --- INVESTIGATION GRAPH: Vehicle Investigation Case #104 ---

export const mockNodes: NodeData[] = [
  // Core persons
  { id: 'n1', label: 'PERSON A', type: 'person', x: 400, y: 280, riskScore: 9.2, connections: 12, cases: 3, description: 'Primary suspect. Owner of WB12AB1234.', evidence: ['ev1', 'ev2', 'ev3'] },
  { id: 'n2', label: 'PERSON B', type: 'person', x: 680, y: 480, riskScore: 7.8, connections: 8, cases: 2, description: 'Associate of Person A. Identified near Case #287.', evidence: ['ev4', 'ev5'] },
  { id: 'n3', label: 'P-037', type: 'person', x: 550, y: 160, riskScore: 9.6, connections: 47, cases: 4, description: 'Critical bridge entity between Case 104 and Case 287.', evidence: ['ev2', 'ev5', 'ev6'] },

  // Vehicle
  { id: 'n4', label: 'WB12AB1234', type: 'vehicle', x: 260, y: 420, riskScore: 7.5, connections: 5, cases: 1, description: 'Vehicle seen in CCTV CAM-04 near Case #104 location. Registered to Person A.', evidence: ['ev1', 'ev3'] },

  // Locations
  { id: 'n5', label: 'KOLKATA / L-09', type: 'location', x: 130, y: 550, riskScore: 5.2, connections: 6, cases: 2, description: 'Key geographic link. Shared by 2 cases.', evidence: ['ev1'] },
  { id: 'n6', label: 'CCTV CAM-04', type: 'evidence', x: 160, y: 310, riskScore: 4.8, connections: 3, cases: 1, description: 'CCTV footage from Aug 14. Vehicle WB12AB1234 captured.', evidence: ['ev3'] },

  // Accounts & Transactions
  { id: 'n7', label: 'ACCT-8921', type: 'account', x: 660, y: 260, riskScore: 8.1, connections: 9, cases: 2, description: 'Account linked to P-037. Large transaction detected.', evidence: ['ev5'] },
  { id: 'n8', label: 'ACCT-4491', type: 'account', x: 800, y: 380, riskScore: 6.3, connections: 5, cases: 1, description: 'Offshore account. Recipient of funds from ACCT-8921.', evidence: ['ev6'] },
  { id: 'n9', label: 'TXN-∑5.2M', type: 'transaction', x: 740, y: 560, riskScore: 9.0, connections: 4, cases: 2, description: 'Large suspicious transfer of ₹5.2M on Aug 14.', evidence: ['ev5', 'ev6'] },

  // Phone
  { id: 'n10', label: 'PHONE-X7192', type: 'phone', x: 440, y: 520, riskScore: 6.7, connections: 6, cases: 2, description: 'Phone active near Case #104 location. Linked to both Person A and P-037.', evidence: ['ev2', 'ev4'] },

  // Ghost / Missing
  { id: 'n11', label: 'GHOST-∅', type: 'ghost', x: 320, y: 160, riskScore: 8.4, isGhost: true, connections: 0, cases: 0, description: 'AI hypothesis: Potential missing intermediary between Person A and P-037 based on temporal gaps.', evidence: [] },

  // Case nodes
  { id: 'n12', label: 'CASE #104', type: 'case', x: 550, y: 640, riskScore: 7.0, connections: 8, cases: 1, description: 'Primary cybercrime case. Multiple entities linked.', evidence: ['ev1', 'ev2', 'ev3', 'ev4', 'ev5'] },
  { id: 'n13', label: 'CASE #287', type: 'case', x: 680, y: 140, riskScore: 6.5, connections: 5, cases: 1, description: 'Secondary case. Potentially linked via P-037.', evidence: ['ev6'] },

  // Device
  { id: 'n14', label: 'DEV-IP-22', type: 'device', x: 880, y: 240, riskScore: 5.1, connections: 4, cases: 1, description: 'Shared IP device. Used by multiple suspects.', evidence: ['ev4'] },
];

export const mockEdges: EdgeData[] = [
  { id: 'e1', source: 'n1', target: 'n4', type: 'owns', weight: 4, label: 'Owns', confidence: 0.95, evidenceIds: ['ev1', 'ev3'] },
  { id: 'e2', source: 'n4', target: 'n5', type: 'appears_at', weight: 3, label: 'Appears At', confidence: 0.88, evidenceIds: ['ev3'] },
  { id: 'e3', source: 'n4', target: 'n6', type: 'identified_by', weight: 3, label: 'Captured By', confidence: 0.97, evidenceIds: ['ev3'] },
  { id: 'e4', source: 'n4', target: 'n12', type: 'part_of', weight: 2, label: 'Part of Case', confidence: 0.90 },
  { id: 'e5', source: 'n1', target: 'n10', type: 'calls', weight: 3, label: 'Uses Phone', confidence: 0.82, evidenceIds: ['ev2'] },
  { id: 'e6', source: 'n10', target: 'n3', type: 'communication', weight: 4, label: 'Calls', confidence: 0.75, evidenceIds: ['ev2'] },
  { id: 'e7', source: 'n3', target: 'n7', type: 'linked_to', weight: 4, label: 'Controls', confidence: 0.88, evidenceIds: ['ev5'] },
  { id: 'e8', source: 'n7', target: 'n9', type: 'transaction', weight: 5, label: '₹5.2M Transfer', confidence: 0.99, evidenceIds: ['ev5'] },
  { id: 'e9', source: 'n9', target: 'n8', type: 'transaction', weight: 4, label: 'To Account', confidence: 0.99, evidenceIds: ['ev6'] },
  { id: 'e10', source: 'n2', target: 'n8', type: 'linked_to', weight: 3, label: 'Controls', confidence: 0.71, evidenceIds: ['ev6'] },
  { id: 'e11', source: 'n2', target: 'n12', type: 'part_of', weight: 2, label: 'Linked to Case', confidence: 0.78 },
  { id: 'e12', source: 'n3', target: 'n12', type: 'part_of', weight: 3, label: 'Bridge to Case', confidence: 0.92 },
  { id: 'e13', source: 'n3', target: 'n13', type: 'part_of', weight: 3, label: 'Bridge to Case', confidence: 0.85 },
  { id: 'e14', source: 'n3', target: 'n14', type: 'shared_device', weight: 2, label: 'Uses Device', confidence: 0.68, evidenceIds: ['ev4'] },
  { id: 'e15', source: 'n1', target: 'n11', type: 'inferred', weight: 1, label: 'Possible Link', confidence: 0.45 },
  { id: 'e16', source: 'n11', target: 'n3', type: 'inferred', weight: 1, label: 'Possible Link', confidence: 0.45 },
  { id: 'e17', source: 'n1', target: 'n5', type: 'located_at', weight: 2, label: 'Located At', confidence: 0.80 },
];

export const mockEvents: EventData[] = [
  { id: 'ev1', timestamp: '2026-08-14T09:00:00Z', title: 'Vehicle Spotted', description: 'WB12AB1234 seen near Case #104 location (Kolkata). Confirmed by CCTV CAM-04.', relatedNodes: ['n4', 'n5', 'n6'], type: 'vehicle', confidence: 0.97 },
  { id: 'ev2', timestamp: '2026-08-14T11:32:04Z', title: 'Suspect Communication', description: 'PHONE-X7192 (linked to Person A) places call to P-037. Duration: 14 min.', relatedNodes: ['n1', 'n10', 'n3'], type: 'communication', confidence: 0.82 },
  { id: 'ev3', timestamp: '2026-08-14T14:20:00Z', title: 'CCTV Event — Person Enters Vehicle', description: 'CCTV CAM-04: Person A enters WB12AB1234. Departs at 14:33.', relatedNodes: ['n1', 'n4', 'n6'], type: 'vehicle', confidence: 0.95 },
  { id: 'ev4', timestamp: '2026-08-16T08:45:00Z', title: 'Shared Device Access', description: 'DEV-IP-22 accessed by multiple suspects. IP flagged.', relatedNodes: ['n3', 'n14'], type: 'alert', confidence: 0.68 },
  { id: 'ev5', timestamp: '2026-08-17T15:10:00Z', title: 'Large Transaction', description: '₹5.2M transferred from ACCT-8921 (linked to P-037) via unknown channel.', relatedNodes: ['n7', 'n9', 'n3'], type: 'transaction', confidence: 0.99 },
  { id: 'ev6', timestamp: '2026-08-19T21:00:00Z', title: 'Offshore Transfer', description: 'Funds reached ACCT-4491 (offshore). Person B identified as controller.', relatedNodes: ['n8', 'n2', 'n9'], type: 'transaction', confidence: 0.99 },
  { id: 'ev7', timestamp: '2026-08-22T07:30:00Z', title: 'Ghost Node Signal', description: 'AI detected temporal gap and structural anomaly between Person A and P-037. Potential intermediary.', relatedNodes: ['n1', 'n11', 'n3'], type: 'alert', confidence: 0.45 },
];

export const mockEntityResolution: EntityResolutionData = {
  id: 'er1',
  entityA: { id: 'rec_881', name: 'J. DOE (ALIAS)', phone: '+91-9800-192-001', location: 'KOLKATA, WB', dob: '1985-04-12' },
  entityB: { id: 'rec_992', name: 'JOHN DOE', phone: '+91-9800-192-001', location: 'SALT LAKE, KOLKATA', dob: '1985-04-12' },
  similarityScore: 0.94,
  matches: ['Phone Number', 'Date of Birth', 'Last Name', 'City'],
  conflicts: ['First Name Precision', 'Location Scope']
};

// --- EVIDENCE HUB ---
export const mockEvidence: EvidenceItem[] = [
  {
    id: 'evi1', name: 'WB12AB1234.jpg', type: 'vehicle', status: 'done', progress: 100, size: '2.4 MB',
    extractedEntities: [
      { id: 'ee1', label: 'WB12AB1234', type: 'vehicle', confidence: 0.97, sourceEvidenceId: 'evi1', addedToGraph: true },
      { id: 'ee2', label: 'Kolkata / L-09', type: 'location', confidence: 0.82, sourceEvidenceId: 'evi1', addedToGraph: true },
    ]
  },
  {
    id: 'evi2', name: 'CCTV_CAM04_Aug14.mp4', type: 'video', status: 'done', progress: 100, size: '124 MB',
    extractedEntities: [
      { id: 'ee3', label: 'PERSON A', type: 'person', confidence: 0.91, sourceEvidenceId: 'evi2', addedToGraph: true },
      { id: 'ee4', label: 'WB12AB1234', type: 'vehicle', confidence: 0.95, sourceEvidenceId: 'evi2', addedToGraph: true },
      { id: 'ee5', label: 'CCTV CAM-04', type: 'evidence', confidence: 0.99, sourceEvidenceId: 'evi2', addedToGraph: true },
    ]
  },
  {
    id: 'evi3', name: 'case_104_FIR.pdf', type: 'document', status: 'done', progress: 100, size: '892 KB',
    extractedEntities: [
      { id: 'ee6', label: 'PERSON A', type: 'person', confidence: 0.98, sourceEvidenceId: 'evi3', addedToGraph: true },
      { id: 'ee7', label: 'CASE #104', type: 'case', confidence: 0.99, sourceEvidenceId: 'evi3', addedToGraph: true },
      { id: 'ee8', label: '+91-9800-192-001', type: 'phone', confidence: 0.94, sourceEvidenceId: 'evi3', addedToGraph: false },
    ]
  },
  {
    id: 'evi4', name: 'call_records_aug.csv', type: 'phone', status: 'done', progress: 100, size: '45 KB',
    extractedEntities: [
      { id: 'ee9', label: 'PHONE-X7192', type: 'phone', confidence: 0.99, sourceEvidenceId: 'evi4', addedToGraph: true },
      { id: 'ee10', label: 'P-037', type: 'person', confidence: 0.76, sourceEvidenceId: 'evi4', addedToGraph: true },
    ]
  },
  {
    id: 'evi5', name: 'transactions_aug.csv', type: 'account', status: 'done', progress: 100, size: '212 KB',
    extractedEntities: [
      { id: 'ee11', label: 'ACCT-8921', type: 'account', confidence: 0.99, sourceEvidenceId: 'evi5', addedToGraph: true },
      { id: 'ee12', label: 'ACCT-4491', type: 'account', confidence: 0.99, sourceEvidenceId: 'evi5', addedToGraph: true },
      { id: 'ee13', label: 'TXN-∑5.2M', type: 'transaction', confidence: 0.99, sourceEvidenceId: 'evi5', addedToGraph: true },
    ]
  },
  {
    id: 'evi6', name: 'suspect_audio_recording.mp3', type: 'audio', status: 'processing', progress: 67, size: '18 MB',
    extractedEntities: [
      { id: 'ee14', label: 'SPEAKER A', type: 'person', confidence: 0.71, sourceEvidenceId: 'evi6', addedToGraph: false },
    ]
  },
];

// --- AI INSIGHTS ---
export const mockHypotheses: Hypothesis[] = [
  {
    id: 'h1',
    title: 'Missing Intermediary Between Person A & P-037',
    description: 'AI has detected a structural gap in the communication chain. Person A and P-037 appear connected via an undiscovered entity.',
    type: 'ghost_node',
    confidence: 0.45,
    supportingSignals: ['Shared location (Kolkata)', 'Temporal correlation Aug 14', 'Related communication event via PHONE-X7192', 'Financial flow pattern matches'],
    affectedNodes: ['n1', 'n11', 'n3'],
    status: 'active',
  },
  {
    id: 'h2',
    title: 'Case 104 ↔ Case 287 — Linked via P-037',
    description: 'P-037 may be the primary bridge between two separate investigations. Confirming this link would be a breakthrough.',
    type: 'cross_case',
    confidence: 0.85,
    supportingSignals: ['P-037 appears in both case records', 'ACCT-8921 transaction flows into Case 287 territory', '3 shared device fingerprints'],
    affectedNodes: ['n3', 'n12', 'n13'],
    status: 'active',
  },
  {
    id: 'h3',
    title: 'Person B Controls ACCT-4491 via Proxy',
    description: 'Behavioral pattern suggests Person B is the real controller of the offshore account, using an intermediary signature.',
    type: 'pattern',
    confidence: 0.71,
    supportingSignals: ['Login timing correlates with Person B activity', 'Communication event precedes every transaction', 'Same device fingerprint as Person B device'],
    affectedNodes: ['n2', 'n8'],
    status: 'active',
  },
];

export const mockNextEvidence: NextEvidence[] = [
  {
    id: 'ne1',
    title: 'Device D-917',
    description: 'Analyzing this device could explain 7 undocumented relationships and confirm the Ghost Node hypothesis.',
    impact: 'high',
    relationships: 7,
    hypothesesAffected: 2,
    type: 'device',
  },
  {
    id: 'ne2',
    title: 'Location L-09 CCTV Archive',
    description: 'Additional CCTV footage from Kolkata could confirm the Aug 14 timeline and locate the ghost intermediary.',
    impact: 'high',
    relationships: 5,
    hypothesesAffected: 1,
    type: 'location',
  },
  {
    id: 'ne3',
    title: 'Account A-221 Records',
    description: 'Could distinguish between 2 competing hypotheses about the offshore flow destination.',
    impact: 'medium',
    relationships: 4,
    hypothesesAffected: 1,
    type: 'account',
  },
  {
    id: 'ne4',
    title: 'P-037 Phone Records (Full CDR)',
    description: 'Complete call detail records for P-037 could reveal the missing Case 287 connection.',
    impact: 'high',
    relationships: 12,
    hypothesesAffected: 2,
    type: 'phone',
  },
];

export interface CrimeIncident {
  id: string;
  type: string;
  severity: "Low" | "Medium" | "High";
  location: string;
  lat: number;
  lng: number;
  date: string;
  status: string;
}

export const crimeIncidents: CrimeIncident[] = [
  {
    id: "CR-001",
    type: "Robbery",
    severity: "High",
    location: "Park Street",
    lat: 22.5535,
    lng: 88.3525,
    date: "2026-08-25",
    status: "Under Investigation",
  },

  {
    id: "CR-002",
    type: "Theft",
    severity: "Medium",
    location: "Park Street",
    lat: 22.5542,
    lng: 88.3531,
    date: "2026-08-24",
    status: "Open",
  },

  {
    id: "CR-003",
    type: "Assault",
    severity: "High",
    location: "Park Street",
    lat: 22.5528,
    lng: 88.3518,
    date: "2026-08-22",
    status: "Under Investigation",
  },

  {
    id: "CR-004",
    type: "Theft",
    severity: "Medium",
    location: "Salt Lake",
    lat: 22.5867,
    lng: 88.4170,
    date: "2026-08-23",
    status: "Open",
  },

  {
    id: "CR-005",
    type: "Robbery",
    severity: "High",
    location: "Salt Lake",
    lat: 22.5875,
    lng: 88.4182,
    date: "2026-08-21",
    status: "Under Investigation",
  },

  {
    id: "CR-006",
    type: "Burglary",
    severity: "Medium",
    location: "Howrah",
    lat: 22.5958,
    lng: 88.2636,
    date: "2026-08-20",
    status: "Open",
  },

  {
    id: "CR-007",
    type: "Robbery",
    severity: "High",
    location: "Howrah",
    lat: 22.5965,
    lng: 88.2645,
    date: "2026-08-18",
    status: "Under Investigation",
  },

  {
    id: "CR-008",
    type: "Cyber Crime",
    severity: "High",
    location: "New Town",
    lat: 22.5797,
    lng: 88.4590,
    date: "2026-08-19",
    status: "Open",
  },

  {
    id: "CR-009",
    type: "Theft",
    severity: "Low",
    location: "Ballygunge",
    lat: 22.5285,
    lng: 88.3655,
    date: "2026-08-17",
    status: "Closed",
  },

  {
    id: "CR-010",
    type: "Assault",
    severity: "High",
    location: "Esplanade",
    lat: 22.5667,
    lng: 88.3500,
    date: "2026-08-16",
    status: "Under Investigation",
  },
];
