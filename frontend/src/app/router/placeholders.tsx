import { PlaceholderPage } from '@/components/common/PlaceholderPage'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Shield, Warehouse, Mail, Key } from 'lucide-react'

export function DashboardPlaceholder() {
  return (
    <PlaceholderPage
      title="Inventory Operations Dashboard"
      subtitle="Real-time operational overview of warehouse receipts, dispatches, stock levels, and transfer queues"
      moduleCode="WH/DASH/01"
      stats={[
        { label: 'Total Tracked SKUs', value: '2,481', change: '+18 this week', trend: 'up' },
        { label: 'Inbound Receipts Due', value: '14', change: '4 arriving today', trend: 'neutral' },
        { label: 'Outbound Dispatches', value: '29', change: '8 pending pack', trend: 'down' },
        { label: 'Low Stock Alerts', value: '6', change: 'Below safety threshold', trend: 'down' },
      ]}
      columns={['Reference', 'Activity Type', 'Source / Dest', 'Status', 'Timestamp']}
      sampleRows={[
        {
          ref: 'WH/IN/00094',
          desc: 'PO-8821 Raw Components Intake',
          qty: '350 units',
          status: 'ready',
          updated: '8 mins ago',
        },
        {
          ref: 'WH/OUT/00142',
          desc: 'SO-4402 Expedited Commercial Freight',
          qty: '45 cartons',
          status: 'confirmed',
          updated: '22 mins ago',
        },
        {
          ref: 'WH/INT/00088',
          desc: 'Zone B Staging to Bay 4 Rack 12',
          qty: '120 units',
          status: 'done',
          updated: '45 mins ago',
        },
        {
          ref: 'WH/ADJ/00019',
          desc: 'Cycle Count Adjustment (Aisle 3)',
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
      subtitle="SKU definitions, product categories, units of measure, and multi-location stock balances"
      // moduleCode omitted — internal codes do not belong in the user-facing header
      showCalendarView={false}
      showPrintSlip={false}
      searchPlaceholder="Search products, SKUs, categories..."
      tableTitle="Product Catalog"
      actionLabel="View"
      // Map product lifecycle states (driven by products.is_active) to
      // human-readable labels. 'active' = is_active true, 'archived' = false.
      statusLabelMap={{ active: 'Active', archived: 'Archived' }}
      stats={[
        { label: 'Products',         value: '2,481', change: '2,473 active',          trend: 'neutral' },
        { label: 'Reorder Required', value: '142',   change: 'Products below minimum', trend: 'down'    },
        { label: 'Out of Stock',     value: '8',     change: 'Requires replenishment', trend: 'down'    },
        { label: 'Categories',       value: '34',    change: '6 primary families',     trend: 'neutral' },
      ]}
      columns={['Product SKU', 'Product Name', 'On-hand', 'Status', 'Category']}
      sampleRows={[
        {
          ref:     'SKU-ERG-904',
          desc:    'Ergonomic Task Chair (Mesh Black)',
          qty:     '142 pcs',
          status:  'active',
          updated: 'Furniture / Seating',
        },
        {
          ref:     'SKU-DKS-301',
          desc:    'Motorized Standing Desk Frame 140cm',
          qty:     '28 pcs',
          status:  'active',
          updated: 'Furniture / Desks',
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
          desc:    'Braided Thunderbolt 4 Cable 2m (Legacy)',
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
      title="Incoming Receipts (Inbound Operations)"
      subtitle="Vendor purchase order intake, dock delivery receipts, inspection quality checks, and putaway staging"
      moduleCode="WH/IN/REC"
      stats={[
        { label: 'Receipts Scheduled', value: '24', change: '7 due today', trend: 'up' },
        { label: 'Dock Receiving', value: '5', change: 'In active staging', trend: 'neutral' },
        { label: 'Putaway Pending', value: '11', change: 'Awaiting bin allocation', trend: 'neutral' },
        { label: 'Received This Week', value: '188', change: '99.8% accuracy', trend: 'up' },
      ]}
      columns={['Receipt ID', 'Vendor / Source Document', 'Total Quantity', 'Status', 'Scheduled Date']}
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
      title="Outgoing Delivery Orders"
      subtitle="Sales order dispatches, wave picking queues, packing verification, and courier handoff"
      moduleCode="WH/OUT/DEL"
      stats={[
        { label: 'Dispatches Today', value: '42', change: '18 dispatched', trend: 'up' },
        { label: 'Picking Active', value: '9', change: 'Wave #14', trend: 'neutral' },
        { label: 'Packing & Staging', value: '6', change: 'Awaiting courier', trend: 'neutral' },
        { label: 'Carrier On-Time %', value: '98.6%', change: '+0.4% this month', trend: 'up' },
      ]}
      columns={['Delivery Order', 'Destination / Customer SO', 'Items / Cartons', 'Status', 'Dispatch Window']}
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
      title="Internal Stock Transfers"
      subtitle="Inter-location stock routing, rack-to-rack replenishment, zone transfers, and facility movements"
      moduleCode="WH/INT/TRF"
      stats={[
        { label: 'Active Movements', value: '18', change: '4 inter-warehouse', trend: 'neutral' },
        { label: 'Replenishment Moves', value: '7', change: 'High-velocity bins', trend: 'up' },
        { label: 'Completed Transfers', value: '84', change: 'Last 24 hours', trend: 'up' },
        { label: 'Avg Transfer Time', value: '14m', change: 'Within SLA', trend: 'neutral' },
      ]}
      columns={['Transfer ID', 'Source Location → Destination', 'Stock Items', 'Status', 'Assigned Handler']}
      sampleRows={[
        {
          ref: 'WH/INT/00045',
          desc: 'WH01/Bulk/Row-4 → WH01/Pick/Bin-12',
          qty: '200 units',
          status: 'ready',
          updated: 'Operator: J. Diaz',
        },
        {
          ref: 'WH/INT/00046',
          desc: 'WH01/Inbound/Staging → WH01/Rack-B3',
          qty: '500 units',
          status: 'confirmed',
          updated: 'Operator: K. Smith',
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
          updated: 'Operator: M. Vance',
        },
      ]}
    />
  )
}

export function AdjustmentsPlaceholder() {
  return (
    <PlaceholderPage
      title="Inventory Adjustments & Cycle Counts"
      subtitle="Stock reconciliation, theoretical vs counted discrepancy logging, cycle count validations"
      moduleCode="WH/ADJ/INV"
      stats={[
        { label: 'Active Cycle Counts', value: '3', change: 'Zone A & B', trend: 'neutral' },
        { label: 'Discrepancy Variances', value: '2', change: '-$42.00 variance', trend: 'down' },
        { label: 'Reconciled Stock', value: '99.8%', change: 'Audit benchmark', trend: 'up' },
        { label: 'Approved Adjustments', value: '14', change: 'This quarter', trend: 'neutral' },
      ]}
      columns={['Adjustment Ref', 'Target Location / Product', 'Variance / Qty', 'Status', 'Audit Timestamp']}
      sampleRows={[
        {
          ref: 'WH/ADJ/00021',
          desc: 'Aisle 4 Bin 12 / Industrial Fasteners',
          qty: '-10 pcs (Variance)',
          status: 'ready',
          updated: 'Pending Supervisor Signoff',
        },
        {
          ref: 'WH/ADJ/00022',
          desc: 'Bay 2 Shelf 3 / Dual Arm Monitor Mounts',
          qty: '+2 pcs (Found)',
          status: 'confirmed',
          updated: 'Under Review',
        },
        {
          ref: 'WH/ADJ/00020',
          desc: 'Warehouse 01 Full Quarterly Cycle Count',
          qty: '0 variance',
          status: 'done',
          updated: 'Reconciled 2 days ago',
        },
      ]}
    />
  )
}

export function HistoryPlaceholder() {
  return (
    <PlaceholderPage
      title="Stock Move History Ledger"
      subtitle="Immutable cryptographic ledger of every inventory mutation, lot tracking, user signature, and timestamp"
      moduleCode="WH/MOVE/HIST"
      stats={[
        { label: 'Total Stock Moves', value: '48,192', change: '+341 today', trend: 'up' },
        { label: 'Audit Compliance', value: '100%', change: 'ISO 9001 certified', trend: 'up' },
        { label: 'Traceable Lots', value: '1,890', change: 'Active lot tracking', trend: 'neutral' },
        { label: 'Average Moves/Hr', value: '42.4', change: 'Peak shift', trend: 'up' },
      ]}
      columns={['Move Reference', 'Product & Lot/Serial', 'Quantity Mutation', 'Status', 'Logged Timestamp']}
      sampleRows={[
        {
          ref: 'MV-2026-99014',
          desc: 'Ergonomic Task Chair (Lot: LT-8841)',
          qty: '+50 pcs (Inbound Intake)',
          status: 'done',
          updated: 'Today 11:24:02',
        },
        {
          ref: 'MV-2026-99015',
          desc: 'Braided Thunderbolt Cable (Lot: LT-3312)',
          qty: '-12 pcs (Customer SO-8812)',
          status: 'done',
          updated: 'Today 11:18:45',
        },
        {
          ref: 'MV-2026-99013',
          desc: 'Standing Desk Frame (Serial: SN-49021)',
          qty: '1 unit (Internal Move)',
          status: 'done',
          updated: 'Today 10:55:10',
        },
        {
          ref: 'MV-2026-99012',
          desc: 'Hydraulic Seal Kit (Lot: LT-1029)',
          qty: '-1 unit (Scrap / Damaged)',
          status: 'done',
          updated: 'Today 09:40:12',
        },
      ]}
    />
  )
}

export function WarehousesPlaceholder() {
  return (
    <PlaceholderPage
      title="Warehouse Facilities & Locations"
      subtitle="Physical warehouse facilities, hierarchical location trees, storage zones, aisles, and staging racks"
      moduleCode="CFG/WH/SETUP"
      stats={[
        { label: 'Active Facilities', value: '3', change: 'All nodes online', trend: 'up' },
        { label: 'Storage Locations', value: '412', change: 'Across 3 facilities', trend: 'neutral' },
        { label: 'Capacity Utilization', value: '74.2%', change: '25.8% available', trend: 'neutral' },
        { label: 'Designated Zones', value: '18', change: 'Cold / Bulk / Rack', trend: 'neutral' },
      ]}
      columns={['Facility Code', 'Warehouse Name', 'Operating Locations', 'Status', 'Primary Manager']}
      sampleRows={[
        {
          ref: 'WH01',
          desc: 'Main Central Hub (HQ Distribution)',
          qty: '240 Locations',
          status: 'done',
          updated: 'Alex Mercer (Lead)',
        },
        {
          ref: 'WH02',
          desc: 'North Distribution Facility',
          qty: '110 Locations',
          status: 'done',
          updated: 'Marcus Vance',
        },
        {
          ref: 'WH03',
          desc: 'Cold Storage & Chemical Bay',
          qty: '62 Locations',
          status: 'ready',
          updated: 'Elena Rostova',
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
              Operator Profile
            </h1>
            <Badge variant="brand" dot className="text-[11px]">
              Active Session
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-sans">
            User credentials, role permissions, and active warehouse node assignments
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
              Lead Inventory Operations Specialist
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
                <span className="text-slate-400 block text-[11px]">System Role</span>
                <span className="font-medium capitalize text-slate-800">{user?.role || 'Inventory Manager'} (Full Access)</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-slate-700">
              <Warehouse className="w-4 h-4 text-brand shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px]">Assigned Warehouse</span>
                <span className="font-medium text-slate-800">{user?.warehouseName || 'WH01 — Main Central Warehouse'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-700">
              <Key className="w-4 h-4 text-brand shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px]">Security Level</span>
                <span className="font-medium text-emerald-600">MFA Verified &middot; RSA 4096</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/50 border-t border-slate-100 py-3 px-5 flex items-center justify-between text-xs text-slate-500">
          <span>Session Node: SS-PROD-EUR-01</span>
          <span className="font-mono text-[11px]">User ID: {user?.id || 'usr_01HXYZ789'}</span>
        </div>
      </div>
    </div>
  )
}
