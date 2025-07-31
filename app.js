document.addEventListener("DOMContentLoaded", () => {
  // --- CONFIGURATION ---
  // Replace these with your Supabase project credentials
  const SUPABASE_URL = "https://okcewpxneonowzducvjt.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rY2V3cHhuZW9ub3d6ZHVjdmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MDIwOTYsImV4cCI6MjA2ODk3ODA5Nn0.O9XNkrcu-45VJVkSGqMXQqMtG4Z1-rlyoWbeUZtWlI0";
  // Supabase client setup
  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  const familyMembers = {
    Alex: "#FF6F61",
    Austin: "#4C9F70",
    Cate: "#FFD966",
    Charlotte: "#B565A7",
    Ellen: "#6EC4DB",
    Francine: "#7BC8A4",
    Jeff: "#6A5ACD",
    Koko: "#FFB347",
    Larry: "#00BFB2",
    Peter: "#E97451",
    Ryan: "#A1C349",
    Tim: "#8B5E3C",
    Zoe: "#DC143C"
  };

  // --- DOM ELEMENTS ---
  const calendarGrid = document.getElementById("calendar-grid");
  const currentMonthYearEl = document.getElementById("current-month-year");
  const modal = document.getElementById("event-modal");
  const modalForm = document.getElementById("event-form");
  const modalTitle = document.getElementById("modal-title");
  const loader = document.getElementById("loader");
  const legendList = document.getElementById("legend-list");
  const callerNameSelect = document.getElementById("callerName");
  const startTimeSelect = document.getElementById("startTime");
  const dailyEventsTitle = document.getElementById("daily-events-title");
  const dailyEventsList = document.getElementById("daily-events-list");
  const successModal = document.getElementById("success-modal");

  // --- STATE ---
  let currentDate = new Date(); // Mutable per month nav
  let events = [];
  let selectedDateStr = new Date().toISOString().split("T")[0];
  let successTimeout;

  // --- HELPERS ---
  const showLoader = () => loader.classList.remove("hidden");
  const hideLoader = () => loader.classList.add("hidden");

  const formatTime12Hour = (time24) => {
    if (!time24) return "";
    const [h, m] = time24.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  // --- SUPABASE DATABASE FUNCTIONS ---
  const fetchEvents = async () => {
    showLoader();
    try {
      const { data, error } = await supabase
        .from("phone_calls")
        .select("*")
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;

      // Transform data to match existing format
      events = data.map((row) => ({
        id: row.id,
        date: row.date,
        callerName: row.caller_name,
        startTime: row.start_time
      }));

      renderCalendar();
      renderDailyEvents(selectedDateStr);
    } catch (err) {
      console.error("Error fetching events:", err);
      alert(
        "Could not load events. Please check your connection or database settings."
      );
    } finally {
      hideLoader();
    }
  };

  const saveEvent = async (e) => {
    e.preventDefault();
    showLoader();
    const formData = new FormData(modalForm);
    const baseDate = new Date(formData.get("selected-date") + "T00:00:00");
    const repeat = formData.get("recurring") === "on";
    const numWeeks = repeat ? 8 : 1;

    try {
      const eventsToInsert = [];

      for (let i = 0; i < numWeeks; i++) {
        const eventDate = new Date(baseDate);
        eventDate.setDate(baseDate.getDate() + i * 7);

        eventsToInsert.push({
          date: eventDate.toISOString().split("T")[0],
          caller_name: formData.get("callerName"),
          start_time: formData.get("startTime")
        });
      }

      const { error } = await supabase
        .from("phone_calls")
        .insert(eventsToInsert);

      if (error) throw error;

      modal.classList.add("hidden");
      showSuccessModal();
    } catch (err) {
      console.error("Error saving event:", err);
      alert("Could not save the event: " + err.message);
    } finally {
      hideLoader();
    }
  };

  const deleteEvent = async (id) => {
    if (!confirm("Are you sure you want to delete this call?")) return;

    showLoader();
    try {
      const { error } = await supabase
        .from("phone_calls")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchEvents();
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Delete failed. Try again.");
    } finally {
      hideLoader();
    }
  };

  // --- EXISTING UI FUNCTIONS (unchanged) ---
  const renderCalendar = () => {
    // Don't mutate global currentDate!
    const baseDate = new Date(currentDate);
    baseDate.setDate(1);

    calendarGrid.innerHTML = "";
    const month = baseDate.getMonth();
    const year = baseDate.getFullYear();
    currentMonthYearEl.textContent = `${baseDate.toLocaleString("default", {
      month: "long"
    })} ${year}`;

    const firstDayIndex = baseDate.getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevLastDay = new Date(year, month, 0).getDate();
    const lastDayIndex = new Date(year, month + 1, 0).getDay();
    const nextDays = 6 - lastDayIndex;

    // Weekday headers
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((d) => {
      calendarGrid.innerHTML += `<div class="calendar-day-header">${d}</div>`;
    });

    for (let x = firstDayIndex; x > 0; x--) {
      calendarGrid.innerHTML += `<div class="calendar-day other-month"><div class="date-number">${
        prevLastDay - x + 1
      }</div></div>`;
    }

    for (let i = 1; i <= lastDay; i++) {
      const dateObj = new Date(year, month, i);
      const dateStr = dateObj.toISOString().split("T")[0];
      const isToday = dateStr === new Date().toISOString().split("T")[0];
      const isSelected = dateStr === selectedDateStr;
      const dayEvents = events.filter((e) => e.date === dateStr);

      let html = `<div class="calendar-day ${
        isSelected ? "selected" : ""
      }" data-date="${dateStr}">
        <div class="date-number ${isToday ? "today" : ""}">${i}
       ${
         dayEvents.length
           ? `<div class="event-dot" style="background-color:${
               familyMembers[dayEvents[0].callerName] || "#888"
             }"></div>`
           : ""
       }
       </div><div class="events-container">`;

      dayEvents
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .forEach((e) => {
          html += `<div class="event-bar" style="background-color:${
            familyMembers[e.callerName] || "#888"
          }" data-event-id="${e.id}">${formatTime12Hour(e.startTime)} ${
            e.callerName
          }</div>`;
        });

      html += "</div></div>";
      calendarGrid.innerHTML += html;
    }

    for (let j = 1; j <= nextDays; j++) {
      calendarGrid.innerHTML += `<div class="calendar-day other-month"><div class="date-number">${j}</div></div>`;
    }
  };

  const renderDailyEvents = (dateStr) => {
    const date = new Date(dateStr + "T00:00:00");
    dailyEventsTitle.textContent = `Calls for ${date.toLocaleDateString(
      "default",
      { weekday: "long", month: "long", day: "numeric" }
    )}`;
    dailyEventsList.innerHTML = "";

    const items = events
      .filter((e) => e.date === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (!items.length) {
      dailyEventsList.innerHTML = "<li>No calls scheduled.</li>";
      return;
    }

    for (const e of items) {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="event-details-text">${formatTime12Hour(
          e.startTime
        )} <span style="background-color:${
        familyMembers[e.callerName] || "#888"
      }">${e.callerName}</span></div>
        <span class="delete-icon" data-event-id="${e.id}">🗑️</span>
      `;
      dailyEventsList.appendChild(li);
    }
  };

  const openModal = (dateStr) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const formatted = new Date(year, month - 1, day).toLocaleDateString(
      "default",
      {
        month: "long",
        day: "numeric",
        year: "numeric"
      }
    );
    modalTitle.textContent = `Schedule for ${formatted}`;
    modalForm.reset();
    modal.classList.remove("hidden");
    document.getElementById("selected-date").value = dateStr;
  };

  const showSuccessModal = () => {
    successModal.classList.remove("hidden");
    successTimeout = setTimeout(() => {
      hideSuccessModal();
      fetchEvents();
    }, 2500);
  };

  const hideSuccessModal = () => {
    successModal.classList.add("hidden");
    clearTimeout(successTimeout);
  };
  
  /*
  const generateIcsFile = () => {
    const toUtcFormat = (date, time) => {
      const [y, m, d] = date.split("-").map(Number);
      const [h, min] = time.split(":").map(Number);
      return (
        new Date(Date.UTC(y, m - 1, d, h, min))
          .toISOString()
          .replace(/[-:.]/g, "")
          .slice(0, -4) + "Z"
      );
    };

    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GrandmaCall//EN"];

    events.forEach((e) => {
      const dtstart = toUtcFormat(e.date, e.startTime);
      const endDate = new Date(`${e.date}T${e.startTime}`);
      const dtend = toUtcFormat(
        e.date,
        new Date(endDate.getTime() + 30 * 60000).toISOString().slice(11, 16)
      );

      ics.push(
        "BEGIN:VEVENT",
        `UID:event-${e.id}@grandma-call`,
        `DTSTAMP:${toUtcFormat(
          new Date().toISOString().slice(0, 10),
          "00:00"
        )}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:Call Grandma (${e.callerName})`,
        "END:VEVENT"
      );
    });

    ics.push("END:VCALENDAR");
    const blob = new Blob([ics.join("\r\n")], { type: "text/calendar" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "grandma_calls.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  */

  async function generateWebcalUrl() {
    const functionUrl =
      "https://okcewpxneonowzducvjt.supabase.co/functions/v1/calendar-feed";
    const webcalUrl = functionUrl.replace(/^https:\/\//, "webcal://");

    try {
      const resp = await fetch(functionUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } catch (err) {
      alert("⚠️ Calendar feed not reachable. Try again shortly.");
      console.error(err);
      return;
    }

    // Set the URL in the input box
    const input = document.getElementById("calendar-sync-url");
    const copiedMsg = document.getElementById("calendar-sync-copied");
    input.value = webcalUrl;
    copiedMsg.classList.add("hidden");

    // Show modal
    document.getElementById("calendar-sync-modal").classList.remove("hidden");
  }

  // --- INIT & EVENTS ---
  (() => {
    // Setup legend + dropdowns
    legendList.innerHTML = Object.entries(familyMembers)
      .map(
        ([name, color]) =>
          `<li><div class="color-box" style="background-color: ${color}"></div> ${name}</li>`
      )
      .join("");

    callerNameSelect.innerHTML =
      "<option disabled selected>Select your name</option>" +
      Object.keys(familyMembers)
        .map((name) => `<option value="${name}">${name}</option>`)
        .join("");

    const startTime = new Date();
    startTime.setHours(10, 30, 0, 0); // 10:30 AM

    const endTime = new Date();
    endTime.setHours(20, 30, 0, 0); // 8:30 PM

    while (startTime <= endTime) {
      const hours = String(startTime.getHours()).padStart(2, "0");
      const minutes = String(startTime.getMinutes()).padStart(2, "0");
      const timeValue = `${hours}:${minutes}`;

      startTimeSelect.add(new Option(formatTime12Hour(timeValue), timeValue));

      // Add 30 minutes
      startTime.setMinutes(startTime.getMinutes() + 30);
    }
    // ----EMAIL STUFF -----------------
      const emailForm = document.getElementById("email-signup-form");
      const emailInput = document.getElementById("subscriber-email");
      const signupMsg = document.getElementById("signup-message");
       /*
      emailForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();

        if (!email) return;

        const { data, error } = await supabase
          .from("email_subscribers")
          .insert({ email });

        if (error) {
          console.error("Signup error:", error);
          alert("Could not sign up. You may already be subscribed.");
          return;
        }

        signupMsg.classList.remove("hidden");
        emailForm.reset();
      });
      */
    // ----END EMAIL STUFF -----------------
    
    document.getElementById("prev-month-btn").addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
      renderDailyEvents(selectedDateStr);
    });

    document.getElementById("next-month-btn").addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
      renderDailyEvents(selectedDateStr);
    });

    document
      .getElementById("refresh-calendar-btn")
      .addEventListener("click", async () => {
        showLoader();
        await fetchEvents();
        hideLoader();
      });

    document
      .getElementById("add-call-for-day-btn")
      .addEventListener("click", () => openModal(selectedDateStr));

    modalForm.addEventListener("submit", saveEvent);

    document
      .getElementById("cancel-btn")
      .addEventListener("click", () => modal.classList.add("hidden"));

    document
      .getElementById("sync-calendar-btn")
      .addEventListener("click", generateWebcalUrl);

    document
      .getElementById("calendar-sync-close-btn")
      .addEventListener("click", () => {
        document.getElementById("calendar-sync-modal").classList.add("hidden");
      });

    document
      .getElementById("copy-calendar-url-btn")
      .addEventListener("click", () => {
        const input = document.getElementById("calendar-sync-url");
        const copiedMsg = document.getElementById("calendar-sync-copied");
        navigator.clipboard.writeText(input.value).then(() => {
          copiedMsg.classList.remove("hidden");
        });
      });

    document
      .getElementById("calendar-sync-modal")
      .addEventListener("click", (e) => {
        if (e.target.id === "calendar-sync-modal") {
          e.target.classList.add("hidden");
        }
      });

    document
      .getElementById("print-btn")
      .addEventListener("click", () => window.print());

    document.getElementById("success-modal").addEventListener("click", () => {
      hideSuccessModal();
      fetchEvents();
    });

    calendarGrid.addEventListener("click", (e) => {
      const dayCell = e.target.closest(".calendar-day:not(.other-month)");
      const eventBar = e.target.closest(".event-bar");

      if (eventBar) {
        deleteEvent(eventBar.dataset.eventId);
        return;
      }

      if (dayCell && dayCell.dataset.date) {
        const dateStr = dayCell.dataset.date;
        if (dateStr === selectedDateStr) {
          openModal(dateStr);
        } else {
          selectedDateStr = dateStr;
          renderCalendar();
          renderDailyEvents(selectedDateStr);
        }
      }
    });

    dailyEventsList.addEventListener("click", (e) => {
      const icon = e.target.closest(".delete-icon");
      if (icon?.dataset?.eventId) deleteEvent(icon.dataset.eventId);
    });

    fetchEvents();
  })();
});
