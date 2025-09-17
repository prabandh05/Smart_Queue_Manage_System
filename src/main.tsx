import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import "./index.css";
import App from "./App.tsx";
const Index = lazy(() => import("./pages/Index").then(m => ({ default: m.Index })));
const CitizenDashboard = lazy(() => import("./pages/CitizenDashboard").then(m => ({ default: m.CitizenDashboard })));
const OfficerDashboard = lazy(() => import("./pages/OfficerDashboard").then(m => ({ default: m.OfficerDashboard })));
const NotFound = lazy(() => import("./pages/NotFound").then(m => ({ default: m.default })));
const LiveQueueDisplay = lazy(() => import("./components/queue/LiveQueueDisplay").then(m => ({ default: m.LiveQueueDisplay })));

// Reuse ProtectedRoute from App for role-based protection
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error: ProtectedRoute is the default export's named inner component
import { ProtectedRoute } from "./App";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<App />}>
      <Route index element={<Index />} />
      <Route path="/display" element={<LiveQueueDisplay />} />
      <Route
        path="/citizen"
        element={
          <ProtectedRoute requireRole="citizen">
            <CitizenDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer"
        element={
          <ProtectedRoute requireRole="officer">
            <OfficerDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Route>
  ),
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>Loading…</div>}>
    <RouterProvider router={router} />
  </Suspense>
);
