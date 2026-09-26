import { Product, ProductFormData } from './types'

export const PRODUCT_CATEGORIES = [
  'Raw Materials',
  'Finished Goods',
  'Packaging',
  'Electronics',
  'Office Supplies',
]

export const UNITS_OF_MEASURE = [
  'pcs',
  'units',
  'cartons',
  'kg',
  'meters',
  'rolls',
]

export const WAREHOUSE_LOCATIONS = [
  { id: 'wh01-rack-a', label: 'Main Central Warehouse / Rack A', warehouseId: 'WH01' },
  { id: 'wh01-rack-b', label: 'Main Central Warehouse / Rack B', warehouseId: 'WH01' },
  { id: 'wh01-prod',   label: 'Main Central Warehouse / Production Floor', warehouseId: 'WH01' },
  { id: 'wh02-stage',  label: 'North Distribution Hub / Staging Area 1', warehouseId: 'WH02' },
  { id: 'wh02-rack-4', label: 'North Distribution Hub / Rack 04', warehouseId: 'WH02' },
  { id: 'wh03-zone-c', label: 'Cold Storage Facility / Zone C-1', warehouseId: 'WH03' },
]

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    sku: 'SKU-ERG-904',
    name: 'Ergonomic Task Chair (Mesh Black)',
    category: 'Finished Goods',
    unit: 'pcs',
    onHand: 142,
    status: 'in_stock',
    warehouseId: 'WH01',
    warehouseName: 'Main Central Warehouse',
    minReorderLevel: 25,
    targetStock: 200,
    reorderQuantity: 50,
    initialLocation: 'Main Central Warehouse / Rack A',
    locations: [
      {
        id: 'loc-wh01',
        name: 'Main Central Warehouse',
        fullPath: 'WH01',
        quantity: 142,
        unit: 'pcs',
        children: [
          {
            id: 'loc-wh01-rack-a',
            name: 'Rack A',
            fullPath: 'WH01/Rack A',
            quantity: 85,
            unit: 'pcs',
            isLeaf: true,
          },
          {
            id: 'loc-wh01-rack-b',
            name: 'Rack B',
            fullPath: 'WH01/Rack B',
            quantity: 42,
            unit: 'pcs',
            isLeaf: true,
          },
          {
            id: 'loc-wh01-prod',
            name: 'Production Floor',
            fullPath: 'WH01/Production Floor',
            quantity: 15,
            unit: 'pcs',
            isLeaf: true,
          },
        ],
      },
    ],
    recentMovements: [
      {
        id: 'mov-001',
        date: 'Today, 10:45 AM',
        type: 'delivery',
        reference: 'WH/OUT/00288',
        source: 'WH01/Rack A',
        destination: 'Customer: Global Logistics',
        quantity: -12,
        unit: 'pcs',
        status: 'done',
        operator: 'K. Patel',
      },
      {
        id: 'mov-002',
        date: 'Yesterday, 14:20 PM',
        type: 'receipt',
        reference: 'WH/IN/00139',
        source: 'Vendor: ErgoFab Industries',
        destination: 'WH01/Rack A',
        quantity: 50,
        unit: 'pcs',
        status: 'done',
        operator: 'D. Miller',
      },
      {
        id: 'mov-003',
        date: '3 days ago',
        type: 'transfer',
        reference: 'WH/INT/00091',
        source: 'WH01/Production Floor',
        destination: 'WH01/Rack B',
        quantity: 15,
        unit: 'pcs',
        status: 'done',
        operator: 'S. Ganesan',
      },
    ],
    createdAt: '2026-08-15',
    updatedAt: '2026-09-26',
  },
  {
    id: 'prod-002',
    sku: 'SKU-DKS-301',
    name: 'Motorized Standing Desk Frame 140cm',
    category: 'Finished Goods',
    unit: 'pcs',
    onHand: 28,
    status: 'in_stock',
    warehouseId: 'WH01',
    warehouseName: 'Main Central Warehouse',
    minReorderLevel: 15,
    targetStock: 60,
    reorderQuantity: 30,
    initialLocation: 'Main Central Warehouse / Rack B',
    locations: [
      {
        id: 'loc-wh01',
        name: 'Main Central Warehouse',
        fullPath: 'WH01',
        quantity: 28,
        unit: 'pcs',
        children: [
          {
            id: 'loc-wh01-rack-b',
            name: 'Rack B',
            fullPath: 'WH01/Rack B',
            quantity: 20,
            unit: 'pcs',
            isLeaf: true,
          },
          {
            id: 'loc-wh01-prod',
            name: 'Production Floor',
            fullPath: 'WH01/Production Floor',
            quantity: 8,
            unit: 'pcs',
            isLeaf: true,
          },
        ],
      },
    ],
    recentMovements: [
      {
        id: 'mov-004',
        date: '2 days ago',
        type: 'receipt',
        reference: 'WH/IN/00135',
        source: 'Vendor: DeskCraft Ltd',
        destination: 'WH01/Rack B',
        quantity: 10,
        unit: 'pcs',
        status: 'done',
        operator: 'D. Miller',
      },
    ],
    createdAt: '2026-08-20',
    updatedAt: '2026-09-24',
  },
  {
    id: 'prod-003',
    sku: 'SKU-CBL-102',
    name: 'Braided Thunderbolt 4 Cable 2m',
    category: 'Electronics',
    unit: 'pcs',
    onHand: 0,
    status: 'out_of_stock',
    warehouseId: 'WH01',
    warehouseName: 'Main Central Warehouse',
    minReorderLevel: 40,
    targetStock: 150,
    reorderQuantity: 100,
    initialLocation: 'Main Central Warehouse / Rack A',
    locations: [
      {
        id: 'loc-wh01',
        name: 'Main Central Warehouse',
        fullPath: 'WH01',
        quantity: 0,
        unit: 'pcs',
        children: [
          {
            id: 'loc-wh01-rack-a',
            name: 'Rack A',
            fullPath: 'WH01/Rack A',
            quantity: 0,
            unit: 'pcs',
            isLeaf: true,
          },
        ],
      },
    ],
    recentMovements: [
      {
        id: 'mov-005',
        date: '3 weeks ago',
        type: 'delivery',
        reference: 'WH/OUT/00250',
        source: 'WH01/Rack A',
        destination: 'Customer: PrimeTech Corp',
        quantity: -40,
        unit: 'pcs',
        status: 'done',
        operator: 'K. Patel',
      },
    ],
    createdAt: '2026-07-10',
    updatedAt: '2026-09-05',
  },
  {
    id: 'prod-004',
    sku: 'SKU-PKG-440',
    name: 'Heavy-Duty Corrugated Carton Box 40x30x30',
    category: 'Packaging',
    unit: 'cartons',
    onHand: 28,
    status: 'low_stock',
    warehouseId: 'WH02',
    warehouseName: 'North Distribution Hub',
    minReorderLevel: 200,
    targetStock: 800,
    reorderQuantity: 500,
    initialLocation: 'North Distribution Hub / Staging Area 1',
    locations: [
      {
        id: 'loc-wh02',
        name: 'North Distribution Hub',
        fullPath: 'WH02',
        quantity: 28,
        unit: 'cartons',
        children: [
          {
            id: 'loc-wh02-stage',
            name: 'Staging Area 1',
            fullPath: 'WH02/Staging Area 1',
            quantity: 20,
            unit: 'cartons',
            isLeaf: true,
          },
          {
            id: 'loc-wh02-rack-4',
            name: 'Rack 04',
            fullPath: 'WH02/Rack 04',
            quantity: 8,
            unit: 'cartons',
            isLeaf: true,
          },
        ],
      },
    ],
    recentMovements: [
      {
        id: 'mov-006',
        date: '6 days ago',
        type: 'delivery',
        reference: 'WH/OUT/00270',
        source: 'WH02/Staging Area 1',
        destination: 'Internal Pack Station',
        quantity: -150,
        unit: 'cartons',
        status: 'done',
        operator: 'M. Chen',
      },
    ],
    createdAt: '2026-08-01',
    updatedAt: '2026-09-20',
  },
  {
    id: 'prod-005',
    sku: 'SKU-PLT-008',
    name: 'Euro Pallet Hardwood Treated 120x80',
    category: 'Raw Materials',
    unit: 'units',
    onHand: 4,
    status: 'low_stock',
    warehouseId: 'WH02',
    warehouseName: 'North Distribution Hub',
    minReorderLevel: 50,
    targetStock: 250,
    reorderQuantity: 120,
    initialLocation: 'North Distribution Hub / Staging Area 1',
    locations: [
      {
        id: 'loc-wh02',
        name: 'North Distribution Hub',
        fullPath: 'WH02',
        quantity: 4,
        unit: 'units',
        children: [
          {
            id: 'loc-wh02-stage',
            name: 'Staging Area 1',
            fullPath: 'WH02/Staging Area 1',
            quantity: 4,
            unit: 'units',
            isLeaf: true,
          },
        ],
      },
    ],
    recentMovements: [
      {
        id: 'mov-007',
        date: '18 days ago',
        type: 'transfer',
        reference: 'WH/INT/00078',
        source: 'WH02/Yard 2',
        destination: 'WH02/Staging Area 1',
        quantity: 20,
        unit: 'units',
        status: 'done',
        operator: 'D. Miller',
      },
    ],
    createdAt: '2026-07-25',
    updatedAt: '2026-09-18',
  },
  {
    id: 'prod-006',
    sku: 'SKU-MON-881',
    name: 'Dual Arm VESA Monitor Mount Heavy-Duty',
    category: 'Electronics',
    unit: 'pcs',
    onHand: 310,
    status: 'in_stock',
    warehouseId: 'WH01',
    warehouseName: 'Main Central Warehouse',
    minReorderLevel: 50,
    targetStock: 400,
    reorderQuantity: 150,
    initialLocation: 'Main Central Warehouse / Rack A',
    locations: [
      {
        id: 'loc-wh01',
        name: 'Main Central Warehouse',
        fullPath: 'WH01',
        quantity: 310,
        unit: 'pcs',
        children: [
          {
            id: 'loc-wh01-rack-a',
            name: 'Rack A',
            fullPath: 'WH01/Rack A',
            quantity: 210,
            unit: 'pcs',
            isLeaf: true,
          },
          {
            id: 'loc-wh01-rack-b',
            name: 'Rack B',
            fullPath: 'WH01/Rack B',
            quantity: 100,
            unit: 'pcs',
            isLeaf: true,
          },
        ],
      },
    ],
    recentMovements: [
      {
        id: 'mov-008',
        date: 'Yesterday',
        type: 'receipt',
        reference: 'WH/IN/00140',
        source: 'Vendor: MountTech Corp',
        destination: 'WH01/Rack A',
        quantity: 120,
        unit: 'pcs',
        status: 'done',
        operator: 'D. Miller',
      },
    ],
    createdAt: '2026-08-11',
    updatedAt: '2026-09-25',
  },
  {
    id: 'prod-007',
    sku: 'SKU-SEN-910',
    name: 'Temperature & Humidity IoT Telemetry Probe',
    category: 'Electronics',
    unit: 'pcs',
    onHand: 0,
    status: 'out_of_stock',
    warehouseId: 'WH03',
    warehouseName: 'Cold Storage Facility',
    minReorderLevel: 15,
    targetStock: 60,
    reorderQuantity: 30,
    initialLocation: 'Cold Storage Facility / Zone C-1',
    locations: [
      {
        id: 'loc-wh03',
        name: 'Cold Storage Facility',
        fullPath: 'WH03',
        quantity: 0,
        unit: 'pcs',
        children: [
          {
            id: 'loc-wh03-zone-c',
            name: 'Zone C-1',
            fullPath: 'WH03/Zone C-1',
            quantity: 0,
            unit: 'pcs',
            isLeaf: true,
          },
        ],
      },
    ],
    recentMovements: [],
    createdAt: '2026-08-01',
    updatedAt: '2026-08-28',
  },
  {
    id: 'prod-008',
    sku: 'SKU-OFF-219',
    name: 'Thermal Shipping Label Rolls 4x6 (500/roll)',
    category: 'Office Supplies',
    unit: 'rolls',
    onHand: 6,
    status: 'low_stock',
    warehouseId: 'WH01',
    warehouseName: 'Main Central Warehouse',
    minReorderLevel: 30,
    targetStock: 120,
    reorderQuantity: 60,
    initialLocation: 'Main Central Warehouse / Rack B',
    locations: [
      {
        id: 'loc-wh01',
        name: 'Main Central Warehouse',
        fullPath: 'WH01',
        quantity: 6,
        unit: 'rolls',
        children: [
          {
            id: 'loc-wh01-rack-b',
            name: 'Rack B',
            fullPath: 'WH01/Rack B',
            quantity: 6,
            unit: 'rolls',
            isLeaf: true,
          },
        ],
      },
    ],
    recentMovements: [
      {
        id: 'mov-009',
        date: '9 days ago',
        type: 'delivery',
        reference: 'WH/OUT/00262',
        source: 'WH01/Rack B',
        destination: 'Warehouse Dispatch Table',
        quantity: -12,
        unit: 'rolls',
        status: 'done',
        operator: 'K. Patel',
      },
    ],
    createdAt: '2026-08-18',
    updatedAt: '2026-09-17',
  },
  {
    id: 'prod-009',
    sku: 'SKU-INS-602',
    name: 'Thermal Insulation Foam Liner Sheets',
    category: 'Raw Materials',
    unit: 'meters',
    onHand: 0,
    status: 'inactive',
    warehouseId: 'WH03',
    warehouseName: 'Cold Storage Facility',
    minReorderLevel: 60,
    targetStock: 200,
    reorderQuantity: 150,
    initialLocation: 'Cold Storage Facility / Zone C-1',
    locations: [
      {
        id: 'loc-wh03',
        name: 'Cold Storage Facility',
        fullPath: 'WH03',
        quantity: 0,
        unit: 'meters',
        children: [
          {
            id: 'loc-wh03-zone-c',
            name: 'Zone C-1',
            fullPath: 'WH03/Zone C-1',
            quantity: 0,
            unit: 'meters',
            isLeaf: true,
          },
        ],
      },
    ],
    recentMovements: [],
    createdAt: '2026-06-12',
    updatedAt: '2026-09-01',
  },
  {
    id: 'prod-010',
    sku: 'SKU-ALU-501',
    name: 'Extruded Aluminum Profile 40x40 T-Slot 2m',
    category: 'Raw Materials',
    unit: 'meters',
    onHand: 420,
    status: 'in_stock',
    warehouseId: 'WH01',
    warehouseName: 'Main Central Warehouse',
    minReorderLevel: 100,
    targetStock: 600,
    reorderQuantity: 250,
    initialLocation: 'Main Central Warehouse / Production Floor',
    locations: [
      {
        id: 'loc-wh01',
        name: 'Main Central Warehouse',
        fullPath: 'WH01',
        quantity: 420,
        unit: 'meters',
        children: [
          {
            id: 'loc-wh01-prod',
            name: 'Production Floor',
            fullPath: 'WH01/Production Floor',
            quantity: 260,
            unit: 'meters',
            isLeaf: true,
          },
          {
            id: 'loc-wh01-rack-b',
            name: 'Rack B',
            fullPath: 'WH01/Rack B',
            quantity: 160,
            unit: 'meters',
            isLeaf: true,
          },
        ],
      },
    ],
    recentMovements: [
      {
        id: 'mov-010',
        date: 'Today, 11:15 AM',
        type: 'receipt',
        reference: 'WH/IN/00141',
        source: 'Vendor: Apex Metal Works',
        destination: 'WH01/Production Floor',
        quantity: 350,
        unit: 'meters',
        status: 'done',
        operator: 'D. Miller',
      },
    ],
    createdAt: '2026-08-05',
    updatedAt: '2026-09-26',
  },
]

// ── In-Memory Product State Store ────────────────────────────────────────────
let productsStore = [...INITIAL_PRODUCTS]

export function getMockProducts(): Product[] {
  return [...productsStore]
}

export function getMockProductById(id: string): Product | undefined {
  return productsStore.find((p) => p.id === id)
}

export function createMockProduct(data: ProductFormData): Product {
  const stock = Number(data.initialStock) || 0
  const status = stock === 0 ? 'out_of_stock' : stock < 20 ? 'low_stock' : 'in_stock'
  const warehouse = data.initialLocation.includes('North')
    ? { id: 'WH02', name: 'North Distribution Hub' }
    : data.initialLocation.includes('Cold')
    ? { id: 'WH03', name: 'Cold Storage Facility' }
    : { id: 'WH01', name: 'Main Central Warehouse' }

  // Extract leaf location name
  const locParts = data.initialLocation.split(' / ')
  const subLocation = locParts[1] || 'Rack A'

  const newProduct: Product = {
    id: `prod-${Date.now().toString().slice(-4)}`,
    sku: data.sku.trim().toUpperCase(),
    name: data.name.trim(),
    category: data.category,
    unit: data.unit,
    onHand: stock,
    status,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    minReorderLevel: Math.max(10, Math.round(stock * 0.25)),
    targetStock: Math.max(50, Math.round(stock * 1.5)),
    reorderQuantity: Math.max(25, Math.round(stock * 0.5)),
    initialLocation: data.initialLocation,
    locations: [
      {
        id: `loc-${warehouse.id.toLowerCase()}`,
        name: warehouse.name,
        fullPath: warehouse.id,
        quantity: stock,
        unit: data.unit,
        children: [
          {
            id: `loc-sub-${Date.now()}`,
            name: subLocation,
            fullPath: `${warehouse.id}/${subLocation}`,
            quantity: stock,
            unit: data.unit,
            isLeaf: true,
          },
        ],
      },
    ],
    recentMovements: stock > 0 ? [
      {
        id: `mov-${Date.now()}`,
        date: 'Just now',
        type: 'receipt',
        reference: 'WH/IN/INITIAL',
        source: 'Initial Setup Intake',
        destination: `${warehouse.id}/${subLocation}`,
        quantity: stock,
        unit: data.unit,
        status: 'done',
        operator: 'System Admin',
      },
    ] : [],
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  }

  productsStore = [newProduct, ...productsStore]
  return newProduct
}

export function updateMockProduct(id: string, data: Partial<ProductFormData>): Product | undefined {
  const existing = productsStore.find((p) => p.id === id)
  if (!existing) return undefined

  const updated: Product = {
    ...existing,
    name: data.name !== undefined ? data.name.trim() : existing.name,
    sku: data.sku !== undefined ? data.sku.trim().toUpperCase() : existing.sku,
    category: data.category !== undefined ? data.category : existing.category,
    unit: data.unit !== undefined ? data.unit : existing.unit,
    updatedAt: new Date().toISOString().split('T')[0],
  }

  productsStore = productsStore.map((p) => (p.id === id ? updated : p))
  return updated
}
