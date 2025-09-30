const weekdayRow = document.getElementById('weekday-row');
const calendarGrid = document.getElementById('calendar-grid');
const currentMonthLabel = document.getElementById('current-month');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const eventForm = document.getElementById('event-form');
const eventFeedback = document.getElementById('event-feedback');
const categoryForm = document.getElementById('category-form');
const categoryFeedback = document.getElementById('category-feedback');
const categorySelect = document.getElementById('category-select');
const categoryList = document.getElementById('category-list');
const eventTemplate = document.getElementById('event-template');

const API_BASE = '';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
let currentDate = new Date();
let categories = [];
let events = [];

WEEKDAYS.forEach(day => {
  const span = document.createElement('span');
  span.textContent = day;
  weekdayRow.appendChild(span);
});

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Request failed');
  }

  return response.json();
}

async function loadCategories() {
  categories = await fetchJSON(`${API_BASE}/api/categories`);
  renderCategories();
  populateCategorySelect();
}

async function loadEvents() {
  events = await fetchJSON(`${API_BASE}/api/events`);
  renderCalendar();
}

function populateCategorySelect() {
  categorySelect.innerHTML = '';
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = `${category.emoji} ${category.name}`;
    categorySelect.appendChild(option);
  });
}

function renderCategories() {
  categoryList.innerHTML = '';
  categories.forEach(category => {
    const item = document.createElement('div');
    item.className = 'category-item';

    const swatch = document.createElement('div');
    swatch.className = 'category-swatch';
    swatch.style.background = category.color;

    const info = document.createElement('div');
    info.className = 'category-info';
    const name = document.createElement('span');
    name.textContent = `${category.emoji} ${category.name}`;
    const color = document.createElement('span');
    color.textContent = category.color;

    info.appendChild(name);
    info.appendChild(color);

    item.appendChild(swatch);
    item.appendChild(info);
    categoryList.appendChild(item);
  });
}

function formatMonthLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getCalendarDays(date) {
  const firstDay = startOfMonth(date);
  const lastDay = endOfMonth(date);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const days = [];

  const previousMonthLastDate = new Date(date.getFullYear(), date.getMonth(), 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = previousMonthLastDate - i;
    const displayDate = new Date(date.getFullYear(), date.getMonth() - 1, day);
    days.push({ date: displayDate, outside: true });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: new Date(date.getFullYear(), date.getMonth(), i), outside: false });
  }

  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const displayDate = new Date(date.getFullYear(), date.getMonth() + 1, i);
    days.push({ date: displayDate, outside: true });
  }

  return days;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function renderCalendar() {
  currentMonthLabel.textContent = formatMonthLabel(currentDate);
  calendarGrid.innerHTML = '';

  const today = new Date();
  const days = getCalendarDays(currentDate);

  days.forEach(({ date, outside }) => {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (outside) {
      cell.classList.add('outside-month');
    }
    if (isSameDay(date, today)) {
      cell.classList.add('today');
    }

    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = date.getDate();
    cell.appendChild(dayNumber);

    const eventContainer = document.createElement('div');
    eventContainer.className = 'event-list';

    const dayEvents = events.filter(event => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate || event.startDate);
      return start <= date && date <= end;
    });

    dayEvents.forEach(event => {
      const pill = eventTemplate.content.firstElementChild.cloneNode(true);
      const emojiSpan = pill.querySelector('.emoji');
      const textSpan = pill.querySelector('.text');
      const color = event.category?.color || '#cbd5f5';
      const emoji = event.category?.emoji || '📌';

      pill.style.background = color;
      emojiSpan.textContent = emoji;
      textSpan.textContent = event.title;
      eventContainer.appendChild(pill);
    });

    cell.appendChild(eventContainer);
    calendarGrid.appendChild(cell);
  });
}

prevMonthBtn.addEventListener('click', () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  renderCalendar();
});

eventForm.addEventListener('submit', async event => {
  event.preventDefault();
  eventFeedback.textContent = '';
  eventFeedback.classList.remove('success');

  const formData = new FormData(eventForm);
  const payload = Object.fromEntries(formData.entries());
  if (!payload.endDate) {
    delete payload.endDate;
  }

  try {
    const created = await fetchJSON(`${API_BASE}/api/events`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    events.push(created);
    renderCalendar();
    eventForm.reset();
    populateCategorySelect();
    eventFeedback.textContent = 'Event saved!';
    eventFeedback.classList.add('success');
  } catch (error) {
    eventFeedback.textContent = error.message;
  }
});

categoryForm.addEventListener('submit', async event => {
  event.preventDefault();
  categoryFeedback.textContent = '';
  categoryFeedback.classList.remove('success');

  const formData = new FormData(categoryForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const created = await fetchJSON(`${API_BASE}/api/categories`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    categories.push(created);
    populateCategorySelect();
    renderCategories();
    categoryForm.reset();
    categoryFeedback.textContent = 'Category added!';
    categoryFeedback.classList.add('success');
  } catch (error) {
    categoryFeedback.textContent = error.message;
  }
});

async function init() {
  try {
    await loadCategories();
    await loadEvents();
  } catch (error) {
    eventFeedback.textContent = error.message;
  }

  const today = new Date();
  eventForm.startDate.valueAsDate = today;
}

init();
