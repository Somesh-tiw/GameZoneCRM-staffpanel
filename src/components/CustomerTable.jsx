import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Form,
  InputGroup,
  Pagination,
  Container,
  Card,
  Modal,
} from "react-bootstrap";

const itemsPerPage = 8;

function CustomerTable() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/customers/all?date=${selectedDate}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        setCustomers(data);
      } catch (err) {
        console.error("Error fetching customers:", err);
      }
    };

    if (token) fetchCustomers();
  }, [selectedDate]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleRowClick = (cust) => {
    setSelectedCustomer(cust);
    setShowModal(true);
  };

  const filtered = customers.filter((cust) => {
    const searchTerm = search.toLowerCase();
    const name = cust.name?.toLowerCase() || "";
    const phone = cust.phone || "";
    const status = cust.status?.toLowerCase() || "";
    const totalAmount = String(cust.total_amount || "");
    const createdAt = new Date(cust.created_at);
    const timeStr = createdAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      name.includes(searchTerm) ||
      phone.includes(searchTerm) ||
      status.includes(searchTerm) ||
      totalAmount.includes(searchTerm) ||
      timeStr.toLowerCase().includes(searchTerm)
    );
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const displayed = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDateTime = (isoDateString) => {
    const createdAt = new Date(isoDateString);
    const now = new Date();

    const isToday =
      createdAt.getDate() === now.getDate() &&
      createdAt.getMonth() === now.getMonth() &&
      createdAt.getFullYear() === now.getFullYear();

    const timeStr = createdAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) {
      return `Today, ${timeStr}`;
    } else {
      const dateStr = createdAt.toLocaleDateString([], {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      return `${dateStr}, ${timeStr}`;
    }
  };

  return (
    <Container
      fluid
      className="p-3 min-vh-100"
      style={{ backgroundColor: "#1e293b" }}
    >
      <h2 className="mb-4 text-success">Customer List</h2>

      <Form.Group className="mb-3" style={{ maxWidth: "250px" }}>
        <Form.Label className="text-white">Filter by Date</Form.Label>
        <Form.Control
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setSearch("");
            setCurrentPage(1);
          }}
          className="border-success"
          style={{ backgroundColor: "#1e293b", color: "white" }}
        />
      </Form.Group>

      <InputGroup className="mb-3" style={{ maxWidth: "300px" }}>
        <Form.Control
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={handleSearch}
          className="border-success"
          style={{
            backgroundColor: "#1e293b",
            color: "white",
            fontSize: "14px",
          }}
        />
        <Button variant="success" size="sm">
          Search
        </Button>
      </InputGroup>

      {/* Desktop Table */}
      <div className="d-none d-md-block">
        <div className="table-responsive">
          <Table
            bordered
            hover
            responsive
            className="text-white"
            style={{ backgroundColor: "#1e293b" }}
          >
            <thead style={{ backgroundColor: "#324154", color: "white" }}>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((cust) => (
                <tr
                  key={cust._id}
                  onClick={() => handleRowClick(cust)}
                  style={{
                    cursor: "pointer",
                    backgroundColor: "#324154",
                    color: "white",
                    fontSize: "14px",
                  }}
                >
                  <td>{cust._id.slice(-6)}</td>
                  <td>{cust.name}</td>
                  <td>{cust.phone}</td>
                  <td>
                    ₹
                    {(cust.total_amount || 0) +
                      (cust.extended_amount || 0) +
                      (cust.extraSnacksPrice || 0)}
                  </td>
                  <td>{cust.status}</td>
                  <td>{formatDateTime(cust.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="d-md-none">
        {displayed.map((cust) => (
          <Card
            key={cust._id}
            className="mb-2 border-success"
            style={{
              maxWidth: "95%",
              backgroundColor: "#324154",
              color: "white",
              fontSize: "14px",
            }}
            onClick={() => handleRowClick(cust)}
          >
            <Card.Body>
              <p className="mb-1">
                <strong>ID:</strong> {cust._id.slice(-6)}
              </p>
              <p className="mb-1">
                <strong>Name:</strong> {cust.name}
              </p>
              <p className="mb-1">
                <strong>Phone:</strong> {cust.phone}
              </p>
              <p className="mb-1">
                <strong>Total:</strong> ₹
                {(cust.total_amount || 0) +
                  (cust.extended_amount || 0) +
                  (cust.extraSnacksPrice || 0)}
              </p>
              <p className="mb-1">
                <strong>Status:</strong> {cust.status}
              </p>
              <p className="mb-1">
                <strong>Created:</strong> {formatDateTime(cust.created_at)}
              </p>
            </Card.Body>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <Pagination className="justify-content-center mt-3">
        <Pagination.First
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
        />
        <Pagination.Prev
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
        />
        {Array.from({ length: totalPages }, (_, i) => (
          <Pagination.Item
            key={i}
            active={i + 1 === currentPage}
            onClick={() => setCurrentPage(i + 1)}
            className={`${
              i + 1 === currentPage ? "bg-success text-dark" : "text-white"
            }`}
            style={{
              backgroundColor: "#1e293b",
              borderColor: "#324154",
              fontSize: "14px",
            }}
          >
            {i + 1}
          </Pagination.Item>
        ))}
        <Pagination.Next
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
        />
        <Pagination.Last
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
        />
      </Pagination>

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header
          closeButton
          style={{ backgroundColor: "#1e293b" }}
          className="text-success"
        >
          <Modal.Title>Customer Full Details</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: "#1e293b", color: "white" }}>
          {selectedCustomer ? (
            <div>
              {Object.entries(selectedCustomer).map(([key, value]) => {
                if (key === "total_amount") {
                  return (
                    <p key={key} className="mb-1" style={{ fontSize: "14px" }}>
                      <strong>First Time Total Amount:</strong> ₹{value}
                    </p>
                  );
                }

                if (key === "extended_amount" || key === "extraSnacksPrice") {
                  return (
                    <p key={key} className="mb-1" style={{ fontSize: "14px" }}>
                      <strong>{key.replace(/([A-Z])/g, " $1")}:</strong> ₹{value}
                    </p>
                  );
                }

                return (
                  <p key={key} className="mb-1" style={{ fontSize: "14px" }}>
                    <strong>{key.replace(/([A-Z])/g, " $1")}:</strong>{" "}
                    {key === "created_at"
                      ? new Date(value).toLocaleString()
                      : value ?? "—"}
                  </p>
                );
              })}

              <hr />
              <p className="mb-1 text-success" style={{ fontSize: "16px" }}>
                <strong>Final Total Amount:</strong> ₹
                {(selectedCustomer.total_amount || 0) +
                  (selectedCustomer.extended_amount || 0) +
                  (selectedCustomer.extraSnacksPrice || 0)}
              </p>
            </div>
          ) : (
            <p>No data</p>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: "#1e293b" }}>
          <Button variant="success" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default CustomerTable;
