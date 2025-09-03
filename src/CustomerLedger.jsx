import React, { useEffect, useState } from "react";
import Header from "./components/header";

const LEDGER_API_URL = "http://localhost:5000/api/ledgers";

const CustomerLedger = () => {
  const [ledgers, setLedgers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newEntry, setNewEntry] = useState({
    description: "",
    amount: "",
    transactionType: "credit",
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(LEDGER_API_URL)
      .then((res) => res.json())
      .then((data) => {
        setLedgers(data);
      })
      .catch((err) => console.error("Failed to fetch ledgers:", err));
  }, []);

  const filteredCustomers = ledgers.filter((c) =>
    `${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSearch(`${customer.name} (${customer.phone})`);
    setShowDropdown(false);
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const iso = now.toISOString();
    const time = now.toTimeString().split(" ")[0]; // hh:mm:ss
    return { iso, time };
  };

  const handleAddEntry = () => {
    if (!newEntry.description || !newEntry.amount || !selectedCustomer) {
      window.alert("Missing required fields");
      return;
    }

    const { iso, time } = getCurrentDateTime();

    const entry = {
      customer: selectedCustomer.customer || selectedCustomer._id, // might be either
      date: iso,
      time: time,
      description: newEntry.description,
      amount: parseFloat(newEntry.amount),
      transactionType: newEntry.transactionType,
    };

    // Update in UI
    const updatedCustomer = {
      ...selectedCustomer,
      transactions: [...(selectedCustomer.transactions || []), entry],
    };
    setSelectedCustomer(updatedCustomer);

    // POST to backend
    fetch(`${LEDGER_API_URL}/${selectedCustomer._id}/addentry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // 🔐 REQUIRED
      },
      body: JSON.stringify(entry),
    })
      .then((res) => res.json())
      .then((updatedFromServer) => {
        setSelectedCustomer(updatedFromServer);
      })
      .catch((err) => {
        console.error("Failed to save transaction:", err);
      });

    // Reset form
    setNewEntry({
      description: "",
      amount: "",
      transactionType: "credit",
    });
  };

  const inputStyle = {
    padding: "0.5rem",
    borderRadius: "0.375rem",
    border: "1px solid #374151",
    backgroundColor: "#1e2a35",
    color: "#f9fafb",
    fontSize: "0.9rem",
    minWidth: "150px",
  };

  return (
    <div className="ledger-container">
      <div className="ledger-content">
        <h2 className="ledger-title" style={{ textAlign: "center" }}>
          Customer Ledger (Row View)
        </h2>

        <div
          style={{
            height: "1px",
            backgroundColor: "#334155",
            marginBottom: "1.8rem",
            width: "100%",
          }}
        />

        {/* Search Input */}
        <div
          style={{
            position: "relative",
            minWidth: 200,
            maxWidth: 300,
            flex: "1 1 200px",
            marginBottom: "1.5rem",
          }}
        >
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
            }}
            onClick={() => setSearch("")}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "0.375rem",
              border: "1px solid #374151",
              color: "#f9fafb",
              backgroundColor: "#1e2a35",
              fontSize: "0.9rem",
            }}
            required
          />

          {showDropdown && filteredCustomers.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                maxHeight: 150,
                overflowY: "auto",
                backgroundColor: "#1e2a35",
                border: "1px solid #374151",
                borderRadius: "0 0 0.375rem 0.375rem",
                zIndex: 10,
              }}
            >
              {filteredCustomers.map((c) => (
                <div
                  key={c._id}
                  onMouseDown={() => handleSelectCustomer(c)}
                  style={{
                    padding: "0.5rem",
                    cursor: "pointer",
                    color: "#f9fafb",
                    borderBottom: "1px solid #374151",
                  }}
                >
                  {c.name} ({c.phone})
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Transaction Form */}
        {selectedCustomer && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <input
              type="text"
              placeholder="Description"
              value={newEntry.description}
              onChange={(e) =>
                setNewEntry({ ...newEntry, description: e.target.value })
              }
              style={inputStyle}
              required
            />
            <input
              type="number"
              placeholder="Amount"
              value={newEntry.amount}
              onChange={(e) =>
                setNewEntry({ ...newEntry, amount: e.target.value })
              }
              style={inputStyle}
              required
            />
            <select
              value={newEntry.transactionType}
              onChange={(e) =>
                setNewEntry({
                  ...newEntry,
                  transactionType: e.target.value,
                })
              }
              style={inputStyle}
            >
              <option value="credit">Credit +</option>
              <option value="debit">Debit -</option>
            </select>
            <button
              onClick={handleAddEntry}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#22cc5e",
                color: "#fff",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
              }}
            >
              Add Entry
            </button>
          </div>
        )}

        {/* Ledger Table */}
        <div className="ledger-table-wrapper">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Credit</th>
                <th>Debit</th>
                <th>Running Total</th>
              </tr>
            </thead>
            <tbody>
              {selectedCustomer ? (
                selectedCustomer.transactions &&
                selectedCustomer.transactions.length > 0 ? (
                  (() => {
                    const sorted = [...selectedCustomer.transactions].sort(
                      (a, b) => new Date(a.date) - new Date(b.date)
                    );
                    let runningTotal = 0;
                    return sorted.map((entry, idx) => {
                      const isCredit = entry.transactionType === "credit";
                      runningTotal += isCredit
                        ? Math.abs(entry.amount)
                        : -Math.abs(entry.amount);
                      return (
                        <tr key={entry._id || idx}>
                          <td>{new Date(entry.date).toLocaleDateString()}</td>
                          <td>{entry.description}</td>
                          <td
                            style={{
                              color: isCredit ? "#22cc5e" : "#e5e7eb",
                            }}
                          >
                            {isCredit ? entry.amount : ""}
                          </td>
                          <td
                            style={{
                              color: !isCredit ? "#ef4444" : "#e5e7eb",
                            }}
                          >
                            {!isCredit ? entry.amount : ""}
                          </td>
                          <td>{runningTotal}</td>
                        </tr>
                      );
                    });
                  })()
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ textAlign: "center", color: "#aaa" }}
                    >
                      No transactions available.
                    </td>
                  </tr>
                )
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      color: "#f59e0b",
                      fontWeight: "bold",
                      fontSize: "1.1rem",
                    }}
                  >
                    Please select a customer to view transactions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Styling */}
      <style>{`
        .ledger-container {
          color: #f3f4f6;
          min-height: 100vh;
          font-family: Inter, sans-serif;
        }
        .ledger-content {
          padding: 2rem;
          max-width: 100%;
          overflow-x: auto;
        }
        .ledger-title {
          color: #22cc5e;
          font-weight: 700;
          font-size: 1.8rem;
          margin-bottom: 1rem;
        }
        .ledger-table-wrapper {
          overflow-x: auto;
        }
        .ledger-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }
        .ledger-table th,
        .ledger-table td {
          padding: 0.75rem;
          border: 1px solid #374151;
          text-align: center;
        }
        .ledger-table th {
          background-color: #1c2733;
          color: #f9fafb;
        }
        .ledger-table td {
          background-color: #111827;
          color: #e5e7eb;
        }
      `}</style>
    </div>
  );
};

export default CustomerLedger;
