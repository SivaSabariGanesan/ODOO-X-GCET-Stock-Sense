import { Adjustment, CreateAdjustmentInput, AdjustmentStatus, AdjustmentReason } from './types'

export const ADJUSTMENT_REASONS: AdjustmentReason[] = [
  'Annual Physical Count',
  'Damage / Breakage',
  'Theft / Missing',
  'Found Inventory',
  'Data Entry Correction',
  'Expired / Spoilage',
  'Scrap',
  'Routine Shelf Audit',
]

export const ADJUSTMENT_WAREHOUSES = [
  {
    id: 'WH01',
    name: 'WH01 — Main Central Warehouse',
    locations: [
      'WH01/Rack A',
      'WH01/Rack B',
      'WH01/Production Floor',
      'WH01/Inbound Staging',
      'WH01/Outbound Dock',
    ],
  },
  {
    id: 'WH02',
    name: 'WH02 — North Distribution Hub',
    locations: [
      'WH02/Staging Area 1',
      'WH02/Rack 04',
      'WH02/Unloading Bay',
      'WH02/Dispatch Staging',
    ],
  },
  {
    id: 'WH03',
    name: 'WH03 — Cold Storage Facility',
    locations: [
      'WH03/Zone C-1',
      'WH03/Cold Intake Staging',
      'WH03/Deep Freeze Bay',
    ],
  },
]

export const INITIAL_ADJUSTMENTS: Adjustment[] = [
  {
    id: 'adj-001',
    adjustmentNumber: 'WH/ADJ/00035',
    productId: 'prod-001',
    productSku: 'SKU-ERG-904',
    productName: 'Ergonomic Task Chair (Mesh Black)',
    warehouseId: 'WH01',
    warehouseName: 'WH01 — Main Central Warehouse',
    location: 'WH01/Rack A',
    systemQuantity: 100,
    countedQuantity: 97,
    difference: -3,
    unit: 'pcs',
    reason: 'Annual Physical Count',
    notes: '3 units found with cracked caster assemblies in aisle 4. Quarantined for scrap evaluation.',
    status: 'draft',
    createdDate: '2026-09-26',
    adjustedBy: 'Alex Mercer',
    timeline: [
      {
        id: 'tl-adj-1',
        timestamp: '2026-09-26 10:30',
        title: 'Draft Adjustment Recorded',
        description: 'Physical cycle count variance logged: System 100 pcs vs Counted 97 pcs (diff: -3 pcs).',
        user: 'Alex Mercer',
        statusTo: 'draft',
      },
    ],
  },
  {
    id: 'adj-002',
    adjustmentNumber: 'WH/ADJ/00034',
    productId: 'prod-005',
    productSku: 'SKU-PLT-008',
    productName: 'Euro Pallet Hardwood Treated 120x80',
    warehouseId: 'WH02',
    warehouseName: 'WH02 — North Distribution Hub',
    location: 'WH02/Staging Area 1',
    systemQuantity: 5,
    countedQuantity: 4,
    difference: -1,
    unit: 'units',
    reason: 'Damage / Breakage',
    notes: 'Forklift blade impact damaged base runner beyond structural tolerance.',
    status: 'done',
    createdDate: '2026-09-25',
    validatedDate: '2026-09-25 15:45',
    adjustedBy: 'Marcus Chen',
    timeline: [
      {
        id: 'tl-adj-2',
        timestamp: '2026-09-25 14:20',
        title: 'Discrepancy Reported',
        description: 'Forklift incident report logged with warehouse supervisor.',
        user: 'Marcus Chen',
      },
      {
        id: 'tl-adj-3',
        timestamp: '2026-09-25 15:45',
        title: 'Adjustment Validated',
        description: 'Inventory balance adjusted by -1 units at WH02/Staging Area 1.',
        user: 'Alex Mercer',
        statusFrom: 'draft',
        statusTo: 'done',
      },
    ],
  },
  {
    id: 'adj-003',
    adjustmentNumber: 'WH/ADJ/00036',
    productId: 'prod-010',
    productSku: 'SKU-ALU-501',
    productName: 'Extruded Aluminum Profile 40x40 T-Slot 2m',
    warehouseId: 'WH01',
    warehouseName: 'WH01 — Main Central Warehouse',
    location: 'WH01/Production Floor',
    systemQuantity: 400,
    countedQuantity: 420,
    difference: 20,
    unit: 'meters',
    reason: 'Found Inventory',
    notes: 'Unlabeled bundle from previous shift fabrication identified during floor sweep.',
    status: 'done',
    createdDate: '2026-09-24',
    validatedDate: '2026-09-24 16:30',
    adjustedBy: 'David Miller',
    timeline: [
      {
        id: 'tl-adj-4',
        timestamp: '2026-09-24 15:00',
        title: 'Surplus Count Logged',
        description: '+20 meters found unallocated near cutting station 2.',
        user: 'David Miller',
      },
      {
        id: 'tl-adj-5',
        timestamp: '2026-09-24 16:30',
        title: 'Adjustment Validated',
        description: 'Stock increased by +20 meters at WH01/Production Floor.',
        user: 'David Miller',
        statusFrom: 'draft',
        statusTo: 'done',
      },
    ],
  },
  {
    id: 'adj-004',
    adjustmentNumber: 'WH/ADJ/00037',
    productId: 'prod-008',
    productSku: 'SKU-OFF-219',
    productName: 'Thermal Shipping Label Rolls 4x6 (500/roll)',
    warehouseId: 'WH01',
    warehouseName: 'WH01 — Main Central Warehouse',
    location: 'WH01/Rack B',
    systemQuantity: 10,
    countedQuantity: 6,
    difference: -4,
    unit: 'rolls',
    reason: 'Scrap',
    notes: 'Water exposure from sprinkler inspection test damaged packaging.',
    status: 'draft',
    createdDate: '2026-09-23',
    adjustedBy: 'Alex Mercer',
    timeline: [
      {
        id: 'tl-adj-6',
        timestamp: '2026-09-23 11:15',
        title: 'Draft Adjustment Recorded',
        description: 'Awaiting facilities insurance claim review before final stock write-off.',
        user: 'Alex Mercer',
      },
    ],
  },
  {
    id: 'adj-005',
    adjustmentNumber: 'WH/ADJ/00032',
    productId: 'prod-002',
    productSku: 'SKU-DKS-301',
    productName: 'Motorized Standing Desk Frame 140cm',
    warehouseId: 'WH01',
    warehouseName: 'WH01 — Main Central Warehouse',
    location: 'WH01/Rack B',
    systemQuantity: 28,
    countedQuantity: 28,
    difference: 0,
    unit: 'pcs',
    reason: 'Routine Shelf Audit',
    notes: 'Quarterly audit confirmed 100% stock accuracy in Rack B high-bay storage.',
    status: 'done',
    createdDate: '2026-09-20',
    validatedDate: '2026-09-20 17:00',
    adjustedBy: 'Elena Rostova',
    timeline: [
      {
        id: 'tl-adj-7',
        timestamp: '2026-09-20 16:30',
        title: 'Shelf Audit Conducted',
        description: 'Physical count exactly matches system balance (28 pcs).',
        user: 'Elena Rostova',
      },
      {
        id: 'tl-adj-8',
        timestamp: '2026-09-20 17:00',
        title: 'Audit Confirmed',
        description: 'Reconciled with zero variance.',
        user: 'Elena Rostova',
        statusFrom: 'draft',
        statusTo: 'done',
      },
    ],
  },
  {
    id: 'adj-006',
    adjustmentNumber: 'WH/ADJ/00031',
    productId: 'prod-007',
    productSku: 'SKU-SEN-910',
    productName: 'Temperature & Humidity IoT Telemetry Probe',
    warehouseId: 'WH03',
    warehouseName: 'WH03 — Cold Storage Facility',
    location: 'WH03/Zone C-1',
    systemQuantity: 10,
    countedQuantity: 8,
    difference: -2,
    unit: 'pcs',
    reason: 'Theft / Missing',
    notes: 'Missing probes were found in QA testing lab. Adjustment canceled.',
    status: 'cancelled',
    createdDate: '2026-09-19',
    adjustedBy: 'Elena Rostova',
    timeline: [
      {
        id: 'tl-adj-9',
        timestamp: '2026-09-19 09:00',
        title: 'Adjustment Initiated',
        description: '2 probes not found at bin location.',
        user: 'Elena Rostova',
      },
      {
        id: 'tl-adj-10',
        timestamp: '2026-09-19 14:00',
        title: 'Adjustment Canceled',
        description: 'Items located in calibration fixture bay.',
        user: 'Elena Rostova',
        statusFrom: 'draft',
        statusTo: 'cancelled',
      },
    ],
  },
]

let adjustmentsStore = [...INITIAL_ADJUSTMENTS]

export function getMockAdjustments(): Adjustment[] {
  return [...adjustmentsStore]
}

export function getMockAdjustmentById(id: string): Adjustment | undefined {
  return adjustmentsStore.find((a) => a.id === id || a.adjustmentNumber === id)
}

export function createMockAdjustment(input: CreateAdjustmentInput): Adjustment {
  const nextNum = (adjustmentsStore.length + 38).toString().padStart(5, '0')
  const diff = input.countedQuantity - input.systemQuantity

  const newAdjustment: Adjustment = {
    id: `adj-${Date.now().toString().slice(-4)}`,
    adjustmentNumber: `WH/ADJ/${nextNum}`,
    productId: input.productId,
    productSku: input.productSku,
    productName: input.productName,
    warehouseId: input.warehouseId,
    warehouseName: input.warehouseName,
    location: input.location,
    systemQuantity: input.systemQuantity,
    countedQuantity: input.countedQuantity,
    difference: diff,
    unit: input.unit,
    reason: input.reason,
    notes: input.notes,
    status: input.status,
    createdDate: new Date().toISOString().split('T')[0],
    validatedDate: input.status === 'done' ? new Date().toISOString().replace('T', ' ').slice(0, 16) : undefined,
    adjustedBy: 'Alex Mercer',
    timeline: [
      {
        id: `tl-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        title: input.status === 'done' ? 'Adjustment Created & Validated' : 'Draft Count Recorded',
        description: `Count recorded: System ${input.systemQuantity} ${input.unit} vs Counted ${input.countedQuantity} ${input.unit} (Variance: ${diff >= 0 ? '+' : ''}${diff} ${input.unit}). Reason: ${input.reason}.`,
        user: 'Alex Mercer',
        statusTo: input.status,
      },
    ],
  }

  adjustmentsStore = [newAdjustment, ...adjustmentsStore]
  return newAdjustment
}

export function updateAdjustmentStatus(
  id: string,
  newStatus: AdjustmentStatus,
  user = 'Alex Mercer'
): Adjustment | undefined {
  const target = adjustmentsStore.find((a) => a.id === id)
  if (!target) return undefined

  const updated: Adjustment = {
    ...target,
    status: newStatus,
    validatedDate: newStatus === 'done' ? new Date().toISOString().replace('T', ' ').slice(0, 16) : target.validatedDate,
    timeline: [
      ...target.timeline,
      {
        id: `tl-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        title: `Status Changed to ${newStatus.toUpperCase()}`,
        description:
          newStatus === 'done'
            ? `Physical count confirmed. Discrepancy of ${target.difference >= 0 ? '+' : ''}${target.difference} ${target.unit} reconciled.`
            : `Adjustment status updated to ${newStatus}.`,
        user,
        statusFrom: target.status,
        statusTo: newStatus,
      },
    ],
  }

  adjustmentsStore = adjustmentsStore.map((a) => (a.id === id ? updated : a))
  return updated
}
