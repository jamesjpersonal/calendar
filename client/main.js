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
const eventListPanel = document.getElementById('event-list-panel');

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
  renderEventList();
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

    const colors = dayEvents
      .map(event => event.category?.color)
      .filter(Boolean);
    if (colors.length > 0) {
      applyDayAccent(cell, colors);
    }

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

function applyDayAccent(cell, colors) {
  const [primary] = colors;
  cell.classList.add('has-events');
  cell.style.setProperty('--event-accent', primary);
  cell.style.setProperty('--event-accent-soft', hexToRgba(primary, 0.35));

  if (colors.length > 1) {
    const secondary = colors[1];
    const gradient = `linear-gradient(135deg, ${hexToRgba(primary, 0.4)} 0%, ${hexToRgba(
      secondary,
      0.25
    )} 55%, rgba(30, 41, 59, 0.92) 100%)`;
    cell.style.background = gradient;
  }
}

function renderEventList() {
  if (!eventListPanel) return;
  eventListPanel.innerHTML = '';

  if (!events.length) {
    return;
  }

  const sorted = [...events].sort((a, b) => {
    const startDiff = new Date(a.startDate) - new Date(b.startDate);
    if (startDiff !== 0) {
      return startDiff;
    }
    return new Date(a.endDate || a.startDate) - new Date(b.endDate || b.startDate);
  });

  sorted.forEach(event => {
    const item = document.createElement('article');
    item.className = 'event-list-item';
    const accent = event.category?.color || '#38bdf8';
    item.style.setProperty('--event-accent', accent);
    item.style.setProperty('--event-accent-soft', hexToRgba(accent, 0.25));

    const titleRow = document.createElement('div');
    titleRow.className = 'event-title';
    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'emoji';
    emojiSpan.textContent = event.category?.emoji || '📌';
    const titleText = document.createElement('span');
    titleText.textContent = event.title;
    titleRow.appendChild(emojiSpan);
    titleRow.appendChild(titleText);

    const metaRow = document.createElement('div');
    metaRow.className = 'event-meta';
    const dateLabel = document.createElement('span');
    dateLabel.textContent = formatDateRange(event.startDate, event.endDate);
    const categoryLabel = document.createElement('span');
    categoryLabel.textContent = event.category ? event.category.name : 'Uncategorized';
    metaRow.appendChild(dateLabel);
    metaRow.appendChild(categoryLabel);

    item.appendChild(titleRow);
    item.appendChild(metaRow);

    if (event.description) {
      const description = document.createElement('p');
      description.className = 'event-description';
      description.textContent = event.description;
      item.appendChild(description);
    }

    eventListPanel.appendChild(item);
  });
}

function formatDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate || startDate);
  const sameDay = start.toDateString() === end.toDateString();
  const options = { month: 'short', day: 'numeric' };
  if (sameDay) {
    return start.toLocaleDateString(undefined, options);
  }
  return `${start.toLocaleDateString(undefined, options)} → ${end.toLocaleDateString(
    undefined,
    options
  )}`;
}

function hexToRgba(hex, alpha = 1) {
  if (!hex) {
    return `rgba(148, 163, 184, ${alpha})`;
  }
  let sanitized = hex.replace('#', '');
  if (sanitized.length === 3) {
    sanitized = sanitized
      .split('')
      .map(ch => ch + ch)
      .join('');
  }
  if (sanitized.length !== 6) {
    return `rgba(148, 163, 184, ${alpha})`;
  }
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
    renderEventList();
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
