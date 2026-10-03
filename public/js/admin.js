
document.addEventListener("DOMContentLoaded", () => {
  const loginSection = document.getElementById("login-section");
  const dashboardSection = document.getElementById("dashboard-section");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const btnLogout = document.getElementById("btn-logout");
  const btnRefresh = document.getElementById("btn-refresh");
  const tableBody = document.getElementById("bookings-table-body");

  checkAuthStatus();

  async function checkAuthStatus() {
    try {
      const res = await fetch("/api/admin/check");
      if (res.ok) {
        showDashboard();
      } else {
        showLogin();
      }
    } catch (err) {
      showLogin();
    }
  }

  function showLogin() {
    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
    btnLogout.classList.add("hidden");
  }

  function showDashboard() {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    btnLogout.classList.remove("hidden");
    loadBookings();
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");

    const username = document.getElementById("admin-username").value;
    const password = document.getElementById("admin-password").value;

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        showDashboard();
      } else {
        loginError.textContent = data.error || "Login failed";
        loginError.classList.remove("hidden");
      }
    } catch (err) {
      loginError.textContent = "Server connection error.";
      loginError.classList.remove("hidden");
    }
  });

  btnLogout.addEventListener("click", async (e) => {
    e.preventDefault();
    await fetch("/api/admin/logout", { method: "POST" });
    showLogin();
  });

  btnRefresh.addEventListener("click", loadBookings);

  async function loadBookings() {
    tableBody.innerHTML = '<tr><td colspan="7">Loading bookings...</td></tr>';
    try {
      const res = await fetch("/api/admin/bookings");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          showLogin();
          return;
        }
        throw new Error("Failed to fetch bookings.");
      }

      const bookings = await res.json();

      if (bookings.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">No bookings found.</td></tr>';
        return;
      }

      tableBody.innerHTML = "";
      bookings.forEach((booking) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${booking.reference}</strong></td>
          <td>${booking.name}<br><small>Guests/Devices: ${booking.guests}</small></td>
          <td>${booking.contact}<br><small>${booking.email}</small></td>
          <td>${booking.services ? booking.services.name : "N/A"}<br><small>₱${booking.services ? parseFloat(booking.services.price).toFixed(2) : "0.00"}</small></td>
          <td>${booking.booking_date}<br><small>${booking.booking_time}</small></td>
          <td><span class="badge badge-${booking.status}">${booking.status}</span></td>
          <td>
            <div class="actions">
              ${
                booking.status !== "confirmed"
                  ? `<button class="btn btn-success" onclick="updateStatus(${booking.id}, 'confirmed')">Confirm</button>`
                  : ""
              }
              ${
                booking.status !== "cancelled"
                  ? `<button class="btn btn-warning" onclick="updateStatus(${booking.id}, 'cancelled')">Cancel</button>`
                  : ""
              }
              <button class="btn btn-danger" onclick="deleteBooking(${booking.id})">Delete</button>
            </div>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="7" style="color:red;">Error: ${err.message}</td></tr>`;
    }
  }

  window.updateStatus = async function (id, status) {
    if (!confirm(`Are you sure you want to change status to "${status}"?`)) return;

    try {
      const res = await fetch(`/api/admin/bookings/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        loadBookings();
      } else {
        const data = await res.json();
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  window.deleteBooking = async function (id) {
    if (!confirm("Are you sure you want to permanently delete this booking?")) return;

    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        loadBookings();
      } else {
        const data = await res.json();
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Failed to delete booking.");
    }
  };
});