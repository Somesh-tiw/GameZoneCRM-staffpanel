import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import { setAutoLogout, getToken } from "./utils/auth";

import Login from "./Login";
import ViewOrders from "./ViewOrders";
import CreateOrders from "./CreateOrders";
import CustomerLedger from "./CustomerLedger";
import Layout from "./components/layout";
import CustomerPage from "./pages/CustomerPage";
import ViewCustomerLedger from "./ViewCustomerLedger";
import ProtectedRoute from "./pages/ProtectedRoute";

const token = getToken();
if (token) setAutoLogout(token);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />

        {/* Protected Routes */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Layout>
                <ViewOrders />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-order"
          element={
            <ProtectedRoute>
              <Layout>
                <CreateOrders />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ledger"
          element={
            <ProtectedRoute>
              <Layout>
                <CustomerLedger />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <Layout>
                <CustomerPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/view-ledger"
          element={
            <ProtectedRoute>
              <Layout>
                <ViewCustomerLedger />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  </StrictMode>
);
