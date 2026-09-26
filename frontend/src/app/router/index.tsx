import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  LoginPage,
  SignupPage,
  ForgotPasswordPage,
  OtpVerificationPage,
  ResetPasswordPage,
} from '@/features/auth'
import {
  DashboardPlaceholder,
  ProductsPlaceholder,
  ReceiptsPlaceholder,
  DeliveriesPlaceholder,
  TransfersPlaceholder,
  AdjustmentsPlaceholder,
  HistoryPlaceholder,
  WarehousesPlaceholder,
  ProfilePlaceholder,
} from './placeholders'

export const router = createBrowserRouter([
  // ── Authentication Routes ──────────────────────────────────────────────
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/verify-otp',
    element: <OtpVerificationPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },

  // ── Authenticated App Shell Routes ──────────────────────────────────────
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPlaceholder />,
      },
      {
        path: 'products',
        element: <ProductsPlaceholder />,
      },
      {
        path: 'operations',
        children: [
          {
            index: true,
            element: <Navigate to="/operations/receipts" replace />,
          },
          {
            path: 'receipts',
            element: <ReceiptsPlaceholder />,
          },
          {
            path: 'deliveries',
            element: <DeliveriesPlaceholder />,
          },
          {
            path: 'transfers',
            element: <TransfersPlaceholder />,
          },
          {
            path: 'adjustments',
            element: <AdjustmentsPlaceholder />,
          },
          {
            path: 'history',
            element: <HistoryPlaceholder />,
          },
        ],
      },
      {
        path: 'settings',
        children: [
          {
            index: true,
            element: <Navigate to="/settings/warehouses" replace />,
          },
          {
            path: 'warehouses',
            element: <WarehousesPlaceholder />,
          },
        ],
      },
      {
        path: 'profile',
        element: <ProfilePlaceholder />,
      },
    ],
  },

  // ── Catch-All ──────────────────────────────────────────────────────────
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
