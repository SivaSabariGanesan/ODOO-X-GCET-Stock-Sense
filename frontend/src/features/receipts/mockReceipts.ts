import { Receipt, CreateReceiptInput, ReceiptStatus } from './types'

export const SUPPLIERS = [
  'Apex Microtech Ltd',
  'Nordic Timber Co.',
  'ErgoFab Industries',
  'DeskCraft Ltd',
  'MountTech Corp',
  'Packaging Direct International',
  'Apex Metal Works',
]

export const RECEIPT_WAREHOUSES = [
  { id: 'WH01', name: 'WH01 — Main Central Warehouse', defaultLocation: 'WH01/Inbound Staging' },
  { id: 'WH02', name: 'WH02 — North Distribution Hub', defaultLocation: 'WH02/Unloading Bay' },
  { id: 'WH03', name: 'WH03 — Cold Storage Facility', defaultLocation: 'WH03/Cold Intake Staging' },
]

export const INITIAL_RECEIPTS: Receipt[] = [
  {
    id: 'rec-001',
    receiptNumber: 'WH/IN/00142',
    supplier: 'Apex Microtech Ltd',
    supplierReference: 'PO-8842',
    warehouseId: 'WH01',
    warehouseName: 'WH01 — Main Central Warehouse',
    destinationLocation: 'WH01/Inbound Staging',
    itemCount: 2,
    totalQuantity: 320,
    scheduledDate: 'Today, 14:00',
    createdDate: '2026-09-26',
    status: 'ready',
    notes: 'Priority air freight consignment. Inspect outer carton seals upon unloading.',
    lines: [
      {
        id: 'line-001',
        productId: 'prod-003',
        productSku: 'SKU-CBL-102',
        productName: 'Braided Thunderbolt 4 Cable 2m',
        destinationLocation: 'WH01/Inbound Staging',
        quantity: 120,
        receivedQuantity: 120,
        unit: 'pcs',
      },
      {
        id: 'line-002',
        productId: 'prod-006',
        productSku: 'SKU-MON-881',
        productName: 'Dual Arm VESA Monitor Mount Heavy-Duty',
        destinationLocation: 'WH01/Inbound Staging',
        quantity: 200,
        receivedQuantity: 200,
        unit: 'pcs',
      },
    ],
    timeline: [
      {
        id: 'tl-1',
        timestamp: '2026-09-26 09:15',
        title: 'Receipt Created',
        description: 'PO-8842 imported from procurement workflow.',
        user: 'D. Miller',
      },
      {
        id: 'tl-2',
        timestamp: '2026-09-26 11:30',
        title: 'Status Updated to Ready',
        description: 'Dock door 04 assigned. Inbound unloading staging verified.',
        user: 'D. Miller',
        statusFrom: 'draft',
        statusTo: 'ready',
      },
    ],
  },
  {
    id: 'rec-002',
    receiptNumber: 'WH/IN/00143',
    supplier: 'Nordic Timber Co.',
    supplierReference: 'PO-8845',
    warehouseId: 'WH02',
    warehouseName: 'WH02 — North Distribution Hub',
    destinationLocation: 'WH02/Unloading Bay',
    itemCount: 1,
    totalQuantity: 500,
    scheduledDate: 'Tomorrow, 09:30',
    createdDate: '2026-09-25',
    status: 'draft',
    notes: 'Treated softwood pallets for regional distribution buffer.',
    lines: [
      {
        id: 'line-003',
        productId: 'prod-005',
        productSku: 'SKU-PLT-008',
        productName: 'Euro Pallet Hardwood Treated 120x80',
        destinationLocation: 'WH02/Unloading Bay',
        quantity: 500,
        receivedQuantity: 0,
        unit: 'units',
      },
    ],
    timeline: [
      {
        id: 'tl-3',
        timestamp: '2026-09-25 15:40',
        title: 'Receipt Draft Created',
        description: 'Vendor confirmation pending dispatch tracking number.',
        user: 'M. Chen',
      },
    ],
  },
  {
    id: 'rec-003',
    receiptNumber: 'WH/IN/00141',
    supplier: 'Apex Metal Works',
    supplierReference: 'PO-8840',
    warehouseId: 'WH01',
    warehouseName: 'WH01 — Main Central Warehouse',
    destinationLocation: 'WH01/Production Floor',
    itemCount: 1,
    totalQuantity: 350,
    scheduledDate: '2026-09-26 11:15',
    createdDate: '2026-09-24',
    status: 'done',
    notes: 'Structural frame extrusions inspected and signed off by quality control.',
    lines: [
      {
        id: 'line-004',
        productId: 'prod-010',
        productSku: 'SKU-ALU-501',
        productName: 'Extruded Aluminum Profile 40x40 T-Slot 2m',
        destinationLocation: 'WH01/Production Floor',
        quantity: 350,
        receivedQuantity: 350,
        unit: 'meters',
      },
    ],
    timeline: [
      {
        id: 'tl-4',
        timestamp: '2026-09-24 10:00',
        title: 'Receipt Created',
        description: 'Standard inventory replenishment order PO-8840.',
        user: 'D. Miller',
      },
      {
        id: 'tl-5',
        timestamp: '2026-09-26 10:45',
        title: 'Dock Intake Commenced',
        description: 'Consignment received at Gate 2 and verified.',
        user: 'D. Miller',
        statusFrom: 'draft',
        statusTo: 'ready',
      },
      {
        id: 'tl-6',
        timestamp: '2026-09-26 11:15',
        title: 'Validated & Stock Updated',
        description: '+350 meters booked into WH01/Production Floor ledger.',
        user: 'D. Miller',
        statusFrom: 'ready',
        statusTo: 'done',
      },
    ],
  },
  {
    id: 'rec-004',
    receiptNumber: 'WH/IN/00140',
    supplier: 'ErgoFab Industries',
    supplierReference: 'PO-8839',
    warehouseId: 'WH01',
    warehouseName: 'WH01 — Main Central Warehouse',
    destinationLocation: 'WH01/Rack A',
    itemCount: 2,
    totalQuantity: 150,
    scheduledDate: '2026-09-23 14:00',
    createdDate: '2026-09-22',
    status: 'done',
    notes: 'Component batch for ergonomic seating assembly line.',
    lines: [
      {
        id: 'line-005',
        productId: 'prod-001',
        productSku: 'SKU-ERG-904',
        productName: 'Ergonomic Task Chair (Mesh Black)',
        destinationLocation: 'WH01/Rack A',
        quantity: 100,
        receivedQuantity: 100,
        unit: 'pcs',
      },
      {
        id: 'line-006',
        productId: 'prod-002',
        productSku: 'SKU-DKS-301',
        productName: 'Motorized Standing Desk Frame 140cm',
        destinationLocation: 'WH01/Rack B',
        quantity: 50,
        receivedQuantity: 50,
        unit: 'pcs',
      },
    ],
    timeline: [
      {
        id: 'tl-7',
        timestamp: '2026-09-22 09:00',
        title: 'Receipt Created',
        description: 'Scheduled intake from regional manufacturer.',
        user: 'J. Rodriguez',
      },
      {
        id: 'tl-8',
        timestamp: '2026-09-23 14:30',
        title: 'Validation Complete',
        description: 'All 150 items checked and added to on-hand inventory.',
        user: 'J. Rodriguez',
        statusFrom: 'ready',
        statusTo: 'done',
      },
    ],
  },
  {
    id: 'rec-005',
    receiptNumber: 'WH/IN/00138',
    supplier: 'Packaging Direct International',
    supplierReference: 'PO-8831',
    warehouseId: 'WH02',
    warehouseName: 'WH02 — North Distribution Hub',
    destinationLocation: 'WH02/Staging Area 1',
    itemCount: 1,
    totalQuantity: 1000,
    scheduledDate: '2026-09-20',
    createdDate: '2026-09-18',
    status: 'cancelled',
    notes: 'Order canceled due to freight logistics delay. Re-issued as PO-8850.',
    lines: [
      {
        id: 'line-007',
        productId: 'prod-004',
        productSku: 'SKU-PKG-440',
        productName: 'Heavy-Duty Corrugated Carton Box 40x30x30',
        destinationLocation: 'WH02/Staging Area 1',
        quantity: 1000,
        receivedQuantity: 0,
        unit: 'cartons',
      },
    ],
    timeline: [
      {
        id: 'tl-9',
        timestamp: '2026-09-18 11:00',
        title: 'Receipt Created',
        description: 'Bulk packaging carton supply.',
        user: 'M. Chen',
      },
      {
        id: 'tl-10',
        timestamp: '2026-09-20 16:00',
        title: 'Canceled',
        description: 'Supplier shipment damaged in transit before arrival.',
        user: 'M. Chen',
        statusFrom: 'draft',
        statusTo: 'cancelled',
      },
    ],
  },
]

let receiptsStore = [...INITIAL_RECEIPTS]

export function getMockReceipts(): Receipt[] {
  return [...receiptsStore]
}

export function getMockReceiptById(id: string): Receipt | undefined {
  return receiptsStore.find((r) => r.id === id || r.receiptNumber === id)
}

export function createMockReceipt(input: CreateReceiptInput): Receipt {
  const nextNum = (receiptsStore.length + 144).toString().padStart(5, '0')
  const totalUnits = input.lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0)
  const warehouse = (RECEIPT_WAREHOUSES.find((w) => w.id === input.warehouseId) || RECEIPT_WAREHOUSES[0])!

  const newReceipt: Receipt = {
    id: `rec-${Date.now().toString().slice(-4)}`,
    receiptNumber: `WH/IN/${nextNum}`,
    supplier: input.supplier,
    supplierReference: input.supplierReference,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    destinationLocation: input.destinationLocation || warehouse.defaultLocation,
    itemCount: input.lines.length,
    totalQuantity: totalUnits,
    scheduledDate: input.scheduledDate || 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdDate: new Date().toISOString().split('T')[0]!,
    status: input.status || 'draft',
    notes: input.notes,
    lines: input.lines.map((l, idx) => ({
      id: `line-${Date.now()}-${idx}`,
      productId: l.productId,
      productSku: l.productSku,
      productName: l.productName,
      destinationLocation: l.destinationLocation || input.destinationLocation,
      quantity: Number(l.quantity) || 0,
      receivedQuantity: input.status === 'done' ? Number(l.quantity) || 0 : 0,
      unit: l.unit || 'pcs',
    })),
    timeline: [
      {
        id: `tl-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        title: input.status === 'done' ? 'Receipt Created & Validated' : 'Receipt Draft Created',
        description: `Scheduled receipt from ${input.supplier} for ${totalUnits} units.`,
        user: 'Current User',
        statusTo: input.status,
      },
    ],
  }

  receiptsStore = [newReceipt, ...receiptsStore]
  return newReceipt
}

export function updateReceiptStatus(id: string, newStatus: ReceiptStatus, user = 'Current User'): Receipt | undefined {
  const target = receiptsStore.find((r) => r.id === id)
  if (!target) return undefined

  const updated: Receipt = {
    ...target,
    status: newStatus,
    lines: target.lines.map((l) => ({
      ...l,
      receivedQuantity: newStatus === 'done' ? l.quantity : l.receivedQuantity,
    })),
    timeline: [
      ...target.timeline,
      {
        id: `tl-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        title: `Status Changed to ${newStatus.toUpperCase()}`,
        description: `Operational status updated from ${target.status} to ${newStatus}.`,
        user,
        statusFrom: target.status,
        statusTo: newStatus,
      },
    ],
  }

  receiptsStore = receiptsStore.map((r) => (r.id === id ? updated : r))
  return updated
}
