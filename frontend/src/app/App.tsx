/**
 * App.tsx
 * -------
 * Root application shell. Providers and the router mount here.
 * Add React Query, React Router, and any other providers in
 * src/app/providers/ and compose them here.
 */

export default function App() {
  return (
    <div className="page-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="px-4 py-4 border-b border-gray-200">
          <h1 className="text-heading text-brand font-heading">StockSense</h1>
          <p className="text-xs text-gray-500">Inventory Management</p>
        </div>
        <nav className="flex-1 py-2">
          <span className="nav-section-label">Operations</span>
          <a href="#" className="nav-item active">
            <span>Products</span>
          </a>
          <a href="#" className="nav-item">
            <span>Inventory</span>
          </a>
          <a href="#" className="nav-item">
            <span>Receipts</span>
          </a>
          <a href="#" className="nav-item">
            <span>Deliveries</span>
          </a>
          <span className="nav-section-label">Warehouse</span>
          <a href="#" className="nav-item">
            <span>Warehouses</span>
          </a>
          <a href="#" className="nav-item">
            <span>Transfers</span>
          </a>
          <a href="#" className="nav-item">
            <span>Adjustments</span>
          </a>
          <span className="nav-section-label">Insights</span>
          <a href="#" className="nav-item">
            <span>Dashboard</span>
          </a>
        </nav>
      </aside>

      {/* Main content area */}
      <div className="page-main">
        {/* Top bar */}
        <header className="page-topbar">
          <nav className="breadcrumb">
            <span className="breadcrumb-item">
              <a href="#">Inventory</a>
            </span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-item">Products</span>
          </nav>
          <div className="flex items-center gap-2">
            <button className="btn btn-primary btn-md">New</button>
            <button className="btn btn-secondary btn-md">Filters ▾</button>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="stat-card">
              <div className="stat-label">Total SKUs</div>
              <div className="stat-value">2,481</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">In Transit</div>
              <div className="stat-value">34</div>
              <div className="stat-trend-up">↑ 12 today</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Low Stock</div>
              <div className="stat-value" style={{ color: 'var(--color-warning-text)' }}>18</div>
              <div className="stat-trend-down">Below threshold</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Receipts Due</div>
              <div className="stat-value" style={{ color: 'var(--color-info-text)' }}>7</div>
            </div>
          </div>

          {/* Data Table */}
          <div className="card">
            <div className="card-header">Recent Transfers</div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" /></th>
                    <th>Reference</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Source</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="selected">
                    <td><input type="checkbox" defaultChecked /></td>
                    <td className="td-mono">WH/IN/00042</td>
                    <td>Office Chair (Black)</td>
                    <td className="td-mono">50</td>
                    <td>Purchase Order</td>
                    <td><span className="badge badge-done">Done</span></td>
                  </tr>
                  <tr>
                    <td><input type="checkbox" /></td>
                    <td className="td-mono">WH/IN/00043</td>
                    <td>Standing Desk</td>
                    <td className="td-mono">12</td>
                    <td>Purchase Order</td>
                    <td><span className="badge badge-ready">Ready</span></td>
                  </tr>
                  <tr>
                    <td><input type="checkbox" /></td>
                    <td className="td-mono">WH/OUT/00089</td>
                    <td>Laptop Bag (Grey)</td>
                    <td className="td-mono">200</td>
                    <td>Sales Order</td>
                    <td><span className="badge badge-confirmed">Confirmed</span></td>
                  </tr>
                  <tr>
                    <td><input type="checkbox" /></td>
                    <td className="td-mono">WH/INT/00017</td>
                    <td>USB-C Hub</td>
                    <td className="td-mono">80</td>
                    <td>Internal Transfer</td>
                    <td><span className="badge badge-draft">Draft</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
