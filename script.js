const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');
const navLinks = document.querySelectorAll('.site-nav a');
const revealItems = document.querySelectorAll('.reveal');

menuToggle?.addEventListener('click', () => {
  const isOpen = siteNav.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    if (siteNav.classList.contains('is-open')) {
      siteNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });

revealItems.forEach((item) => observer.observe(item));

const sectionIds = Array.from(navLinks).map((link) => link.getAttribute('href')).filter((href) => href && href.startsWith('#'));
const sections = sectionIds.map((id) => document.querySelector(id)).filter(Boolean);

const highlightNav = () => {
  const midpoint = window.scrollY + window.innerHeight * 0.33;
  let activeId = '#home';

  sections.forEach((section) => {
    if (section.offsetTop <= midpoint) {
      activeId = `#${section.id}`;
    }
  });

  navLinks.forEach((link) => {
    const isActive = link.getAttribute('href') === activeId;
    link.classList.toggle('active', isActive);
  });
};

window.addEventListener('scroll', highlightNav, { passive: true });
window.addEventListener('load', highlightNav);

const scrollToAnchor = (hash) => {
  const target = document.querySelector(hash);
  if (!target) {
    return;
  }

  const header = document.querySelector('.site-header');
  const offset = (header?.getBoundingClientRect().height || 0) + 40;
  const targetTop = window.scrollY + target.getBoundingClientRect().top - offset;

  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: 'smooth',
  });

  history.replaceState(null, '', hash);
};

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const hash = link.getAttribute('href');
    if (!hash || hash === '#') {
      return;
    }

    const target = document.querySelector(hash);
    if (!target) {
      return;
    }

    event.preventDefault();

    if (siteNav.classList.contains('is-open')) {
      siteNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }

    scrollToAnchor(hash);
  });
});

const visitingCardQr = document.querySelector('[data-visiting-card-qr]');
if (visitingCardQr) {
  const targetUrl = new URL('visiting-card.html', window.location.href).href;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`;
  visitingCardQr.setAttribute('src', qrApiUrl);
}

const visitorCountEl = document.getElementById('visitor-count');
const visitorSessionSeenKey = 'premierVisitorSeenThisTab';
const visitorBaseline = 81;
const visitorRemoteNamespace = 'premierfarmhouse-github-io';
const visitorRemoteKey = 'visitors';
const visitorBaselineOffset = visitorBaseline - 1;

const sanitizeVisitorCount = (value) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < visitorBaseline) {
    return visitorBaseline;
  }
  return parsed;
};

const renderVisitorCount = (value) => {
  const count = sanitizeVisitorCount(value);
  if (visitorCountEl) {
    visitorCountEl.textContent = String(count);
  }
};

const updateVisitorCount = async (retries = 3) => {
  renderVisitorCount(visitorBaseline);

  const seenInCurrentTab = sessionStorage.getItem(visitorSessionSeenKey) === 'true';
  const endpoint = seenInCurrentTab
    ? `https://api.countapi.xyz/get/${visitorRemoteNamespace}/${visitorRemoteKey}`
    : `https://api.countapi.xyz/hit/${visitorRemoteNamespace}/${visitorRemoteKey}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Visitor counter request failed: ${response.status}`);
      }

      const payload = await response.json();
      const remoteRaw = Number.parseInt(String(payload?.value ?? ''), 10);
      
      if (!Number.isFinite(remoteRaw)) {
        throw new Error('Invalid payload from CountAPI');
      }

      const remoteValue = remoteRaw + visitorBaselineOffset;
      renderVisitorCount(remoteValue);

      if (!seenInCurrentTab) {
        sessionStorage.setItem(visitorSessionSeenKey, 'true');
      }
      return;
    } catch (error) {
      if (attempt === retries - 1) {
        console.warn('Visitor counter API unavailable after retries, keeping baseline.', error);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
};

updateVisitorCount();

const shareButtons = document.querySelectorAll('[data-share]');
const shareUrl = window.location.href;
const shareText = 'Premier Group of Farm Houses - Hyderabad';

shareButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (error) {
        // Ignore cancellation and fallback to clipboard copy.
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      button.textContent = 'Link Copied';
      setTimeout(() => {
        button.textContent = 'Share';
      }, 1500);
    }
  });
});

const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxClose = document.getElementById('lightbox-close');
const thumbTriggers = document.querySelectorAll('.thumb-trigger');

const openLightbox = (src, title) => {
  if (!lightbox || !lightboxImage || !lightboxTitle) {
    return;
  }

  lightboxImage.src = src;
  lightboxTitle.textContent = title || 'Photo preview';
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
};

const closeLightbox = () => {
  if (!lightbox || !lightboxImage) {
    return;
  }

  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImage.src = '';
  document.body.style.overflow = '';
};

thumbTriggers.forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const src = trigger.getAttribute('data-full-img');
    const title = trigger.getAttribute('data-full-title') || '';
    if (src) {
      openLightbox(src, title);
    }
  });
});

lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeLightbox();
  }
});

const feedbackForm = document.getElementById('feedback-form');
const ratingButtons = document.querySelectorAll('.rating-stars button');
const ratingValue = document.getElementById('rating-value');
const feedbackText = document.getElementById('feedback-text');
const feedbackName = document.getElementById('feedback-name');
const feedbackStatus = document.getElementById('feedback-status');
const feedbackHeroStars = document.getElementById('feedback-hero-stars');
const feedbackStorageKey = 'premierFeedback';

const renderStarState = (value) => {
  ratingButtons.forEach((button) => {
    const buttonValue = Number(button.getAttribute('data-rate'));
    button.classList.toggle('is-active', buttonValue <= value);
  });
};

ratingButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const value = Number(button.getAttribute('data-rate'));
    ratingValue.value = String(value);
    renderStarState(value);
    if (feedbackHeroStars) {
      feedbackHeroStars.textContent = '★★★★★'.slice(0, value).padEnd(5, '☆');
    }
  });
});

feedbackForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  const rate = Number(ratingValue?.value || '0');
  const message = feedbackText?.value.trim() || '';
  const name = feedbackName?.value.trim() || 'Guest';

  if (rate < 1) {
    if (feedbackStatus) {
      feedbackStatus.textContent = 'Please select a star rating.';
    }
    return;
  }

  if (!message) {
    if (feedbackStatus) {
      feedbackStatus.textContent = 'Please enter your feedback message.';
    }
    return;
  }

  const payload = {
    name,
    rate,
    message,
    time: new Date().toISOString(),
  };

  const existing = JSON.parse(localStorage.getItem(feedbackStorageKey) || '[]');
  existing.unshift(payload);
  localStorage.setItem(feedbackStorageKey, JSON.stringify(existing.slice(0, 25)));

  const whatsappMessage = encodeURIComponent(`Feedback from ${name}\nRating: ${rate}/5\nMessage: ${message}`);
  const whatsappUrl = `https://api.whatsapp.com/send?phone=917093539734&text=${whatsappMessage}`;

  if (feedbackStatus) {
    feedbackStatus.textContent = 'Feedback saved. Opening WhatsApp...';
  }

  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  feedbackForm.reset();
  ratingValue.value = '0';
  renderStarState(0);
  if (feedbackHeroStars) {
    feedbackHeroStars.textContent = '★★★★★';
  }
});

const calendarRoot = document.getElementById('booking-calendar');
const calendarMonth = document.getElementById('calendar-month');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const selectedDateEl = document.getElementById('booking-selected-date');
const selectedStatusEl = document.getElementById('booking-selected-status');
const bookingFarmhouseSelect = document.getElementById('booking-farmhouse');
const bookingRequestLink = document.getElementById('booking-request-link');

if (calendarRoot && calendarMonth && prevMonthBtn && nextMonthBtn && selectedDateEl && selectedStatusEl && bookingFarmhouseSelect && bookingRequestLink) {
  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedKey = '';
  let selectedDateText = '';
  let selectedFarmhouse = bookingFarmhouseSelect.value;

  const fallbackBookingData = {
    booked: [
      '2026-04-26',
      '2026-04-27',
      '2026-05-03',
      '2026-05-10',
      '2026-05-17',
      '2026-05-24',
      '2026-06-07',
      '2026-06-14',
    ],
    tentative: [
      '2026-04-30',
      '2026-05-01',
      '2026-05-11',
      '2026-05-12',
      '2026-06-01',
      '2026-06-02',
      '2026-06-21',
    ],
  };

  let statusMap = {
    booked: new Set(fallbackBookingData.booked),
    tentative: new Set(fallbackBookingData.tentative),
  };

  const farmhouseStatusData = {
    'Green Field Farm House': {
      booked: ['2026-04-26', '2026-05-03'],
      tentative: ['2026-04-30'],
    },
    'SA Farm House': {
      booked: ['2026-04-27', '2026-05-10'],
      tentative: ['2026-05-01'],
    },
    'SB Farm House': {
      booked: ['2026-05-17'],
      tentative: ['2026-05-11'],
    },
    'Rest Home Farms': {
      booked: ['2026-05-24'],
      tentative: ['2026-05-12'],
    },
    'MS Farm House': {
      booked: ['2026-06-07'],
      tentative: ['2026-06-01', '2026-06-02'],
    },
    'Serene Farm House': {
      booked: ['2026-06-14'],
      tentative: ['2026-06-21'],
    },
  };

  const updateRequestLink = () => {
    const selectedDatePhrase = selectedDateText || 'your preferred date';
    const message = encodeURIComponent(`I have an request to book "${selectedFarmhouse}" on ${selectedDatePhrase}.`);
    bookingRequestLink.href = `https://api.whatsapp.com/send?phone=917093539734&text=${message}`;
  };

  const pad = (value) => String(value).padStart(2, '0');
  const dateKey = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;

  const getStatus = (key) => {
    if (statusMap.booked.has(key)) {
      return 'booked';
    }
    if (statusMap.tentative.has(key)) {
      return 'tentative';
    }
    return 'available';
  };

  const statusLabel = (status) => {
    if (status === 'booked') {
      return 'Booked';
    }
    if (status === 'tentative') {
      return 'Tentative';
    }
    return 'Available';
  };

  const renderCalendar = () => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    calendarMonth.textContent = monthLabel;
    calendarRoot.innerHTML = '';

    for (let i = 0; i < firstDay; i += 1) {
      const empty = document.createElement('div');
      empty.className = 'calendar-day is-empty';
      calendarRoot.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = dateKey(viewYear, viewMonth, day);
      const status = getStatus(key);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `calendar-day is-${status}`;
      button.textContent = String(day);
      button.setAttribute('data-date', key);
      button.setAttribute('aria-label', `${key} ${statusLabel(status)}`);

      if (selectedKey === key) {
        button.classList.add('is-selected');
      }

      button.addEventListener('click', () => {
        selectedKey = key;
        selectedDateText = new Date(viewYear, viewMonth, day).toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        selectedDateEl.textContent = selectedDateText;
        selectedStatusEl.textContent = `Status: ${statusLabel(status)}`;
        updateRequestLink();
        renderCalendar();
      });

      calendarRoot.appendChild(button);
    }
  };

  prevMonthBtn.addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear -= 1;
    }
    renderCalendar();
  });

  nextMonthBtn.addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear += 1;
    }
    renderCalendar();
  });

  const loadBookingData = async () => {
    try {
      const response = await fetch('booking-data.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Booking data request failed: ${response.status}`);
      }

      const data = await response.json();
      const farmhouseData = data?.farmhouses?.[selectedFarmhouse];
      const booked = Array.isArray(farmhouseData?.booked) ? farmhouseData.booked : (Array.isArray(data.booked) ? data.booked : []);
      const tentative = Array.isArray(farmhouseData?.tentative) ? farmhouseData.tentative : (Array.isArray(data.tentative) ? data.tentative : []);

      statusMap = {
        booked: new Set(booked),
        tentative: new Set(tentative),
      };
    } catch (error) {
      const fallbackFarmhouseData = farmhouseStatusData[selectedFarmhouse] || {};
      statusMap = {
        booked: new Set(fallbackFarmhouseData.booked || fallbackBookingData.booked),
        tentative: new Set(fallbackFarmhouseData.tentative || fallbackBookingData.tentative),
      };
    }
  };

  bookingFarmhouseSelect.addEventListener('change', async () => {
    selectedFarmhouse = bookingFarmhouseSelect.value;
    selectedKey = '';
    selectedDateText = '';
    selectedDateEl.textContent = 'Select a date from the calendar.';
    selectedStatusEl.textContent = 'Status will appear here.';
    await loadBookingData();
    updateRequestLink();
    renderCalendar();
  });

  const initCalendar = async () => {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    await loadBookingData();
    updateRequestLink();
    renderCalendar();
  };

  initCalendar();
}