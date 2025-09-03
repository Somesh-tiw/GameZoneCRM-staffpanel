import React, { useState, useEffect } from "react";
import axios from "axios";

const SnackSelector = ({ onChange, reset, storeDetails }) => {
  const [formData, setFormData] = useState({
    snackName: "",
    snackQuantity: 1,
    snackPrice: 0,
  });

  const [selectedItems, setSelectedItems] = useState([]);
  const [items, setItems] = useState({ Snacks: [], Drinks: [] });

  useEffect(() => {
    const fetchItems = async () => {
      try {
        if (!storeDetails?.isCafeEnabled) {
          setItems({ Snacks: [], Drinks: [] });
          return;
        }

        const res = await axios.get(
          "http://localhost:5000/api/customers/snacksAndDrinks"
        );
        const fetchedItems = res.data;

        const snacks = fetchedItems.filter((item) => item.category === "Snack");
        const drinks = fetchedItems.filter((item) => item.category === "Drink");

        setItems({ Snacks: snacks, Drinks: drinks });
      } catch (error) {
        console.error("Failed to fetch snacks and drinks:", error);
        setItems({ Snacks: [], Drinks: [] });
      }
    };

    fetchItems();
  }, [storeDetails]);

  const getItemUnitPrice = (name) => {
    const allItems = [...items.Snacks, ...items.Drinks];
    const found = allItems.find((item) => item.name === name);
    return found ? found.price : 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "snackName") {
      const unitPrice = getItemUnitPrice(value);
      const totalPrice = unitPrice * formData.snackQuantity;
      setFormData({
        ...formData,
        snackName: value,
        snackPrice: totalPrice,
      });
    }

    if (name === "snackQuantity") {
      const quantity = parseInt(value, 10) || 0;
      const unitPrice = getItemUnitPrice(formData.snackName);
      const totalPrice = unitPrice * quantity;
      setFormData({
        ...formData,
        snackQuantity: quantity,
        snackPrice: totalPrice,
      });
    }
  };

  const handleAddItem = () => {
    if (!formData.snackName || formData.snackQuantity <= 0) return;

    const isDuplicate = selectedItems.find(
      (item) => item.snackName === formData.snackName
    );
    if (isDuplicate) {
      alert("Item already added.");
      return;
    }

    setSelectedItems([...selectedItems, formData]);
    setFormData({ snackName: "", snackQuantity: 1, snackPrice: 0 });
  };

  const handleRemoveItem = (name) => {
    const filtered = selectedItems.filter((item) => item.snackName !== name);
    setSelectedItems(filtered);
  };

  const handleWheel = (e) => e.target.blur();

  const totalPrice = selectedItems.reduce(
    (sum, item) => sum + item.snackPrice,
    0
  );
  useEffect(() => {
    if (onChange) {
      onChange({ totalPrice, items: selectedItems });
    }
  }, [selectedItems, totalPrice, onChange]);

  useEffect(() => {
    setSelectedItems([]);
    setFormData({ snackName: "", snackQuantity: 1, snackPrice: 0 });
  }, [reset]);

  return (
    <div className="container mt-4">
      <div className="row g-3 mb-4 align-items-end">
        <div className="col-sm-4">
          <label
            className="form-label fw-semibold"
            style={{ fontSize: "0.9rem", color: "white" }}
          >
            Snack / Drink
          </label>
          <select
            name="snackName"
            value={formData.snackName}
            onChange={handleInputChange}
            className="form-select"
            style={{
              backgroundColor: "#334155",
              color: "white",
              border: "1px solid #475569",
              fontSize: "0.9rem",
            }}
          >
            <option value="">Select an item</option>
            <optgroup label="Snacks">
              {items.Snacks.map((snack) => (
                <option key={snack._id} value={snack.name}>
                  {snack.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Drinks">
              {items.Drinks.map((drink) => (
                <option key={drink._id} value={drink.name}>
                  {drink.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="col-sm-4">
          <label
            className="form-label fw-semibold"
            style={{ fontSize: "0.9rem", color: "white" }}
          >
            Quantity
          </label>
          <input
            name="snackQuantity"
            type="number"
            value={formData.snackQuantity}
            onChange={handleInputChange}
            onWheel={handleWheel}
            className="form-control"
            min={1}
            placeholder="e.g. 2"
            style={{
              backgroundColor: "#334155",
              color: "white",
              border: "1px solid #475569",
              fontSize: "0.9rem",
            }}
          />
        </div>

        <div className="col-sm-4">
          <label
            className="form-label fw-semibold"
            style={{ fontSize: "0.9rem", color: "white" }}
          >
            Price
          </label>
          <input
            name="snackPrice"
            type="number"
            value={formData.snackPrice}
            readOnly
            className="form-control"
            placeholder="Auto"
            style={{
              backgroundColor: "#334155",
              color: "white",
              border: "1px solid #475569",
              fontSize: "0.9rem",
            }}
          />
        </div>
      </div>

      <button
        type="button"
        className="btn btn-outline-light btn-sm mb-4"
        onClick={handleAddItem}
        style={{ borderColor: "#64748b", color: "white" }}
      >
        ➕ Add Item
      </button>

      {selectedItems.length > 0 && (
        <div
          className="card"
          style={{ backgroundColor: "#1e293b", color: "white" }}
        >
          <div className="card-body">
            <h6 className="card-title mb-3">Selected Items:</h6>
            <ul className="list-group list-group-flush mb-3">
              {selectedItems.map((item, index) => (
                <li
                  key={index}
                  className="list-group-item d-flex justify-content-between align-items-center"
                  style={{
                    backgroundColor: "#1e293b",
                    color: "white",
                    borderBottom: "1px solid #334155",
                  }}
                >
                  <span>
                    <strong>{item.snackName}</strong> — {item.snackQuantity} × ₹
                    {getItemUnitPrice(item.snackName)} = ₹{item.snackPrice}
                  </span>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleRemoveItem(item.snackName)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <h6 className="text-end">
              <strong>Total:</strong> ₹{totalPrice}
            </h6>
          </div>
        </div>
      )}
    </div>
  );
};

export default SnackSelector;
