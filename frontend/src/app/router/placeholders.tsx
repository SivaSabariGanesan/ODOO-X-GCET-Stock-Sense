import { PlaceholderPage } from '@/components/common/PlaceholderPage'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Shield, Warehouse, Mail, Key } from 'lucide-react'

export function DashboardPlaceholder() {
  return (
    <PlaceholderPage
      title="Dashboard"
      subtitle="Overview of stock levels, pending operations, and inventory movements."
      stats={[
        { label: 'Total Products', value: '48', change: 'In catalog', trend: 'neutral' },
        { label: 'Pending Receipts', value: '14', change: 'Awaiting receipt', trend: 'neutral' },
        { label: 'Pending Deliveries', value: '29', change: 'To process', trend: 'neutral' },
        { label: 'Low Stock', value: '6', change: 'Below safety threshold', trend: 'down' },
      ]}
      columns={['Reference', 'Activity Type', 'Source / Dest', 'Status', 'Timestamp']}
      sampleRows={[
        {
          ref: 'WH/IN/00094',
          desc: 'Raw Components Intake',
          qty: '350 units',
          status: 'ready',
          updated: '8 mins ago',
        },
        {
          ref: 'WH/OUT/00142',
          desc: 'Commercial Delivery Order',
          qty: '45 cartons',
          status: 'confirmed',
          updated: '22 mins ago',
        },
        {
          ref: 'WH/INT/00088',
          desc: 'Main to Secondary Rack',
          qty: '120 units',
          status: 'done',
          updated: '45 mins ago',
        },
        {
          ref: 'WH/ADJ/00019',
          desc: 'Cycle Count Adjustment',
          qty: '-4 units',
          status: 'draft',
          updated: '2 hours ago',
        },
      ]}
    />
  )
}

export function ProductsPlaceholder() {
  return (
    <PlaceholderPage
      title="Products"
      subtitle="Manage products, SKUs, categories, and stock information."
      showCalendarView={false}
      showPrintSlip={false}
      searchPlaceholder="Search products, SKUs, categories..."
      tableTitle="Products"
      actionLabel="View"
      statusLabelMap={{ active: 'Active', archived: 'Archived' }}
      stats={[
        { label: 'Products',         value: '48',    change: '42 active',             trend: 'neutral' },
        { label: 'Low Stock',        value: '6',     change: 'Below minimum',         trend: 'down'    },
        { label: 'Out of Stock',     value: '2',     change: 'Requires reorder',      trend: 'down'    },
        { label: 'Categories',       value: '8',     change: 'Configured categories', trend: 'neutral' },
      ]}
      columns={['SKU', 'Product Name', 'On Hand', 'Status', 'Category']}
      sampleRows={[
        {
          ref:     'SKU-ERG-904',
          desc:    'Ergonomic Task Chair (Mesh Black)',
          qty:     '142 pcs',
          status:  'active',
          updated: 'Furniture',
        },
        {
          ref:     'SKU-DKS-301',
          desc:    'Motorized Standing Desk Frame 140cm',
          qty:     '28 pcs',
          status:  'active',
          updated: 'Furniture',
        },
        {
          ref:     'SKU-MON-881',
          desc:    'Dual Arm VESA Monitor Mount Heavy-Duty',
          qty:     '310 pcs',
          status:  'active',
          updated: 'Accessories',
        },
        {
          ref:     'SKU-CBL-102',
          desc:    'Braided Thunderbolt 4 Cable 2m',
          qty:     '0 pcs',
          status:  'archived',
          updated: 'Electronics',
        },
      ]}
    />
  )
}

export function ReceiptsPlaceholder() {
  return (
    <PlaceholderPage
      title="Receipts"
      subtitle="Record and process incoming stock."
      stats={[
        { label: 'Receipts Scheduled', value: '24', change: '7 due today', trend: 'up' },
        { label: 'Waiting Stock', value: '5', change: 'Pending', trend: 'neutral' },
        { label: 'Ready to Receive', value: '11', change: 'Ready', trend: 'neutral' },
        { label: 'Completed', value: '188', change: 'Processed', trend: 'up' },
      ]}
      columns={['Receipt ID', 'Partner / Source Document', 'Quantity', 'Status', 'Scheduled Date']}
      sampleRows={[
        {
          ref: 'WH/IN/00094',
          desc: 'Apex Industrial Parts / PO-2026-091',
          qty: '1,200 pcs',
          status: 'ready',
          updated: 'Today 14:00',
        },
        {
          ref: 'WH/IN/00095',
          desc: 'Pacific Logistics Supply / PO-2026-092',
          qty: '450 pcs',
          status: 'confirmed',
          updated: 'Today 16:30',
        },
        {
          ref: 'WH/IN/00096',
          desc: 'Starlight Manufacturing / PO-2026-093',
          qty: '2,800 pcs',
          status: 'draft',
          updated: 'Tomorrow 09:00',
        },
        {
          ref: 'WH/IN/00093',
          desc: 'Global Hardware Corp / PO-2026-088',
          qty: '620 pcs',
          status: 'done',
          updated: 'Yesterday 17:15',
        },
      ]}
    />
  )
}

export function DeliveriesPlaceholder() {
  return (
    <PlaceholderPage
      title="Deliveries"
      subtitle="Prepare and process outgoing stock."
      stats={[
        { label: 'Deliveries Today', value: '42', change: '18 dispatched', trend: 'up' },
        { label: 'Ready', value: '9', change: 'Ready for delivery', trend: 'neutral' },
        { label: 'Waiting', value: '6', change: 'Awaiting stock', trend: 'neutral' },
        { label: 'Completed', value: '210', change: 'Completed this month', trend: 'up' },
      ]}
      columns={['Delivery Order', 'Destination / Customer SO', 'Items', 'Status', 'Scheduled Date']}
      sampleRows={[
        {
          ref: 'WH/OUT/00140',
          desc: 'Northwind Enterprise / SO-88912',
          qty: '18 items (4 boxes)',
          status: 'ready',
          updated: 'Departs 13:30',
        },
        {
          ref: 'WH/OUT/00141',
          desc: 'TechCorp Logistics / SO-88915',
          qty: '65 items (12 boxes)',
          status: 'confirmed',
          updated: 'Departs 15:00',
        },
        {
          ref: 'WH/OUT/00142',
          desc: 'Delta Systems Inc / SO-88918',
          qty: '4 items (1 box)',
          status: 'draft',
          updated: 'Departs 17:00',
        },
        {
          ref: 'WH/OUT/00139',
          desc: 'Standard Retailers / SO-88904',
          qty: '120 items (Pallet #2)',
          status: 'done',
          updated: 'Dispatched 10:15',
        },
      ]}
    />
  )
}

export function TransfersPlaceholder() {
  return (
    <PlaceholderPage
      title="Internal Transfers"
      subtitle="Move stock between locations."
      stats={[
        { label: 'Active Movements', value: '18', change: 'In progress', trend: 'neutral' },
        { label: 'Ready', value: '7', change: 'Ready to transfer', trend: 'up' },
        { label: 'Completed', value: '84', change: 'Last 24 hours', trend: 'up' },
        { label: 'Draft', value: '4', change: 'New transfers', trend: 'neutral' },
      ]}
      columns={['Transfer ID', 'Source Location → Destination', 'Items', 'Status', 'Operator']}
      sampleRows={[
        {
          ref: 'WH/INT/00045',
          desc: 'WH01/Bulk/Row-4 → WH01/Pick/Bin-12',
          qty: '200 units',
          status: 'ready',
          updated: 'J. Diaz',
        },
        {
          ref: 'WH/INT/00046',
          desc: 'WH01/Inbound/Staging → WH01/Rack-B3',
          qty: '500 units',
          status: 'confirmed',
          updated: 'K. Smith',
        },
        {
          ref: 'WH/INT/00047',
          desc: 'WH01/Main → WH02/North Staging',
          qty: '80 units',
          status: 'draft',
          updated: 'Unassigned',
        },
        {
          ref: 'WH/INT/00044',
          desc: 'WH01/Return/Inspect → WH01/Stock/A1',
          qty: '15 units',
          status: 'done',
          updated: 'M. Vance',
        },
      ]}
    />
  )
}

export function AdjustmentsPlaceholder() {
  return (
    <PlaceholderPage
      title="Inventory Adjustments"
      subtitle="Reconcile physical stock with system quantities."
      stats={[
        { label: 'Active Adjustments', value: '3', change: 'In progress', trend: 'neutral' },
        { label: 'Discrepancies', value: '2', change: 'Under review', trend: 'down' },
        { label: 'Approved', value: '14', change: 'This quarter', trend: 'neutral' },
        { label: 'Completed', value: '42', change: 'Reconciled', trend: 'up' },
      ]}
      columns={['Adjustment Ref', 'Location / Product', 'Difference', 'Status', 'Date']}
      sampleRows={[
        {
          ref: 'WH/ADJ/00021',
          desc: 'Aisle 4 Bin 12 / Industrial Fasteners',
          qty: '-10 pcs',
          status: 'ready',
          updated: 'Pending Signoff',
        },
        {
          ref: 'WH/ADJ/00022',
          desc: 'Bay 2 Shelf 3 / Dual Arm Monitor Mounts',
          qty: '+2 pcs',
          status: 'confirmed',
          updated: 'Under Review',
        },
        {
          ref: 'WH/ADJ/00020',
          desc: 'Warehouse 01 Cycle Count',
          qty: '0 variance',
          status: 'done',
          updated: '2 days ago',
        },
      ]}
    />
  )
}

export function HistoryPlaceholder() {
  return (
    <PlaceholderPage
      title="Move History"
      subtitle="View stock movement history."
      stats={[
        { label: 'Total Moves', value: '4,192', change: '+341 today', trend: 'up' },
        { label: 'Receipts', value: '1,240', change: 'Inbound', trend: 'up' },
        { label: 'Deliveries', value: '2,110', change: 'Outbound', trend: 'neutral' },
        { label: 'Transfers', value: '842', change: 'Internal', trend: 'up' },
      ]}
      columns={['Move Reference', 'Product', 'Quantity', 'Status', 'Date & Time']}
      sampleRows={[
        {
          ref: 'MV-2026-99014',
          desc: 'Ergonomic Task Chair',
          qty: '+50 pcs',
          status: 'done',
          updated: 'Today 11:24',
        },
        {
          ref: 'MV-2026-99015',
          desc: 'Braided Thunderbolt Cable',
          qty: '-12 pcs',
          status: 'done',
          updated: 'Today 11:18',
        },
        {
          ref: 'MV-2026-99013',
          desc: 'Standing Desk Frame',
          qty: '1 unit',
          status: 'done',
          updated: 'Today 10:55',
        },
        {
          ref: 'MV-2026-99012',
          desc: 'Hydraulic Seal Kit',
          qty: '-1 unit',
          status: 'done',
          updated: 'Today 09:40',
        },
      ]}
    />
  )
}

export function WarehousesPlaceholder() {
  return (
    <PlaceholderPage
      title="Warehouses"
      subtitle="Manage warehouses and storage locations."
      stats={[
        { label: 'Total Warehouses', value: '3', change: 'Active', trend: 'up' },
        { label: 'Storage Locations', value: '412', change: 'Across warehouses', trend: 'neutral' },
        { label: 'Active Warehouses', value: '3', change: 'Operational', trend: 'neutral' },
        { label: 'Zones', value: '18', change: 'Configured zones', trend: 'neutral' },
      ]}
      columns={['Short Code', 'Warehouse Name', 'Locations', 'Status', 'Address']}
      sampleRows={[
        {
          ref: 'WH01',
          desc: 'Main Central Warehouse',
          qty: '240 Locations',
          status: 'done',
          updated: '12 Industrial Ave',
        },
        {
          ref: 'WH02',
          desc: 'North Distribution Center',
          qty: '110 Locations',
          status: 'done',
          updated: '45 Logistics Blvd',
        },
        {
          ref: 'WH03',
          desc: 'Cold Storage Facility',
          qty: '62 Locations',
          status: 'ready',
          updated: '88 Harbour Way',
        },
      ]}
    />
  )
}

export function ProfilePlaceholder() {
  const { user } = useAuth()

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-slate-200/80 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-heading font-semibold text-slate-900 tracking-tight">
              Profile
            </h1>
            <Badge variant="brand" dot className="text-[11px]">
              Active Session
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-sans">
            User credentials, role permissions, and default warehouse
          </p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden shadow-2xs">
        <div className="bg-slate-50/70 border-b border-slate-200/80 py-3.5 px-5 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-md bg-brand text-white font-heading font-semibold flex items-center justify-center text-sm shadow-2xs">
            {user?.name
              ? user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : 'AM'}
          </div>
          <div>
            <h2 className="text-sm font-heading font-semibold text-slate-900 leading-tight">
              {user?.name || 'Alex Mercer'}
            </h2>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Inventory Manager
            </p>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-slate-700">
              <Mail className="w-4 h-4 text-brand shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px]">Email Address</span>
                <span className="font-medium font-mono text-slate-800">{user?.email || 'alex.mercer@stocksense.io'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-700">
              <Shield className="w-4 h-4 text-brand shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px]">Role</span>
                <span className="font-medium capitalize text-slate-800">{user?.role || 'Inventory Manager'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-slate-700">
              <Warehouse className="w-4 h-4 text-brand shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px]">Default Warehouse</span>
                <span className="font-medium text-slate-800">{user?.warehouseName || 'WH01 — Main Central Warehouse'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-700">
              <Key className="w-4 h-4 text-brand shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px]">Status</span>
                <span className="font-medium text-emerald-600">Active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/50 border-t border-slate-100 py-3 px-5 flex items-center justify-between text-xs text-slate-500">
          <span>Active Session</span>
          <span className="font-mono text-[11px]">User ID: {user?.id || 'usr_01HXYZ789'}</span>
        </div>
      </div>
    </div>
  )
}
