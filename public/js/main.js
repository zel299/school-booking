
document.addEventListener("DOMContentLoaded", () => {
  const servicesList = document.getElementById("services-list");
  const serviceSelect = document.getElementById("service-select");
  const bookingForm = document.getElementById("booking-form");
  const confirmationModal = document.getElementById("confirmation-modal");
  const btnLookup = document.getElementById("btn-lookup");
  const lookupRefInput = document.getElementById("lookup-ref");
  const lookupResult = document.getElementById("lookup-result");

  fetchServices();

  async function fetchServices() {
    try {
      const response = await fetch("/api/services");
      const services = await response.json();

      servicesList.innerHTML = "";
      serviceSelect.innerHTML = '<option value="">-- Choose a Service --</option>';

      services.forEach((service) => {
        const card = document.createElement("div");
        card.className = "service-card";
        card.innerHTML = `
          <div>
            <h3>${service.name}</h3>
            <p>${service.description}</p>
          </div>
          <div>
            <div class="price">₱${parseFloat(service.price).toFixed(2)}</div>
            <button class="btn" onclick="selectServiceForBooking(${service.id})">Select</button>
          </div>
        `;
        servicesList.appendChild(card);

        const option = document.createElement("option");
        option.value = service.id;
        option.textContent = `${service.name} - ₱${parseFloat(service.price).toFixed(2)}`;
        serviceSelect.appendChild(option);
      });
    } catch (err) {
      servicesList.innerHTML = "<p>Error loading services. Please refresh.</p>";
    }
  }

  window.selectServiceForBooking = function (serviceId) {
    serviceSelect.value = serviceId;
    bookingForm.scrollIntoView({ behavior: "smooth" });
  };

  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      service_id: serviceSelect.value,
      name: document.getElementById("name").value,
      contact: document.getElementById("contact").value,
      email: document.getElementById("email").value,
      booking_date: document.getElementById("booking-date").value,
      booking_time: document.getElementById("booking-time").value,
      guests: document.getElementById("guests").value,
      notes: document.getElementById("notes").value
    };

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        bookingForm.reset();
        bookingForm.classList.add("hidden");

        const booking = result.booking;
        confirmationModal.classList.remove("hidden");
        confirmationModal.innerHTML = `
          <h2>🎉 Booking Confirmed!</h2>
          <p>Thank you, <strong>${booking.name}</strong>!</p>
          <p style="font-size: 1.2rem; margin: 1rem 0;">Reference Number: <strong style="color: #27ae60;">${booking.reference}</strong></p>
          <p><strong>Service:</strong> ${booking.services.name}</p>
          <p><strong>Date & Time:</strong> ${booking.booking_date} at ${booking.booking_time}</p>
          <p><strong>Total Price:</strong> ₱${parseFloat(booking.services.price).toFixed(2)}</p>
          <p><strong>Status:</strong> <span class="badge badge-pending">${booking.status}</span></p>
          <br>
          <button class="btn" onclick="window.location.reload()">Make Another Booking</button>
        `;
      } else {
        alert("Error: " + result.error);
      }
    } catch (err) {
      alert("Failed to process booking. Please try again.");
    }
  });

  btnLookup.addEventListener("click", async () => {
    const ref = lookupRefInput.value.trim();
    if (!ref) {
      alert("Please enter a reference code.");
      return;
    }

    try {
      const response = await fetch(`/api/bookings/reference/${ref}`);
      const data = await response.json();

      if (response.ok) {
        lookupResult.classList.remove("hidden");
        lookupResult.innerHTML = `
          <div style="padding: 1rem; border: 1px solid #ccc; border-radius: 4px; margin-top: 1rem;">
            <h3>Booking Details [${data.reference}]</h3>
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Service:</strong> ${data.services.name} (₱${parseFloat(data.services.price).toFixed(2)})</p>
            <p><strong>Schedule:</strong> ${data.booking_date} at ${data.booking_time}</p>
            <p><strong>Guests/Devices:</strong> ${data.guests}</p>
            <p><strong>Status:</strong> <span class="badge badge-${data.status}">${data.status}</span></p>
          </div>
        `;
      } else {
        lookupResult.classList.remove("hidden");
        lookupResult.innerHTML = `<p style="color: red; margin-top: 1rem;">${data.error}</p>`;
      }
    } catch (err) {
      alert("Error finding booking.");
    }
  });
});