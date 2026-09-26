import { Delivery, CreateDeliveryInput, DeliveryStatus } from './types'

export const CUSTOMERS = [
  'Global Logistics Direct',
  'TechVibe Hardware Inc',
  'FreshFoods Retail Corp',
  'PrimeTech Enterprise',
  'Metro Retail Partners',
  'Nordic Workspace Solutions',
]

export const DELIVERY_WAREHOUSES = [
  { id: 'WH01', name: 'WH01 — Main Central Warehouse', defaultSourceLocation: 'WH01/Bay 04' },
  { id: 'WH02', name: 'WH02 — North Distribution Hub', defaultSourceLocation: 'WH02/Pick Zone 1' },
  { id: 'WH03', name: 'WH03 — Cold Storage Facility', defaultSourceLocation: 'WH03/Cold Zone C-2' },
]

export const INITIAL_DELIVERIES: Delivery[] = [
  {
    id: 'del-001',
    deliveryNumber: 'WH/OUT/00289',
    customer: 'Global Logistics Direct',
    customerReference: 'SO-4402',
    warehouseId: 'WH01',
    warehouseName: 'WH01 — Main Central Warehouse',
    sourceLocation: 'WH01/Bay 04',
    itemCount: 2,
    totalQuantity: 145,
    scheduledDate: 'Today, 16:30',
    createdDate: '2026-09-26',
    status: 'waiting',
    isPicked: false,
    isPacked: false,
    notes: 'Commercial road freight dispatch. Requires corner protective edge boards on all pallets.',
    lines: [
      {
        id: 'dline-001',
        productId: 'prod-001',
        productSku: 'SKU-ERG-904',
        productName: 'Ergonomic Task Chair (Mesh Black)',
        sourceLocation: 'WH01/Rack A',
        demandQuantity: 45,
        doneQuantity: 0,
        unit: 'pcs',
        isAvailable: true,
      },
      {
        id: 'dline-002',
        productId: 'prod-006',
        productSku: 'SKU-MON-881',
        productName: 'Dual Arm VESA Monitor Mount Heavy-Duty',
        sourceLocation: 'WH01/Rack B',
        demandQuantity: 100,
        doneQuantity: 0,
        unit: 'pcs',
        isAvailable: true,
      },
    ],
    timeline: [
      {
        id: 'dtl-1',
        timestamp: '2026-09-26 08:30',
        title: 'Sales Order Confirmed',
        description: 'Delivery order generated from SO-4402.',
        user: 'Sales Desk',
      },
      {
        id: 'dtl-2',
        timestamp: '2026-09-26 10:15',
        title: 'Stock Reservation Check',
        description: 'Waiting for inventory allocation buffer from Bay 04.',
        user: 'K. Patel',
        statusFrom: 'draft',
        statusTo: 'waiting',
      },
    ],
  },
  {
    id: 'del-002',
    deliveryNumber: 'WH/OUT/00290',
    customer: 'FreshFoods Retail Corp',
    customerReference: 'SO-4408',
    warehouseId: 'WH03',
    warehouseName: 'WH03 — Cold Storage Facility',
    sourceLocation: 'WH03/Cold Zone C-2',
    itemCount: 1,
    totalQuantity: 80,
    scheduledDate: 'Today, 18:00',
    createdDate: '2026-09-26',
    status: 'ready',
    isPicked: true,
    isPacked: true,
    notes: 'Refrigerated container truck pickup. Gate 01 temperature log attached.',
    lines: [
      {
        id: 'dline-003',
        productId: 'prod-005',
        productSku: 'SKU-PLT-008',
        productName: 'Euro Pallet Hardwood Treated 120x80',
        sourceLocation: 'WH03/Cold Zone C-2',
        demandQuantity: 80,
        doneQuantity: 80,
        unit: 'units',
        isAvailable: true,
      },
    ],
    timeline: [
      {
        id: 'dtl-3',
        timestamp: '2026-09-26 09:00',
        title: 'Order Created',
        description: 'Scheduled dispatch for cold chain fulfillment.',
        user: 'M. Chen',
      },
      {
        id: 'dtl-4',
        timestamp: '2026-09-26 11:45',
        title: 'Items Picked & Packed',
        description: 'All 80 units staged at dispatch bay.',
        user: 'M. Chen',
        statusFrom: 'waiting',
        statusTo: 'ready',
      },
    ],
  },
  {
    id: 'del-003',
    deliveryNumber: 'WH/OUT/00291',
    customer: 'TechVibe Hardware Inc',
    customerReference: 'SO-4412',
    warehouseId: 'WH01',
    warehouseName: 'WH01 — Main Central Warehouse',
    sourceLocation: 'WH01/Shipping Staging',
    itemCount: 2,
    totalQuantity: 92,
    scheduledDate: 'Today, 19:15',
    createdDate: '2026-09-25',
    status: 'ready',
    isPicked: true,
    isPacked: false,
    notes: 'Priority air courier. Packing slip barcode scan required.',
    lines: [
      {
        id: 'dline-004',
        productId: 'prod-002',
        productSku: 'SKU-DKS-301',
        productName: 'Motorized Standing Desk Frame 140cm',
        sourceLocation: 'WH01/Rack B',
        demandQuantity: 12,
        doneQuantity: 12,
        unit: 'pcs',
        isAvailable: true,
      },
      {
        id: 'dline-005',
        productId: 'prod-006',
        productSku: 'SKU-MON-881',
        productName: 'Dual Arm VESA Monitor Mount Heavy-Duty',
        sourceLocation: 'WH01/Rack A',
        demandQuantity: 80,
        doneQuantity: 80,
        unit: 'pcs',
        isAvailable: true,
      },
    ],
    timeline: [
      {
        id: 'dtl-5',
        timestamp: '2026-09-25 14:00',
        title: 'Order Drafted',
        description: 'Customer order SO-4412 queued.',
        user: 'D. Miller',
      },
      {
        id: 'dtl-6',
        timestamp: '2026-09-26 10:00',
        title: 'Stock Picked',
        description: 'Forklift pick route finished for Rack A and Rack B.',
        user: 'K. Patel',
        statusFrom: 'waiting',
        statusTo: 'ready',
      },
    ],
  },
  {
    id: 'del-004',
    deliveryNumber: 'WH/OUT/00288',
    customer: 'Metro Retail Partners',
    customerReference: 'SO-4419',
    warehouseId: 'WH02',
    warehouseName: 'WH02 — North Distribution Hub',
    sourceLocation: 'WH02/Pick Zone 1',
    itemCount: 1,
    totalQuantity: 48,
    scheduledDate: '2026-09-26 10:48',
    createdDate: '2026-09-24',
    status: 'done',
    isPicked: true,
    isPacked: true,
    notes: 'Commercial freight loaded and signed for by carrier driver.',
    lines: [
      {
        id: 'dline-006',
        productId: 'prod-001',
        productSku: 'SKU-ERG-904',
        productName: 'Ergonomic Task Chair (Mesh Black)',
        sourceLocation: 'WH02/Pick Zone 1',
        demandQuantity: 48,
        doneQuantity: 48,
        unit: 'pcs',
        isAvailable: true,
      },
    ],
    timeline: [
      {
        id: 'dtl-7',
        timestamp: '2026-09-24 16:30',
        title: 'Order Generated',
        description: 'Wholesale order SO-4419.',
        user: 'M. Chen',
      },
      {
        id: 'dtl-8',
        timestamp: '2026-09-26 09:15',
        title: 'Pick & Pack Complete',
        description: 'Staged at North dock bay 3.',
        user: 'K. Patel',
        statusFrom: 'waiting',
        statusTo: 'ready',
      },
      {
        id: 'dtl-9',
        timestamp: '2026-09-26 10:48',
        title: 'Dispatched & Validated',
        description: 'Carrier bill of lading issued. Inventory deducted.',
        user: 'K. Patel',
        statusFrom: 'ready',
        statusTo: 'done',
      },
    ],
  },
  {
    id: 'del-005',
    deliveryNumber: 'WH/OUT/00285',
    customer: 'PrimeTech Enterprise',
    customerReference: 'SO-4395',
    warehouseId: 'WH01',
    warehouseName: 'WH01 — Main Central Warehouse',
    sourceLocation: 'WH01/Bay 04',
    itemCount: 1,
    totalQuantity: 20,
    scheduledDate: '2026-09-21',
    createdDate: '2026-09-20',
    status: 'cancelled',
    isPicked: false,
    isPacked: false,
    notes: 'Customer changed delivery address and requested order cancellation.',
    lines: [
      {
        id: 'dline-007',
        productId: 'prod-003',
        productSku: 'SKU-CBL-102',
        productName: 'Braided Thunderbolt 4 Cable 2m',
        sourceLocation: 'WH01/Rack A',
        demandQuantity: 20,
        doneQuantity: 0,
        unit: 'pcs',
        isAvailable: false,
      },
    ],
    timeline: [
      {
        id: 'dtl-10',
        timestamp: '2026-09-20 11:00',
        title: 'Order Created',
        description: 'Sales order entry.',
        user: 'D. Miller',
      },
      {
        id: 'dtl-11',
        timestamp: '2026-09-21 14:00',
        title: 'Order Canceled',
        description: 'Canceled by customer prior to picking.',
        user: 'D. Miller',
        statusFrom: 'draft',
        statusTo: 'cancelled',
      },
    ],
  },
]

let deliveriesStore = [...INITIAL_DELIVERIES]

export function getMockDeliveries(): Delivery[] {
  return [...deliveriesStore]
}

export function getMockDeliveryById(id: string): Delivery | undefined {
  return deliveriesStore.find((d) => d.id === id || d.deliveryNumber === id)
}

export function createMockDelivery(input: CreateDeliveryInput): Delivery {
  const nextNum = (deliveriesStore.length + 292).toString().padStart(5, '0')
  const totalUnits = input.lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0)
  const warehouse = DELIVERY_WAREHOUSES.find((w) => w.id === input.warehouseId) || DELIVERY_WAREHOUSES[0]

  const newDelivery: Delivery = {
    id: `del-${Date.now().toString().slice(-4)}`,
    deliveryNumber: `WH/OUT/${nextNum}`,
    customer: input.customer,
    customerReference: input.customerReference,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    sourceLocation: input.sourceLocation || warehouse.defaultSourceLocation,
    itemCount: input.lines.length,
    totalQuantity: totalUnits,
    scheduledDate: input.scheduledDate || 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdDate: new Date().toISOString().split('T')[0],
    status: input.status || 'draft',
    isPicked: input.status === 'ready' || input.status === 'done',
    isPacked: input.status === 'done',
    notes: input.notes,
    lines: input.lines.map((l, idx) => ({
      id: `dline-${Date.now()}-${idx}`,
      productId: l.productId,
      productSku: l.productSku,
      productName: l.productName,
      sourceLocation: l.sourceLocation || input.sourceLocation,
      demandQuantity: Number(l.quantity) || 0,
      doneQuantity: input.status === 'done' ? Number(l.quantity) || 0 : 0,
      unit: l.unit || 'pcs',
      isAvailable: true,
    })),
    timeline: [
      {
        id: `dtl-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        title: input.status === 'done' ? 'Delivery Dispatched & Validated' : 'Delivery Draft Created',
        description: `Outbound consignment for ${input.customer} (${totalUnits} units).`,
        user: 'Current User',
        statusTo: input.status,
      },
    ],
  }

  deliveriesStore = [newDelivery, ...deliveriesStore]
  return newDelivery
}

export function updateDeliveryStatus(
  id: string,
  newStatus: DeliveryStatus,
  user = 'Current User'
): Delivery | undefined {
  const target = deliveriesStore.find((d) => d.id === id)
  if (!target) return undefined

  const updated: Delivery = {
    ...target,
    status: newStatus,
    isPicked: newStatus === 'ready' || newStatus === 'done' ? true : target.isPicked,
    isPacked: newStatus === 'done' ? true : target.isPacked,
    lines: target.lines.map((l) => ({
      ...l,
      doneQuantity: newStatus === 'done' ? l.demandQuantity : l.doneQuantity,
    })),
    timeline: [
      ...target.timeline,
      {
        id: `dtl-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        title: `Status Changed to ${newStatus.toUpperCase()}`,
        description: `Operational progression updated from ${target.status} to ${newStatus}.`,
        user,
        statusFrom: target.status,
        statusTo: newStatus,
      },
    ],
  }

  deliveriesStore = deliveriesStore.map((d) => (d.id === id ? updated : d))
  return updated
}

export function updateDeliveryPicking(
  id: string,
  action: 'pick' | 'pack',
  user = 'Current User'
): Delivery | undefined {
  const target = deliveriesStore.find((d) => d.id === id)
  if (!target) return undefined

  let isPicked = target.isPicked
  let isPacked = target.isPacked
  let status = target.status

  if (action === 'pick') {
    isPicked = true
    status = 'ready'
  } else if (action === 'pack') {
    isPacked = true
  }

  const updated: Delivery = {
    ...target,
    isPicked,
    isPacked,
    status,
    timeline: [
      ...target.timeline,
      {
        id: `dtl-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        title: action === 'pick' ? 'Picking Completed' : 'Packing Completed',
        description: action === 'pick' ? 'Items picked from racks and staged at dispatch.' : 'Shipping labels affixed and cartons sealed.',
        user,
      },
    ],
  }

  deliveriesStore = deliveriesStore.map((d) => (d.id === id ? updated : d))
  return updated
}
