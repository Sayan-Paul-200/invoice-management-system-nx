import { Navigate } from "react-router-dom";
import { AppRoute } from "./utils";
import { lazy, Suspense } from "react";
import { SuspenseLoader } from "@components/loaders/SuspenseLoader";
import { AppLayout } from "@layouts/AppLayout";
import { IconChartBar } from "@tabler/icons-react";

// Import pages
const AdminDashboard = lazy(() => import('@pages/admin/AdminDashboard'));

export const adminRoutes: AppRoute = {
    path: '/admin',
    element: <AppLayout />,
    children: [
        {
            label: 'Dashboard',
            path: 'dashboard',
            icon: IconChartBar,
            element: (
                <Suspense fallback={<SuspenseLoader />}>
                    <AdminDashboard />
                </Suspense>
            )
        }
    ]
}