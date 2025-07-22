document.addEventListener('DOMContentLoaded', function() {
  let calendarEl = document.getElementById('calendar');
  let calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    events: async function(info, successCallback) {
      const res = await fetch('https://api.sheety.co/bb40ccff6c18ebdc8dc88590a23aea62/grandmaPhoneCallCalendarDatabase/sheet1');
      const data = await res.json();
      const events = data.yoursheet.map(row => ({
        title: row.callerName,
        start: `${row.date}T${row.startTime}`,
        end: `${row.date}T${row.endTime}`
      }));
      successCallback(events);
    }
  });
  calendar.render();
});
