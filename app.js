document.addEventListener('DOMContentLoaded', function() {
  // 1) Your Sheety API endpoint
  const SHEET_API_URL = 'https://api.sheety.co/yourusername/yourproject/sheet1';

  // 2) Map each caller to a custom color
  const personColor = {
    'Ryan':      '#007bff',
    'Mom':       '#e83e8c',
    'Uncle Joe': '#28a745'
    // add more name → color mappings here
  };

  // 3) Grab DOM elements
  const calendarEl = document.getElementById('calendar');
  const formModal  = document.getElementById('formModal');
  const closeModal = document.getElementById('closeModal');
  const form       = document.getElementById('scheduleForm');

  // 4) Choose view based on screen width (mobile vs desktop)
  function getView() {
    return window.innerWidth < 600 ? 'listMonth' : 'dayGridMonth';
  }

  // 5) Initialize FullCalendar
  const calendar = new FullCalendar.Calendar(calendarEl, {
    plugins: [
      FullCalendar.dayGridPlugin,
      FullCalendar.timeGridPlugin,
      FullCalendar.listPlugin,
      FullCalendar.interactionPlugin
    ],

    initialView: getView(),
    headerToolbar: {
      left:   'prev,next today',
      center: 'title',
      right:  'dayGridMonth,timeGridWeek,listMonth'
    },
    windowResize: () => calendar.changeView(getView()),

    selectable:       true,   // allow click-&-drag
    selectMirror:     true,
    selectMinDistance: 2,

    eventDisplay:    'block', // solid bars
    dayMaxEventRows: true,
    moreLinkClick:   'popover',

    // 6) Load existing events
    events: async (info, successCallback) => {
      const res  = await fetch(SHEET_API_URL);
      const data = await res.json();
      // `data.sheet1` must match your sheet name exactly
      const events = data.sheet1.map(row => ({
        title: row.callerName,
        start: `${row.date}T${row.startTime}`,
        end:   `${row.date}T${row.endTime}`,
        color: personColor[row.callerName] || '#3788d8'
      }));
      successCallback(events);
    },

    // 7) On user selection, open modal & populate hidden inputs
    select: info => {
      form.date.value      = info.startStr.slice(0,10);
      form.startTime.value = info.startStr.slice(11,16);
      form.endTime.value   = info.endStr.slice(11,16);

      form.recur.checked = false;
      form.querySelectorAll('input[name="dow"]').forEach(cb => cb.checked = false);

      formModal.style.display = 'block';
      calendar.unselect();
    }
  });

  calendar.render();

  // 8) Close modal on “×”
  closeModal.onclick = () => formModal.style.display = 'none';

  // 9) Handle form submission (single + weekly recurrence)
  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Base event payload
    const ev = {
      date:       form.date.value,
      startTime:  form.startTime.value,
      endTime:    form.endTime.value,
      callerName: form.callerName.value
    };

    // Helper to POST & render
    async function postAndRender(eventData) {
      await fetch(SHEET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet1: eventData })
      });
      calendar.addEvent({
        title: eventData.callerName,
        start: `${eventData.date}T${eventData.startTime}`,
        end:   `${eventData.date}T${eventData.endTime}`,
        color: personColor[eventData.callerName] || '#3788d8',
        display: 'block'
      });
    }

    // Weekly recurrence?
    if (form.recur.checked) {
      const days = Array.from(form.querySelectorAll('input[name="dow"]:checked'))
                        .map(cb => parseInt(cb.value,10));
      const startDate = new Date(`${ev.date}T${ev.startTime}`);

      // Generate 4 weeks of bookings
      for (let w = 0; w < 4; w++) {
        days.forEach(dow => {
          const dt = new Date(startDate);
          dt.setDate(dt.getDate() + ((dow + 7 - dt.getDay()) % 7) + 7*w);
          const iso = dt.toISOString().slice(0,10);
          postAndRender({ ...ev, date: iso });
        });
      }
    } else {
      // Single booking
      await postAndRender(ev);
    }

    formModal.style.display = 'none';
  });
});
