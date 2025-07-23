document.addEventListener('DOMContentLoaded', function() {
  // 1) Your Sheety API endpoint
  const SHEET_API_URL = 'https://api.sheety.co/yourusername/yourproject/sheet1';

  // 2) UPDATED: Enhanced color mapping with more vibrant colors for better visibility
  const personColor = {
    'Ryan':       '#007bff',  // Bright blue
    'Mom':        '#e83e8c',  // Pink
    'Uncle Joe':  '#28a745',  // Green
    'Sarah':      '#fd7e14',  // Orange
    'Dad':        '#6f42c1',  // Purple
    'Aunt Mary':  '#20c997',  // Teal
    // add more name → color mappings here as needed
  };

  // 3) Grab DOM elements
  const calendarEl = document.getElementById('calendar');
  const formModal  = document.getElementById('formModal');
  const closeModal = document.getElementById('closeModal');
  const form       = document.getElementById('scheduleForm');
  
  // NEW: Additional DOM elements for enhanced functionality
  const cancelBtn = document.getElementById('cancelBtn');
  const recurCheckbox = document.getElementById('recur');
  const dowOptions = document.getElementById('dowOptions');
  const selectedTimeDisplay = document.getElementById('selectedTimeDisplay');

  // 4) UPDATED: Better responsive view selection
  function getView() {
    const width = window.innerWidth;
    if (width < 480) {
      return 'listMonth';  // Mobile phones get list view
    } else if (width < 768) {
      return 'dayGridMonth';  // Tablets get day grid
    } else {
      return 'dayGridMonth';  // Desktop gets day grid
    }
  }

  // NEW: Function to format time display for users
  function formatTimeDisplay(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    };
    
    const startStr = startDate.toLocaleDateString('en-US', options);
    const endTime = endDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
    
    return `${startStr} to ${endTime}`;
  }

  // 5) UPDATED: Enhanced FullCalendar initialization with better mobile support
  const calendar = new FullCalendar.Calendar(calendarEl, {
    plugins: [
      FullCalendar.dayGridPlugin,
      FullCalendar.timeGridPlugin,
      FullCalendar.listPlugin,
      FullCalendar.interactionPlugin
    ],

    initialView: getView(),
    
    // UPDATED: Better header toolbar for mobile
    headerToolbar: {
      left:   'prev,next',
      center: 'title',
      right:  window.innerWidth < 600 ? 'listMonth,dayGridMonth' : 'dayGridMonth,timeGridWeek,listMonth'
    },
    
    // NEW: Better responsive handling
    windowResize: () => {
      const newView = getView();
      if (calendar.view.type !== newView) {
        calendar.changeView(newView);
      }
      
      // Update header toolbar for mobile
      calendar.setOption('headerToolbar', {
        left:   'prev,next',
        center: 'title',
        right:  window.innerWidth < 600 ? 'listMonth,dayGridMonth' : 'dayGridMonth,timeGridWeek,listMonth'
      });
    },

    selectable:       true,
    selectMirror:     true,
    selectMinDistance: 2,

    // UPDATED: Enhanced event display settings
    eventDisplay:    'block',
    dayMaxEventRows: false,  // Show all events, don't truncate
    moreLinkClick:   'popover',
    
    // NEW: Better height handling for mobile
    height: window.innerWidth < 600 ? 'auto' : 650,
    
    // NEW: Enhanced event styling
    eventDidMount: function(info) {
      // Add tooltip with caller name and time
      info.el.title = `${info.event.title} - ${info.event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} to ${info.event.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    },

    // 6) Load existing events
    events: async (info, successCallback) => {
      try {
        const res  = await fetch(SHEET_API_URL);
        const data = await res.json();
        
        // `data.sheet1` must match your sheet name exactly
        const events = data.sheet1.map(row => ({
          title: row.callerName,
          start: `${row.date}T${row.startTime}`,
          end:   `${row.date}T${row.endTime}`,
          color: personColor[row.callerName] || '#6c757d',  // Default gray if person not in color map
          textColor: 'white',  // Ensure text is readable
          borderColor: personColor[row.callerName] || '#6c757d'
        }));
        
        successCallback(events);
      } catch (error) {
        console.error('Error loading events:', error);
        successCallback([]);  // Return empty array if error
      }
    },

    // 7) UPDATED: Enhanced selection handling with better user feedback
    select: info => {
      // Set the hidden form values
      form.date.value      = info.startStr.slice(0,10);
      form.startTime.value = info.startStr.slice(11,16);
      form.endTime.value   = info.endStr.slice(11,16);

      // NEW: Update the time display for user confirmation
      selectedTimeDisplay.textContent = formatTimeDisplay(info.start, info.end);
      
      // Reset form state
      form.callerName.value = '';
      form.recur.checked = false;
      dowOptions.style.display = 'none';
      form.querySelectorAll('input[name="dow"]').forEach(cb => cb.checked = false);

      // Show modal
      formModal.style.display = 'block';
      
      // NEW: Focus on the name dropdown for better UX
      setTimeout(() => form.callerName.focus(), 100);
      
      calendar.unselect();
    }
  });

  calendar.render();

  // 8) UPDATED: Enhanced modal close functionality
  function closeModalFunction() {
    formModal.style.display = 'none';
    calendar.unselect();  // Clear any selection
  }

  closeModal.onclick = closeModalFunction;
  cancelBtn.onclick = closeModalFunction;
  
  // NEW: Close modal when clicking outside of it
  window.onclick = function(event) {
    if (event.target === formModal) {
      closeModalFunction();
    }
  }

  // NEW: Handle recurring checkbox to show/hide day options
  recurCheckbox.addEventListener('change', function() {
    if (this.checked) {
      dowOptions.style.display = 'block';
      // Auto-select the day of the week that matches the selected date
      const selectedDate = new Date(form.date.value + 'T' + form.startTime.value);
      const dayOfWeek = selectedDate.getDay();
      const checkbox = form.querySelector(`input[name="dow"][value="${dayOfWeek}"]`);
      if (checkbox) {
        checkbox.checked = true;
      }
    } else {
      dowOptions.style.display = 'none';
      // Uncheck all day checkboxes
      form.querySelectorAll('input[name="dow"]').forEach(cb => cb.checked = false);
    }
  });

  // 9) UPDATED: Enhanced form submission with better error handling and user feedback
  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Validate that a name was selected
    if (!form.callerName.value) {
      alert('Please select your name from the dropdown.');
      form.callerName.focus();
      return;
    }

    // NEW: Show loading state
    const saveBtn = form.querySelector('.save-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    try {
      // Base event payload
      const ev = {
        date:       form.date.value,
        startTime:  form.startTime.value,
        endTime:    form.endTime.value,
        callerName: form.callerName.value
      };

      // UPDATED: Enhanced helper function with better error handling
      async function postAndRender(eventData) {
        try {
          const response = await fetch(SHEET_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sheet1: eventData })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Add event to calendar display
          calendar.addEvent({
            title: eventData.callerName,
            start: `${eventData.date}T${eventData.startTime}`,
            end:   `${eventData.date}T${eventData.endTime}`,
            color: personColor[eventData.callerName] || '#6c757d',
            textColor: 'white',
            borderColor: personColor[eventData.callerName] || '#6c757d',
            display: 'block'
          });
        } catch (error) {
          console.error('Error saving event:', error);
          throw error;  // Re-throw to be caught by the main try-catch
        }
      }

      // Handle weekly recurrence
      if (form.recur.checked) {
        const checkedDays = Array.from(form.querySelectorAll('input[name="dow"]:checked'));
        
        if (checkedDays.length === 0) {
          alert('Please select at least one day of the week for recurring calls.');
          saveBtn.textContent = originalText;
          saveBtn.disabled = false;
          return;
        }

        const days = checkedDays.map(cb => parseInt(cb.value, 10));
        const startDate = new Date(`${ev.date}T${ev.startTime}`);

        // Generate 4 weeks of bookings
        for (let w = 0; w < 4; w++) {
          for (const dow of days) {
            const dt = new Date(startDate);
            dt.setDate(dt.getDate() + ((dow + 7 - dt.getDay()) % 7) + 7*w);
            const iso = dt.toISOString().slice(0,10);
            
            await postAndRender({ ...ev, date: iso });
          }
        }
        
        alert(`Successfully scheduled ${days.length * 4} recurring call${days.length * 4 > 1 ? 's' : ''} for ${ev.callerName}!`);
      } else {
        // Single booking
        await postAndRender(ev);
        alert(`Successfully scheduled call for ${ev.callerName}!`);
      }

      // Close modal on success
      formModal.style.display = 'none';

    } catch (error) {
      console.error('Error saving events:', error);
      alert('Sorry, there was an error saving your call time. Please try again.');
    } finally {
      // NEW: Reset button state
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }
  });

  // NEW: Add keyboard navigation support
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && formModal.style.display === 'block') {
      closeModalFunction();
    }
  });

  // NEW: Prevent form submission on Enter key in select dropdown (common issue)
  form.callerName.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  });
});
