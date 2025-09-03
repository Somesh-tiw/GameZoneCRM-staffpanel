import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./components/header";
import SnackSelector from "./components/SnackSelector";
import { useLocation } from "react-router-dom";
import { useMemo } from "react";

const staffRaw = localStorage.getItem("staff");
let storeID;
let staff;
try {
  staff = staffRaw ? JSON.parse(staffRaw) : {};
  storeID = staff.store;
} catch (e) {
  storeID = undefined;
}
console.log("storeID:", storeID);

const ViewOrders = () => {
  const [bookings, setBookings] = useState([]);
  const [activeCard, setActiveCard] = useState(null);
  const [showExtensionMenu, setShowExtensionMenu] = useState(null);
  const [showExtendTimePopup, setShowExtendTimePopup] = useState(null);
  const [showSnackSelector, setShowSnackSelector] = useState(null);
  const [snackData, setSnackData] = useState([]);
  const [snackReset, setSnackReset] = useState(0);
  const [pendingExtension, setPendingExtension] = useState({});
  const [extensionInputs, setExtensionInputs] = useState({});
  const [showCustomerPopup, setShowCustomerPopup] = useState(null);
  const [pendingSnacks, setPendingSnacks] = useState({}); // { bookingId: {snacks: [], total: number} }
  const [selectedExtendTime, setSelectedExtendTime] = useState({});
  const location = useLocation();
  const [showStopModal, setShowStopModal] = useState(false);
  const [selectedStopBooking, setSelectedStopBooking] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [fetchedStore, setFetchedStore] = useState(null);

  const customerData = bookings.map((b) => ({
    name: b.name,
    phone: b.phoneNumber,
    game: b.game,
  }));

  const coupons = bookings
    .map((b) => b.couponDetails)
    .filter((c) => c !== null && c !== undefined);
  const coupon = coupons.length > 0 ? coupons[0] : null;

  const remainingAmount = useMemo(() => {
    const unpaidAmount = bookings.reduce(
      (sum, b) => sum + (b.remainingAmount || 0),
      0
    );

    const totalExtendedAmount = bookings.reduce(
      (sum, b) => sum + (b.extend_amount || 0),
      0
    );

    const totalSnacksAmount = bookings.reduce(
      (sum, b) => sum + (b.extraSnacksTotal || 0),
      0
    );

    return unpaidAmount + totalExtendedAmount + totalSnacksAmount;
  }, [bookings]);

  // Handle snack data changes
  useEffect(() => {
    if (fetchedStore?.isCafeEnabled && showSnackSelector) {
      handleSnackSelection(showSnackSelector, snackData.totalPrice);
    }
  }, [snackData, fetchedStore, showSnackSelector]);

  // Reset snack-related state when cafe is disabled
  useEffect(() => {
    if (fetchedStore && !fetchedStore.isCafeEnabled) {
      setSnackData([]);
      setSnackReset((prev) => prev + 1);
      setShowSnackSelector(null);
      setPendingSnacks({});
      setShowExtensionMenu(null);
    }
  }, [fetchedStore]);

  // Fetch store details
  useEffect(() => {
    const fetchStoreData = async () => {
      if (!storeID) return;

      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `http://localhost:5000/api/customers/getStoreByNumber/${storeID}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();

        if (data && typeof data.isCafeEnabled !== "undefined") {
          setFetchedStore(data);
          // Reset snack-related UI state if cafe is disabled
          if (!data.isCafeEnabled) {
            setSnackData([]);
            setShowSnackSelector(null);
            setPendingSnacks({});
            setShowExtensionMenu(null);
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
  const { screenOptions, screenToGame, priceTable } = useMemo(() => {
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

    return { screenOptions, screenToGame, priceTable };
  }, [fetchedStore]);

  const allowedScreens = useMemo(() => {
    return (
      fetchedStore?.screens?.map((screen) => screen.screenName.toLowerCase()) ||
      []
    );
  }, [fetchedStore]);

  // Fetch bookings based on allowed screens
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!allowedScreens.length) return;

    const queryString = allowedScreens
      .map((screen) => `screens=${encodeURIComponent(screen)}`)
      .join("&");

    fetch(`http://localhost:5000/api/customers/active?${queryString}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error("Expected an array, got: " + JSON.stringify(data));
        }

        const mappedBookings = data
          .filter((item) =>
            allowedScreens.includes((item.screen || "").toLowerCase())
          )
          .map((item) => ({
            id: item._id,
            name: item.name,
            phoneNumber: item.phone,
            game: item.screen || "",
            duration: item.duration,
            snacks: item.snacks,
            extend_time: item.extended_time || 0,
            extend_amount: item.extended_amount || 0,
            paid: item.paid || 0,
            players: item.players || 1,
            timeLeft: `${item.duration} minutes`,
            extraSnacksTotal: item.extraSnacksPrice || 0,
            payment: item.payment,
            status: item.status || "active",
            remainingAmount: item.remainingAmount,
            couponDetails: item.couponDetails || null,
          }));

        setBookings(mappedBookings);
      })
      .catch((err) => {
        console.error("Error fetching bookings:", err);
      });
  }, [location, allowedScreens]);

  // fetch today's discount
  useEffect(() => {
    fetch("http://localhost:5000/api/admin/discounts/today")
      .then((res) => res.json())
      .then((data) => {
        let discountAmount = 0;
        let discountLabel = "";
        if (data.store && data.store !== storeID) {
          console.warn(
            `Today's discount is for store ${data.store}, not current store ${storeID}.`
          );
          return; // Ignore if discount is not for this store
        }

        if (data.discountValue && data.discountType) {
          if (data.discountType === "percent") {
            discountAmount = data.discountValue / 100;
            discountLabel = `${data.discountValue}% OFF`;
          } else if (data.discountType === "fixed") {
            discountAmount = data.discountValue;
            discountLabel = `₹${data.discountValue.toFixed(0)} OFF`;
          }
        }
        console.log(data);
        setDiscountAmount(discountAmount);
        console.log("Discount Amount:", discountAmount);
      })
      .catch((err) => {
        console.error("Error fetching discount:", err);
      });
  }, []);

  // Handle extension input change
  const handleExtensionInputChange = (booking, val) => {
    const extendTime = Math.max(0, val || 0);

    const totalDuration =
      (booking.extend_time || 0) + extendTime + booking.duration;

    let newTotalPrice = getGamePrice(
      booking.game,
      totalDuration,
      booking.players
    );

    const totalPaid = booking.paid || 0;

    let discountValue = 0;
    // Apply discount here
    // 💡 Priority: Coupon > Today's Discount
    if (coupon && coupon.discountType && coupon.value) {
      if (coupon.discountType === "percentage") {
        discountValue = newTotalPrice * (coupon.value / 100);
        newTotalPrice -= discountValue;
      } else if (coupon.discountType === "flat") {
        discountValue = coupon.value;
        newTotalPrice -= discountValue;
      }
    } else if (discountAmount > 0) {
      if (discountAmount < 1) {
        // Percentage discount (e.g., 0.1 for 10%)
        discountValue = newTotalPrice * discountAmount;
        newTotalPrice -= discountValue;
      } else {
        // Fixed discount
        console.log(`Applying fixed discount: ₹${discountAmount}`);
        newTotalPrice -= discountAmount;
      }
    }

    let extendAmount = newTotalPrice - totalPaid;
    console.log("Extension Amount before discount:", extendAmount);

    // Prevent negative amounts
    extendAmount = Math.max(0, extendAmount);

    console.log("Final Extension Amount after discount:", extendAmount);

    setPendingExtension((prev) => ({
      ...prev,
      [booking.id]: {
        extendTime: (booking.extend_time || 0) + extendTime,
        extendAmount,
        timeLeft: `${(booking.extend_time || 0) + extendTime} minutes`,
      },
    }));

    setExtensionInputs((prev) => ({ ...prev, [booking.id]: extendTime }));
  };

  // Handle extension confirmation
  const handleConfirmExtension = async (bookingId) => {
    const booking = bookings.find((b) => b.id === bookingId);
    console.log("--- Confirming Extension ---");
    console.log("Booking ID:", bookingId);
    if (!booking) return;
    const pending = pendingExtension[bookingId];
    console.log("Pending Extension:", pending);
    if (!pending || !pending.extendTime) return;

    // Prepare update data for backend with accumulated values
    const updateData = {
      extended_amount: pending.extendAmount,
      extended_time: pending.extendTime,
    };
    console.log("Update Data:", updateData);

    try {
      const res = await fetch(
        `http://localhost:5000/api/customers/update/${bookingId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        }
      );
      const result = await res.json();

      if (res.ok) {
        setBookings((bookings) =>
          bookings.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  extend_time: pending.extendTime,
                  extend_amount: pending.extendAmount,
                  timeLeft: `${
                    Number(booking.duration) + pending.extendTime
                  } minutes`,
                }
              : b
          )
        );
        console.log("Extension confirmed successfully:", result);
        setPendingExtension((prev) => ({ ...prev, [bookingId]: undefined }));
        setShowExtendTimePopup(null);
      } else {
        alert(result.message || "Failed to update extension");
      }
    } catch (error) {
      alert("Error updating extension: " + error.message);
    }
  };

  // Add this handler for pending snacks
  // Called when snack selection changes in SnackSelector popup
  const handleSnackSelection = (bookingId, snacks) => {
    console.log("--- Handling Snack Selection ---");
    console.log("Booking ID:", bookingId);
    console.log("Selected Snacks:", snacks);

    let total = 0;
    if (Array.isArray(snacks) && snacks.length > 0) {
      if (typeof snacks[0] === "object" && snacks[0] !== null) {
        total = snacks.reduce(
          (sum, s) => sum + (Number(s.price) || 0) * (Number(s.quantity) || 1),
          0
        );
      } else if (typeof snacks[0] === "string") {
        total = snacks.reduce((sum, s) => {
          const match = s.match(/₹(\d+)/);
          return sum + (match ? Number(match[1]) : 0);
        }, 0);
      }
    }

    setPendingSnacks((prev) => ({
      ...prev,
      [bookingId]: { snacks, total },
    }));
  };

  // Called when user confirms snack selection
  const handleConfirmSnacks = async (bookingId) => {
    const pending = pendingSnacks[bookingId];
    console.log(" pendingSnacks:", pendingSnacks);
    if (!pending) return;

    console.log("--- Confirming Snacks ---");
    console.log("Booking ID:", bookingId);
    console.log("Selected Snacks:", pending.snacks);
    console.log("Total Snacks Price:", pending.total);

    let b = bookings.find((b) => b.id === bookingId);
    console.log("Booking Details:", b);

    let extraSnacksTotal = (b.extraSnacksTotal || 0) + pending.snacks;

    const updateData = {
      extraSnacksPrice: extraSnacksTotal,
      // optionally send snacks array if backend supports it:
      // snacks: pending.snacks,
    };

    try {
      const res = await fetch(
        `http://localhost:5000/api/customers/update/${bookingId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        }
      );

      const result = await res.json();

      if (res.ok) {
        // save data of snacks and drinks in databse for cafe purpose
        await fetch("http://localhost:5000/api/orders/gamezone", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerName: customerData[0].name,
            phone: customerData[0].phone,
            items: snackData.items || [],
            screenNumber: customerData[0].game || "Unknown",
          }),
        });

        // Update frontend state with new extraSnacksTotal
        setBookings(
          bookings.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  extraSnacksTotal: extraSnacksTotal,
                }
              : b
          )
        );
        setShowSnackSelector(null);
        setSnackReset((prev) => prev + 1); // Triggers reset in SnackSelector
      } else {
        alert(result.message || "Failed to update snacks");
      }
    } catch (error) {
      alert("Error updating snacks: " + error.message);
    }
  };

  // Timer component inside your file (above or below ViewOrders)
  function Timer({
    bookingId,
    initialMinutes,
    extendTime = 0,
    onFiveMinutesLeft,
    onTick = () => {},
  }) {
    const storageKey = `timer_${bookingId}`;
    const startTimeKey = `start_time_${bookingId}`;
    const extendStorageKey = `timer_extend_${bookingId}`;
    const alertedRef = useRef(false);
    const prevInitialMinutesRef = useRef(initialMinutes);
    const lastAppliedExtendRef = useRef(0);

    // Track stopped state
    const [isStopped, setIsStopped] = useState(false);

    // Initialize lastAppliedExtendRef from localStorage on mount
    useEffect(() => {
      const savedExtend = localStorage.getItem(extendStorageKey);
      if (savedExtend !== null) {
        const parsed = parseInt(savedExtend, 10);
        if (!isNaN(parsed)) {
          lastAppliedExtendRef.current = parsed;
        }
      }
    }, [extendStorageKey]);

    const [secondsLeft, setSecondsLeft] = useState(() => {
      const startTime = localStorage.getItem(startTimeKey);
      const storedExtend = localStorage.getItem(extendStorageKey) || "0";
      
      if (!startTime) {
        // First time initialization
        const now = new Date().getTime();
        localStorage.setItem(startTimeKey, now.toString());
        return initialMinutes * 60;
      }

      // Calculate remaining time based on actual elapsed time
      const now = new Date().getTime();
      const start = parseInt(startTime);
      const totalSeconds = initialMinutes * 60;
      const elapsedSeconds = Math.floor((now - start) / 1000);
      const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
      
      // Add any extended time
      return remainingSeconds + (parseInt(storedExtend) * 60);
    });

    // Reset timer if initialMinutes changes
    useEffect(() => {
      if (prevInitialMinutesRef.current !== initialMinutes) {
        const newTotalSeconds = initialMinutes * 60;
        setSecondsLeft(newTotalSeconds);
        localStorage.setItem(storageKey, newTotalSeconds.toString());
        alertedRef.current = false;
        lastAppliedExtendRef.current = 0;
        localStorage.setItem(extendStorageKey, "0");
        prevInitialMinutesRef.current = initialMinutes;
        setIsStopped(false);
      }
    }, [initialMinutes, storageKey, extendStorageKey]);

    // Handle extension
    useEffect(() => {
      const extendDiff = extendTime - lastAppliedExtendRef.current;
      if (extendDiff > 0) {
        setSecondsLeft((prev) => {
          const updated = prev + extendDiff * 60;
          localStorage.setItem(storageKey, updated.toString());
          alertedRef.current = false;
          lastAppliedExtendRef.current = extendTime;
          localStorage.setItem(extendStorageKey, extendTime.toString());
          setIsStopped(false); // Restart timer if extended
          return updated;
        });
      }
    }, [extendTime, storageKey, extendStorageKey]);

    // Main timer effect
    useEffect(() => {
      if (secondsLeft <= 0) {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(extendStorageKey);
        setIsStopped(true); // Mark as stopped
        return;
      }
      if (isStopped) return; // Do not start interval if stopped

      if (secondsLeft === 300 && !alertedRef.current) {
        onFiveMinutesLeft();
        alertedRef.current = true;
      }

      const interval = setInterval(() => {
        setSecondsLeft((prev) => {
          const next = prev - 1;
          if (next >= 0) {
            localStorage.setItem(storageKey, next.toString());
            if (onTick) onTick(next); // notify parent
          }
          return next;
        });
      }, 1000);

      return () => clearInterval(interval);
    }, [
      secondsLeft,
      isStopped,
      onFiveMinutesLeft,
      storageKey,
      extendStorageKey,
      onTick,
    ]);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    return (
      <span>
        {minutes}:{seconds.toString().padStart(2, "0")} left
        {isStopped && (
          <span style={{ color: "red", marginLeft: 8 }}>(Stopped)</span>
        )}
      </span>
    );
  }

  const handleStopBooking = async (bookingId) => {
    const booking = bookings.find((b) => b.id === bookingId); // Get full booking info
    if (!booking) return alert("Booking not found");

    // Clear all localStorage entries related to this booking
    localStorage.removeItem(`timer_${bookingId}`);
    localStorage.removeItem(`timer_extend_${bookingId}`);
    localStorage.removeItem(`start_time_${bookingId}`);

    const name = booking.name || "Unknown";
    const phoneNumber = booking.phoneNumber || "Unknown";
    const Screen = booking.game || "Unknown";
    const game = screenToGame[Screen.toLowerCase()] || Screen;
    const extendTime = booking.extend_time || 0;
    const time_extend_amount = booking.extend_amount || 0;
    const totalDuration = booking.duration + extendTime;
    const extraSnacksTotal = booking.extraSnacksTotal || 0;
    const totalPlayers = booking.players || 1;
    const First_time_Booking_Game_price = booking.paid || 0;
    const totalExtra_Remaining_Amount = time_extend_amount + extraSnacksTotal;

    const token = localStorage.getItem("token"); // Get token from localStorage

    await fetch("http://localhost:5000/api/customers/log-activity-save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // JWT token required for backend to extract employee/store
      },
      body: JSON.stringify({
        action: "stop_order",
        details: {
          bookingId,
          name,
          phoneNumber,
          Screen: Screen,
          game: game,
          extendedTime: extendTime,
          extendedTimeAmount: time_extend_amount,
          extendedSnacksAmount: extraSnacksTotal,
          RemainingAmount: totalExtra_Remaining_Amount,
          totalDuration,
          totalPlayers,
          firstGamePrice: First_time_Booking_Game_price,
        },
      }),
    });

    try {
      const res = await fetch(
        `http://localhost:5000/api/customers/status/${bookingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "stopped" }),
        }
      );
      const result = await res.json();
      if (res.ok) {
        setBookings((bookings) => bookings.filter((b) => b.id !== bookingId));
      } else {
        alert(result.message || "Failed to stop booking");
      }
    } catch (error) {
      alert("Error stopping booking: " + error.message);
    }
  };

  const addAmountToLedger = async (
    bookingId,
    remainingAmount,
    phoneNumber,
    screenName
  ) => {
    console.log("--- Adding Amount to Ledger ---");
    console.log("Booking ID:", bookingId);
    console.log("Amount to Add:", remainingAmount);
    console.log("Phone Number:", phoneNumber);
    console.log("screenName:", screenName);

    // Prepare data for the transaction
    const transactionData = {
      date: new Date().toISOString(), // current date/time in ISO format
      description: `Booking ${screenName} payment`,
      amount: remainingAmount,
      transactionType: "debit", // or 'debit' depending on your logic
      bookingId: bookingId,
    };

    try {
      const token = localStorage.getItem("token"); // ✅ Declare token here
      if (!token) throw new Error("No token found in localStorage");
      // Replace with your actual backend base URL
      const backendBaseUrl = "http://localhost:5000/api/ledgers";

      // Make POST request to add transaction
      const response = await fetch(
        `${backendBaseUrl}/${phoneNumber}/transaction`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transactionData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to add ledger transaction"
        );
      }

      const updatedLedger = await response.json();
      console.log("Ledger updated successfully:", updatedLedger);
      alert("Amount added to ledger successfully!");
    } catch (error) {
      console.error("Error adding amount to ledger:", error);
      alert(`Error adding amount to ledger: ${error.message}`);
    }
    handleStopBooking(bookingId); // Stop booking after adding to ledger
    setShowCustomerPopup(null); // Close customer popup after successful transaction
  };

  // Calculate price for given game, duration (in minutes), players, and nonPlayingMembers
  function getGamePrice(game, duration, players) {
    console.log("--- Calculating Game Price ---");
    console.log("Game:", game);
    console.log("Duration:", duration);
    console.log("Players:", players);

    // Always use lowercase for screen lookup
    const mappedGame = screenToGame[game.toLowerCase()] || game;
    const gameKey = Object.keys(priceTable).find(
      (key) => key.toLowerCase() === mappedGame.toLowerCase()
    );
    if (!gameKey) {
      console.warn(`Game key not found for mapped game: ${mappedGame}`);
      return 0;
    }

    if (duration % 30 !== 0) {
      console.warn(
        `Duration ${duration} is not a multiple of 30. Please enter valid duration.`
      );
      return 0;
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
        console.warn("Price not found for 60 min slot");
        return 0;
      }
    }
    if (remaining === 30) {
      if (
        priceTable[gameKey][30] &&
        priceTable[gameKey][30][players] !== undefined
      ) {
        total += priceTable[gameKey][30][players];
      } else {
        console.warn("Price not found for 30 min slot");
        return 0;
      }
    }

    return total;
  }

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        height: "100vh",
        overflow: "hidden",
        color: "#fff",
        // padding: '18px',
      }}
    >
      {/* <Header /> */}
      <div
        style={{
          padding: "8px",
        }}
      >
        <h2
          style={{
            color: "#22cc5e",
            fontWeight: "bold",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          Current Bookings
        </h2>
        <div
          className="sidebar-divider"
          style={{
            height: "1px",
            backgroundColor: "#334155",
            marginBottom: "1.8rem",
            width: "100%",
          }}
        />
        {/* Scrollable container for mobile */}
        <div
          style={{
            height: "calc(100vh - 160px)", // Adjust height to fit viewport minus header/padding
            overflowY: "auto",
          }}
          className="mobile-scroll-container"
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            {bookings
              .filter(
                (b) =>
                  allowedScreens.includes((b.game || "").toLowerCase()) &&
                  b.status === "active"
              )
              .map((booking) => {
                const showPending =
                  pendingExtension[booking.id] &&
                  pendingExtension[booking.id].extendTime > 0;
                let extendTimeForTimer = 0;
                if (booking.extend_time !== extendTimeForTimer) {
                  extendTimeForTimer = booking.extend_time;
                }
                return (
                  <div
                    key={booking.id}
                    onClick={() => setShowCustomerPopup(booking)}
                    onMouseEnter={() => setActiveCard(booking.id)}
                    onMouseLeave={() => {
                      setActiveCard(null);
                      setShowExtensionMenu(null);
                      setExtensionInputs((prev) => ({
                        ...prev,
                        [booking.id]: "",
                      }));
                    }}
                    style={{
                      flex: "1 1 250px",
                      maxWidth: "250px",
                      background: "#0f1923",
                      borderRadius: 16,
                      boxShadow:
                        activeCard === booking.id
                          ? "0 8px 32px rgba(0,255,128,0.15)"
                          : "0 2px 8px rgba(0,0,0,0.2)",
                      padding: 16,
                      transition: "all 0.2s ease-in-out",
                      cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <h4
                          style={{
                            marginRight: 12,
                            color: "#22cc5e",
                            fontWeight: "bold",
                            fontSize: 22,
                            margin: 0,
                          }}
                        >
                          {booking.game.toUpperCase()}
                        </h4>
                      </div>
                      <span style={{ fontSize: 13, color: "#bbb" }}>
                        Payment:{" "}
                        <strong style={{ color: "#f7c844" }}>
                          {booking.payment}
                        </strong>
                      </span>
                    </div>
                    <div>
                      <ul
                        style={{
                          listStyle: "none",
                          padding: 0,
                          fontSize: 13,
                          color: "#ccc",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ color: "#ddd", fontSize: 15 }}>
                            {booking.duration} minutes
                          </span>
                          <li
                            style={{
                              margin: 0,
                              padding: 0,
                              color: "#ccc",
                              fontSize: 15,
                              listStyle: "none",
                            }}
                          >
                            Players: {booking.players}
                          </li>
                        </div>

                        <li>
                          Time Left:
                          <Timer
                            bookingId={booking.id}
                            initialMinutes={parseInt(booking.timeLeft, 10)}
                            extendTime={extendTimeForTimer}
                            onFiveMinutesLeft={() =>
                              alert(
                                `Only 5 minutes left for booking ${booking.game}!`
                              )
                            }
                            onTick={(secondsLeft) => {
                              // Optional tick handler
                            }}
                          />
                        </li>
                        {booking.extend_time > 0 && (
                          <>
                            <li>
                              Extended Time: {booking.extend_time} minutes
                            </li>
                            <li>
                              Extend Amount: ₹{booking.extend_amount.toFixed(2)}
                            </li>
                          </>
                        )}
                        {booking.extraSnacksTotal > 0 && (
                          <li>
                            {" "}
                            Extra Snacks Total: ₹{booking.extraSnacksTotal}
                          </li>
                        )}
                        {(booking.remainingAmount !== 0 ||
                          booking.extraSnacksTotal !== 0 ||
                          booking.extend_time !== 0) && (
                          <li style={{ color: "red", fontSize: "16px" }}>
                            {" "}
                            Remaining Amount : ₹{remainingAmount.toFixed(2)}
                          </li>
                        )}
                      </ul>

                      {/* Button row: Stop and Extensions in the same row */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          gap: 8,
                          marginTop: 10,
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStopBooking(booking);
                            setShowStopModal(true);
                          }}
                          style={{
                            backgroundColor: "#fa020d", // bright red
                            color: "white",
                            minWidth: 110,
                            padding: "8px 16px",
                            fontSize: 14,
                            fontWeight: "600",
                            border: "none",
                            borderRadius: 6,
                            boxSizing: "border-box",
                            display: "inline-block",
                            cursor: "pointer",
                            transition: "background-color 0.3s ease",
                            userSelect: "none",
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor = "#c7010a")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor = "#fa020d")
                          }
                        >
                          Stop
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowExtensionMenu(
                              showExtensionMenu === booking.id
                                ? null
                                : booking.id
                            );
                          }}
                          style={{
                            padding: "6px 10px",
                            fontSize: 13,
                            background: "transparent",
                            border: "1px solid #22cc5e",
                            borderRadius: 6,
                            color: "#22cc5e",
                            cursor: "pointer",
                            minWidth: 110,
                            boxSizing: "border-box",
                            display: "inline-block",
                          }}
                        >
                          Extensions ▼
                        </button>
                      </div>

                      {showStopModal && selectedStopBooking && (
                        <div
                          style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100vw",
                            height: "100vh",
                            background: "rgba(0,0,0,0.6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 5000,
                          }}
                          onClick={() => setShowStopModal(false)} // close on background click
                        >
                          <div
                            style={{
                              background: "#101921",
                              padding: 24,
                              borderRadius: 12,
                              minWidth: 320,
                              maxWidth: 400,
                              boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
                              color: "#fff",
                              position: "relative",
                            }}
                            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside modal
                          >
                            {/* Close icon */}
                            <button
                              onClick={() => {
                                setShowStopModal(false);
                                setSelectedStopBooking(null);
                              }}
                              style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                background: "transparent",
                                border: "none",
                                color: "#f7c844",
                                fontSize: 24,
                                fontWeight: "bold",
                                cursor: "pointer",
                                lineHeight: 1,
                                padding: 0,
                                userSelect: "none",
                              }}
                              aria-label="Close"
                            >
                              ×
                            </button>

                            <h3 style={{ marginBottom: 16, color: "#22cc5e" }}>
                              Confirm Stop Booking
                            </h3>

                            <p>
                              <strong>
                                Remaining Amount : ₹{remainingAmount.toFixed(2)}
                              </strong>
                            </p>
                            <div
                              style={{
                                display: "flex",
                                gap: 12,
                                marginTop: 24,
                              }}
                            >
                              <button
                                onClick={() => {
                                  handleStopBooking(selectedStopBooking.id);
                                  setShowStopModal(false);
                                  setSelectedStopBooking(null);
                                }}
                                style={{
                                  flex: 1,
                                  padding: "10px",
                                  backgroundColor: "#cc3344",
                                  border: "none",
                                  borderRadius: 6,
                                  color: "#fff",
                                  fontWeight: "bold",
                                  cursor: "pointer",
                                }}
                              >
                                Stop
                              </button>

                              <button
                                onClick={() => {
                                  addAmountToLedger(
                                    selectedStopBooking.id,
                                    remainingAmount,
                                    selectedStopBooking.phoneNumber,
                                    customerData[0].game
                                  );
                                  setShowStopModal(false);
                                  setSelectedStopBooking(null);
                                }}
                                style={{
                                  flex: 1,
                                  padding: "10px",
                                  backgroundColor: "#22cc5e",
                                  border: "none",
                                  borderRadius: 6,
                                  color: "#fff",
                                  fontWeight: "bold",
                                  cursor: "pointer",
                                }}
                              >
                                Add to Ledger
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Popup modal for Extensions */}
                      {showExtensionMenu === booking.id && (
                        <div
                          style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100vw",
                            height: "100vh",
                            background: "rgba(0,0,0,0.5)",
                            zIndex: 1000,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onClick={() => setShowExtensionMenu(null)}
                        >
                          <div
                            style={{
                              background: "#101921",
                              border: "1px solid #333",
                              borderRadius: 12,
                              padding: 24,
                              minWidth: 320,
                              maxWidth: 400,
                              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                              position: "relative",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setShowExtensionMenu(null)}
                              style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                background: "transparent",
                                border: "none",
                                color: "#fff",
                                fontSize: 18,
                                cursor: "pointer",
                              }}
                            >
                              ×
                            </button>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "row",
                                gap: 12,
                                marginTop: 10,
                                marginBottom: 10,
                              }}
                            >
                              <>
                                <button
                                  onClick={() => {
                                    setShowExtendTimePopup(booking.id);
                                    setShowExtensionMenu(null);
                                  }}
                                  style={{
                                    flex: fetchedStore?.isCafeEnabled
                                      ? 1
                                      : "100%",
                                    padding: "10px",
                                    background: "#22cc5e",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 6,
                                    fontWeight: "bold",
                                    fontSize: 15,
                                    cursor: "pointer",
                                  }}
                                >
                                  Extend Time
                                </button>
                                {fetchedStore?.isCafeEnabled && (
                                  <button
                                    onClick={() => {
                                      setShowSnackSelector(booking.id);
                                      setShowExtensionMenu(null);
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: "10px",
                                      background: "#f7c844",
                                      color: "#222",
                                      border: "1px solid #f7c844",
                                      borderRadius: 6,
                                      fontWeight: "bold",
                                      fontSize: 15,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Add Snacks
                                  </button>
                                )}
                              </>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Extend Time Popup */}
      {showExtendTimePopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowExtendTimePopup(null)}
        >
          <div
            style={{
              background: "#101921",
              border: "1px solid #333",
              borderRadius: 14,
              padding: 32,
              minWidth: 340,
              maxWidth: 420,
              boxShadow: "0 6px 32px rgba(0,0,0,0.5)",
              color: "#fff",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowExtendTimePopup(null)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: 22,
                cursor: "pointer",
              }}
            >
              ×
            </button>
            <h3 style={{ color: "#22cc5e", marginBottom: 16 }}>Extend Time</h3>
            <div style={{ marginBottom: 10 }}>
              <label style={{ color: "#aaa" }}>Select Extend Time:</label>
              <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
                {[30, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => {
                      const booking = bookings.find(
                        (b) => b.id === showExtendTimePopup
                      );
                      setSelectedExtendTime((prev) => ({
                        ...prev,
                        [showExtendTimePopup]: mins,
                      }));
                      if (booking) handleExtensionInputChange(booking, mins);
                    }}
                    style={{
                      flex: 1,
                      padding: "12px",
                      background:
                        selectedExtendTime[showExtendTimePopup] === mins
                          ? "#22cc5e"
                          : "#1e2a35",
                      color:
                        selectedExtendTime[showExtendTimePopup] === mins
                          ? "#fff"
                          : "#ccc",
                      border: "1px solid #22cc5e",
                      borderRadius: 6,
                      fontWeight: "bold",
                      fontSize: 16,
                      cursor: selectedExtendTime[showExtendTimePopup]
                        ? "pointer"
                        : "not-allowed",
                      outline:
                        selectedExtendTime[showExtendTimePopup] === mins
                          ? "2px solid #f7c844"
                          : "none",
                    }}
                  >
                    {mins} Minutes
                  </button>
                ))}
              </div>
              {pendingExtension[showExtendTimePopup] &&
                pendingExtension[showExtendTimePopup].extendTime > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      color: "#f7c844",
                      fontWeight: "bold",
                    }}
                  >
                    Selected Extend Time:{" "}
                    {pendingExtension[showExtendTimePopup].extendTime} minutes
                    <br />
                    Remaining Amount: ₹
                    {pendingExtension[showExtendTimePopup].extendAmount.toFixed(
                      2
                    )}
                  </div>
                )}
            </div>
            <div>
              <button
                onClick={() => {
                  if (selectedExtendTime[showExtendTimePopup]) {
                    handleConfirmExtension(showExtendTimePopup);
                    setSelectedExtendTime((prev) => ({
                      ...prev,
                      [showExtendTimePopup]: undefined,
                    }));
                  }
                }}
                disabled={!selectedExtendTime[showExtendTimePopup]}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: selectedExtendTime[showExtendTimePopup]
                    ? "#22cc5e"
                    : "#444",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: selectedExtendTime[showExtendTimePopup]
                    ? "pointer"
                    : "not-allowed",
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                Confirm Extension
              </button>
            </div>
          </div>
        </div>
      )}

      {showCustomerPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.7)",
            zIndex: 5000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            overflowY: "auto",
          }}
          onClick={() => setShowCustomerPopup(null)} // close on background click
        >
          <div
            style={{
              background: "#121b26",
              borderRadius: "16px",
              padding: "32px 40px",
              maxWidth: "480px",
              width: "100%",
              color: "#e0e6f1",
              position: "relative",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.8)",
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              lineHeight: 1.5,
            }}
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside modal
          >
            <button
              onClick={() => setShowCustomerPopup(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                color: "#f7c844",
                fontSize: "28px",
                fontWeight: "bold",
                cursor: "pointer",
                lineHeight: 1,
                padding: 0,
                userSelect: "none",
              }}
              aria-label="Close"
            >
              ×
            </button>

            <h2
              style={{
                marginBottom: "24px",
                color: "#22cc5e",
                fontWeight: "700",
                fontSize: "1.8rem",
                textAlign: "center",
              }}
            >
              Booking Details
            </h2>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                fontSize: "1rem",
              }}
            >
              <p>
                <strong>Name:</strong> {showCustomerPopup.name}
              </p>
              <p>
                <strong>Phone:</strong> {showCustomerPopup.phoneNumber}
              </p>
              <p>
                <strong>Screen:</strong> {showCustomerPopup.game}
              </p>
              <p>
                <strong>Duration:</strong> {showCustomerPopup.duration} minutes
              </p>
              <p>
                <strong>Players:</strong> {showCustomerPopup.players}
              </p>
              <p>
                <strong>Snacks:</strong> {showCustomerPopup.snacks}
              </p>

              <p>
                <strong>Paid:</strong> ₹{showCustomerPopup.paid}
              </p>
              <p>
                <strong>Payment Method:</strong> {showCustomerPopup.payment}
              </p>
              <p>
                <strong>Status:</strong> {showCustomerPopup.status}
              </p>
              <p>
                <strong>Time Left:</strong> {showCustomerPopup.timeLeft}
              </p>
              <p>
                <strong>Extended Time:</strong> {showCustomerPopup.extend_time}{" "}
                minutes
              </p>
              <p>
                <strong>Extend Amount:</strong> ₹
                {showCustomerPopup.extend_amount.toFixed(2)}
              </p>

              <p>
                <strong>Extra Snacks Total:</strong> ₹
                {showCustomerPopup.extraSnacksTotal}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SnackSelector Popup */}
      {showSnackSelector && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            zIndex: 4000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowSnackSelector(null)}
        >
          <div
            style={{
              background: "#101921",
              border: "1px solid #333",
              borderRadius: 14,
              padding: 32,
              minWidth: 340,
              maxWidth: 420,
              boxShadow: "0 6px 32px rgba(0,0,0,0.5)",
              color: "#fff",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSnackSelector(null)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: 22,
                cursor: "pointer",
              }}
            >
              ×
            </button>
            <h3 style={{ color: "#f7c844", marginBottom: 16 }}>
              Snacks & Drinks
            </h3>
            {fetchedStore?.isCafeEnabled ? (
              <>
                <SnackSelector
                  onChange={setSnackData}
                  reset={snackReset}
                  storeDetails={fetchedStore}
                />
                <div
                  style={{
                    margin: "16px 0",
                    color: "#f7c844",
                    fontWeight: "bold",
                  }}
                >
                  Total Snacks Price: ₹
                  {pendingSnacks[showSnackSelector]?.total || 0}
                </div>
                <button
                  onClick={() => handleConfirmSnacks(showSnackSelector)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "#22cc5e",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Confirm Snacks
                </button>
              </>
            ) : (
              <div
                style={{
                  color: "#666",
                  textAlign: "center",
                  padding: "20px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.05)",
                  marginBottom: "16px",
                }}
              >
                <div style={{ marginBottom: "8px", fontSize: "24px" }}>☕</div>
                Cafe service is currently disabled for this store.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile-only scrollbar CSS */}
      <style>{`
        @media (min-width: 769px) {
          .mobile-scroll-container {
            overflow-y: visible !important;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ViewOrders;
