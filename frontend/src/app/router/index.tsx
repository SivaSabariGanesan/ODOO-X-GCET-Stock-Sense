import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  LoginPage,
  SignupPage,
  ForgotPasswordPage,
  OtpVerificationPage,
  ResetPasswordPage,
} from '@/features/auth'
import { DashboardPage } from '@/features/dashboard'
import {
  ProductsListPage,
  ProductFormPage,
  ProductDetailsPage,
} from '@/features/products'
import {
  ReceiptsListPage,
  ReceiptFormPage,
  ReceiptDetailsPage,
} from '@/features/receipts'
import {
  DeliveriesListPage,
  DeliveryFormPage,
  DeliveryDetailsPage,
} from '@/features/deliveries'
import {
  TransfersListPage,
  TransferFormPage,
  TransferDetailsPage,
} from '@/features/transfers'
import {
  AdjustmentsListPage,
  AdjustmentFormPage,
  AdjustmentDetailsPage,
} from '@/features/adjustments'
import { MoveHistoryPage } from '@/features/moves'
import {
  WarehousesListPage,
  WarehouseDetailsPage,
} from '@/features/warehouses'
import { ProfilePage } from '@/features/profile'

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
        element: <DashboardPage />,
      },
      {
        path: 'products',
        children: [
          {
            index: true,
            element: <ProductsListPage />,
          },
          {
            path: 'new',
            element: <ProductFormPage />,
          },
          {
            path: ':id',
            element: <ProductDetailsPage />,
          },
          {
            path: ':id/edit',
            element: <ProductFormPage isEdit />,
          },
        ],
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
            children: [
              {
                index: true,
                element: <ReceiptsListPage />,
              },
              {
                path: 'new',
                element: <ReceiptFormPage />,
              },
              {
                path: ':id',
                element: <ReceiptDetailsPage />,
              },
            ],
          },
          {
            path: 'deliveries',
            children: [
              {
                index: true,
                element: <DeliveriesListPage />,
              },
              {
                path: 'new',
                element: <DeliveryFormPage />,
              },
              {
                path: ':id',
                element: <DeliveryDetailsPage />,
              },
            ],
          },
          {
            path: 'transfers',
            children: [
              {
                index: true,
                element: <TransfersListPage />,
              },
              {
                path: 'new',
                element: <TransferFormPage />,
              },
              {
                path: ':id',
                element: <TransferDetailsPage />,
              },
            ],
          },
          {
            path: 'adjustments',
            children: [
              {
                index: true,
                element: <AdjustmentsListPage />,
              },
              {
                path: 'new',
                element: <AdjustmentFormPage />,
              },
              {
                path: ':id',
                element: <AdjustmentDetailsPage />,
              },
            ],
          },
          {
            path: 'moves',
            element: <MoveHistoryPage />,
          },
          {
            path: 'history',
            element: <Navigate to="/operations/moves" replace />,
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
            children: [
              {
                index: true,
                element: <WarehousesListPage />,
              },
              {
                path: ':id',
                element: <WarehouseDetailsPage />,
              },
            ],
          },
        ],
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
    ],
  },

  // ── Catch-All ──────────────────────────────────────────────────────────
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
