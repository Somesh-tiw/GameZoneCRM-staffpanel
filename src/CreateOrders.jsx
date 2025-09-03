import React, { useState, useEffect } from "react";
import { useRef } from "react";

import "bootstrap/dist/css/bootstrap.min.css";
// import Header from './components/header';
import SnackSelector from "./components/SnackSelector"; // Adjust path if needed
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

const staffRaw = localStorage.getItem("staff");
let storeID;
let staff;
try {
  staff = staffRaw ? JSON.parse(staffRaw) : {};
  storeID = staff.store;
} catch (e) {
  storeID = undefined;
}
console.log("Store:", staff);
console.log("Store ID:", storeID);

const CreateOrders = () => {
  const suggestionBoxRef = useRef(null);
  const [activeScreens, setActiveScreens] = useState([]);
  const [snackData, setSnackData] = useState([]);
  const [snackTotal, setSnackTotal] = useState(0);
  const [snackReset, setSnackReset] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [originalAmount, setOriginalAmount] = useState(0);
  const [discountLabel, setDiscountLabel] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDetails, setCouponDetails] = useState(null);
  const [fetchedStore, setFetchedStore] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    screen: "",
    game: "",
    duration: 60,
    players: 1,
    nonPlayingMembers: "",
    paid: 0,
    snacks: 0,
    totalAmount: 0,
    payment: "Cash",
  });

  //set snackTotal when SnackSelector changes

  useEffect(() => {
    setSnackTotal(snackData.totalPrice);
  }, [snackData]);

  // Fetch store details
  useEffect(() => {
    const fetchStoreData = async () => {
      if (!storeID) return;
      
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `http://localhost:5000/api/customers/getStoreByNumber/${storeID}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        if (res.data && typeof res.data.isCafeEnabled !== 'undefined') {
          setFetchedStore(res.data);
          // Reset snack data if cafe is disabled
          if (!res.data.isCafeEnabled) {
            setSnackData([]);
            setSnackTotal(0);
          }
        } else {
          console.error("Store data missing isCafeEnabled field");
          setFetchedStore(null);
        }
      } catch (err) {
        console.error("❌ Error fetching store:", err);
        setFetchedStore(null);
      }
    };

    fetchStoreData();
  }, [storeID]);

  // Derived data
  const screenOptions = [];
  const screenToGame = {};
  const priceTable = {};

  if (fetchedStore && fetchedStore.screens) {
    fetchedStore.screens.forEach((screen) => {
      const screenName = screen.screenName.toLowerCase();
      screenOptions.push(screenName);

      const game = screen.games?.[0]; // assuming one game per screen
      if (game) {
        const gameName = game.gameName;
        screenToGame[screenName] = gameName;

        if (!priceTable[gameName]) priceTable[gameName] = {};

        Object.entries(game.pricing).forEach(([hr, pricingObj]) => {
          const durationMinutes = parseFloat(hr) * 60;
          priceTable[gameName][durationMinutes] = pricingObj;
        });
      }
    });
  }

  function getGamePrice(game, duration, players = 1) {
    const gameKey = Object.keys(priceTable).find(
      (key) => key.toLowerCase() === game.toLowerCase()
    );
    if (!gameKey) return 0;

    if (
      priceTable[gameKey][duration] &&
      priceTable[gameKey][duration][players] !== undefined
    ) {
      const price = priceTable[gameKey][duration][players];
      return price;
    }

    let total = 0;
    let remaining = duration;
    while (remaining >= 60) {
      if (
        priceTable[gameKey][60] &&
        priceTable[gameKey][60][players] !== undefined
      ) {
        total += priceTable[gameKey][60][players];
        remaining -= 60;
      } else {
        return 0;
      }
    }

    if (
      remaining === 30 &&
      priceTable[gameKey][30] &&
      priceTable[gameKey][30][players] !== undefined
    ) {
      total += priceTable[gameKey][30][players];
    }

    return total;
  }

  // Helper to get allowed players
  const getAllowedPlayers = (gameName) => {
    if (!fetchedStore) return [];

    for (const screen of fetchedStore.screens) {
      const game = screen.games.find((g) => g.gameName === gameName);
      if (game) {
        return Array.from({ length: game.allowedPlayers }, (_, i) => i + 1);
      }
    }

    return [];
  };

  // Fetch active screens
  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:5000/api/customers/active-screens", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Active screens:", data);
        setActiveScreens(data); // ✅ Already an array of names
      })
      .catch((err) => {
        console.error("Error fetching active screens:", err);
      });
  }, []);

  useEffect(() => {
    if (formData.game) {
      fetch("http://localhost:5000/api/admin/discounts/today")
        .then((res) => res.json())
        .then((data) => {
          const paid = getGamePrice(
            formData.game,
            Number(formData.duration),
            Number(formData.players)
          );
          if (!data || data.store !== storeID) {
            setDiscountAmount(0);
            setOriginalAmount(paid);
            setDiscountLabel("");
            return;
          }

          let discountAmount = 0;
          let discountedPaid = paid;
          let discountLabel = "";

          if (data.discountValue && data.discountType) {
            if (data.discountType === "percent") {
              discountAmount = paid * (data.discountValue / 100);
              discountLabel = `${data.discountValue}% OFF`;
            } else if (data.discountType === "fixed") {
              discountAmount = data.discountValue;
              discountLabel = `₹${data.discountValue.toFixed(0)} OFF`;
            }
            discountedPaid = Math.max(paid - discountAmount, 0);
          }

          setDiscountAmount(discountAmount);
          setOriginalAmount(paid);
          setDiscountLabel(discountLabel); // NEW
          setFormData((prev) => ({ ...prev, paid: discountedPaid }));
        })
        .catch((err) => {
          console.error("Error fetching discount:", err);
        });
    }
  }, [
    formData.game,
    formData.duration,
    formData.players,
    formData.nonPlayingMembers,
  ]);

  // Update game when screen changes
  useEffect(() => {
    if (formData.screen) {
      const game = screenToGame[formData.screen] || "";
      setFormData((prev) => ({ ...prev, game }));
    } else {
      setFormData((prev) => ({ ...prev, game: "" }));
    }
  }, [formData.screen]);

  // Reset players if not allowed for selected game
  useEffect(() => {
    if (formData.game) {
      const allowed = getAllowedPlayers(formData.game);
      if (!allowed.includes(formData.players)) {
        setFormData((prev) => ({ ...prev, players: allowed[0] }));
      }
    }
  }, [formData.game]);

  // Calculate paid (game price) when relevant fields change
  useEffect(() => {
    if (formData.game) {
      const paid = getGamePrice(
        formData.game,
        Number(formData.duration),
        Number(formData.players)
      );
      setFormData((prev) => ({ ...prev, paid }));
    }
  }, [
    formData.game,
    formData.duration,
    formData.players,
    formData.nonPlayingMembers,
  ]);

  // Update snacks in formData and totalAmount when snackTotal changes
  useEffect(() => {
    setFormData((prev) => {
      const seatingCharge = 20 * (parseInt(prev.nonPlayingMembers) || 0);
      // Only include snack total if cafe is enabled
      const snackAmount = fetchedStore?.isCafeEnabled ? Number(snackTotal || 0) : 0;
      const totalAmount = Number(prev.paid || 0) + snackAmount + seatingCharge;
      return { ...prev, snacks: snackAmount, totalAmount };
    });
  }, [snackTotal, formData.nonPlayingMembers, fetchedStore]);

  // Also update totalAmount when paid or nonPlayingMembers change
  useEffect(() => {
    setFormData((prev) => {
      const seatingCharge = 20 * (parseInt(prev.nonPlayingMembers) || 0);
      const totalAmount =
        Number(prev.paid || 0) + Number(prev.snacks || 0) + seatingCharge;
      return { ...prev, totalAmount };
    });
  }, [formData.paid, formData.nonPlayingMembers]);

  // Handle input changes
  const handleInputChange = async (e) => {
    const { name, value, type } = e.target;

    // First, update the formData
    setFormData((prev) => {
      // Special handling for "screen"
      if (name === "screen") {
        const game = screenToGame[value.toLowerCase()] || "";
        return {
          ...prev,
          screen: value,
          game,
          players: 1,
          duration: 60,
        };
      }

      return {
        ...prev,
        [name]: type === "number" ? Number(value) || 0 : value,
      };
    });

    // Special handling for phoneNumber suggestions
    if (name === "phoneNumber") {
      if (value.length >= 3) {
        try {
          const res = await fetch(
            `http://localhost:5000/api/customers/search?query=${value}`
          );
          if (res.ok) {
            const data = await res.json();
            setSuggestions(data);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        } catch (err) {
          console.error("❌ Suggestion fetch failed:", err);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
  };

  const handleSuggestionSelect = (customer) => {
    setFormData((prev) => ({
      ...prev,
      phoneNumber: customer.phone,
      name: customer.name,
    }));
    setSuggestions([]);
    setShowSuggestions(false);
    toast.success("Customer selected & autofilled!");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      phone: formData.phoneNumber,
      screen: formData.screen,
      game: formData.game,
      time: formData.duration,
      // Only include snacks if cafe is enabled
      snacks: fetchedStore?.isCafeEnabled ? formData.snacks : 0,
      paid: formData.paid,
      players: formData.players,
      nonPlayingMembers: formData.nonPlayingMembers,
      total_amount: formData.totalAmount,
      payment: formData.payment,
      store: storeID,
      discount: discountLabel,
      remainingAmount: formData.payment === "Unpaid" ? formData.totalAmount : 0,
      couponDetails: couponDetails ? couponDetails : null, // Store full coupon details if applied
    };

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/customers/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // 🔐 REQUIRED
        },
        body: JSON.stringify(payload),
      });
      console.log("Response:", response);

      const data = await response.json();
      console.log("Data:", data);

      if (!response.ok) throw new Error("Failed to submit booking");

      alert("Booking successful!");

      // If a coupon was applied, mark it as used
      if (couponApplied && couponDetails) {
        console.log("Marking coupon as used: mai andar hu");
        console.log("Coupon code:", couponDetails.code);
        await fetch(
          `http://localhost:5000/api/admin/discounts/markUsed/${couponDetails.code}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      // save data of snacks and drinks in database for cafe purpose only if cafe is enabled
      if (fetchedStore?.isCafeEnabled && snackData.items?.length > 0) {
        await fetch("http://localhost:5000/api/orders/gamezone", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerName: formData.name,
            phone: formData.phoneNumber,
            items: snackData.items,
            screenNumber: formData.screen.toLowerCase(),
          }),
        });
      }

      setFormData({
        name: "",
        phoneNumber: "",
        screen: "",
        game: "",
        duration: 60,
        players: 1,
        nonPlayingMembers: "",
        paid: 0,
        snacks: 0,
        totalAmount: 0,
        payment: "Cash",
      });
      setSnackTotal(0);
      setSnackReset((prev) => prev + 1); // Triggers reset in SnackSelector
      navigate("/orders");
    } catch (error) {
      alert("Error submitting booking. Please try again.");
      console.error(error);
    }
  };

  const handleWheel = (e) => {
    e.target.blur();
  };

  const applyCouponCode = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    setCouponApplied(true); // prevent race condition

    try {
      const res = await fetch(
        `http://localhost:5000/api/admin/discounts/getCoupon/${couponCode}`
      );
      const response = await res.json();

      if (!res.ok || !response.success) {
        throw new Error(response.message || "Invalid coupon");
      }
      const data = response.data; // ✅ FIXED: Access actual coupon object
      console.log("Coupon data:", data);

      const now = new Date();
      const startDate = new Date(data.startDate);
      const expiresAt = new Date(data.expiresAt);

      if (data.isExpired || now > expiresAt) {
        throw new Error("This coupon has expired.");
      }

      if (now < startDate) {
        throw new Error("This coupon is not active yet.");
      }

      if (data.used) {
        throw new Error("This coupon has already been used.");
      }

      if (data.store && data.store !== storeID) {
        throw new Error(
          response.message || "This coupon is not valid for your store."
        );
      }

      // ✅ Passed all checks — proceed with discount logic...

      const paid = getGamePrice(
        formData.game,
        Number(formData.duration),
        Number(formData.players)
      );

      let discountAmount = 0;
      let discountedPaid = paid;

      if (data.discountType === "percentage") {
        discountAmount = paid * (data.value / 100);
      } else if (data.discountType === "flat") {
        discountAmount = data.value;
      }

      discountedPaid = Math.max(paid - discountAmount, 0);

      setDiscountAmount(discountAmount);
      setOriginalAmount(paid);
      setCouponDetails(data); // store full coupon details

      let label = `Coupon Applied - `;

      if (data.discountType === "percentage") {
        label += `💸${data.value}% off`;
      } else if (data.discountType === "flat") {
        label += `💸₹${data.value} off`;
      }

      if (Array.isArray(data.freeSnacks) && data.freeSnacks.length > 0) {
        const snackText = data.freeSnacks
          .map((snack) => `${snack.snackName} (x${snack.snackQuantity})`)
          .join(", ");
        label += ` +🍿 Free: ${snackText}`;
      }

      setDiscountLabel(label);
      setFormData((prev) => ({ ...prev, paid: discountedPaid }));
      setCouponError("");
      toast.success("Coupon applied successfully!");
    } catch (err) {
      console.error("Error applying coupon:", err);
      setCouponError(err.message || "Invalid or expired coupon.");
      setDiscountAmount(0);
      setDiscountLabel("");
      setCouponApplied(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#0f172a",
        minHeight: "100vh",
        maxHeight: "80vh",
        overflowY: "auto",
      }}
    >
      {/* <Header /> */}
      <div
        className="container-fluid py-3"
        style={{ backgroundColor: "#0f172a" }}
      >
        <div className="row justify-content-center">
          <div className="col-12 col-xl-11">
            <div
              className="card shadow-lg"
              style={{
                borderRadius: 16,
                backgroundColor: "#1e293b",
                color: "white",
                border: "none",
              }}
            >
              <div className="card-body p-3 p-lg-4">
                <h2
                  className="mb-3 text-center"
                  style={{
                    color: "#22c55e",
                    fontWeight: "bold",
                    fontSize: "2rem",
                  }}
                >
                  Book Your Gaming Session
                </h2>
                <ToastContainer position="top-right" autoClose={3000} />

                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    {/* Left Column - Personal & Game Details */}
                    <div className="col-12 col-lg-6">
                      <div className="h-100 pe-lg-2">
                        <h5
                          className="mb-2 pb-1 border-bottom border-secondary"
                          style={{ color: "#22c55e", fontSize: "1.1rem" }}
                        >
                          Personal Information
                        </h5>

                        <div
                          className="mb-3 position-relative"
                          ref={suggestionBoxRef}
                        >
                          <label
                            htmlFor="phoneNumber"
                            className="form-label fw-semibold"
                            style={{ fontSize: "0.9rem" }}
                          >
                            Phone Number
                          </label>
                          <input
                            id="phoneNumber"
                            name="phoneNumber"
                            type="number"
                            required
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            className="form-control"
                            style={{
                              backgroundColor: "#334155",
                              color: "white",
                              border: "none",
                              fontSize: "0.9rem",
                            }}
                            placeholder="Enter your phone number"
                            onFocus={() => {
                              if (formData.phoneNumber.length >= 3)
                                setShowSuggestions(true);
                            }}
                          />

                          {showSuggestions && suggestions.length > 0 && (
                            <ul
                              className="list-group position-absolute w-100 shadow"
                              style={{ zIndex: 1000, top: "100%" }}
                            >
                              {suggestions.map((cust) => (
                                <li
                                  key={cust._id}
                                  className="list-group-item list-group-item-action"
                                  onMouseDown={() =>
                                    handleSuggestionSelect(cust)
                                  } // ✅ IMPORTANT
                                  style={{ cursor: "pointer" }}
                                >
                                  {cust.name} - {cust.phone}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="mb-3">
                          <label
                            htmlFor="name"
                            className="form-label fw-semibold"
                            style={{ fontSize: "0.9rem" }}
                          >
                            Full Name
                          </label>
                          <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={handleInputChange}
                            className="form-control"
                            style={{
                              backgroundColor: "#334155",
                              color: "white",
                              border: "none",
                              fontSize: "0.9rem",
                            }}
                            placeholder="Enter your full name"
                          />
                        </div>

                        <h5
                          className="mb-2 pb-1 border-bottom border-secondary mt-3"
                          style={{ color: "#22c55e", fontSize: "1.1rem" }}
                        >
                          Gaming Details
                        </h5>

                        <div className="mb-3">
                          <label
                            htmlFor="screen"
                            className="form-label fw-semibold"
                            style={{ fontSize: "0.9rem" }}
                          >
                            Select Screen
                          </label>
                          <select
                            id="screen"
                            name="screen"
                            value={formData.screen}
                            onChange={handleInputChange}
                            className="form-select"
                            required
                            style={{
                              backgroundColor: "#334155",
                              color: "white",
                              border: "none",
                              fontSize: "0.9rem",
                            }}
                          >
                            <option value="">-- Select Screen --</option>
                            {screenOptions.map((screen) => {
                              const isActive = activeScreens.includes(
                                screen.toLowerCase()
                              );
                              return (
                                <option
                                  key={screen}
                                  value={screen}
                                  disabled={isActive}
                                  style={{
                                    color: isActive ? "red" : "inherit",
                                  }}
                                >
                                  {screen.toUpperCase()}{" "}
                                  {isActive ? "(Allocated)" : ""}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div className="mb-3">
                          <label
                            htmlFor="game"
                            className="form-label fw-semibold"
                            style={{ fontSize: "0.9rem" }}
                          >
                            Game
                          </label>
                          <input
                            id="game"
                            name="game"
                            type="text"
                            value={formData.game}
                            readOnly
                            className="form-control"
                            style={{
                              backgroundColor: "#334155",
                              color: "white",
                              border: "none",
                              fontSize: "0.9rem",
                            }}
                            placeholder="Auto-selected based on screen"
                          />
                        </div>

                        <div className="row g-2">
                          <div className="col-sm-6">
                            <label
                              htmlFor="duration"
                              className="form-label fw-semibold"
                              style={{ fontSize: "0.9rem" }}
                            >
                              Duration
                            </label>
                            <select
                              id="duration"
                              name="duration"
                              value={formData.duration}
                              onChange={handleInputChange}
                              className="form-select"
                              required
                              style={{
                                backgroundColor: "#334155",
                                color: "white",
                                border: "none",
                                fontSize: "0.9rem",
                              }}
                            >
                              <option value={30}>30 Minutes</option>
                              <option value={60}>1 Hour</option>
                              <option value={90}>1 Hour 30 Minutes</option>
                              <option value={120}>2 Hours</option>
                            </select>
                          </div>

                          <div className="col-sm-6">
                            <label
                              htmlFor="players"
                              className="form-label fw-semibold"
                              style={{ fontSize: "0.9rem" }}
                            >
                              Players
                            </label>
                            <select
                              id="players"
                              name="players"
                              value={formData.players}
                              onChange={handleInputChange}
                              className="form-select"
                              style={{
                                backgroundColor: "#334155",
                                color: "white",
                                border: "none",
                                fontSize: "0.9rem",
                              }}
                            >
                              {getAllowedPlayers(formData.game).map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Snacks & Payment */}
                    <div className="col-12 col-lg-6">
                      <div className="h-100 ps-lg-2">
                        <h5
                          className="mb-2 pb-1 border-bottom border-secondary mt-3"
                          style={{ color: "#22c55e", fontSize: "1.1rem" }}
                        >
                          Additional Services
                        </h5>

                        <div className="mb-3">
                          <label
                            htmlFor="nonPlayingMembers"
                            className="form-label fw-semibold"
                            style={{ fontSize: "0.9rem" }}
                          >
                            Non-Playing Members
                          </label>
                          <input
                            id="nonPlayingMembers"
                            name="nonPlayingMembers"
                            type="number"
                            value={formData.nonPlayingMembers}
                            onChange={handleInputChange}
                            onWheel={handleWheel}
                            className="form-control"
                            placeholder="Number of non-playing members"
                            style={{
                              backgroundColor: "#334155",
                              color: "white",
                              border: "none",
                              fontSize: "0.9rem",
                            }}
                          />
                          <div
                            className="form-text text-light"
                            style={{ fontSize: "0.8rem" }}
                          >
                            ₹20 per non-playing member
                          </div>
                        </div>
                        {fetchedStore?.isCafeEnabled && (
                          <>
                            <h5
                              className="mb-2 pb-1 border-bottom border-secondary"
                              style={{ color: "#22c55e", fontSize: "1.1rem" }}
                            >
                              Snacks & Drinks
                            </h5>
                            <SnackSelector
                              onChange={setSnackData}
                              reset={snackReset}
                              storeDetails={fetchedStore}
                            />
                          </>
                        )}

                        <h5
                          className="mb-2 pb-1 border-bottom border-secondary mt-3"
                          style={{ color: "#22c55e", fontSize: "1.1rem" }}
                        >
                          Payment Summary
                        </h5>
                        <div className="mb-3">
                          {!showCouponInput ? (
                            <div
                              className="fw-semibold d-inline-flex align-items-center gap-2"
                              onClick={() => setShowCouponInput(true)}
                              style={{
                                cursor: "pointer",
                                fontSize: "0.9rem",
                                color: "#22c55e",
                                transition: "color 0.2s ease-in-out",
                                padding: "6px 10px",
                                borderRadius: "6px",
                                backgroundColor: "#1e293b",
                                border: "1px solid #334155",
                              }}
                            >
                              🎁 <span>Have a coupon?</span>
                            </div>
                          ) : (
                            <div
                              className="p-3 mt-1"
                              style={{
                                backgroundColor: "#0f172a",
                                borderRadius: "10px",
                                border: "1px solid #334155",
                                animation: "fadeIn 0.3s ease",
                              }}
                            >
                              <label
                                htmlFor="couponCode"
                                className="form-label fw-semibold mb-2"
                                style={{
                                  fontSize: "0.85rem",
                                  color: "#cbd5e1",
                                }}
                              >
                                🎟️ Enter Coupon Code
                              </label>

                              <div className="input-group mb-2">
                                <input
                                  type="text"
                                  id="couponCode"
                                  value={couponCode}
                                  onChange={(e) =>
                                    setCouponCode(e.target.value)
                                  }
                                  placeholder="e.g. SAVE50"
                                  className="form-control"
                                  style={{
                                    backgroundColor: "#1e293b",
                                    color: "#e2e8f0",
                                    border: "1px solid #475569",
                                    fontSize: "0.9rem",
                                    borderRadius: "8px 0 0 8px",
                                  }}
                                />
                                <button
                                  type="button"
                                  className="btn"
                                  onClick={applyCouponCode}
                                  style={{
                                    backgroundColor: "#22c55e",
                                    color: "#0f172a",
                                    fontWeight: "600",
                                    fontSize: "0.9rem",
                                    borderRadius: "0 8px 8px 0",
                                  }}
                                >
                                  Apply
                                </button>
                              </div>

                              {couponError && (
                                <div className="text-danger small">
                                  ❗ {couponError}
                                </div>
                              )}

                              <div
                                onClick={() => setShowCouponInput(false)}
                                className="text-secondary mt-2 small"
                                style={{ cursor: "pointer" }}
                              >
                                ✖ I don't have a coupon
                              </div>
                            </div>
                          )}
                        </div>

                        <style>
                          {`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `}
                        </style>

                        <div className="row g-2 mb-3">
                          <div className="col-sm-6">
                            <label
                              htmlFor="paid"
                              className="form-label fw-semibold"
                              style={{ fontSize: "0.9rem" }}
                            >
                              Game Price
                            </label>
                            <div className="input-group">
                              <span
                                className="input-group-text"
                                style={{
                                  backgroundColor: "#334155",
                                  color: "#22c55e",
                                  border: "none",
                                  fontSize: "0.9rem",
                                }}
                              >
                                ₹
                              </span>
                              <input
                                id="paid"
                                name="paid"
                                type="text"
                                value={formData.paid}
                                readOnly
                                className="form-control"
                                style={{
                                  backgroundColor: "#1e293b",
                                  color: "#22cc5e",
                                  fontWeight: "bold",
                                  border: "none",
                                  fontSize: "0.9rem",
                                }}
                              />
                            </div>
                          </div>
                          {discountAmount > 0 && (
                            <div className="mt-2 small d-flex align-items-center gap-3 border border-warning rounded px-3 py-1 bg-dark text-white">
                              <div className="fw-semibold d-flex align-items-center gap-1 text-warning">
                                🎉 <span>Saved:</span>{" "}
                                <span className="text-white">
                                  {discountLabel}
                                </span>
                              </div>
                              <div
                                className="text-decoration-line-through text-danger"
                                style={{ fontSize: "0.8rem" }}
                              >
                                ₹{originalAmount.toFixed(2)}
                              </div>
                              <div
                                className="text-success fw-bold"
                                style={{ fontSize: "0.9rem" }}
                              >
                                ₹{(originalAmount - discountAmount).toFixed(2)}
                              </div>
                            </div>
                          )}

                          <div className="col-sm-6">
                            <label
                              className="form-label fw-semibold"
                              style={{ fontSize: "0.9rem" }}
                            >
                              Total Amount
                            </label>
                            <div className="input-group">
                              <span
                                className="input-group-text"
                                style={{
                                  backgroundColor: "#334155",
                                  color: "#22cc5e",
                                  border: "none",
                                  fontSize: "0.9rem",
                                }}
                              >
                                ₹
                              </span>
                              <input
                                type="text"
                                className="form-control"
                                value={formData.totalAmount}
                                readOnly
                                style={{
                                  backgroundColor: "#1e293b",
                                  color: "#22cc5e",
                                  fontWeight: "bold",
                                  border: "none",
                                  fontSize: "1rem",
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mb-3">
                          <label
                            className="form-label fw-semibold mb-2"
                            style={{ fontSize: "0.9rem" }}
                          >
                            Payment Method
                          </label>
                          <div className="d-flex gap-3">
                            {["online", "Cash", "Unpaid"].map((option) => (
                              <div className="form-check" key={option}>
                                <input
                                  className="form-check-input"
                                  type="radio"
                                  name="payment"
                                  id={`payment${option}`}
                                  value={option}
                                  checked={formData.payment === option}
                                  onChange={handleInputChange}
                                />
                                <label
                                  className="form-check-label text-light"
                                  htmlFor={`payment${option}`}
                                  style={{ fontSize: "0.9rem" }}
                                >
                                  {/* Simple conditional rendering for each label */}
                                  {option === "online" && "Online"}
                                  {option === "Cash" && "Cash"}
                                  {option === "Unpaid" && "Unpaid"}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button - Full Width */}
                  <div className="row mt-3">
                    <div className="col-12">
                      <button
                        type="submit"
                        className="btn w-100 fw-bold py-2"
                        style={{
                          backgroundColor: "#22c55e",
                          color: "#0f172a",
                          fontSize: "1.1rem",
                          borderRadius: "10px",
                          border: "none",
                          transition: "all 0.3s ease",
                        }}
                        onMouseOver={(e) =>
                          (e.target.style.backgroundColor = "#16a34a")
                        }
                        onMouseOut={(e) =>
                          (e.target.style.backgroundColor = "#22c55e")
                        }
                      >
                        Book Your Gaming Session Now
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOrders;
