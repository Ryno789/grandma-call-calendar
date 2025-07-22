document.addEventListener('DOMContentLoaded', function() {
  let calendarEl = document.getElementById('calendar');
  let calendar = new FullCalendar.Calendar(calendarEl, {
  plugins: [ 'dayGrid', 'interaction' ],
  initialView: 'dayGridMonth',
  selectable: true,          // allows click-and-drag to select
  selectMirror: true,        // shows placeholder while dragging
  selectMinDistance: 2,      // small drag still counts
  select: handleNewSelection
    initialView: 'dayGridMonth',
    events: async function(info, successCallback) {
      const res = await fetch('https://api.sheety.co/bb40ccff6c18ebdc8dc88590a23aea62/grandmaPhoneCallCalendarDatabase/sheet1');
      const data = await res.json();
      console.log(data);
      const events = data.sheet1.map(row => ({
        title: row.callerName,
        start: `${row.date}T${row.startTime}`,
        end: `${row.date}T${row.endTime}`
      }));
      successCallback(events);
    }
  });
  calendar.render();
});
function handleNewSelection(info) {
  // populate ISO date/time in hidden inputs
  form.date.value      = info.startStr.slice(0,10);
  form.startTime.value = info.startStr.slice(11,16);
  form.endTime.value   = info.endStr.slice(11,16);
  form.recur.checked   = false;
  formModal.show();     // your favorite modal library or vanilla toggle
  calendar.unselect();  // clear highlight until form submission
}

