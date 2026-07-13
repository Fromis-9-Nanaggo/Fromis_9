(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const pad = (value) => String(value).padStart(2, '0');

  const totalVisitorCount = document.querySelector('[data-total-visitor-count]');
  const todayVisitorCount = document.querySelector('[data-today-visitor-count]');
  if (totalVisitorCount && todayVisitorCount) {
    const visitorStorageKey = 'fromis9-visitor-id';
    const visitorsEndpoint = '/api/visitors';
    let visitorId = '';

    try {
      visitorId = window.localStorage.getItem(visitorStorageKey) || '';
      if (!/^[a-f0-9-]{36}$/i.test(visitorId)) {
        visitorId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        window.localStorage.setItem(visitorStorageKey, visitorId);
      }
    } catch (_) {
      visitorId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    fetch(visitorsEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ visitorId })
    })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to read visitor counts.');
        return response.json();
      })
      .then((data) => {
        const total = Number.parseInt(data.total, 10);
        const today = Number.parseInt(data.today, 10);
        if (Number.isFinite(total)) totalVisitorCount.textContent = total.toLocaleString('ko-KR');
        if (Number.isFinite(today)) todayVisitorCount.textContent = today.toLocaleString('ko-KR');
      })
      .catch(() => {
        totalVisitorCount.textContent = '—';
        todayVisitorCount.textContent = '—';
      });
  }

  const loader = document.querySelector('.loader');
  const hideLoader = () => {
    window.setTimeout(() => loader?.classList.add('is-hidden'), reducedMotion ? 0 : 520);
  };
  if (document.readyState === 'complete') hideLoader();
  else window.addEventListener('load', hideLoader, { once: true });
  window.setTimeout(hideLoader, 2200);

  const header = document.querySelector('[data-header]');
  const progress = document.querySelector('.scroll-progress span');
  const heroImage = document.querySelector('.hero-image');
  let scrollTicking = false;

  const updateScroll = () => {
    const y = window.scrollY;
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    header?.classList.toggle('is-scrolled', y > 24);
    if (progress) progress.style.width = `${(y / max) * 100}%`;
    if (heroImage && !reducedMotion && y < window.innerHeight * 1.2) {
      heroImage.style.transform = `scale(1.035) translate3d(0, ${y * 0.055}px, 0)`;
    }
    scrollTicking = false;
  };

  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(updateScroll);
      scrollTicking = true;
    }
  }, { passive: true });
  updateScroll();

  const reveals = [...document.querySelectorAll('.reveal')];
  if ('IntersectionObserver' in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.09, rootMargin: '0px 0px -5% 0px' });
    reveals.forEach((item) => revealObserver.observe(item));
  } else {
    reveals.forEach((item) => item.classList.add('is-visible'));
  }

  const navLinks = [...document.querySelectorAll('.desktop-nav a')];
  const sections = [...document.querySelectorAll('main section[id]')];
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const current = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!current) return;
      navLinks.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${current.target.id}`);
      });
    }, { rootMargin: '-25% 0px -60% 0px', threshold: [0, .2, .5] });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  const menuToggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileLinks = [...document.querySelectorAll('.mobile-menu a')];

  const setMenu = (open, returnFocus = false) => {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    mobileMenu.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    if (open) window.setTimeout(() => mobileLinks[0]?.focus(), 0);
    else if (returnFocus) menuToggle.focus();
  };

  menuToggle?.addEventListener('click', () => {
    setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
  });
  mobileLinks.forEach((link) => link.addEventListener('click', () => setMenu(false)));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
      setMenu(false, true);
      return;
    }
    if (event.key !== 'Tab' || menuToggle?.getAttribute('aria-expanded') !== 'true') return;
    const focusable = [menuToggle, ...mobileLinks];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const countdownCard = document.querySelector('.countdown-card');
  if (countdownCard) {
    const release = new Date(countdownCard.dataset.release).getTime();
    const dayEl = countdownCard.querySelector('[data-days]');
    const hourEl = countdownCard.querySelector('[data-hours]');
    const minuteEl = countdownCard.querySelector('[data-minutes]');
    const secondEl = countdownCard.querySelector('[data-seconds]');
    let countdownTimer;

    const updateCountdown = () => {
      const distance = release - Date.now();
      if (distance <= 0) {
        countdownCard.classList.add('is-released');
        countdownCard.querySelector('.countdown-head span').textContent = 'THE 2ND ALBUM';
        countdownCard.querySelector(':scope > p').textContent = 'OUT NOW · OFFICIAL CHANNEL';
        if (countdownTimer) window.clearInterval(countdownTimer);
        return;
      }
      const days = Math.floor(distance / 86400000);
      const hours = Math.floor((distance % 86400000) / 3600000);
      const minutes = Math.floor((distance % 3600000) / 60000);
      const seconds = Math.floor((distance % 60000) / 1000);
      if (dayEl) dayEl.textContent = pad(days);
      if (hourEl) hourEl.textContent = pad(hours);
      if (minuteEl) minuteEl.textContent = pad(minutes);
      if (secondEl) secondEl.textContent = pad(seconds);
    };

    updateCountdown();
    countdownTimer = window.setInterval(updateCountdown, 1000);
  }

  const scheduleList = document.querySelector('[data-schedule-list]');
  const scheduleStatus = document.querySelector('[data-schedule-status]');
  const scheduleUpdated = document.querySelector('[data-schedule-updated]');
  if (scheduleList && scheduleStatus && scheduleUpdated) {
    const scheduleEndpoint = '/api/schedule';
    let lastScheduleCheck = 0;
    let scheduleRequest = null;

    const scheduleFormatters = {
      day: new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', day: '2-digit' }),
      month: new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', month: 'short' }),
      date: new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }),
      time: new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false })
    };
    const formatKst = (value, formatter) => formatter.format(new Date(value));

    const safeUrl = (value) => {
      try {
        const url = new URL(value);
        return ['https:', 'http:'].includes(url.protocol) ? url.href : 'https://www.youtube.com/@fromis9_official';
      } catch (_) {
        return 'https://www.youtube.com/@fromis9_official';
      }
    };

    const makeScheduleItem = (item) => {
      const start = new Date(item.startsAt);
      const end = item.endsAt ? new Date(item.endsAt) : null;
      const isRange = end && formatKst(start, scheduleFormatters.date) !== formatKst(end, scheduleFormatters.date);
      const link = document.createElement('a');
      link.className = 'schedule-item';
      link.href = safeUrl(item.url);
      link.target = '_blank';
      link.rel = 'noreferrer';

      const date = document.createElement('time');
      date.dateTime = start.toISOString();
      date.classList.toggle('is-range', Boolean(isRange));
      const day = document.createElement('b');
      day.textContent = isRange
        ? `${formatKst(start, scheduleFormatters.day)}–${formatKst(end, scheduleFormatters.day)}`
        : formatKst(start, scheduleFormatters.day);
      const month = document.createElement('span');
      month.textContent = isRange && formatKst(start, scheduleFormatters.month) !== formatKst(end, scheduleFormatters.month)
        ? `${formatKst(start, scheduleFormatters.month)}–${formatKst(end, scheduleFormatters.month)}`.toUpperCase()
        : formatKst(start, scheduleFormatters.month).toUpperCase();
      date.append(day, month);

      const copy = document.createElement('span');
      copy.className = 'schedule-copy';
      const meta = document.createElement('small');
      meta.textContent = isRange
        ? `${formatKst(start, scheduleFormatters.time)} — ${formatKst(end, scheduleFormatters.time)} KST`
        : `${formatKst(start, scheduleFormatters.time)} KST`;
      const title = document.createElement('strong');
      title.textContent = item.title || 'OFFICIAL UPDATE';
      copy.append(meta, title);

      const arrow = document.createElement('i');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      link.append(date, copy, arrow);
      return link;
    };

    const renderSchedule = (items) => {
      scheduleList.replaceChildren();
      if (!items.length) {
        const empty = document.createElement('p');
        empty.className = 'schedule-empty';
        empty.textContent = 'NO UPCOMING OFFICIAL SCHEDULE';
        scheduleList.append(empty);
      } else {
        items.forEach((item) => scheduleList.append(makeScheduleItem(item)));
      }
    };

    const loadSchedule = () => {
      if (scheduleRequest) return scheduleRequest;
      scheduleRequest = (async () => {
        scheduleList.setAttribute('aria-busy', 'true');
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch(scheduleEndpoint, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
            signal: controller.signal
          });
          if (!response.ok) {
            const error = await response.json().catch(() => null);
            throw new Error(error?.error || `Schedule request failed: ${response.status}`);
          }
          const payload = await response.json();
          if (!Array.isArray(payload.items)) throw new Error('Invalid schedule payload');
          renderSchedule(payload.items.filter((item) => item && Number.isFinite(Date.parse(item.startsAt)) && (!item.endsAt || Date.parse(item.endsAt) >= Date.parse(item.startsAt))));
          const sources = Array.isArray(payload.liveSources) ? payload.liveSources : [];
          scheduleStatus.textContent = payload.live ? `LIVE · ${sources.join(' + ').toUpperCase()}` : 'UPDATED';
          scheduleUpdated.textContent = `UPDATED ${formatKst(payload.updatedAt || Date.now(), scheduleFormatters.time)} KST · 5 MIN`;
          lastScheduleCheck = Date.now();
        } catch (error) {
          console.warn('Could not load schedules', error);
          renderSchedule([]);
          scheduleStatus.textContent = 'SCHEDULE UNAVAILABLE';
          scheduleUpdated.textContent = 'RETRYING IN 5 MIN';
        } finally {
          window.clearTimeout(timeout);
          scheduleList.setAttribute('aria-busy', 'false');
          scheduleRequest = null;
        }
      })();
      return scheduleRequest;
    };

    loadSchedule();
    window.setInterval(loadSchedule, 300000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - lastScheduleCheck > 300000) loadSchedule();
    });
  }

  const latestVideoCard = document.querySelector('[data-latest-video]');
  const latestVideoFrame = document.querySelector('[data-latest-video-frame]');
  const latestVideoTitle = document.querySelector('[data-latest-video-title]');
  const latestVideoLink = document.querySelector('[data-latest-video-link]');
  const latestVideoFallback = document.querySelector('[data-latest-video-fallback]');
  let latestVideoRequested = false;

  const loadLatestVideo = async () => {
    if (!latestVideoCard || latestVideoRequested) return;
    latestVideoRequested = true;
    latestVideoCard.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch('/api/latest-video', {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`Latest video request failed: ${response.status}`);
      const video = await response.json();
      if (!/^[\w-]{11}$/.test(video.id || '')) throw new Error('Invalid latest video payload');

      const watchUrl = `https://www.youtube.com/watch?v=${video.id}`;
      if (latestVideoLink) latestVideoLink.href = watchUrl;
      if (latestVideoTitle) latestVideoTitle.textContent = video.title || 'LATEST VIDEO FROM THE OFFICIAL CHANNEL.';
      if (latestVideoFallback) latestVideoFallback.textContent = video.title || 'WATCH ON YOUTUBE';
      if (latestVideoFrame) {
        latestVideoFrame.addEventListener('load', () => latestVideoCard.classList.add('is-ready'), { once: true });
        latestVideoFrame.src = `https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1`;
      } else {
        latestVideoCard.classList.add('is-ready');
      }
    } catch (error) {
      console.warn('Could not load the latest YouTube video', error);
      if (latestVideoTitle) latestVideoTitle.textContent = 'OPEN THE OFFICIAL CHANNEL FOR THE LATEST VIDEO.';
      if (latestVideoFallback) latestVideoFallback.textContent = 'OPEN OFFICIAL CHANNEL';
      latestVideoCard.classList.add('is-unavailable');
    } finally {
      latestVideoCard.setAttribute('aria-busy', 'false');
    }
  };

  if (latestVideoCard) {
    latestVideoFallback?.addEventListener('click', (event) => {
      if (latestVideoRequested) return;
      event.preventDefault();
      loadLatestVideo();
    });
  }

  const trackItems = [...document.querySelectorAll('.track-list li')];
  const selectedTrack = document.querySelector('[data-selected-track]');
  const selectedNote = document.querySelector('[data-selected-note]');
  const trackVideoKind = document.querySelector('[data-track-video-kind]');
  const trackVideoCopy = document.querySelector('[data-track-video-copy]');
  const trackVideoLink = document.querySelector('[data-track-video-link]');
  const trackVideoLabel = document.querySelector('[data-track-video-label]');

  const updateTrackRecommendation = (track, note) => {
    const query = `fromis_9 ${track} official`;
    const isTitle = note === 'TITLE TRACK';
    const isUnit = note === 'UNIT';

    if (trackVideoKind) {
      trackVideoKind.textContent = isTitle ? 'TITLE VIDEO' : isUnit ? 'UNIT PICK' : 'OFFICIAL SEARCH';
    }
    if (trackVideoCopy) {
      trackVideoCopy.replaceChildren();
      const title = document.createElement('strong');
      title.textContent = track;
      trackVideoCopy.append(title, document.createTextNode(
        isTitle ? '의 공식 뮤직비디오와 무대를 바로 찾아봐.' : isUnit ? ' 유닛의 공식 콘텐츠와 라이브를 찾아봐.' : '의 공식 영상과 무대를 바로 찾아봐.'
      ));
    }
    if (trackVideoLink) trackVideoLink.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    if (trackVideoLabel) trackVideoLabel.textContent = `${track.toUpperCase()} 영상 찾기`;
  };

  trackItems.forEach((item) => {
    const button = item.querySelector('button');
    button?.addEventListener('click', () => {
      trackItems.forEach((track) => track.classList.remove('active'));
      item.classList.add('active');
      if (selectedTrack) selectedTrack.textContent = button.dataset.track;
      if (selectedNote) selectedNote.textContent = button.dataset.note;
      updateTrackRecommendation(button.dataset.track || '', button.dataset.note || '');
      button.animate?.([
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(0)' }
      ], { duration: 240, easing: 'cubic-bezier(.2,.75,.2,1)' });
    });
  });

  const memberDeck = document.querySelector('.member-deck');
  if (memberDeck && window.matchMedia('(pointer: coarse)').matches) {
    const dragThreshold = 10;
    let trackingMemberSwipe = false;
    let horizontalMemberSwipe = false;
    let suppressMemberClick = false;
    let startMemberX = 0;
    let startMemberY = 0;
    let startMemberScroll = 0;

    const finishMemberSwipe = (event) => {
      if (event.pointerType !== 'touch') return;
      const didSwipeHorizontally = horizontalMemberSwipe;
      if (horizontalMemberSwipe && memberDeck.hasPointerCapture(event.pointerId)) {
        memberDeck.releasePointerCapture(event.pointerId);
      }
      trackingMemberSwipe = false;
      horizontalMemberSwipe = false;
      if (didSwipeHorizontally) window.setTimeout(() => { suppressMemberClick = false; }, 350);
    };

    memberDeck.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'touch') return;
      trackingMemberSwipe = true;
      horizontalMemberSwipe = false;
      suppressMemberClick = false;
      startMemberX = event.clientX;
      startMemberY = event.clientY;
      startMemberScroll = memberDeck.scrollLeft;
    });
    memberDeck.addEventListener('pointermove', (event) => {
      if (!trackingMemberSwipe || event.pointerType !== 'touch') return;
      const moveX = event.clientX - startMemberX;
      const moveY = event.clientY - startMemberY;
      if (!horizontalMemberSwipe) {
        if (Math.max(Math.abs(moveX), Math.abs(moveY)) < dragThreshold) return;
        if (Math.abs(moveY) >= Math.abs(moveX)) {
          trackingMemberSwipe = false;
          return;
        }
        horizontalMemberSwipe = true;
        suppressMemberClick = true;
        memberDeck.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      memberDeck.scrollLeft = startMemberScroll - moveX;
    }, { passive: false });
    memberDeck.addEventListener('pointerup', finishMemberSwipe);
    memberDeck.addEventListener('pointercancel', finishMemberSwipe);
    memberDeck.addEventListener('click', (event) => {
      if (!suppressMemberClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressMemberClick = false;
    }, true);
  }

  const archiveControls = document.querySelector('.archive-controls');
  const archiveScroller = document.querySelector('.era-scroller');
  if (archiveControls && archiveScroller) archiveScroller.before(archiveControls);
  const archiveSearch = document.querySelector('[data-archive-search]');
  const archiveYear = document.querySelector('[data-archive-year]');
  const archiveTypeButtons = [...document.querySelectorAll('[data-archive-type]')];
  const archiveResult = document.querySelector('[data-archive-result]');
  const eraCards = [...document.querySelectorAll('.era-card[data-era-year]')];
  let activeArchiveType = 'all';

  const filterArchive = () => {
    const keyword = (archiveSearch?.value || '').trim().toLowerCase();
    const year = archiveYear?.value || 'all';
    let matched = 0;
    eraCards.forEach((card) => {
      const matches = (year === 'all' || card.dataset.eraYear === year)
        && (activeArchiveType === 'all' || card.dataset.eraType === activeArchiveType)
        && (!keyword || card.dataset.eraSearch?.includes(keyword));
      card.hidden = !matches;
      if (matches) matched += 1;
    });
    if (archiveResult) archiveResult.textContent = `${matched}개의 기록`;
  };

  archiveSearch?.addEventListener('input', filterArchive);
  archiveYear?.addEventListener('change', filterArchive);
  archiveTypeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeArchiveType = button.dataset.archiveType || 'all';
      archiveTypeButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      filterArchive();
    });
  });

  const eraScroller = archiveScroller;
  if (eraScroller) {
    let dragging = false;
    let pointerActive = false;
    let dragged = false;
    let suppressEraClick = false;
    let startX = 0;
    let startScroll = 0;

    eraScroller.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch') return;
      pointerActive = true;
      dragging = false;
      dragged = false;
      startX = event.clientX;
      startScroll = eraScroller.scrollLeft;
    });
    eraScroller.addEventListener('pointermove', (event) => {
      if (!pointerActive) return;
      const distance = event.clientX - startX;
      if (Math.abs(distance) <= 5) return;
      if (!dragging) {
        dragging = true;
        dragged = true;
        eraScroller.classList.add('is-dragging');
        if (!eraScroller.hasPointerCapture(event.pointerId)) eraScroller.setPointerCapture(event.pointerId);
      }
      eraScroller.scrollLeft = startScroll - distance * 1.2;
    });
    const stopDrag = (event) => {
      if (!pointerActive) return;
      pointerActive = false;
      if (!dragging) return;
      dragging = false;
      eraScroller.classList.remove('is-dragging');
      if (event.pointerId !== undefined && eraScroller.hasPointerCapture(event.pointerId)) {
        eraScroller.releasePointerCapture(event.pointerId);
      }
      if (dragged) {
        suppressEraClick = true;
        window.requestAnimationFrame(() => { suppressEraClick = false; });
      }
    };
    eraScroller.addEventListener('pointerup', (event) => {
      const card = event.target.closest?.('.era-card[data-album-id]');
      if (pointerActive && !dragged && card) {
        openAlbumModal(card.dataset.albumId, { historyMode: 'push', opener: card });
      }
      stopDrag(event);
    });
    eraScroller.addEventListener('pointercancel', stopDrag);
    eraScroller.addEventListener('pointerleave', stopDrag);
    eraScroller.addEventListener('click', (event) => {
      if (!suppressEraClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressEraClick = false;
    }, true);
    eraScroller.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      eraScroller.scrollBy({
        left: event.key === 'ArrowRight' ? 320 : -320,
        behavior: reducedMotion ? 'auto' : 'smooth'
      });
    });

    const albumModal = document.querySelector('#archive-album-dialog');
    const albumModalPanel = document.querySelector('.album-modal-panel');
    const albumModalClose = document.querySelector('.album-modal-close');
    const albumModalTitle = document.querySelector('[data-album-modal-title]');
    const albumModalMeta = document.querySelector('[data-album-modal-meta]');
    const albumModalTitleTrack = document.querySelector('[data-album-modal-title-track]');
    const albumModalDescription = document.querySelector('[data-album-modal-description]');
    const albumModalTracks = document.querySelector('[data-album-modal-tracks]');
    const albumModalVideo = document.querySelector('[data-album-modal-video]');
    const albumModalPrevious = document.querySelector('[data-album-modal-prev]');
    const albumModalNext = document.querySelector('[data-album-modal-next]');
    const albums = Array.isArray(window.ARCHIVE_ALBUMS) ? window.ARCHIVE_ALBUMS : [];
    const albumsById = new Map(albums.filter((album) => album?.id).map((album) => [album.id, album]));
    const albumOrder = eraCards.map((card) => card.dataset.albumId).filter((id) => albumsById.has(id));
    const typeLabels = { single: 'SINGLE ALBUM', mini: 'MINI ALBUM', album: 'FULL ALBUM' };
    const pageRegions = [document.querySelector('header'), document.querySelector('main'), document.querySelector('footer')].filter(Boolean);
    let activeAlbumId = '';
    let albumOpener = null;
    let restoreAlbumFocus = false;

    const isSafeHttpsUrl = (value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' ? url.href : '';
      } catch (_) {
        return '';
      }
    };

    const getAlbumIdFromHash = () => {
      if (!window.location.hash.startsWith('#album=')) return '';
      try {
        return decodeURIComponent(window.location.hash.slice(7));
      } catch (_) {
        return '';
      }
    };

    const formatReleaseDate = (value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '발매일 정보 확인 중';
      const [year, month, day] = value.split('-');
      return `${year}.${month}.${day}`;
    };

    const updateAlbumHash = (id, mode) => {
      const url = `${window.location.pathname}${window.location.search}#album=${encodeURIComponent(id)}`;
      const state = { archiveAlbumModal: true };
      if (mode === 'replace') window.history.replaceState(state, '', url);
      else if (mode === 'push') window.history.pushState(state, '', url);
    };

    const setAlbumModalBackground = (open) => {
      document.body.classList.toggle('album-modal-open', open);
      pageRegions.forEach((region) => { region.inert = open; });
    };

    const renderAlbum = (album) => {
      if (!albumModalTitle || !albumModalMeta || !albumModalTitleTrack || !albumModalDescription || !albumModalTracks) return;
      albumModalTitle.textContent = album.title || '앨범 정보 확인 중';
      albumModalMeta.textContent = `${formatReleaseDate(album.releaseDate)} · ${typeLabels[album.type] || '앨범 유형 정보 확인 중'}`;
      albumModalTitleTrack.textContent = album.titleTrack ? `TITLE TRACK · ${album.titleTrack}` : '대표곡 정보 확인 중';
      albumModalDescription.textContent = album.description || '앨범 소개 정보 확인 중';

      albumModalTracks.replaceChildren();
      const tracks = Array.isArray(album.tracks) ? album.tracks : [];
      if (tracks.length) {
        tracks.forEach((track) => {
          const item = document.createElement('li');
          item.textContent = track;
          albumModalTracks.append(item);
        });
      } else {
        const item = document.createElement('li');
        item.textContent = '수록곡 정보 확인 중';
        albumModalTracks.append(item);
      }

      const videoUrl = isSafeHttpsUrl(album.officialVideoUrl);
      if (albumModalVideo) {
        albumModalVideo.hidden = !videoUrl;
        if (videoUrl) albumModalVideo.href = videoUrl;
        else albumModalVideo.removeAttribute('href');
      }

      const index = albumOrder.indexOf(album.id);
      if (albumModalPrevious) albumModalPrevious.disabled = index <= 0;
      if (albumModalNext) albumModalNext.disabled = index < 0 || index >= albumOrder.length - 1;
    };

    const closeAlbumModal = ({ returnFocus = true } = {}) => {
      if (!albumModal || albumModal.hidden) return;
      albumModal.hidden = true;
      setAlbumModalBackground(false);
      activeAlbumId = '';
      if (returnFocus && restoreAlbumFocus && albumOpener) {
        window.setTimeout(() => albumOpener.focus(), 0);
      }
      albumOpener = null;
      restoreAlbumFocus = false;
    };

    const openAlbumModal = (id, { historyMode = 'none', opener = null, moveFocus = true } = {}) => {
      const album = albumsById.get(id);
      if (!album || !albumModal) return false;
      const wasOpen = !albumModal.hidden;
      if (!wasOpen) {
        albumOpener = opener;
        restoreAlbumFocus = Boolean(opener);
      }
      activeAlbumId = id;
      renderAlbum(album);
      albumModal.hidden = false;
      setAlbumModalBackground(true);
      if (historyMode !== 'none') updateAlbumHash(id, wasOpen ? 'replace' : historyMode);
      if (moveFocus && !wasOpen) window.setTimeout(() => albumModalClose?.focus(), 0);
      return true;
    };

    const requestAlbumModalClose = () => {
      if (window.history.state?.archiveAlbumModal) {
        window.history.back();
        return;
      }
      if (getAlbumIdFromHash()) {
        window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}#archive`);
      }
      closeAlbumModal();
    };

    const syncAlbumModalFromHash = () => {
      const albumId = getAlbumIdFromHash();
      if (albumId && albumsById.has(albumId)) {
        if (albumId !== activeAlbumId) openAlbumModal(albumId, { moveFocus: !activeAlbumId });
      } else {
        closeAlbumModal();
      }
    };

    eraCards.forEach((card) => {
      card.addEventListener('click', () => {
        if (suppressEraClick) return;
        openAlbumModal(card.dataset.albumId, { historyMode: 'push', opener: card });
      });
      card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openAlbumModal(card.dataset.albumId, { historyMode: 'push', opener: card });
      });
    });

    albumModal?.querySelectorAll('[data-album-modal-close]').forEach((button) => {
      button.addEventListener('click', requestAlbumModalClose);
    });
    albumModalPrevious?.addEventListener('click', () => {
      const index = albumOrder.indexOf(activeAlbumId);
      if (index > 0) openAlbumModal(albumOrder[index - 1], { historyMode: 'replace', moveFocus: false });
    });
    albumModalNext?.addEventListener('click', () => {
      const index = albumOrder.indexOf(activeAlbumId);
      if (index >= 0 && index < albumOrder.length - 1) openAlbumModal(albumOrder[index + 1], { historyMode: 'replace', moveFocus: false });
    });
    albumModal?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestAlbumModalClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...albumModal.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.hidden && element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    window.addEventListener('hashchange', syncAlbumModalFromHash);
    window.addEventListener('popstate', syncAlbumModalFromHash);
    window.setTimeout(syncAlbumModalFromHash, 0);
  }

  const pointerGlow = document.querySelector('.pointer-glow');
  if (pointerGlow && window.matchMedia('(pointer: fine)').matches) {
    let pointerFrame = null;
    let pointerX = 0;
    let pointerY = 0;
    const renderPointerGlow = () => {
      pointerGlow.style.left = `${pointerX}px`;
      pointerGlow.style.top = `${pointerY}px`;
      pointerFrame = null;
    };
    window.addEventListener('pointermove', (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (pointerFrame === null) pointerFrame = window.requestAnimationFrame(renderPointerGlow);
    }, { passive: true });
  }

  if (!reducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.magnetic-button').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * .13;
        const y = (event.clientY - rect.top - rect.height / 2) * .2;
        button.style.transform = `translate(${x}px, ${y}px)`;
      });
      button.addEventListener('pointerleave', () => {
        button.style.transform = '';
      });
    });
  }

  document.querySelectorAll('img').forEach((image) => {
    image.addEventListener('error', () => image.classList.add('is-missing'), { once: true });
  });

  const canvas = document.querySelector('#flover-canvas');
  const canvasWrap = document.querySelector('.flover-canvas-wrap');
  const plantButton = document.querySelector('[data-plant]');
  const lightCount = document.querySelector('[data-light-count]');
  const todayLightCount = document.querySelector('[data-today-light-count]');

  if (canvas && canvasWrap) {
    const context = canvas.getContext('2d');
    const colors = ['#c8ff2f', '#6fe9ff', '#b49bff', '#ffcb70', '#ffffff'];
    const storageKey = 'glow-with-9-lights';
    const lightsEndpoint = '/api/lights';
    let width = 0;
    let height = 0;
    let ratio = 1;
    let stars = [];
    let blooms = [];
    let count = 0;
    let todayCount = 0;
    let serverCount = null;
    let globalCountRequested = false;
    let frame = 0;
    let animationFrame = null;
    let resizeFrame = null;
    let canvasVisible = false;

    try {
      count = Number.parseInt(window.localStorage.getItem(storageKey) || '0', 10) || 0;
    } catch (_) {
      count = 0;
    }

    const updateCount = () => {
      if (lightCount) lightCount.textContent = String(count).padStart(3, '0');
      if (todayLightCount) todayLightCount.textContent = String(todayCount).padStart(3, '0');
    };
    updateCount();

    const readGlobalCount = async () => {
      if (globalCountRequested) return;
      globalCountRequested = true;
      try {
        const response = await fetch(lightsEndpoint, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('Unable to read the shared light count.');
        const data = await response.json();
        const globalCount = Number.parseInt(data.count, 10);
        if (!Number.isFinite(globalCount)) throw new Error('Invalid shared light count.');
        serverCount = globalCount;
        count = globalCount;
        todayCount = Number.parseInt(data.today, 10) || 0;
        updateCount();
      } catch (_) {
        globalCountRequested = false;
        // D1 바인딩 전에는 기존 기기별 카운트를 안전한 대체값으로 사용한다.
      }
    };

    const plantGlobalLight = async () => {
      try {
        const response = await fetch(lightsEndpoint, {
          method: 'POST',
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error('Unable to plant the shared light.');
        const data = await response.json();
        const globalCount = Number.parseInt(data.count, 10);
        if (Number.isFinite(globalCount)) {
          serverCount = Math.max(serverCount || 0, globalCount);
          count = serverCount;
          todayCount = Number.parseInt(data.today, 10) || 0;
          updateCount();
          window.localStorage.setItem(storageKey, String(count));
        }
      } catch (_) {
        // 네트워크 오류면 기존 로컬 카운트를 유지한다.
      }
    };

    const makeStars = () => {
      const total = Math.round(clamp((width * height) / (coarsePointer ? 30000 : 20000), coarsePointer ? 20 : 32, coarsePointer ? 48 : 82));
      stars = Array.from({ length: total }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.45 + .35,
        alpha: Math.random() * .56 + .15,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * .012 + .004,
        color: colors[index % colors.length]
      }));
      const remembered = Math.min(count, coarsePointer ? 12 : 18);
      for (let i = 0; i < remembered; i += 1) {
        blooms.push({
          x: width * (.08 + Math.random() * .84),
          y: height * (.1 + Math.random() * .8),
          age: 1,
          permanent: true,
          size: 6 + Math.random() * 7,
          color: colors[i % colors.length],
          rotation: Math.random() * Math.PI
        });
      }
    };

    const resizeCanvas = () => {
      const rect = canvasWrap.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      ratio = clamp(window.devicePixelRatio || 1, 1, coarsePointer ? 1 : 1.25);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      blooms = [];
      makeStars();
      if (reducedMotion) draw();
    };

    const drawClover = (bloom) => {
      const pulse = bloom.permanent ? 1 : Math.min(1, bloom.age / .35);
      const fade = bloom.permanent ? .35 : Math.max(0, 1 - Math.max(0, bloom.age - 1.7) / 1.3);
      const size = bloom.size * pulse;
      context.save();
      context.translate(bloom.x, bloom.y);
      context.rotate(bloom.rotation + bloom.age * .08);
      context.globalAlpha = fade;
      context.shadowBlur = 14;
      context.shadowColor = bloom.color;
      context.fillStyle = bloom.color;

      for (let i = 0; i < 4; i += 1) {
        context.save();
        context.rotate((Math.PI / 2) * i);
        context.beginPath();
        context.moveTo(0, 0);
        context.bezierCurveTo(size * .18, -size * .2, size * 1.1, -size * .78, size * 1.04, -size * .08);
        context.bezierCurveTo(size, size * .58, size * .26, size * .48, 0, 0);
        context.fill();
        context.restore();
      }
      context.beginPath();
      context.arc(0, 0, Math.max(1, size * .12), 0, Math.PI * 2);
      context.fillStyle = '#ffffff';
      context.fill();
      context.restore();
    };

    function draw() {
      context.clearRect(0, 0, width, height);
      stars.forEach((star) => {
        const twinkle = star.alpha + Math.sin(frame * star.speed + star.phase) * .18;
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.globalAlpha = clamp(twinkle, .06, .82);
        context.fillStyle = star.color;
        context.fill();
      });
      context.globalAlpha = 1;
      blooms.forEach(drawClover);
      blooms = blooms.filter((bloom) => bloom.permanent || bloom.age < 3);
      blooms.forEach((bloom) => {
        if (!bloom.permanent) bloom.age += .018;
      });
      frame += 1;
    }

    const shouldAnimate = () => !reducedMotion && canvasVisible && document.visibilityState === 'visible';
    const stopAnimation = () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    };
    let lastDrawTime = 0;
    const frameInterval = 1000 / (coarsePointer ? 24 : 30);
    const animate = (timestamp) => {
      if (timestamp - lastDrawTime >= frameInterval) {
        draw();
        lastDrawTime = timestamp;
      }
      animationFrame = shouldAnimate() ? window.requestAnimationFrame(animate) : null;
    };
    const startAnimation = () => {
      if (animationFrame === null && shouldAnimate()) animationFrame = window.requestAnimationFrame(animate);
    };
    const queueResize = () => {
      if (resizeFrame !== null) return;
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        resizeCanvas();
      });
    };

    const plant = (x, y) => {
      const baseColor = colors[count % colors.length];
      blooms.push({
        x: clamp(x, 30, width - 30),
        y: clamp(y, 30, height - 30),
        age: 0,
        permanent: false,
        size: 10 + Math.random() * 8,
        color: baseColor,
        rotation: Math.random() * Math.PI
      });
      for (let i = 0; i < 5; i += 1) {
        blooms.push({
          x: clamp(x + (Math.random() - .5) * 110, 20, width - 20),
          y: clamp(y + (Math.random() - .5) * 110, 20, height - 20),
          age: Math.random() * .18,
          permanent: false,
          size: 3 + Math.random() * 4,
          color: colors[(count + i + 1) % colors.length],
          rotation: Math.random() * Math.PI
        });
      }
      count += 1;
      todayCount += 1;
      try {
        window.localStorage.setItem(storageKey, String(count));
      } catch (_) {
        // 저장을 막은 브라우저에서도 인터랙션 자체는 계속 동작해.
      }
      updateCount();
      plantGlobalLight();
      if (reducedMotion) draw();
    };

    canvasWrap.addEventListener('pointerdown', (event) => {
      if (event.target.closest('[data-plant], a, button')) return;
      const rect = canvasWrap.getBoundingClientRect();
      plant(event.clientX - rect.left, event.clientY - rect.top);
    });
    plantButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      plant(width * (.28 + Math.random() * .44), height * (.24 + Math.random() * .5));
    });

    if ('ResizeObserver' in window) new ResizeObserver(queueResize).observe(canvasWrap);
    else window.addEventListener('resize', queueResize, { passive: true });
    resizeCanvas();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        canvasVisible = entries.some((entry) => entry.isIntersecting);
        if (canvasVisible) {
          readGlobalCount();
          if (reducedMotion) draw();
          else startAnimation();
        } else {
          stopAnimation();
        }
      }, { rootMargin: '160px 0px' }).observe(canvasWrap);
    } else {
      canvasVisible = true;
      if (reducedMotion) draw();
      else startAnimation();
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') startAnimation();
      else stopAnimation();
    });
  }
})();
