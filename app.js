document.addEventListener('DOMContentLoaded', function() {
  // 1) Your Sheety API endpoint
  const SHEET_API_URL = 'https://api.sheety.co/yourusername/yourproject/sheet1';

  // 2) Define a color for each person: inserted
  const personColor = {
    'Ryan':      '#007bff',
    'Mom':       '#e83e8c',
    'Uncle Joe': '#28a745'
    // add more mappings as needed
  };

  // 3) Grab calendar and modal/form elements: inserted
  const calendarEl = document.getElementById('calendar');
  const formModal  = document.getElementById('formModal');
  const closeModal = document.getElementById('closeModal');
  const form       = document.getElementById('scheduleForm');

  // Utility: choose view by screen width (mobile-friendly): inserted
  function getView() {
    return window.innerWidth < 600 ? 'listMonth' : 'dayGridMonth';
  }

  // 4) Initialize FullCalendar with selection, mobile toggle, block events: inserted
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: getView(),
    headerToolbar: {
      left:   'prev,next today',
      center: 'title',
      right:  'dayGridMonth,timeGridWeek,listMonth'
    },
    windowResize: () => calendar.changeView(getView()),

    selectable:       true,      // clicked-and-drag for new slot
    selectMirror:     true,
    selectMinDistance: 2,        // tiny drag still selects

    eventDisplay:     'block',   // solid bars instead of dots
    dayMaxEventRows:  true,
    moreLinkClick:    'popover',

    // 5) Load existing events from Google Sheet: inserted
    events: async function(fetchInfo, successCallback) {
      const res  = await fetch(SHEET_API_URL);
      const data = await res.json();
      const events = data.sheet1.map(row => ({
        title: row.callerName,
        start: `${row.date}T${row.startTime}`,
        end:   `${row.date}T${row.endTime}`,
        color: personColor[row.callerName] || '#3788d8'
      }));
      successCallback(events);
    },

    // 6) When user selects a range, show the form: inserted
    select: function(info) {
      // populate hidden inputs
      form.date.value      = info.startStr.slice(0, 10);
      form.startTime.value = info.startStr.slice(11, 16);
      form.endTime.value   = info.endStr.slice(11, 16);
      // reset recurrence
      form.recur.checked = false;
      form.querySelectorAll('input[name="dow"]').forEach(cb => cb.checked = false);

      formModal.style.display = 'block';
      calendar.unselect();
    }
  });

  calendar.render();

  // 7) Close modal on “×”: inserted
  closeModal.onclick = () => formModal.style.display = 'none';

  // 8) Handle form submission: inserted
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Build base event object
    const ev = {
      date:       form.date.value,
      startTime:  form.startTime.value,
      endTime:    form.endTime.value,
      callerName: form.callerName.value
    };

    // Helper to POST to Sheety + render on calendar
    async function postAndRender(eventData) {
      await fetch(SHEET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet1: eventData })
      });
      calendar.addEvent({
        title:   eventData.callerName,
        start:   `${eventData.date}T${eventData.startTime}`,
        end:     `${eventData.date}T${eventData.endTime}`,
        color:   personColor[eventData.callerName] || '#3788d8',
        display: 'block'
      });
    }

    // 9) Handle recurrence if checked: inserted
    if (form.recur.checked) {
      // get selected weekdays
      const days = Array.from(form.querySelectorAll('input[name="dow"]:checked'))
                       .map(cb => parseInt(cb.value, 10));
      // schedule next 4 weeks
      let startDate = new Date(`${ev.date}T${ev.startTime}`);
      for (let week = 0; week < 4; week++) {
        days.forEach(dayOfWeek => {
          let dt = new Date(startDate);
          // shift to this week's target dow
          dt.setDate(dt.getDate() + ((dayOfWeek + 7 - dt.getDay()) % 7) + 7*week);
          const isoDate = dt.toISOString().slice(0,10);
          postAndRender({ ...ev, date: isoDate });
        });
      }
    } else {
      // single booking
      await postAndRender(ev);
    }

    formModal.style.display = 'none';
  });
});
