import { Transfer, CreateTransferInput, TransferStatus } from './types'

export const TRANSFER_WAREHOUSES = [
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

export const INITIAL_TRANSFERS: Transfer[] = [
  {
    id: 'trf-001',
    transferNumber: 'WH/INT/00092',
    sourceWarehouseId: 'WH01',
    sourceWarehouseName: 'WH01 — Main Central Warehouse',
    sourceLocation: 'WH01/Rack A',
    destinationWarehouseId: 'WH02',
    destinationWarehouseName: 'WH02 — North Distribution Hub',
    destinationLocation: 'WH02/Staging Area 1',
    itemCount: 2,
    totalQuantity: 70,
    scheduledDate: 'Today, 16:30',
    createdDate: '2026-09-26',
    status: 'ready',
    notes: 'Inter-warehouse replenishment for north fulfillment buffer.',
    lines: [
      {
        id: 'line-t-1',
        productId: 'prod-006',
        productSku: 'SKU-MON-881',
        productName: 'Dual Arm VESA Monitor Mount Heavy-Duty',
        sourceLocation: 'WH01/Rack A',
        destinationLocation: 'WH02/Staging Area 1',
        quantity: 50,
        unit: 'pcs',
      },
      {
        id: 'line-t-2',
        productId: 'prod-002',
        productSku: 'SKU-DKS-301',
        productName: 'Motorized Standing Desk Frame 140cm',
        sourceLocation: 'WH01/Rack A',
        destinationLocation: 'WH02/Staging Area 1',
        quantity: 20,
        unit: 'pcs',
      },
    ],
    timeline: [
      {
        id: 'tl-trf-1',
        timestamp: '2026-09-26 10:15',
        title: 'Transfer Draft Created',
        description: 'Replenishment order initiated from WH01 to WH02.',
        user: 'Alex Mercer',
      },
      {
        id: 'tl-trf-2',
        timestamp: '2026-09-26 11:45',
        title: 'Marked as Ready',
        description: 'Stock verified at WH01/Rack A and transit bay scheduled.',
        user: 'Alex Mercer',
        statusFrom: 'draft',
        statusTo: 'ready',
      },
    ],
  },
  {
    id: 'trf-002',
    transferNumber: 'WH/INT/00091',
    sourceWarehouseId: 'WH01',
    sourceWarehouseName: 'WH01 — Main Central Warehouse',
    sourceLocation: 'WH01/Production Floor',
    destinationWarehouseId: 'WH01',
    destinationWarehouseName: 'WH01 — Main Central Warehouse',
    destinationLocation: 'WH01/Rack B',
    itemCount: 1,
    totalQuantity: 15,
    scheduledDate: 'Today, 11:00',
    createdDate: '2026-09-26',
    status: 'done',
    notes: 'Internal move from manufacturing assembly back to primary storage rack.',
    lines: [
      {
        id: 'line-t-3',
        productId: 'prod-001',
        productSku: 'SKU-ERG-904',
        productName: 'Ergonomic Task Chair (Mesh Black)',
        sourceLocation: 'WH01/Production Floor',
        destinationLocation: 'WH01/Rack B',
        quantity: 15,
        unit: 'pcs',
      },
    ],
    timeline: [
      {
        id: 'tl-trf-3',
        timestamp: '2026-09-26 09:30',
        title: 'Transfer Created',
        description: 'Line clearing from production floor.',
        user: 'S. Ganesan',
      },
      {
        id: 'tl-trf-4',
        timestamp: '2026-09-26 10:20',
        title: 'Transfer Validated',
        description: '15 units moved to WH01/Rack B. Company on-hand balance unchanged.',
        user: 'S. Ganesan',
        statusFrom: 'ready',
        statusTo: 'done',
      },
    ],
  },
  {
    id: 'trf-003',
    transferNumber: 'WH/INT/00093',
    sourceWarehouseId: 'WH01',
    sourceWarehouseName: 'WH01 — Main Central Warehouse',
    sourceLocation: 'WH01/Production Floor',
    destinationWarehouseId: 'WH01',
    destinationWarehouseName: 'WH01 — Main Central Warehouse',
    destinationLocation: 'WH01/Rack B',
    itemCount: 1,
    totalQuantity: 100,
    scheduledDate: 'Tomorrow, 09:00',
    createdDate: '2026-09-25',
    status: 'draft',
    notes: 'Surplus extrusion relocation after workstation fabrication run.',
    lines: [
      {
        id: 'line-t-4',
        productId: 'prod-010',
        productSku: 'SKU-ALU-501',
        productName: 'Extruded Aluminum Profile 40x40 T-Slot 2m',
        sourceLocation: 'WH01/Production Floor',
        destinationLocation: 'WH01/Rack B',
        quantity: 100,
        unit: 'meters',
      },
    ],
    timeline: [
      {
        id: 'tl-trf-5',
        timestamp: '2026-09-25 16:10',
        title: 'Draft Initiated',
        description: 'Awaiting completion of workstation cutting shift.',
        user: 'D. Miller',
      },
    ],
  },
  {
    id: 'trf-004',
    transferNumber: 'WH/INT/00088',
    sourceWarehouseId: 'WH02',
    sourceWarehouseName: 'WH02 — North Distribution Hub',
    sourceLocation: 'WH02/Unloading Bay',
    destinationWarehouseId: 'WH02',
    destinationWarehouseName: 'WH02 — North Distribution Hub',
    destinationLocation: 'WH02/Rack 04',
    itemCount: 1,
    totalQuantity: 200,
    scheduledDate: '2026-09-24',
    createdDate: '2026-09-24',
    status: 'done',
    notes: 'Putaway transfer from inbound unloading staging into high-density storage rack.',
    lines: [
      {
        id: 'line-t-5',
        productId: 'prod-004',
        productSku: 'SKU-PKG-440',
        productName: 'Heavy-Duty Corrugated Carton Box 40x30x30',
        sourceLocation: 'WH02/Unloading Bay',
        destinationLocation: 'WH02/Rack 04',
        quantity: 200,
        unit: 'cartons',
      },
    ],
    timeline: [
      {
        id: 'tl-trf-6',
        timestamp: '2026-09-24 11:00',
        title: 'Transfer Created',
        description: 'Putaway instruction from dock intake.',
        user: 'M. Chen',
      },
      {
        id: 'tl-trf-7',
        timestamp: '2026-09-24 14:15',
        title: 'Putaway Completed',
        description: '200 cartons transferred into WH02/Rack 04 bin slots.',
        user: 'M. Chen',
        statusFrom: 'ready',
        statusTo: 'done',
      },
    ],
  },
  {
    id: 'trf-005',
    transferNumber: 'WH/INT/00085',
    sourceWarehouseId: 'WH03',
    sourceWarehouseName: 'WH03 — Cold Storage Facility',
    sourceLocation: 'WH03/Cold Intake Staging',
    destinationWarehouseId: 'WH03',
    destinationWarehouseName: 'WH03 — Cold Storage Facility',
    destinationLocation: 'WH03/Zone C-1',
    itemCount: 1,
    totalQuantity: 30,
    scheduledDate: '2026-09-22',
    createdDate: '2026-09-21',
    status: 'cancelled',
    notes: 'Transfer canceled due to chiller maintenance shutoff in Zone C-1.',
    lines: [
      {
        id: 'line-t-6',
        productId: 'prod-007',
        productSku: 'SKU-SEN-910',
        productName: 'Temperature & Humidity IoT Telemetry Probe',
        sourceLocation: 'WH03/Cold Intake Staging',
        destinationLocation: 'WH03/Zone C-1',
        quantity: 30,
        unit: 'pcs',
      },
    ],
    timeline: [
      {
        id: 'tl-trf-8',
        timestamp: '2026-09-21 14:00',
        title: 'Draft Created',
        description: 'Scheduled intake relocation to cold zone.',
        user: 'Elena Rostova',
      },
      {
        id: 'tl-trf-9',
        timestamp: '2026-09-22 09:30',
        title: 'Transfer Canceled',
        description: 'Facility compressor downtime rescheduled.',
        user: 'Elena Rostova',
        statusFrom: 'draft',
        statusTo: 'cancelled',
      },
    ],
  },
]

let transfersStore = [...INITIAL_TRANSFERS]

export function getMockTransfers(): Transfer[] {
  return [...transfersStore]
}

export function getMockTransferById(id: string): Transfer | undefined {
  return transfersStore.find((t) => t.id === id || t.transferNumber === id)
}

export function createMockTransfer(input: CreateTransferInput): Transfer {
  const nextNum = (transfersStore.length + 94).toString().padStart(5, '0')
  const totalUnits = input.lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0)

  const srcWh = (TRANSFER_WAREHOUSES.find((w) => w.id === input.sourceWarehouseId) || TRANSFER_WAREHOUSES[0])!
  const dstWh = (TRANSFER_WAREHOUSES.find((w) => w.id === input.destinationWarehouseId) || TRANSFER_WAREHOUSES[0])!

  const newTransfer: Transfer = {
    id: `trf-${Date.now().toString().slice(-4)}`,
    transferNumber: `WH/INT/${nextNum}`,
    sourceWarehouseId: srcWh.id,
    sourceWarehouseName: srcWh.name,
    sourceLocation: input.sourceLocation,
    destinationWarehouseId: dstWh.id,
    destinationWarehouseName: dstWh.name,
    destinationLocation: input.destinationLocation,
    itemCount: input.lines.length,
    totalQuantity: totalUnits,
    scheduledDate: input.scheduledDate || 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdDate: new Date().toISOString().split('T')[0]!,
    status: input.status || 'draft',
    notes: input.notes,
    lines: input.lines.map((l, idx) => ({
      id: `line-trf-${Date.now()}-${idx}`,
      productId: l.productId,
      productSku: l.productSku,
      productName: l.productName,
      sourceLocation: l.sourceLocation || input.sourceLocation,
      destinationLocation: l.destinationLocation || input.destinationLocation,
      quantity: Number(l.quantity) || 0,
      unit: l.unit || 'pcs',
    })),
    timeline: [
      {
        id: `tl-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        title: input.status === 'done' ? 'Transfer Validated & Relocated' : 'Internal Transfer Created',
        description: `Transfer of ${totalUnits} units from ${input.sourceLocation} to ${input.destinationLocation}. Total stock quantity unchanged.`,
        user: 'Current Operator',
        statusTo: input.status,
      },
    ],
  }

  transfersStore = [newTransfer, ...transfersStore]
  return newTransfer
}

export function updateTransferStatus(id: string, newStatus: TransferStatus, user = 'Current Operator'): Transfer | undefined {
  const target = transfersStore.find((t) => t.id === id)
  if (!target) return undefined

  const updated: Transfer = {
    ...target,
    status: newStatus,
    timeline: [
      ...target.timeline,
      {
        id: `tl-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        title: `Status Changed to ${newStatus.toUpperCase()}`,
        description:
          newStatus === 'done'
            ? 'Stock successfully relocated to destination bin. Total company inventory balance is unchanged.'
            : `Operational status updated from ${target.status} to ${newStatus}.`,
        user,
        statusFrom: target.status,
        statusTo: newStatus,
      },
    ],
  }

  transfersStore = transfersStore.map((t) => (t.id === id ? updated : t))
  return updated
}
