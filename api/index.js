require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));

function authenticateAdmin(req, res, next) {
  const token = req.cookies.admin_token;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized access. Please log in." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired session token." });
    }
    req.admin = decoded;
    next();
  });
}

function generateReference() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomStr = "";
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return "BK-" + randomStr;
}

// PUBLIC ROUTES

app.get("/api/services", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("id", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/api/bookings", async (req, res) => {
  const { service_id, name, contact, email, booking_date, booking_time, guests, notes } = req.body;

  if (!service_id || !name || !contact || !email || !booking_date || !booking_time) {
    return res.status(400).json({ error: "All required fields must be provided." });
  }

  const todayStr = new Date().toISOString().split("T")[0];
  if (booking_date < todayStr) {
    return res.status(400).json({ error: "Booking date cannot be in the past." });
  }

  if (booking_time < "07:00" || booking_time > "17:00") {
    return res.status(400).json({ error: "Booking time must be between 07:00 and 17:00." });
  }

  try {
    const reference = generateReference();

    const { data, error } = await supabase
      .from("bookings")
      .insert([
        {
          reference,
          service_id: parseInt(service_id),
          name,
          contact,
          email,
          booking_date,
          booking_time,
          guests: guests ? parseInt(guests) : 1,
          notes: notes || "",
          status: "pending"
        }
      ])
      .select("*, services(name)");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const createdBooking = data[0];
    res.status(201).json({
      message: "Booking submitted successfully.",
      reference: createdBooking.reference,
      booking: createdBooking
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/api/bookings/:reference", async (req, res) => {
  const { reference } = req.params;

  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, services(name)")
      .eq("reference", reference.toUpperCase())
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Booking reference not found." });
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Internal server error." });
  }
});

// ADMIN ROUTES (PROTECTED)

app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    const { data: admin, error } = await supabase
      .from("admins")
      .select("*")
      .eq("username", username)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000
    });

    res.status(200).json({ message: "Login successful." });
  } catch (err) {
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/api/admin/logout", authenticateAdmin, (req, res) => {
  res.clearCookie("admin_token");
  res.status(200).json({ message: "Logged out successfully." });
});

app.get("/api/admin/bookings", authenticateAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, services(name)")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Internal server error." });
  }
});

app.patch("/api/admin/bookings/:id/confirm", authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", id)
      .select();

    if (error || !data.length) {
      return res.status(404).json({ error: "Booking not found or update failed." });
    }

    res.status(200).json({ message: "Booking confirmed successfully.", booking: data[0] });
  } catch (err) {
    res.status(500).json({ error: "Internal server error." });
  }
});

app.patch("/api/admin/bookings/:id/cancel", authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select();

    if (error || !data.length) {
      return res.status(404).json({ error: "Booking not found or update failed." });
    }

    res.status(200).json({ message: "Booking cancelled successfully.", booking: data[0] });
  } catch (err) {
    res.status(500).json({ error: "Internal server error." });
  }
});

app.delete("/api/admin/bookings/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ message: "Booking deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Internal server error." });
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;