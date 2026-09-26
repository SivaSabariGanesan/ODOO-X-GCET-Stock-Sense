import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User as UserIcon,
  Mail,
  Shield,
  Warehouse,
  Key,
  LogOut,
  Save,
  CheckCircle2,
  Lock,
  Globe,
  Smartphone,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useToast } from '@/context/ToastContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'

export function ProfilePage() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  // Profile Form State
  const [name, setName] = useState(user?.name || 'Alex Mercer')
  const [email, setEmail] = useState(user?.email || 'alex.mercer@stocksense.io')
  const [role, setRole] = useState(user?.role || 'inventory_manager')
  const [warehouseName, setWarehouseName] = useState(
    user?.warehouseName || 'WH01 — Main Central Warehouse'
  )

  // Security State
  const [mfaEnabled, setMfaEnabled] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Password Update Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Logout Confirmation Modal State
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      toast.error('Validation Error', 'Name and email are required.')
      return
    }

    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      updateUser({
        name: name.trim(),
        email: email.trim(),
        role: role as any,
        warehouseName,
      })
      toast.success('Profile Updated', 'Your operator information has been successfully saved.')
    }, 300)
  }

  const handleUpdatePassword = () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Weak Password', 'New password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mismatch Error', 'New passwords do not match.')
      return
    }

    setIsPasswordModalOpen(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    toast.success('Password Updated', 'Your account credentials have been successfully updated.')
  }

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false)
    logout()
    toast.info('Session Terminated', 'You have been signed out of the terminal.')
    navigate('/login')
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-16">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading">
              Operator Profile & Security
            </h1>
            <Badge variant="brand" dot className="text-[11px]">
              Active Session
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-sans">
            User credentials, role permissions, active warehouse context, and authentication preferences.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsLogoutModalOpen(true)}
          className="text-rose-600 hover:bg-rose-50 border-rose-200 shrink-0"
          leftIcon={<LogOut className="w-3.5 h-3.5 text-rose-600" />}
        >
          Sign Out
        </Button>
      </div>

      {/* ── Operator Summary Hero Card ──────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-brand text-white font-heading font-bold text-lg flex items-center justify-center shadow-xs">
            {name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 font-heading leading-tight">
              {name}
            </h2>
            <span className="font-mono text-xs text-slate-500 block mt-0.5">
              {email}
            </span>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10.5px] font-mono capitalize">
                {role.replace('_', ' ')}
              </span>
              <span className="text-[10.5px] text-emerald-700 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                MFA Verified
              </span>
            </div>
          </div>
        </div>

        <div className="text-right text-xs text-slate-500 font-mono hidden sm:block">
          <div>Node ID: SS-NODE-01</div>
          <div className="text-[11px] text-slate-400">RSA 4096 Signed Session</div>
        </div>
      </div>

      {/* ── Profile Details Form ────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-brand" />
            <span>Account Details</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Update your operational display name, notification email, and primary warehouse facility.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Mercer"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex.mercer@stocksense.io"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Operational Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
              >
                <option value="inventory_manager">Inventory Manager (Full Operations)</option>
                <option value="admin">System Administrator (Root Access)</option>
                <option value="warehouse_operator">Warehouse Operator (Floor Intake/Dispatches)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Assigned Facility Node</label>
              <select
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand cursor-pointer"
              >
                <option value="WH01 — Main Central Warehouse">WH01 — Main Central Warehouse</option>
                <option value="WH02 — North Distribution Hub">WH02 — North Distribution Hub</option>
                <option value="WH03 — Cold Storage Facility">WH03 — Cold Storage Facility</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-slate-100">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              {isSaving ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>
      </div>

      {/* ── Security & Authentication Preferences ───────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-brand" />
              <span>Authentication & Security</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Multi-factor authentication, cryptographic credentials, and active terminal sessions.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() => setIsPasswordModalOpen(true)}
            leftIcon={<Lock className="w-3 h-3" />}
          >
            Change Password
          </Button>
        </div>

        <div className="space-y-3 text-xs">
          {/* MFA Toggle */}
          <div className="p-3.5 bg-slate-50/70 rounded-lg border border-slate-200 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-900 block">
                Two-Factor Authentication (TOTP)
              </span>
              <span className="text-[11px] text-slate-500 block">
                Requires a 6-digit one-time code during terminal sign-in.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setMfaEnabled(!mfaEnabled)
                toast.info(
                  mfaEnabled ? 'MFA Disabled' : 'MFA Enabled',
                  `Two-factor authentication is now ${!mfaEnabled ? 'active' : 'disabled'}.`
                )
              }}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium border transition-colors cursor-pointer',
                mfaEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              )}
            >
              {mfaEnabled ? 'Active / Protected' : 'Disabled'}
            </button>
          </div>

          {/* Active Session Card */}
          <div className="p-3.5 bg-slate-50/70 rounded-lg border border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-slate-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900 block">
                  Current Web Terminal Session
                </span>
                <span className="text-[11px] text-slate-500 font-mono block">
                  192.168.1.104 &middot; Chrome on Windows &middot; Frankfurt, DE
                </span>
              </div>
            </div>
            <Badge variant="done" dot className="text-[10.5px]">
              Current Device
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Change Password Modal ───────────────────────────────────── */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-2xs animate-[fadeIn_100ms_ease-out]">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#ede9fe] text-brand-dark flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  Update Account Password
                </h3>
                <p className="text-slate-500 mt-0.5">
                  Enter your current password and choose a secure replacement.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">New Password (min 8 chars)</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsPasswordModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdatePassword}
              >
                Save New Password
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sign Out Confirmation Modal ─────────────────────────────── */}
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        title="Sign Out of StockSense"
        description="Are you sure you want to end your active terminal session? You will be redirected to the sign-in portal."
        confirmLabel="Sign Out"
        cancelLabel="Stay Signed In"
        variant="danger"
        onConfirm={handleConfirmLogout}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </div>
  )
}
