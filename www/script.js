/* VARIABLES */

// const playlistOnline = "channels.m3u";
const playlistOnline = "https://raw.githubusercontent.com/Shariar-Ahamed/online-tv-streaming-platform/main/channels.m3u";
const playlistLocal = "channels.m3u";

let channels = [];
let defaultChannels = [];
let customChannels = [];
let filteredChannels = [];
let currentChannel = null;
let currentCategory = "All";
let favorites = [];
try {
  const saved = localStorage.getItem("alpha_tv_favorites");
  if (saved) {
    favorites = JSON.parse(saved);
  }
} catch(e) {
  console.warn("Could not load favorites from localStorage:", e);
}
let searchKeyword = "";
let currentHls = null;
let hlsInitInterval = null;
let controlsTimeout;
let resolvedServers = [];
let activeServerIndex = 0;

/* ON INITIALIZATION */
document.addEventListener("DOMContentLoaded", () => {
  setupPlayerSync();
  setupControlAutohide();
  setupFullscreenChange();
  setupCategoryScrolling();
  loadPlaylist();
  setupLiveStats();
  setupOrientationExitFullscreen();
  setupExternalLinks();
  setupBackToTop();
  setupFooterFeatures();
  setupViewModeToggle();
  setupMobileAppBanner();
  checkForUpdates();
  checkDisclaimer();
  setupPictureInPicture();
  setupVolumeControl();
  setupKeyboardAdjustments();
  setupRemoteNavigation();
});

/* SETUP D-PAD REMOTE CONTROL NAVIGATION (FOR ANDROID TV) */
let activeFocusedEl = null;

function setupRemoteNavigation() {
  const FOCUSABLE_SELECTOR = '.channel, .category-pill, .control-btn, .quality-menu-item, #chatSendBtn, .chat-toggle-collapse-btn, #search';

  // Helper to check if a modal is currently open and return it
  function getActiveModal() {
    return document.querySelector('.custom-modal:not(.hidden), .settings-modal:not(.hidden)');
  }

  // Helper to get all focusable elements in the current context (either active modal or whole app)
  function getFocusableElements(activeModal) {
    if (activeModal) {
      // Find all buttons, links, inputs, and close buttons inside the active modal card
      return Array.from(activeModal.querySelectorAll('.custom-modal-close-btn, .custom-modal-btn, a, button, input, textarea, [tabindex="0"]')).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
      });
    }
    
    // Normal context: query the global selector
    return Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR)).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    });
  }

  function customScrollIntoView(el) {
    if (!el) return;
    
    // If it's part of the sticky search/category header or inside a modal, use standard scrollIntoView
    if (el.closest('.search-filter-sticky') || el.closest('.categories-wrapper') || el.closest('.custom-modal-card') || el.closest('.settings-modal-content')) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      return;
    }
    
    // Find the scrollable container
    const container = document.querySelector('.channels-section');
    if (!container) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      return;
    }
    
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    
    // Calculate the height of the sticky header
    const stickyHeader = document.querySelector('.search-filter-sticky');
    const stickyHeight = stickyHeader ? stickyHeader.offsetHeight : 150;
    
    // Spacing/buffer space
    const BUFFER = 15;
    
    // If the element's top is hidden under the sticky header
    if (elRect.top < containerRect.top + stickyHeight + BUFFER) {
      const scrollTopDiff = (containerRect.top + stickyHeight + BUFFER) - elRect.top;
      container.scrollBy({ top: -scrollTopDiff, behavior: 'smooth' });
    }
    // If the element's bottom is below the scrollable viewport boundary
    else if (elRect.bottom > containerRect.bottom - BUFFER) {
      const scrollBottomDiff = elRect.bottom - (containerRect.bottom - BUFFER);
      container.scrollBy({ top: scrollBottomDiff, behavior: 'smooth' });
    }
  }

  function getClosestElement(currentEl, focusableElements, direction) {
    if (focusableElements.length === 0) return null;
    
    const currentRect = currentEl.getBoundingClientRect();
    const currentCenterX = currentRect.left + currentRect.width / 2;
    const currentCenterY = currentRect.top + currentRect.height / 2;
    
    let closestEl = null;
    let minDistance = Infinity;
    
    for (const el of focusableElements) {
      if (el === currentEl) continue;
      
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const diffX = centerX - currentCenterX;
      const diffY = centerY - currentCenterY;
      
      let isValidDirection = false;
      if (direction === 'up' && diffY < -5 && Math.abs(diffX) < Math.abs(diffY) * 2.5) isValidDirection = true;
      if (direction === 'down' && diffY > 5 && Math.abs(diffX) < Math.abs(diffY) * 2.5) isValidDirection = true;
      if (direction === 'left' && diffX < -5 && Math.abs(diffY) < Math.abs(diffX) * 2.5) isValidDirection = true;
      if (direction === 'right' && diffX > 5 && Math.abs(diffY) < Math.abs(diffX) * 2.5) isValidDirection = true;
      
      if (isValidDirection) {
        // Weight the perpendicular axis to heavily prefer straight alignment
        const xWeight = (direction === 'up' || direction === 'down') ? 4.0 : 1.0;
        const yWeight = (direction === 'left' || direction === 'right') ? 4.0 : 1.0;
        
        const wX = diffX * xWeight;
        const wY = diffY * yWeight;
        const distance = Math.sqrt(wX * wX + wY * wY);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestEl = el;
        }
      }
    }
    
    // Fallback: If no closest element in that direction, but we are in a modal, cycle focus
    if (!closestEl && focusableElements.length > 1) {
      const activeModal = getActiveModal();
      if (activeModal) {
        const currentIndex = focusableElements.indexOf(currentEl);
        if (direction === 'down' || direction === 'right') {
          closestEl = focusableElements[(currentIndex + 1) % focusableElements.length];
        } else if (direction === 'up' || direction === 'left') {
          closestEl = focusableElements[(currentIndex - 1 + focusableElements.length) % focusableElements.length];
        }
      }
    }
    
    return closestEl;
  }

  window.addEventListener('keydown', (e) => {
    const qualityMenu = document.getElementById("qualityMenu");
    const isMenuOpen = qualityMenu && !qualityMenu.classList.contains("hidden");
    
    let direction = '';
    if (e.key === 'ArrowUp') direction = 'up';
    else if (e.key === 'ArrowDown') direction = 'down';
    else if (e.key === 'ArrowLeft') direction = 'left';
    else if (e.key === 'ArrowRight') direction = 'right';

    // 1. Intercept quality menu navigation if it is open
    if (isMenuOpen) {
      const items = Array.from(qualityMenu.querySelectorAll('.quality-menu-item'));
      
      // Close quality menu on back button press
      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'BrowserBack') {
        e.preventDefault();
        e.stopPropagation();
        qualityMenu.classList.add('hidden');
        if (activeFocusedEl) activeFocusedEl.classList.remove('remote-focused');
        activeFocusedEl = document.getElementById("qualityBtn");
        if (activeFocusedEl) activeFocusedEl.classList.add('remote-focused');
        return;
      }

      if (activeFocusedEl && activeFocusedEl.classList.contains('quality-menu-item')) {
        const currentIndex = items.indexOf(activeFocusedEl);
        
        if (direction === 'up') {
          if (currentIndex > 0) {
            activeFocusedEl.classList.remove('remote-focused');
            activeFocusedEl = items[currentIndex - 1];
            activeFocusedEl.classList.add('remote-focused');
          }
          e.preventDefault();
          return;
        } else if (direction === 'down') {
          activeFocusedEl.classList.remove('remote-focused');
          if (currentIndex < items.length - 1) {
            activeFocusedEl = items[currentIndex + 1];
            activeFocusedEl.classList.add('remote-focused');
          } else {
            qualityMenu.classList.add('hidden');
            activeFocusedEl = document.getElementById("qualityBtn");
            if (activeFocusedEl) activeFocusedEl.classList.add('remote-focused');
          }
          e.preventDefault();
          return;
        } else if (direction === 'left' || direction === 'right') {
          qualityMenu.classList.add('hidden');
          activeFocusedEl.classList.remove('remote-focused');
          activeFocusedEl = document.getElementById("qualityBtn");
          if (activeFocusedEl) activeFocusedEl.classList.add('remote-focused');
          e.preventDefault();
          return;
        }
      } else if (activeFocusedEl && activeFocusedEl.id === 'qualityBtn') {
        if (direction === 'up') {
          activeFocusedEl.classList.remove('remote-focused');
          activeFocusedEl = items[items.length - 1];
          activeFocusedEl.classList.add('remote-focused');
          e.preventDefault();
          return;
        } else if (direction === 'down') {
          activeFocusedEl.classList.remove('remote-focused');
          activeFocusedEl = items[0];
          activeFocusedEl.classList.add('remote-focused');
          e.preventDefault();
          return;
        }
      } else {
        // Quality menu is open but focus was lost or set by mouse.
        // Enter menu navigation only if the user presses directional keys.
        if (direction === 'up' || direction === 'down') {
          if (activeFocusedEl) {
            activeFocusedEl.classList.remove('remote-focused');
          }
          activeFocusedEl = (direction === 'up') ? items[items.length - 1] : items[0];
          activeFocusedEl.classList.add('remote-focused');
          e.preventDefault();
          return;
        } else if (direction === 'left' || direction === 'right') {
          qualityMenu.classList.add('hidden');
          if (activeFocusedEl) {
            activeFocusedEl.classList.remove('remote-focused');
          }
          activeFocusedEl = document.getElementById("qualityBtn");
          if (activeFocusedEl) activeFocusedEl.classList.add('remote-focused');
          e.preventDefault();
          return;
        }
      }
    }

    // 2. Intercept Back button (Escape/Backspace/BrowserBack) on TV to exit fullscreen if active
    if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'BrowserBack') {
      const isFullscreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement || 
                           document.msFullscreenElement;
      if (isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
        return;
      }
    }
    
    if (direction) {
      const activeModal = getActiveModal();
      const focusable = getFocusableElements(activeModal);
      
      // If modal is active, make sure activeFocusedEl is inside it
      const isCurrentInActiveModal = activeModal && activeFocusedEl && activeModal.contains(activeFocusedEl);
      
      // Find default focusable element if none focused or if current focused is outside active modal
      if (!activeFocusedEl || !document.body.contains(activeFocusedEl) || activeFocusedEl.offsetParent === null || (activeModal && !isCurrentInActiveModal)) {
        if (activeFocusedEl) {
          activeFocusedEl.classList.remove('remote-focused');
        }
        
        if (activeModal) {
          // Select the primary action button (usually has disclaimer-accept-btn or custom-modal-btn) or just first item
          const primaryBtn = activeModal.querySelector('.disclaimer-accept-btn, .custom-modal-btn, a, button');
          activeFocusedEl = primaryBtn || focusable[0];
        } else {
          const activeChannel = document.querySelector('.channel.active');
          const firstCat = document.querySelector('.category-pill.active');
          activeFocusedEl = activeChannel || firstCat || focusable[0];
        }
        
        if (activeFocusedEl) {
          activeFocusedEl.classList.add('remote-focused');
          customScrollIntoView(activeFocusedEl);
        }
        e.preventDefault();
        return;
      }
      
      const nextEl = getClosestElement(activeFocusedEl, focusable, direction);
      if (nextEl) {
        activeFocusedEl.classList.remove('remote-focused');
        activeFocusedEl = nextEl;
        activeFocusedEl.classList.add('remote-focused');
        
        // Native focus for input fields so they can type
        if (activeFocusedEl.tagName === 'INPUT' || activeFocusedEl.tagName === 'TEXTAREA') {
          activeFocusedEl.focus();
        } else {
          if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
          }
        }
        
        customScrollIntoView(activeFocusedEl);
      }
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (activeFocusedEl && document.body.contains(activeFocusedEl)) {
        const activeModal = getActiveModal();
        const isCurrentInActiveModal = activeModal && activeModal.contains(activeFocusedEl);
        
        // If modal is active and focused element is outside modal, don't allow click
        if (activeModal && !isCurrentInActiveModal) {
          e.preventDefault();
          return;
        }
        
        if (activeFocusedEl.tagName === 'INPUT' || activeFocusedEl.tagName === 'TEXTAREA') {
          return;
        }
        window.isRemoteClicking = true;
        activeFocusedEl.click();
        window.isRemoteClicking = false;
        e.preventDefault();
      }
    }
  });

  // Clear focus styling on click or touch event to prevent phone/web impact
  document.addEventListener('click', () => {
    if (window.isRemoteClicking) return;
    if (activeFocusedEl) {
      activeFocusedEl.classList.remove('remote-focused');
      activeFocusedEl = null;
    }
  }, true);

  document.addEventListener('touchstart', () => {
    if (activeFocusedEl) {
      activeFocusedEl.classList.remove('remote-focused');
      activeFocusedEl = null;
    }
  }, true);
}

/* DETECT NATIVE FULLSCREEN EXIT TO UNLOCK ORIENTATION & HANDLE BACK BUTTON */
function setupFullscreenChange() {
  const events = ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"];
  events.forEach(event => {
    document.addEventListener(event, () => {
      const isFullscreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement || 
                           document.msFullscreenElement;
      if (isFullscreen) {
        // Push state to history for back button handling if not already pushed
        if (!history.state || !history.state.fullscreen) {
          history.pushState({ fullscreen: true }, "");
        }
      } else {
        unlockOrientation();
        // If we exited manually (e.g. exit button), go back in history to clean up
        if (history.state && history.state.fullscreen) {
          history.back();
        }
      }
    });
  });

  // Listen to browser/hardware back button popstate
  window.addEventListener("popstate", (event) => {
    const isFullscreen = document.fullscreenElement || 
                         document.webkitFullscreenElement || 
                         document.mozFullScreenElement || 
                         document.msFullscreenElement;
    if (isFullscreen) {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  });
}

/* EXIT FULLSCREEN ON PORTRAIT ROTATION */
function setupOrientationExitFullscreen() {
  window.addEventListener("resize", () => {
    if (window.innerHeight > window.innerWidth) {
      const isFullscreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement || 
                           document.msFullscreenElement;
      if (isFullscreen) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    }
  });
}

/* OPEN EXTERNAL LINKS IN IN-APP BROWSER OVERLAY */
function setupExternalLinks() {
  document.addEventListener("click", (e) => {
    const anchor = e.target.closest("a.social-btn, a.developer-name");
    if (anchor) {
      const url = anchor.getAttribute("href");
      if (url && url.startsWith("http")) {
        e.preventDefault();
        openExternalUrl(url);
      }
    }
  });
}

function openExternalUrl(url) {
  const cap = window.Capacitor;
  if (cap && cap.Plugins && cap.Plugins.Browser) {
    cap.Plugins.Browser.open({ url: url })
      .catch(err => {
        console.error("Failed to open URL in browser plugin, falling back...", err);
        window.open(url, "_blank");
      });
  } else {
    window.open(url, "_blank");
  }
}

/* SYNC VIDEO STATE WITH PLAY/PAUSE BUTTON */
function setupPlayerSync() {
  const video = document.getElementById("video");
  const playPauseBtn = document.querySelector(".play-pause-btn");

  if (!video || !playPauseBtn) return;

  video.addEventListener("play", () => {
    playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    if (window.AndroidPiP) {
      window.AndroidPiP.setVideoPlaying(true);
    }
  });

  video.addEventListener("pause", () => {
    playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    if (window.AndroidPiP) {
      window.AndroidPiP.setVideoPlaying(false);
    }
  });
  
  video.addEventListener("ended", () => {
    if (window.AndroidPiP) {
      window.AndroidPiP.setVideoPlaying(false);
    }
    nextChannel();
  });
}

/* VOLUME & MUTE CONTROL LOGIC */
function setupVolumeControl() {
  const video = document.getElementById("video");
  if (!video) return;
  const isMutedSaved = localStorage.getItem("alpha_tv_muted") === "true";
  video.muted = isMutedSaved;
  updateVolumeButtonState(isMutedSaved);

  video.addEventListener("volumechange", () => {
    updateVolumeButtonState(video.muted);
    if (!video.muted) {
      hideUnmuteOverlay();
    }
  });
}

function toggleMute() {
  const video = document.getElementById("video");
  if (!video) return;
  video.muted = !video.muted;
  localStorage.setItem("alpha_tv_muted", video.muted);
  if (!video.muted) {
    hideUnmuteOverlay();
  }
}

function updateVolumeButtonState(isMuted) {
  const volumeBtn = document.getElementById("volumeBtn");
  if (!volumeBtn) return;
  const icon = volumeBtn.querySelector("i");
  if (icon) {
    if (isMuted) {
      icon.className = "fa-solid fa-volume-xmark";
      volumeBtn.title = "Unmute";
    } else {
      icon.className = "fa-solid fa-volume-high";
      volumeBtn.title = "Mute";
    }
  }
}

/* AUTOPLAY PLAYBACK ATTEMPT HANDLER WITH MUTED FALLBACK */
function handlePlayAttempt(video, loader) {
  if (!video) return;
  video.play().catch(err => {
    console.log("Autoplay blocked, retrying muted:", err);
    video.muted = true;
    updateVolumeButtonState(true);
    
    video.play().then(() => {
      console.log("Muted autoplay succeeded");
      showUnmuteOverlay();
    }).catch(err2 => {
      console.error("Autoplay failed even when muted:", err2);
      if (loader) {
        loader.querySelector("span").innerHTML = 'Stream paused. Click Play to watch!<br><span class="paused-play-icon" onclick="togglePlay()">▶</span>';
        const spinner = loader.querySelector(".spinner");
        if (spinner) spinner.classList.add("hidden");
      }
    });
  });
}

window.handleUnmuteOverlayClick = function(event) {
  if (event) event.stopPropagation();
  const video = document.getElementById("video");
  if (video) {
    video.muted = false;
    localStorage.setItem("alpha_tv_muted", "false");
    updateVolumeButtonState(false);
  }
  hideUnmuteOverlay();
};

function showUnmuteOverlay() {
  const overlay = document.getElementById("unmuteOverlay");
  if (overlay) {
    overlay.classList.remove("hidden");
    clearTimeout(window.unmuteOverlayTimeout);
    window.unmuteOverlayTimeout = setTimeout(() => {
      hideUnmuteOverlay();
    }, 7000);
  }
}

function hideUnmuteOverlay() {
  const overlay = document.getElementById("unmuteOverlay");
  if (overlay) {
    overlay.classList.add("hidden");
  }
}

/* AUTO-HIDE PLAYER CONTROLS */
function setupControlAutohide() {
  const playerWrapper = document.querySelector(".player-wrapper");
  const controls = document.getElementById("customControls");

  if (!playerWrapper || !controls) return;

  function showControls() {
    controls.classList.add("visible");
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      controls.classList.remove("visible");
    }, 5000); // 5 seconds
  }

  playerWrapper.addEventListener("mousemove", showControls);
  playerWrapper.addEventListener("click", showControls);
  playerWrapper.addEventListener("touchstart", showControls);
  window.addEventListener("keydown", showControls);
}

// Helper to check if URL is a direct stream URL
function isDirectStreamUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.toLowerCase();
    return pathname.endsWith(".m3u8") || 
           pathname.endsWith(".ts") || 
           pathname.endsWith(".mp4") || 
           pathname.endsWith(".mkv") || 
           pathname.endsWith(".mp3") ||
           pathname.includes(".m3u8") ||
           pathname.includes(".ts");
  } catch (e) {
    return false;
  }
}

// Helper to wrap a direct stream URL as a single-channel M3U playlist
function wrapStreamUrlAsM3u(url, customName) {
  let name = customName ? customName.trim() : "";
  if (!name) {
    name = "Custom Stream";
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p && !p.includes('.'));
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        name = decodeURIComponent(lastPart).replace(/[-_]/g, ' ');
      }
    } catch(e) {}
  }
  return `#EXTM3U\n#EXTINF:-1 tvg-name="${name}" group-title="Custom Channel",${name}\n${url}`;
}

// Merge default and custom channels, then refresh UI
function mergeAndRefreshChannels() {
  channels = [...defaultChannels, ...customChannels];
  renderCategories();
  filterAndSearch();
}

// Migrate old custom keys to the new list format
function migrateOldCustomPlaylist() {
  const oldUrl = localStorage.getItem("alpha_tv_custom_m3u_url");
  const oldData = localStorage.getItem("alpha_tv_custom_m3u_data");
  const oldSource = localStorage.getItem("alpha_tv_custom_m3u_source") || "file";
  const oldName = localStorage.getItem("alpha_tv_custom_m3u_name") || "";

  if (oldData && !localStorage.getItem("alpha_tv_custom_channels_list")) {
    console.log("Migrating old custom playlist to new flat list format...");
    const parsed = parseM3U(oldData);
    if (parsed.length > 0) {
      const categoryName = oldSource === "url" ? "Custom URL" : "Custom File";
      const migrated = parsed.map((ch, index) => ({
        id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
        name: parsed.length === 1 && oldName ? oldName : ch.name,
        url: ch.url,
        logo: ch.logo || "",
        categories: [categoryName]
      }));
      localStorage.setItem("alpha_tv_custom_channels_list", JSON.stringify(migrated));
    }
    // Clean up old keys
    localStorage.removeItem("alpha_tv_custom_m3u_url");
    localStorage.removeItem("alpha_tv_custom_m3u_data");
    localStorage.removeItem("alpha_tv_custom_m3u_source");
    localStorage.removeItem("alpha_tv_custom_m3u_name");
  }
}

// Load custom channels from localStorage (URL or File flat list)
function loadCustomChannels() {
  // First run migration if needed
  migrateOldCustomPlaylist();

  const customDataStr = localStorage.getItem("alpha_tv_custom_channels_list");
  if (customDataStr) {
    try {
      const parsed = JSON.parse(customDataStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log("Loaded custom channels list from localStorage, count:", parsed.length);
        customChannels = parsed;
        return;
      }
    } catch(e) {
      console.error("Failed to parse custom channels list from localStorage:", e);
    }
  }
  customChannels = [];
}

// Delete a specific custom channel from the list
window.deleteCustomChannel = function(event, id) {
  if (event) event.stopPropagation(); // Stop playing the channel on click

  let currentCustom = [];
  const saved = localStorage.getItem("alpha_tv_custom_channels_list");
  if (saved) {
    try {
      currentCustom = JSON.parse(saved);
      if (!Array.isArray(currentCustom)) currentCustom = [];
    } catch(e) {
      currentCustom = [];
    }
  }

  // Filter out the channel to delete
  const updated = currentCustom.filter(ch => ch.id !== id);
  localStorage.setItem("alpha_tv_custom_channels_list", JSON.stringify(updated));

  // Update in memory and refresh UI
  customChannels = updated;
  
  // If the currently playing channel is the one we deleted, reset active channel
  if (currentChannel && currentChannel.id === id) {
    currentChannel = null;
  }

  mergeAndRefreshChannels();
  
  // Update Settings Modal Badge if open
  updateSettingsStatusBadge();
};

// Helper to verify if the file is a channel playlist vs HLS media stream playlist
function isChannelPlaylist(m3uText) {
  if (!m3uText) return false;
  // If it contains HLS segments or stream configurations, it's not a channels playlist
  if (m3uText.includes("#EXT-X-TARGETDURATION") || 
      m3uText.includes("#EXT-X-MEDIA-SEQUENCE") || 
      m3uText.includes("#EXT-X-STREAM-INF") || 
      m3uText.includes("#EXT-X-I-FRAME-STREAM-INF")) {
    return false;
  }
  return m3uText.includes("#EXTINF");
}

/* PARSE M3U PLAYLIST DATA */
function parseM3U(data) {
  const lines = data.split("\n");
  const parsedChannels = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("#EXTINF")) {
      const info = line;

      // Find the next non-empty line that doesn't start with '#'
      let url = "";
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine && !nextLine.startsWith("#")) {
          url = nextLine;
          break;
        }
      }

      if (!url) continue;

      // Extract name (part after the last comma)
      const nameParts = info.split(",");
      const name = nameParts[nameParts.length - 1].trim() || "Unknown Channel";

      let logo = "";
      const logoMatch = info.match(/tvg-logo="([^"]*)"/);
      if (logoMatch) {
        logo = logoMatch[1].trim();
      }

      let categories = ["Other"];
      const groupMatch = info.match(/group-title="([^"]*)"/);
      if (groupMatch) {
        categories = groupMatch[1].split(",").map(c => c.trim()).filter(Boolean);
        if (categories.length === 0) {
          categories = ["Other"];
        }
      }

      parsedChannels.push({
        name,
        url,
        logo,
        categories
      });
    }
  }
  return parsedChannels;
}

/* LOAD M3U PLAYLIST (Instant local load, background online update, supports custom) */
function loadPlaylist() {
  const loader = document.getElementById("playerLoader");
  if (!loader) return;
  loader.classList.remove("hidden");
  loader.querySelector("span").innerText = "Loading playlist...";

  // Always load default playlist first from local
  fetch(playlistLocal)
    .then(response => {
      if (!response.ok) throw new Error("Local playlist response error");
      return response.text();
    })
    .then(localData => {
      const parsedLocal = parseM3U(localData);
      if (parsedLocal.length > 0) {
        defaultChannels = parsedLocal;
      }
      finishLoadingPlaylist();
    })
    .catch(err => {
      console.warn("Failed to load local playlist, fetching online directly:", err);
      fetch(`${playlistOnline}?t=${new Date().getTime()}`)
        .then(response => {
          if (!response.ok) throw new Error("Online playlist error");
          return response.text();
        })
        .then(onlineData => {
          const parsedOnline = parseM3U(onlineData);
          if (parsedOnline.length > 0) {
            defaultChannels = parsedOnline;
          }
          finishLoadingPlaylist();
        })
        .catch(finalErr => {
          console.error("Failed to load default playlist entirely", finalErr);
          // Try loading custom channels anyway even if default failed
          loadCustomChannels();
          mergeAndRefreshChannels();
          if (channels.length > 0) {
            if (loader) loader.classList.add("hidden");
            playDefaultOrFirstChannel();
          } else {
            if (loader) loader.querySelector("span").innerText = "Failed to load playlist ⚠️";
          }
        });
    });
}

function finishLoadingPlaylist() {
  const loader = document.getElementById("playerLoader");
  loadCustomChannels();
  mergeAndRefreshChannels();
  if (loader) loader.classList.add("hidden");
  
  // Check if we need to auto-select a newly added category
  const autoSelectCat = localStorage.getItem("alpha_tv_auto_select_category");
  if (autoSelectCat) {
    localStorage.removeItem("alpha_tv_auto_select_category");
    filterCategory(autoSelectCat);
    
    // Play the first channel in this custom category if available
    if (filteredChannels.length > 0) {
      playChannel(0);
    }
  } else {
    playDefaultOrFirstChannel();
  }
  
  // Background updates for default channels
  fetchOnlinePlaylistInBackground();
}

/* HELPER TO PLAY DEFAULT CHANNEL OR FIRST AVAILABLE */
function playDefaultOrFirstChannel() {
  if (filteredChannels.length > 0) {
    const options = ["tooffee", "channel i"];
    const shuffled = options.sort(() => Math.random() - 0.5);
    
    let defaultIndex = -1;
    for (const keyword of shuffled) {
      defaultIndex = filteredChannels.findIndex(c => c.name.toLowerCase().includes(keyword));
      if (defaultIndex !== -1) break;
    }
    
    playChannel(defaultIndex !== -1 ? defaultIndex : 0);
  }
}

/* FETCH REMOTE PLAYLIST IN BACKGROUND AND SILENTLY UPDATE UI */
function fetchOnlinePlaylistInBackground() {
  fetch(`${playlistOnline}?t=${new Date().getTime()}`)
    .then(response => {
      if (!response.ok) throw new Error("Background online playlist fetch failed");
      return response.text();
    })
    .then(onlineData => {
      const parsedOnline = parseM3U(onlineData);
      if (parsedOnline.length === 0) return;

      const isDifferent = defaultChannels.length !== parsedOnline.length ||
                          defaultChannels.some((c, idx) => !parsedOnline[idx] || c.url !== parsedOnline[idx].url || c.name !== parsedOnline[idx].name);

      if (isDifferent) {
        console.log("Online playlist updates detected. Updating default channels list in background.");
        defaultChannels = parsedOnline;
        mergeAndRefreshChannels();
      } else {
        console.log("Background check complete. Default playlist is up-to-date.");
      }
    })
    .catch(err => {
      console.warn("Background online playlist fetch failed:", err);
    });
}

/* RENDER CATEGORY FILTER PILLS */
function renderCategories() {
  const container = document.getElementById("categoryList");
  
  // Extract unique categories and count channels in each
  const categoryCounts = {};
  channels.forEach(ch => {
    if (ch.categories) {
      ch.categories.forEach(cat => {
        if (cat) {
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
      });
    }
  });

  const allCount = channels.length;
  container.innerHTML = `
    <button class="category-pill" data-category="Favorites" onclick="filterCategory('Favorites', this)">
      <i class="fa-solid fa-star" style="color: #ffcc00; font-size: 10px; margin-right: 4px;"></i> Favorites <span class="category-count" id="favoritesCategoryCount">${favorites.length}</span>
    </button>
    <button class="category-pill active" data-category="All" onclick="filterCategory('All', this)">All Channels <span class="category-count">${allCount}</span></button>
  `;

  const categories = Object.keys(categoryCounts);

  // Sort categories by user defined custom order
  categories.sort((a, b) => {
    const customOrder = [
      "custom url",
      "custom file",
      "fifa 2026",
      "sports",
      "bangla",
      "news",
      "kids",
      "indian bangla",
      "entertainment",
      "movies",
      "english",
      "religious",
      "hindi",
      "infotainment",
      "musics",
      "drama",
      "weather",
      "other"
    ];
    const aIndex = customOrder.indexOf(a.toLowerCase().trim());
    const bIndex = customOrder.indexOf(b.toLowerCase().trim());
    
    const aVal = aIndex !== -1 ? aIndex : 999;
    const bVal = bIndex !== -1 ? bIndex : 999;
    
    if (aVal !== bVal) {
      return aVal - bVal;
    }
    return a.localeCompare(b);
  });

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "category-pill";
    btn.innerHTML = `${cat} <span class="category-count">${categoryCounts[cat]}</span>`;
    btn.dataset.category = cat;
    btn.onclick = () => filterCategory(cat, btn);
    container.appendChild(btn);
  });

  // Trigger scroll button state update after loading elements
  const categoriesContainer = document.getElementById("categoriesContainer");
  if (categoriesContainer) {
    categoriesContainer.dispatchEvent(new Event("scroll"));
  }
}

function updateFavoritesCount() {
  const countSpan = document.getElementById("favoritesCategoryCount");
  if (countSpan) {
    countSpan.innerText = favorites.length;
  }
}

/* FILTER BY CATEGORY */
function filterCategory(category, buttonEl) {
  currentCategory = category;

  document.querySelectorAll(".category-pill").forEach(pill => {
    pill.classList.remove("active");
  });

  if (buttonEl) {
    buttonEl.classList.add("active");
    buttonEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  } else {
    const target = document.querySelector(`.category-pill[data-category="${category}"]`);
    if (target) {
      target.classList.add("active");
      target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }

  filterAndSearch();
}

/* FILTER AND SEARCH CHANNELS */
function filterAndSearch() {
  filteredChannels = channels.filter(ch => {
    let matchesCategory = false;
    if (currentCategory === "All") {
      matchesCategory = true;
    } else if (currentCategory === "Favorites") {
      matchesCategory = favorites.includes(ch.url);
    } else {
      matchesCategory = ch.categories && ch.categories.includes(currentCategory);
    }
    const matchesSearch = ch.name.toLowerCase().includes(searchKeyword);
    return matchesCategory && matchesSearch;
  });

  renderChannels();

  const noResults = document.getElementById("noResults");
  if (filteredChannels.length === 0) {
    if (currentCategory === "Favorites") {
      noResults.innerHTML = `
        <span class="empty-icon" style="color: #ffcc00; font-size: 2.2rem; filter: drop-shadow(0 0 10px rgba(255, 204, 0, 0.45)); animation: starPulse 0.3s ease-in-out;"><i class="fa-regular fa-star"></i></span>
        <p>No favorite channels added yet. Click the star icon on any channel card to add it here.</p>
      `;
    } else {
      noResults.innerHTML = `
        <span>📺</span>
        <p>No channels found matching your search</p>
      `;
    }
    noResults.classList.remove("hidden");
  } else {
    noResults.classList.add("hidden");
  }
}

/* RENDER CHANNELS IN GRID */
function renderChannels() {
  const grid = document.getElementById("channelGrid");
  grid.innerHTML = "";

  filteredChannels.forEach((ch, index) => {
    const div = document.createElement("div");
    const isActive = currentChannel && currentChannel.url === ch.url;
    div.className = `channel ${isActive ? "active" : ""}`;
    div.dataset.index = index;

    const fallbackGradient = getFallbackGradient(ch.name);
    const initials = getInitials(ch.name);
    const isFav = favorites.includes(ch.url);

    div.innerHTML = `
      <button class="fav-btn ${isFav ? "is-favorite" : ""}" onclick="toggleFavorite(event, '${ch.url}')">
        <i class="fa-${isFav ? "solid" : "regular"} fa-star"></i>
      </button>
      ${ch.id && ch.id.startsWith("cust-") ? `
        <button class="delete-custom-btn" onclick="deleteCustomChannel(event, '${ch.id}')" title="Remove Channel">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      ` : ""}
      <div class="channel-card-fallback" style="display: ${ch.logo ? "none" : "flex"}">
        <div class="channel-card-fallback-avatar" style="background: ${fallbackGradient}">${initials}</div>
        <div class="channel-card-fallback-name">${ch.name}</div>
      </div>
      ${ch.logo ? `
        <div class="channel-logo-wrapper">
          <img src="${ch.logo}" alt="${ch.name}" loading="lazy" onerror="handleCardLogoError(this, '${ch.name}')">
        </div>
        <span class="channel-card-name">${ch.name}</span>
      ` : ""}
    `;

    div.onclick = () => playChannel(index);
    grid.appendChild(div);
  });
}

function toggleFavorite(event, url) {
  event.stopPropagation(); // Prevent playing channel on bookmark tap
  
  const index = favorites.indexOf(url);
  if (index === -1) {
    favorites.push(url);
  } else {
    favorites.splice(index, 1);
  }
  
  localStorage.setItem("alpha_tv_favorites", JSON.stringify(favorites));
  updateFavoritesCount();
  filterAndSearch();
}

/* SHOW BROWSER-ONLY HTTP INSECURE CONTENT WARNING MODAL */
function showHttpWarning() {
  // Hide loading overlays
  const loader = document.getElementById("playerLoader");
  if (loader) loader.classList.add("hidden");

  // Open warning modal
  const modal = document.getElementById("warningModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // Disable body scroll
  }
}

/* CLOSE WARNING MODAL */
function closeWarningModal() {
  const modal = document.getElementById("warningModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = ""; // Restore body scroll
  }
}

/* SHOW APP REQUIRED MODAL */
function showAppRequiredModal() {
  const modal = document.getElementById("appRequiredModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // Disable body scroll
  }
}

/* CLOSE APP REQUIRED MODAL */
function closeAppRequiredModal() {
  const modal = document.getElementById("appRequiredModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = ""; // Restore body scroll
  }
}

/* RESET PLAYER LOADER TO NORMAL BUFFERING STATE */
function resetPlayerLoader() {
  const loader = document.getElementById("playerLoader");
  const spinner = loader.querySelector(".spinner");
  const span = loader.querySelector("span");

  if (spinner) spinner.classList.remove("hidden");
  if (span) {
    span.classList.remove("hidden");
    span.innerText = "Buffering stream...";
  }
}

/* EXTRACT SERVERS FROM M3U OR HTML CONTENT */
function extractServersFromM3uOrHtml(text) {
  const servers = [];
  
  // 1. Try matching HTML button formats: onclick="changeServer('https://...')"
  const buttonRegex = /onclick="changeServer\('([^']+)'\)"[^>]*>\s*([^<]+)\s*<\/button>/g;
  let match;
  while ((match = buttonRegex.exec(text)) !== null) {
    let name = match[2].replace(/\s+/g, ' ').trim();
    let url = match[1].trim();
    if (url.startsWith('//')) {
      url = 'https:' + url;
    }
    servers.push({ name, url });
  }

  // 2. Try parsing as standard M3U if no HTML buttons matched
  if (servers.length === 0) {
    const trimmed = text.trim();
    // If the response is HTML (starts with < or contains <html), do not parse as M3U
    if (trimmed.startsWith('<') || trimmed.toLowerCase().includes('<html')) {
      return [];
    }

    const lines = text.split('\n');
    let currentName = '';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#EXTINF')) {
        const parts = line.split(',');
        currentName = parts[parts.length - 1].trim() || `Server ${servers.length + 1}`;
      } else if (line && !line.startsWith('#')) {
        let url = line;
        // Ignore lines containing HTML tags to prevent parsing invalid URLs
        if (url.includes('<') || url.includes('>')) {
          continue;
        }
        if (url.startsWith('//')) {
          url = 'https:' + url;
        }
        servers.push({
          name: currentName || `Server ${servers.length + 1}`,
          url: url
        });
        currentName = '';
      }
    }
  }

  return servers;
}

const proxies = [
  (url) => `https://toffee-proxy.shahriar-diu64.workers.dev/${url}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => url // Direct fetch as final resort
];

function tryProxy(url, index, callback, errorCallback) {
  if (index >= proxies.length) {
    errorCallback(new Error("All CORS proxies failed"));
    return;
  }

  const fetchUrl = proxies[index](url);
  console.log(`Attempting to fetch with proxy index ${index}: ${fetchUrl}`);

  fetch(fetchUrl)
    .then(response => {
      if (!response.ok) throw new Error(`Proxy returned status ${response.status}`);
      return response.text();
    })
    .then(text => {
      const servers = extractServersFromM3uOrHtml(text);
      if (servers.length > 0) {
        callback(servers);
      } else {
        throw new Error("No servers parsed from proxy response");
      }
    })
    .catch(err => {
      console.warn(`Proxy index ${index} failed:`, err);
      tryProxy(url, index + 1, callback, errorCallback);
    });
}

function fetchDirect(url, callback, errorCallback) {
  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`Direct fetch failed: ${response.status}`);
      return response.text();
    })
    .then(text => {
      const servers = extractServersFromM3uOrHtml(text);
      if (servers.length > 0) {
        callback(servers);
      } else {
        errorCallback(new Error("No servers parsed from direct fetch"));
      }
    })
    .catch(err => {
      errorCallback(err);
    });
}

/* FETCH MULTI-SERVERS DATA USING CORS PROXIES OR NATIVE CAPACITOR HTTP */
function fetchMultiServers(url, callback, errorCallback) {
  const cap = window.Capacitor;
  
  // 1. If running in Capacitor (Mobile App) and CapacitorHttp is available, use native fetch (bypasses CORS completely)
  if (cap && cap.Plugins && cap.Plugins.CapacitorHttp) {
    console.log("Using Capacitor native HTTP to fetch streams...");
    cap.Plugins.CapacitorHttp.get({
      url: url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    .then(response => {
      let text = response.data;
      if (typeof text !== 'string') {
        text = JSON.stringify(text);
      }
      const servers = extractServersFromM3uOrHtml(text);
      if (servers.length > 0) {
        callback(servers);
      } else {
        errorCallback(new Error("No servers parsed from CapacitorHttp response"));
      }
    })
    .catch(err => {
      console.warn("Capacitor native HTTP failed, falling back to proxy...", err);
      tryProxy(url, 0, callback, errorCallback);
    });
    return;
  }

  // 2. Otherwise, use CORS proxy chain (Web Browser / Fallback)
  tryProxy(url, 0, callback, errorCallback);
}

/* CLEAN SERVER NAME FOR UI DISPLAY */
function cleanServerName(name, index) {
  if (!name) return `Server ${index + 1}`;
  
  // Extract "Server X" or "Server X (Backup)" -> "Server X"
  const match = name.match(/Server\s*(\d+)/i);
  if (match) {
    return `Server ${match[1]}`;
  }
  return name;
}

/* RENDER SERVER SELECTOR BUTTONS IN UI */
function renderServerSelector() {
  const container = document.getElementById("serverSelectorContainer");
  const grid = document.getElementById("serverButtonsGrid");
  if (!container || !grid) return;

  const isBrowser = !window.Capacitor;
  grid.innerHTML = "";
  resolvedServers.forEach((server, index) => {
    const btn = document.createElement("button");
    btn.className = `server-btn ${index === activeServerIndex ? "active" : ""}`;
    
    // Clean server name for display (e.g. Server 2 (Backup) -> Server 2)
    const cleanedName = cleanServerName(server.name, index);
    
    // Check if this server is locked (either explicitly locked or has no valid stream URL)
    const isLocked = isBrowser && (server.isLocked || !server.url);
    
    if (isLocked) {
      btn.innerHTML = `<i class="fa-solid fa-lock"></i> ${cleanedName} <span class="app-tag">App Only</span>`;
      btn.classList.add("locked-server");
    } else {
      btn.innerHTML = `<i class="fa-solid fa-server"></i> ${cleanedName}`;
    }
    
    btn.onclick = () => playServer(index);
    grid.appendChild(btn);
  });

  container.classList.remove("hidden");
}

/* PLAY SELECTED MULTI-SERVER STREAM */
function playServer(serverIndex) {
  hideUnmuteOverlay();
  if (serverIndex < 0 || serverIndex >= resolvedServers.length) return;
  
  const server = resolvedServers[serverIndex];
  const isBrowser = !window.Capacitor;
  
  // Show app required modal if server is locked in browser
  const isLocked = isBrowser && (server.isLocked || !server.url);
  if (isLocked) {
    showAppRequiredModal();
    return;
  }

  activeServerIndex = serverIndex;

  // Highlight active selector button
  document.querySelectorAll(".server-btn").forEach((btn, idx) => {
    if (idx === serverIndex) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  const video = document.getElementById("video");
  const loader = document.getElementById("playerLoader");
  let serverUrl = resolvedServers[serverIndex].url;

  // Route Server 1 through Cloudflare Worker proxy in browser to bypass CORS/Referer checks
  const isServer1 = server.name && (server.name.toLowerCase().includes("server 1") || server.name.includes("১"));
  if (isBrowser && isServer1 && serverUrl) {
    serverUrl = `https://toffee-proxy.shahriar-diu64.workers.dev/${serverUrl}`;
  }

  // Reset loader & error state
  resetPlayerLoader();
  video.onerror = null;
  loader.classList.remove("hidden");

  // Destroy existing HLS instance
  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }

  initializeQualitySelector(null);

  if (typeof Hls !== "undefined" && Hls.isSupported()) {
    currentHls = new Hls({
      maxMaxBufferLength: 10,
      enableWorker: true
    });
    currentHls.loadSource(serverUrl);
    currentHls.attachMedia(video);
    initializeQualitySelector(currentHls);

    currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
      handlePlayAttempt(video, loader);
    });

    currentHls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        console.warn("HLS fatal error on server:", data);
        loader.querySelector("span").innerText = "Re-connecting stream...";
        const spinner = loader.querySelector(".spinner");
        if (spinner) spinner.classList.remove("hidden");
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            currentHls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            currentHls.recoverMediaError();
            break;
          default:
            loader.querySelector("span").innerText = "Stream unavailable ⚠️";
            break;
        }
      }
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = serverUrl;
    video.onerror = () => {
      loader.querySelector("span").innerText = "Stream unavailable ⚠️";
      const spinner = loader.querySelector(".spinner");
      if (spinner) spinner.classList.add("hidden");
    };

    video.addEventListener("loadedmetadata", () => {
      handlePlayAttempt(video, loader);
    });
  }

  // Hook playing events to handle loaders
  video.onplaying = () => {
    loader.classList.add("hidden");
    resetPlayerLoader();
  };

  video.onwaiting = () => {
    resetPlayerLoader();
    loader.querySelector("span").innerText = "Buffering stream...";
    loader.classList.remove("hidden");
  };

  // Update active style in list for main channel
  const mainChannelIndex = filteredChannels.findIndex(c => c.url === currentChannel.url);
  document.querySelectorAll(".channel").forEach((el) => {
    if (parseInt(el.dataset.index) === mainChannelIndex) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });

  updateCurrentInfoCard(currentChannel);
}

/* PLAY CHANNEL STREAM */
function playChannel(index) {
  hideUnmuteOverlay();
  if (index < 0 || index >= filteredChannels.length) return;

  // Clear any pending HLS loading intervals
  if (hlsInitInterval) {
    clearInterval(hlsInitInterval);
    hlsInitInterval = null;
  }

  const video = document.getElementById("video");
  const loader = document.getElementById("playerLoader");
  const channel = filteredChannels[index];
  currentChannel = channel;

  // Initialize chat room for this channel
  if (typeof initChatForChannel === "function") {
    initChatForChannel(channel);
  }

  // Reset loader & error state
  resetPlayerLoader();
  video.onerror = null;

  // Show loader overlay
  loader.classList.remove("hidden");

  // Destroy existing HLS instance
  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }

  // --- INTERCEPT MULTI-SERVER CHANNELS ---
  if (channel.url === "https://fifalive.click/play") {
    loader.querySelector("span").innerText = "Fetching live server links...";
    const requestedChannel = channel;
    fetchMultiServers(channel.url, (servers) => {
      if (currentChannel !== requestedChannel) return;
      
      const isBrowser = !window.Capacitor;
      
      // Inject isLocked flag for Server 1 if in browser and it has no URL
      resolvedServers = servers.map(s => {
        if (isBrowser && (!s.url || s.isLocked)) {
          return { ...s, isLocked: true };
        }
        return s;
      });
      
      renderServerSelector();
      
      if (isBrowser) {
        // In browser, auto-play first non-locked server (Server 2/index 1)
        const firstWorkingIndex = resolvedServers.findIndex(s => !s.isLocked);
        playServer(firstWorkingIndex >= 0 ? firstWorkingIndex : 0);
      } else {
        // In mobile app, play Server 1 (index 0) directly
        playServer(0);
      }
    }, (err) => {
      if (currentChannel !== requestedChannel) return;
      console.warn("Failed to load live servers via proxy, falling back to static backup servers:", err);
      
      const isBrowser = !window.Capacitor;
      
      // Fallback: manually include Server 1 (locked) followed by others
      resolvedServers = [
        { name: "Server 1", url: "", isLocked: true },
        { name: "Server 2", url: "https://1nyaler.streamhostingcdn.top/stream/89/index.m3u8" },
        { name: "Server 3", url: "https://ua.online24.pm/play/1101/350B326FB34F4B8/video.m3u8" },
        { name: "Server 4", url: "https://live.thebosstv.com:30443/dwlive/Somoy-TV/playlist.m3u8" }
      ];
      
      renderServerSelector();
      
      if (isBrowser) {
        playServer(1); // Play Server 2 (index 1) by default in browser
      } else {
        playServer(0); // On mobile, default to index 0 (Server 1)
      }
    });
    return;
  }

  // Hide server selector if playing a standard single-stream channel
  const serverContainer = document.getElementById("serverSelectorContainer");
  if (serverContainer) {
    serverContainer.classList.add("hidden");
  }
  resolvedServers = [];
  activeServerIndex = 0;

  initializeQualitySelector(null);

  if (typeof Hls !== "undefined" && Hls.isSupported()) {
    currentHls = new Hls({
      maxMaxBufferLength: 10,
      enableWorker: true
    });
    currentHls.loadSource(channel.url);
    currentHls.attachMedia(video);
    initializeQualitySelector(currentHls);

    currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
      handlePlayAttempt(video, loader);
    });

    currentHls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        console.warn("HLS fatal error, recovering...", data);

        // Check if browser-only HTTP stream mixed content block
        const isHttpsPage = window.location.protocol === 'https:';
        const isHttpStream = channel.url.startsWith('http://');
        const isBrowser = !window.Capacitor;

        if (isBrowser && isHttpsPage && isHttpStream && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          showHttpWarning();
          return;
        }

        loader.querySelector("span").innerText = "Re-connecting stream...";
        const spinner = loader.querySelector(".spinner");
        if (spinner) spinner.classList.remove("hidden");
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            currentHls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            currentHls.recoverMediaError();
            break;
          default:
            loader.querySelector("span").innerText = "Stream unavailable ⚠️";
            break;
        }
      }
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = channel.url;

    // Listen to native errors for Safari mixed-content blocks
    video.onerror = () => {
      const isHttpsPage = window.location.protocol === 'https:';
      const isHttpStream = channel.url.startsWith('http://');
      const isBrowser = !window.Capacitor;

      if (isBrowser && isHttpsPage && isHttpStream) {
        showHttpWarning();
      } else {
        loader.querySelector("span").innerText = "Stream unavailable ⚠️";
        const spinner = loader.querySelector(".spinner");
        if (spinner) spinner.classList.add("hidden");
      }
    };

    video.addEventListener("loadedmetadata", () => {
      handlePlayAttempt(video, loader);
    });
  } else {
    // If HLS library is not loaded yet, wait and retry
    if (typeof Hls === "undefined") {
      loader.querySelector("span").innerText = "Initializing player...";
      hlsInitInterval = setInterval(() => {
        if (typeof Hls !== "undefined") {
          clearInterval(hlsInitInterval);
          hlsInitInterval = null;
          playChannel(index);
        }
      }, 100);
      return;
    }
    loader.querySelector("span").innerText = "HLS stream format not supported";
    return;
  }

  // Hook playing events to handle loaders
  video.onplaying = () => {
    loader.classList.add("hidden");
    resetPlayerLoader();
  };

  video.onwaiting = () => {
    resetPlayerLoader();
    loader.querySelector("span").innerText = "Buffering stream...";
    loader.classList.remove("hidden");
  };

  // Update active style in list
  document.querySelectorAll(".channel").forEach((el, idx) => {
    if (parseInt(el.dataset.index) === index) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });

  updateCurrentInfoCard(channel);
}

/* UPDATE PLAYER DETAILS INFO CARD */
function updateCurrentInfoCard(channel) {
  const title = document.getElementById("currentChannelTitle");
  const category = document.getElementById("currentChannelCategory");
  const logo = document.getElementById("currentChannelLogo");
  const fallback = document.getElementById("currentChannelFallback");

  title.innerText = channel.name;
  category.innerText = channel.categories ? channel.categories.join(", ") : "";

  if (channel.logo) {
    logo.src = channel.logo;
    logo.classList.remove("hidden");
    fallback.classList.add("hidden");
  } else {
    logo.classList.add("hidden");
    fallback.innerText = getInitials(channel.name);
    fallback.style.background = getFallbackGradient(channel.name);
    fallback.classList.remove("hidden");
  }
}

/* PLAY NEXT CHANNEL IN ACTIVE LIST */
function nextChannel() {
  if (filteredChannels.length === 0) return;

  let index = filteredChannels.findIndex(ch => currentChannel && ch.url === currentChannel.url);
  index++;
  if (index >= filteredChannels.length) {
    index = 0;
  }
  playChannel(index);
}

/* PLAY PREVIOUS CHANNEL IN ACTIVE LIST */
function prevChannel() {
  if (filteredChannels.length === 0) return;

  let index = filteredChannels.findIndex(ch => currentChannel && ch.url === currentChannel.url);
  index--;
  if (index < 0) {
    index = filteredChannels.length - 1;
  }
  playChannel(index);
}

/* PLAY / PAUSE TOGGLE */
function togglePlay() {
  const video = document.getElementById("video");
  if (video.paused) {
    video.play();
  } else {
    video.pause();
  }
}

/* SEARCH HANDLERS */
function searchChannels() {
  const input = document.getElementById("search");
  searchKeyword = input.value.toLowerCase();

  const clearBtn = document.getElementById("clearSearch");
  if (searchKeyword.length > 0) {
    clearBtn.style.display = "flex";
  } else {
    clearBtn.style.display = "none";
  }

  filterAndSearch();
}

function clearSearchInput() {
  const input = document.getElementById("search");
  input.value = "";
  searchKeyword = "";
  document.getElementById("clearSearch").style.display = "none";
  filterAndSearch();
}

/* ERROR HANDLERS FOR LOGOS */
function handleCardLogoError(img, name) {
  const fallbackHtml = `
    <div class="channel-card-fallback" style="display: flex">
      <div class="channel-card-fallback-avatar" style="background: ${getFallbackGradient(name)}">${getInitials(name)}</div>
      <div class="channel-card-fallback-name">${name}</div>
    </div>
  `;
  const parent = img.parentElement;
  if (parent) {
    parent.innerHTML = fallbackHtml;
  }
}

function handleCurrentLogoError() {
  const logo = document.getElementById("currentChannelLogo");
  const fallback = document.getElementById("currentChannelFallback");
  if (currentChannel) {
    logo.classList.add("hidden");
    fallback.innerText = getInitials(currentChannel.name);
    fallback.style.background = getFallbackGradient(currentChannel.name);
    fallback.classList.remove("hidden");
  }
}

/* AVATAR AND GRADIENT GENERATORS FOR FALLBACKS */
function getInitials(name) {
  if (!name) return "📺";
  const cleanName = name.replace(/[^\w\s]/gi, "").trim();
  const parts = cleanName.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase().substring(0, 2);
  }
  return cleanName.substring(0, 2).toUpperCase() || "📺";
}

function getFallbackGradient(name) {
  const gradients = [
    "linear-gradient(135deg, #ff007f 0%, #7928ca 100%)", // Pink -> Purple
    "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)", // Cyan -> Blue
    "linear-gradient(135deg, #00ff87 0%, #60efff 100%)", // Neon Green -> Light Cyan
    "linear-gradient(135deg, #f5576c 0%, #f093fb 100%)", // Red -> Pink
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", // Pink -> Yellow
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", // Green -> Mint
    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)"  // Blue -> Purple
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

/* TOGGLE FULLSCREEN WITH MULTI-DEVICE & AUTO-LANDSCAPE SUPPORT */
function toggleFullscreen() {
  const video = document.getElementById("video");
  
  if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
    // Enter Fullscreen
    if (video.requestFullscreen) {
      video.requestFullscreen()
        .then(() => {
          lockOrientation();
        })
        .catch(err => {
          console.error("Error entering fullscreen:", err);
        });
    } else if (video.webkitRequestFullscreen) { /* Chrome/Safari on Desktop/Android */
      video.webkitRequestFullscreen();
      setTimeout(lockOrientation, 150);
    } else if (video.msRequestFullscreen) { /* IE/Edge */
      video.msRequestFullscreen();
      setTimeout(lockOrientation, 150);
    } else if (video.webkitEnterFullscreen) { /* iOS (iPhone) Support */
      // iOS webkitEnterFullscreen natively takes over screen and handles auto-rotation
      video.webkitEnterFullscreen();
    } else {
      alert("Fullscreen is not supported on this browser or device.");
    }
  } else {
    // Exit Fullscreen
    unlockOrientation();
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

/* LOCK ORIENTATION TO LANDSCAPE */
function lockOrientation() {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock("landscape")
      .catch(err => {
        console.log("Landscape lock failed or not supported on this device:", err);
      });
  } else if (screen.lockOrientation) {
    screen.lockOrientation("landscape");
  } else if (screen.webkitLockOrientation) {
    screen.webkitLockOrientation("landscape");
  } else if (screen.mozLockOrientation) {
    screen.mozLockOrientation("landscape");
  } else if (screen.msLockOrientation) {
    screen.msLockOrientation("landscape");
  }
}

/* UNLOCK ORIENTATION */
function unlockOrientation() {
  if (screen.orientation && screen.orientation.unlock) {
    screen.orientation.unlock();
  } else if (screen.unlockOrientation) {
    screen.unlockOrientation();
  } else if (screen.webkitUnlockOrientation) {
    screen.webkitUnlockOrientation();
  } else if (screen.mozUnlockOrientation) {
    screen.mozUnlockOrientation();
  } else if (screen.msUnlockOrientation) {
    screen.msUnlockOrientation();
  }
}

/* HORIZONTAL CATEGORY SCROLL INDICATORS & SMOOTH BUTTON NAVIGATION */
function setupCategoryScrolling() {
  const container = document.getElementById("categoriesContainer");
  const leftBtn = document.getElementById("scrollLeftBtn");
  const rightBtn = document.getElementById("scrollRightBtn");
  const wrapper = document.querySelector(".categories-wrapper");
  
  if (!container || !leftBtn || !rightBtn || !wrapper) return;
  
  function updateScrollButtons() {
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    // Toggle Left Indicator
    if (scrollLeft <= 5) {
      leftBtn.classList.add("hidden");
      wrapper.classList.remove("scrolled-left");
    } else {
      leftBtn.classList.remove("hidden");
      wrapper.classList.add("scrolled-left");
    }
    
    // Toggle Right Indicator
    if (scrollLeft + clientWidth >= scrollWidth - 5) {
      rightBtn.classList.add("hidden");
      wrapper.classList.add("scrolled-right");
    } else {
      rightBtn.classList.remove("hidden");
      wrapper.classList.remove("scrolled-right");
    }
  }
  
  container.addEventListener("scroll", updateScrollButtons);
  window.addEventListener("resize", updateScrollButtons);
  
  // Set initial state after rendering categories (using timeout to allow rendering)
  setTimeout(updateScrollButtons, 500);
}

function scrollCategories(direction) {
  const container = document.getElementById("categoriesContainer");
  if (!container) return;
  
  const scrollAmount = 200;
  if (direction === "left") {
    container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  } else {
    container.scrollBy({ left: scrollAmount, behavior: "smooth" });
  }
}

/* LIVE VISITOR AND TOTAL VISITS STATS LOGIC */
function setupLiveStats() {
  const liveCountEl = document.getElementById("liveCount");
  const headerLiveCountEl = document.getElementById("headerLiveCount");
  const totalCountEl = document.getElementById("totalCount");
  const headerTotalCountEl = document.getElementById("headerTotalCount");
  
  if (!totalCountEl) return;

  const updateLiveUI = (val) => {
    if (liveCountEl) liveCountEl.innerText = val.toLocaleString();
    if (headerLiveCountEl) headerLiveCountEl.innerText = val.toLocaleString();
  };

  const updateTotalUI = (val) => {
    if (totalCountEl) totalCountEl.innerText = val.toLocaleString();
    if (headerTotalCountEl) headerTotalCountEl.innerText = val.toLocaleString();
  };

  // 1. Total Visits (Deterministic time-based growth - identical for all users)
  const baseVisits = 9850;
  const baseTime = new Date("2026-06-05T00:00:00Z").getTime(); // Fixed start date
  const visitIntervalMs = 90000; // 1 visit every 90 seconds (1.5 minutes)

  const calculateTotalVisits = () => {
    const elapsed = Date.now() - baseTime;
    return baseVisits + Math.max(0, Math.floor(elapsed / visitIntervalMs));
  };
  
  let currentTotalVisits = calculateTotalVisits();
  updateTotalUI(currentTotalVisits);

  // 2. Live Watching (Deterministic wave fluctuations - identical for all users)
  const baseLive = 110;
  
  const calculateLiveWatching = () => {
    const timeMs = Date.now();
    // Slow wave: completes a full cycle every ~62.8 minutes, fluctuates +/- 25
    const slowWave = Math.sin(timeMs / 600000) * 25;
    // Fast wave (noise): completes a cycle every 20 seconds, fluctuates +/- 4
    const fastNoise = Math.sin(timeMs / 3183) * 4; 
    
    let count = Math.round(baseLive + slowWave + fastNoise);
    if (count < 70) count = 70;
    if (count > 160) count = 160;
    return count;
  };

  let currentLiveCount = calculateLiveWatching();
  updateLiveUI(currentLiveCount);

  // Update UI values dynamically every 3 seconds
  setInterval(() => {
    const newTotalVisits = calculateTotalVisits();
    if (newTotalVisits !== currentTotalVisits) {
      currentTotalVisits = newTotalVisits;
      updateTotalUI(currentTotalVisits);
    }

    const newLiveCount = calculateLiveWatching();
    if (newLiveCount !== currentLiveCount) {
      currentLiveCount = newLiveCount;
      updateLiveUI(currentLiveCount);
    }
  }, 3000);
}

/* BACK TO TOP BUTTON LOGIC */
function setupBackToTop() {
  const btn = document.getElementById("backToTopBtn");
  if (!btn) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 400) {
      btn.classList.remove("hidden");
    } else {
      btn.classList.add("hidden");
    }
  });

  btn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}

/* FOOTER INTERACTIVE FEATURES */
function setupFooterFeatures() {
  // Handle TV Category clicks from Footer
  document.querySelectorAll(".footer-cat-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const cat = link.getAttribute("data-category");
      filterCategory(cat);
      
      // Scroll smoothly to channels section
      const section = document.querySelector(".channels-section");
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

/* SMOOTH SCROLL NAVIGATION HELPERS */
function scrollToPlayer(event) {
  if (event) event.preventDefault();
  const player = document.querySelector(".player-section");
  if (player) {
    player.scrollIntoView({ behavior: "smooth" });
  }
}

function scrollToCategories(event) {
  if (event) event.preventDefault();
  
  // Clear search input and search keyword
  const searchInput = document.getElementById("search");
  if (searchInput) searchInput.value = "";
  searchKeyword = "";
  const clearBtn = document.getElementById("clearSearch");
  if (clearBtn) clearBtn.style.display = "none";
  
  // Reset category filter to 'All'
  filterCategory('All');
  
  const categories = document.querySelector(".search-filter-sticky");
  if (categories) {
    categories.scrollIntoView({ behavior: "smooth" });
  }
}

function resetToDefaultApp(event) {
  if (event) event.preventDefault();
  
  // Clear search input and search keyword
  const searchInput = document.getElementById("search");
  if (searchInput) searchInput.value = "";
  searchKeyword = "";
  const clearBtn = document.getElementById("clearSearch");
  if (clearBtn) clearBtn.style.display = "none";
  
  // Reset category filter to 'All'
  filterCategory('All');
  
  // Play the default channel
  if (channels.length > 0) {
    const options = ["tooffee", "channel i"];
    const shuffled = options.sort(() => Math.random() - 0.5);
    
    let defaultIndex = -1;
    for (const keyword of shuffled) {
      defaultIndex = channels.findIndex(c => c.name.toLowerCase().includes(keyword));
      if (defaultIndex !== -1) break;
    }
    
    playChannel(defaultIndex !== -1 ? defaultIndex : 0);
  }
  
  // Scroll smoothly to player
  const player = document.querySelector(".player-section");
  if (player) {
    player.scrollIntoView({ behavior: "smooth" });
  }
}

/* PRIVACY POLICY & TERMS MODAL CUSTOM DIALOG */
function showTermsModal(type, event) {
  if (event) event.preventDefault();
  
  const title = type === "privacy" ? "Privacy Policy" : "Terms of Service";
  const text = type === "privacy" 
    ? "At Alpha TV, we value your privacy. We do not collect or store any personal data. All streams are sourced from third-party public playlists and played locally in your browser or application. Your preferences are saved only on your local device."
    : "Welcome to Alpha TV! Our services are provided free of charge for streaming live channels. We do not host any of the video content; all streams are sourced from publicly available public playlists. By using this app, you agree to comply with your local copyright and streaming laws.";
  
  const modal = document.getElementById("infoModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  
  if (modal && modalTitle && modalText) {
    modalTitle.textContent = title;
    modalText.textContent = text;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    
    // Disable body scroll when modal is open
    document.body.style.overflow = "hidden";
  }
}

function closeInfoModal() {
  const modal = document.getElementById("infoModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    
    // Restore body scroll
    document.body.style.overflow = "";
  }
}

// Close modal on Escape key press
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeInfoModal();
    closeWarningModal();
    closeUpdateModal();
  }
});

/* 2D / 3D VIEW TOGGLE LOGIC */
function setViewMode(mode) {
  const body = document.body;
  const container = document.querySelector(".view-toggle-container");
  const btn3D = document.getElementById("btnToggle3D");
  const btn2D = document.getElementById("btnToggle2D");
  
  if (!container || !btn3D || !btn2D) return;
  
  // Temporarily disable transitions during layout mode switch
  body.classList.add('no-transition');
  
  if (mode === '2d') {
    body.classList.remove('mode-3d');
    body.classList.add('mode-2d');
    container.classList.add('mode-2d');
    btn2D.classList.add('active');
    btn3D.classList.remove('active');
    localStorage.setItem('viewMode', '2d');
  } else {
    body.classList.remove('mode-2d');
    body.classList.add('mode-3d');
    container.classList.remove('mode-2d');
    btn3D.classList.add('active');
    btn2D.classList.remove('active');
    localStorage.setItem('viewMode', '3d');
  }
  
  // Force reflow
  body.offsetHeight;
  
  // Re-enable transitions after the switch
  setTimeout(() => {
    body.classList.remove('no-transition');
  }, 150);
}

function setupViewModeToggle() {
  const savedMode = localStorage.getItem('viewMode') || '3d';
  setViewMode(savedMode);
}

/* MOBILE SMART APP BANNER & DYNAMIC APK DOWNLOAD */
let latestApkUrl = "https://github.com/Shariar-Ahamed/online-tv-streaming-platform/releases";

function setupMobileAppBanner() {
  if (window.Capacitor) return;

  fetch("https://api.github.com/repos/Shariar-Ahamed/online-tv-streaming-platform/releases/latest")
    .then(response => {
      if (!response.ok) throw new Error("GitHub API error");
      return response.json();
    })
    .then(data => {
      if (data && data.assets && data.assets.length > 0) {
        const apkAsset = data.assets.find(asset => asset.name.endsWith(".apk"));
        if (apkAsset && apkAsset.browser_download_url) {
          latestApkUrl = apkAsset.browser_download_url;
          document.querySelectorAll(".download-apk-link").forEach(link => {
            link.setAttribute("href", latestApkUrl);
          });
        }
      }
    })
    .catch(err => {
      console.warn("Failed to retrieve latest APK release from GitHub API, falling back to release page:", err);
    });

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  const isBannerHidden = localStorage.getItem("alpha_tv_hide_app_banner") === "true";

  if (isMobile && !isBannerHidden) {
    const banner = document.getElementById("mobileAppBanner");
    if (banner) {
      setTimeout(() => {
        banner.classList.remove("hidden");
      }, 2000);
    }
  }
}

function closeAppBanner() {
  const banner = document.getElementById("mobileAppBanner");
  if (banner) {
    banner.classList.add("hidden");
    localStorage.setItem("alpha_tv_hide_app_banner", "true");
  }
}

/* IN-APP UPDATE CHECKER (ANDROID APP ONLY) */
const currentBuildCode = 16; // Matches version 1.1.5 build code

function checkForUpdates() {
  if (!window.Capacitor) return;

  const configUrl = "https://raw.githubusercontent.com/Shariar-Ahamed/online-tv-streaming-platform/main/app-update.json";

  fetch(configUrl)
    .then(response => {
      if (!response.ok) throw new Error("Update config response error");
      return response.json();
    })
    .then(data => {
      if (data && data.buildCode && data.buildCode > currentBuildCode) {
        // Show the header notification badge whenever a new update is available
        showHeaderUpdateNotification(data);

        // Check if the user clicked "Later" for this exact build code in the last 36 hours
        const laterTime = localStorage.getItem("alpha_tv_update_later_time");
        const laterBuild = localStorage.getItem("alpha_tv_update_later_build");
        
        if (laterBuild && parseInt(laterBuild) === data.buildCode && laterTime) {
          const timeDiff = Date.now() - parseInt(laterTime);
          const waitTime = 36 * 60 * 60 * 1000; // 36 hours in milliseconds
          
          if (timeDiff < waitTime) {
            console.log("Update prompt skipped because user selected 'Later' in the last 36 hours.");
            return;
          }
        }
        
        showUpdateModal(data);
      } else {
        // If no update is available or already updated, hide the header badge
        hideHeaderUpdateNotification();
      }
    })
    .catch(err => {
      console.warn("Failed to check for remote app updates:", err);
    });
}

function showHeaderUpdateNotification(updateData) {
  const badge = document.getElementById("headerUpdateNotification");
  const link = document.getElementById("headerUpdateLink");
  if (badge) {
    badge.classList.remove("hidden");
  }
  if (link && updateData.downloadUrl) {
    link.setAttribute("href", updateData.downloadUrl);
  }
}

function hideHeaderUpdateNotification() {
  const badge = document.getElementById("headerUpdateNotification");
  if (badge) {
    badge.classList.add("hidden");
  }
}

function showUpdateModal(updateData) {
  const modal = document.getElementById("updateModal");
  const changelog = document.getElementById("updateChangelog");
  const downloadLink = document.getElementById("updateDownloadLink");

  if (!modal) return;

  // Save the remote build code in a data-attribute so closeUpdateModal can access it
  modal.dataset.updateBuild = updateData.buildCode;

  if (changelog && updateData.changelog) {
    changelog.innerHTML = "";
    const lines = updateData.changelog.split("\n");
    lines.forEach(line => {
      if (line.trim()) {
        const p = document.createElement("p");
        p.className = "changelog-item";
        p.innerText = line;
        changelog.appendChild(p);
      }
    });
  }

  if (downloadLink && updateData.downloadUrl) {
    downloadLink.setAttribute("href", updateData.downloadUrl);
  }

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeUpdateModal() {
  const modal = document.getElementById("updateModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    // Save skip state in localStorage if we skip this update
    const updateBuild = modal.dataset.updateBuild;
    if (updateBuild) {
      localStorage.setItem("alpha_tv_update_later_time", Date.now().toString());
      localStorage.setItem("alpha_tv_update_later_build", updateBuild);
    }
  }
}

function handleUpdateDownload(event) {
  event.preventDefault();
  const url = event.currentTarget.getAttribute("href");
  if (!url || url === "#") return;

  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
    window.Capacitor.Plugins.Browser.open({ url: url }).catch(err => {
      console.error("Failed to open URL via Capacitor Browser:", err);
      window.open(url, "_system");
    });
  } else {
    window.open(url, "_blank");
  }
}

/* DISCLAIMER POPUP MODAL LOGIC */
function checkDisclaimer() {
  const accepted = localStorage.getItem("alpha_tv_disclaimer_accepted");
  if (!accepted) {
    const modal = document.getElementById("disclaimerModal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
  } else {
    // If disclaimer accepted, check if Telegram modal should be shown
    checkTelegramModal();
  }
}

function acceptDisclaimer() {
  localStorage.setItem("alpha_tv_disclaimer_accepted", "true");
  closeDisclaimerModal();
  // Immediately check and open the telegram modal after disclaimer
  checkTelegramModal();
}

function showDisclaimerModal(event) {
  if (event) event.preventDefault();
  const modal = document.getElementById("disclaimerModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
}

function closeDisclaimerModal() {
  const modal = document.getElementById("disclaimerModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
}

/* TELEGRAM COMMUNITY JOIN POPUP MODAL LOGIC */
function checkTelegramModal() {
  const accepted = localStorage.getItem("alpha_tv_telegram_accepted");
  if (!accepted) {
    const modal = document.getElementById("joinCommunityModal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
  }
}

function acceptTelegramModal() {
  localStorage.setItem("alpha_tv_telegram_accepted", "true");
  closeTelegramModal();
}

function closeTelegramModal() {
  const modal = document.getElementById("joinCommunityModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
}

/* AUTOMATIC PICTURE-IN-PICTURE (PIP) MODE SYNC */
function setupPictureInPicture() {
  const video = document.getElementById("video");

  // State to capture chat layout settings before PiP
  let chatStateBeforePiP = {
    hidden: false,
    collapsed: false
  };

  function handleEnterPiP() {
    const chatInput = document.getElementById("chatInput");
    const chatContainer = document.getElementById("liveChatContainer");

    // Dismiss keyboard and focus state to prevent layout distortions in tiny PiP view
    if (chatInput) {
      chatInput.blur();
    }
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }

    if (chatContainer) {
      // Capture current settings
      chatStateBeforePiP.hidden = chatContainer.classList.contains("hidden");
      chatStateBeforePiP.collapsed = chatContainer.classList.contains("chat-collapsed");

      // Hide and collapse the chat container in PiP mode
      chatContainer.classList.add("hidden");
      chatContainer.classList.add("chat-collapsed");
      chatContainer.classList.remove("keyboard-visible");
    }

    // Reset window scroll position to keep player aligned in tiny PiP window
    window.scrollTo(0, 0);
  }

  function handleExitPiP() {
    const chatContainer = document.getElementById("liveChatContainer");
    if (chatContainer) {
      // Restore states
      if (chatStateBeforePiP.hidden) {
        chatContainer.classList.add("hidden");
      } else {
        chatContainer.classList.remove("hidden");
      }

      if (chatStateBeforePiP.collapsed) {
        chatContainer.classList.add("chat-collapsed");
      } else {
        chatContainer.classList.remove("chat-collapsed");
      }

      // Scroll chat body to bottom if chat is restored to visible
      if (!chatStateBeforePiP.hidden && !chatStateBeforePiP.collapsed) {
        setTimeout(() => {
          const chatMessages = document.getElementById("chatMessages");
          if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        }, 100);
      }
    }

    // Smooth scroll page back to top alignment
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }

  // Expose play control functions to window for native Android PiP actions
  window.nextChannel = nextChannel;
  window.prevChannel = prevChannel;
  window.togglePlay = togglePlay;

  // Web Browser native PiP event listeners
  video.addEventListener("enterpictureinpicture", () => {
    console.log("Web PiP Entered");
    document.body.classList.add("pip-active");
    handleEnterPiP();
  });

  video.addEventListener("leavepictureinpicture", () => {
    console.log("Web PiP Exited");
    document.body.classList.remove("pip-active");
    handleExitPiP();
  });

  // Android capacitor wrapper callback to prepare for PiP before transition
  window.onPiPPrepare = function() {
    console.log("Android preparing for PiP");
    handleEnterPiP();
  };

  // Android capacitor wrapper callback
  window.onPiPModeChanged = function(isInPiP) {
    console.log("Android PiP Changed:", isInPiP);
    if (isInPiP) {
      document.body.classList.add("pip-active");
      handleEnterPiP();
    } else {
      document.body.classList.remove("pip-active");
      handleExitPiP();
    }
  };
}

/* VIDEO QUALITY SELECTOR LOGIC */
function initializeQualitySelector(hlsInstance) {
  const qualityBtn = document.getElementById("qualityBtn");
  const qualityMenu = document.getElementById("qualityMenu");

  if (!qualityBtn || !qualityMenu) return;

  // Make sure quality button is always visible
  qualityBtn.style.display = "flex";
  qualityMenu.classList.add("hidden");

  // Default menu before manifest parsed or if single quality
  qualityMenu.innerHTML = `<div class="quality-menu-item active" data-level="-1" onclick="changeQualityLevel(-1, event)">Original</div>`;

  if (!hlsInstance) return;

  hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
    const levels = hlsInstance.levels;
    if (levels && levels.length > 1) {
      // Build menu options (Auto at top)
      let menuHtml = `<div class="quality-menu-item active" data-level="-1" onclick="changeQualityLevel(-1, event)">Auto</div>`;

      // Sort levels by height descending (e.g. 1080p, 720p...)
      const sortedLevels = [...levels].map((level, index) => ({ level, originalIndex: index }));
      sortedLevels.sort((a, b) => (b.level.height || 0) - (a.level.height || 0));

      sortedLevels.forEach(item => {
        const height = item.level.height || Math.round((item.level.width || 0) * 9 / 16);
        const name = height ? `${height}p` : `Level ${item.originalIndex + 1}`;
        menuHtml += `<div class="quality-menu-item" data-level="${item.originalIndex}" onclick="changeQualityLevel(${item.originalIndex}, event)">${name}</div>`;
      });

      qualityMenu.innerHTML = menuHtml;
    } else {
      qualityMenu.innerHTML = `<div class="quality-menu-item active" data-level="-1" onclick="changeQualityLevel(-1, event)">Original</div>`;
    }
  });
}

function changeQualityLevel(levelIndex, event) {
  if (event) event.stopPropagation();

  if (currentHls) {
    currentHls.currentLevel = levelIndex;
  }

  // Update active item in the UI
  const menuItems = document.querySelectorAll(".quality-menu-item");
  menuItems.forEach(item => {
    if (parseInt(item.getAttribute("data-level")) === levelIndex) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Check if selection was made during active remote navigation session
  const wasRemoteFocused = activeFocusedEl && activeFocusedEl.classList.contains("remote-focused");

  // Hide the menu
  const qualityMenu = document.getElementById("qualityMenu");
  if (qualityMenu) {
    qualityMenu.classList.add("hidden");
  }

  // Return remote focus to the quality gear button ONLY if selection was made via remote control
  if (wasRemoteFocused) {
    if (activeFocusedEl) {
      activeFocusedEl.classList.remove("remote-focused");
    }
    const qualityBtn = document.getElementById("qualityBtn");
    if (qualityBtn) {
      activeFocusedEl = qualityBtn;
      activeFocusedEl.classList.add("remote-focused");
    }
  } else {
    // For mouse/touch events, clear any remote focused reference entirely
    if (activeFocusedEl) {
      activeFocusedEl.classList.remove("remote-focused");
      activeFocusedEl = null;
    }
  }

  console.log("Quality level changed to index:", levelIndex);
}

function toggleQualityMenu(event) {
  if (event) event.stopPropagation();
  const qualityMenu = document.getElementById("qualityMenu");
  if (qualityMenu) {
    const wasHidden = qualityMenu.classList.contains("hidden");
    qualityMenu.classList.toggle("hidden");
    
    if (wasHidden) {
      // Menu is now open! Auto-focus the active quality item or the first item
      // ONLY if we are in active remote navigation mode (i.e. qualityBtn is remote-focused)
      const qualityBtn = document.getElementById("qualityBtn");
      const isRemoteActive = qualityBtn && qualityBtn.classList.contains("remote-focused");

      if (isRemoteActive) {
        setTimeout(() => {
          const activeItem = qualityMenu.querySelector(".quality-menu-item.active") || qualityMenu.querySelector(".quality-menu-item");
          if (activeItem) {
            if (activeFocusedEl) {
              activeFocusedEl.classList.remove("remote-focused");
            }
            activeFocusedEl = activeItem;
            activeFocusedEl.classList.add("remote-focused");
          }
        }, 50);
      }
    }
  }
}

// Global click listener to close the quality menu when clicking outside of it
document.addEventListener("click", () => {
  const qualityMenu = document.getElementById("qualityMenu");
  if (qualityMenu && !qualityMenu.classList.contains("hidden")) {
    qualityMenu.classList.add("hidden");
  }
});

/* ==========================================================================
   SETTINGS & CUSTOM PLAYLIST HANDLING
   ========================================================================== */

// Open Settings Modal
window.openSettingsModal = function() {
  const modal = document.getElementById("settingsModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden"; // Prevent background scroll
  
  // Clear any previous error messages
  document.getElementById("urlErrorText").classList.add("hidden");
  document.getElementById("fileErrorText").classList.add("hidden");
  document.getElementById("customM3uUrl").value = localStorage.getItem("alpha_tv_custom_m3u_url") || "";
  const nameInput = document.getElementById("customChannelName");
  if (nameInput) nameInput.value = "";

  updateSettingsStatusBadge();
};

// Close Settings Modal
window.closeSettingsModal = function() {
  const modal = document.getElementById("settingsModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = ""; // Enable background scroll
};

// Update active badge status in Settings Modal
function updateSettingsStatusBadge() {
  const badge = document.getElementById("playlistStatusBadge");
  if (!badge) return;

  const customData = localStorage.getItem("alpha_tv_custom_m3u_data");
  const customSource = localStorage.getItem("alpha_tv_custom_m3u_source");

  if (customData) {
    if (customSource === "url") {
      badge.innerText = "Custom URL Active (সক্রিয় ইউআরএল চ্যানেল)";
    } else {
      badge.innerText = "Custom File Active (সক্রিয় কাস্টম ফাইল)";
    }
    badge.className = "playlist-badge custom";
  } else {
    badge.innerText = "Alpha TV Default (ডিফল্ট প্লেলিস্ট)";
    badge.className = "playlist-badge default";
  }
}

// Helper to append channels to custom channels list in localStorage
function appendCustomChannels(channelsToAppend, targetCategory) {
  let currentCustom = [];
  const saved = localStorage.getItem("alpha_tv_custom_channels_list");
  if (saved) {
    try {
      currentCustom = JSON.parse(saved);
      if (!Array.isArray(currentCustom)) currentCustom = [];
    } catch(e) {
      currentCustom = [];
    }
  }
  const combined = [...currentCustom, ...channelsToAppend];
  localStorage.setItem("alpha_tv_custom_channels_list", JSON.stringify(combined));
  if (targetCategory) {
    localStorage.setItem("alpha_tv_auto_select_category", targetCategory);
  }
  window.location.reload();
}

// Load remote M3U URL
window.loadCustomM3uUrl = function() {
  const urlInput = document.getElementById("customM3uUrl");
  const nameInput = document.getElementById("customChannelName");
  const errorEl = document.getElementById("urlErrorText");
  const url = urlInput.value.trim();
  const customName = nameInput ? nameInput.value.trim() : "";

  if (!url) {
    showSettingError(errorEl, "Please enter a valid URL / লিঙ্ক প্রদান করুন।");
    return;
  }

  errorEl.classList.add("hidden");
  
  // Show loading indicator
  const loader = document.getElementById("playerLoader");
  if (loader) {
    loader.classList.remove("hidden");
    loader.querySelector("span").innerText = "Testing custom M3U link...";
  }

  function saveAsSingleStream(streamUrl) {
    console.log("Wrapping and saving direct stream URL:", streamUrl, "with name:", customName);
    const wrappedM3u = wrapStreamUrlAsM3u(streamUrl, customName);
    const parsed = parseM3U(wrappedM3u);
    if (parsed.length > 0) {
      const formatted = parsed.map(ch => ({
        id: "cust-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
        name: ch.name,
        url: ch.url,
        logo: ch.logo || "",
        categories: ["Custom URL"]
      }));
      appendCustomChannels(formatted, "Custom URL");
    }
  }

  // If it's a direct stream URL, we save immediately to bypass CORS fetch restriction
  if (isDirectStreamUrl(url)) {
    saveAsSingleStream(url);
    return;
  }

  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error("Server returned error response");
      return response.text();
    })
    .then(m3uText => {
      if (isChannelPlaylist(m3uText)) {
        const parsed = parseM3U(m3uText);
        if (parsed.length > 0) {
          const formatted = parsed.map((ch, index) => ({
            id: "cust-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9) + "-" + index,
            name: ch.name,
            url: ch.url,
            logo: ch.logo || "",
            categories: ["Custom URL"]
          }));
          appendCustomChannels(formatted, "Custom URL");
        } else {
          throw new Error("No channels found in M3U file");
        }
      } else {
        // If content contains standard HLS tags, treat it as a direct stream
        if (isDirectStreamUrl(url) || m3uText.includes("#EXT-X-") || m3uText.includes("#EXTM3U")) {
          saveAsSingleStream(url);
        } else {
          throw new Error("No channels found in M3U file");
        }
      }
    })
    .catch(err => {
      console.error("Error loading M3U URL:", err);
      // Double check if we can fall back to direct stream on fetch failure
      if (isDirectStreamUrl(url)) {
        saveAsSingleStream(url);
      } else {
        if (loader) loader.classList.add("hidden");
        showSettingError(errorEl, "Failed to load M3U. Check connection/CORS policy. (লিঙ্কটি লোড করা সম্ভব হয়নি)");
      }
    });
};

// Load uploaded M3U File
window.loadCustomM3uFile = function(event) {
  const file = event.target.files[0];
  const errorEl = document.getElementById("fileErrorText");
  if (!file) return;

  errorEl.classList.add("hidden");

  const reader = new FileReader();
  reader.onload = function(e) {
    const m3uText = e.target.result;

    if (isChannelPlaylist(m3uText)) {
      const parsed = parseM3U(m3uText);
      if (parsed.length > 0) {
        const formatted = parsed.map((ch, index) => ({
          id: "cust-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9) + "-" + index,
          name: ch.name,
          url: ch.url,
          logo: ch.logo || "",
          categories: ["Custom File"]
        }));
        appendCustomChannels(formatted, "Custom File");
      } else {
        showSettingError(errorEl, "No channels found in M3U file. (M3U ফাইলে কোনো চ্যানেল পাওয়া যায়নি)");
      }
    } else {
      showSettingError(errorEl, "Invalid M3U file format. No channels found. (অকার্যকর M3U ফাইল ফরম্যাট)");
    }
  };

  reader.onerror = function() {
    showSettingError(errorEl, "Error reading file. Try again. (ফাইলটি পড়তে সমস্যা হয়েছে)");
  };

  reader.readAsText(file);
};

// Reset to default playlist
window.resetToDefaultPlaylist = function() {
  localStorage.removeItem("alpha_tv_custom_channels_list");
  localStorage.removeItem("alpha_tv_custom_m3u_url");
  localStorage.removeItem("alpha_tv_custom_m3u_data");
  localStorage.removeItem("alpha_tv_custom_m3u_source");
  localStorage.removeItem("alpha_tv_custom_m3u_name");
  
  // Reload app
  window.location.reload();
};

// Show settings error helper
function showSettingError(element, message) {
  if (!element) return;
  element.innerText = message;
  element.classList.remove("hidden");
}

// Initial status badge update on startup
document.addEventListener("DOMContentLoaded", () => {
  updateSettingsStatusBadge();
  loadChatUIState();
});

/* LIVE CHAT ROOM FEATURING FIREBASE REALTIME DATABASE */

const firebaseConfig = {
  apiKey: "AIzaSyARbUktjx16jOc2Ja6O5zCHdq2JW_F9Lx8",
  authDomain: "alpha-tv-chat.firebaseapp.com",
  databaseURL: "https://alpha-tv-chat-default-rtdb.firebaseio.com", // If Singapore region, change to: https://alpha-tv-chat-default-rtdb.asia-southeast1.firebasedatabase.app
  projectId: "alpha-tv-chat",
  storageBucket: "alpha-tv-chat.firebasestorage.app",
  messagingSenderId: "868815265771",
  appId: "1:868815265771:web:c771819dbc1aea9ba543ae",
  measurementId: "G-SRE4CZ3ZSX"
};

let database = null;
let chatRef = null;
let chatInitialized = false;
let currentNickname = "";
let shouldScrollToBottom = true;
let userCountry = "";

function fetchUserCountry() {
  if (userCountry) return;
  fetch('https://ipapi.co/json/')
    .then(res => res.json())
    .then(data => {
      if (data && data.country_code) {
        userCountry = data.country_code;
        console.log("Detected user country:", userCountry);
      }
    })
    .catch(err => {
      console.warn("ipapi.co failed, trying ip-api.com:", err);
      fetch('https://ip-api.com/json/')
        .then(res => res.json())
        .then(data => {
          if (data && data.countryCode) {
            userCountry = data.countryCode;
            console.log("Detected user country (fallback):", userCountry);
          }
        })
        .catch(() => {
          userCountry = "";
        });
    });
}

function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return "";
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return "";
  }
}

function formatChatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}


function initFirebase() {
  if (chatInitialized) return;
  
  if (typeof firebase !== 'undefined') {
    try {
      firebase.initializeApp(firebaseConfig);
      database = firebase.database();
      chatInitialized = true;
      console.log("Firebase Chat initialized successfully.");
      fetchUserCountry();
    } catch (e) {
      console.error("Firebase initialization failed:", e);
    }
  } else {
    console.warn("Firebase SDK not loaded. Chat room running in offline mode.");
  }
}

function getSanitizedChannelId(name) {
  if (!name) return 'general';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function loadNickname() {
  let saved = localStorage.getItem("alpha_tv_chat_nickname");
  if (!saved) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    saved = "User_" + rand;
    localStorage.setItem("alpha_tv_chat_nickname", saved);
  }
  currentNickname = saved;
  updateNicknameUI();
}

function updateNicknameUI() {
  const el = document.getElementById("chatNickname");
  if (el) {
    el.innerHTML = `${escapeHtml(currentNickname)} <i class="fa-solid fa-pen" style="font-size: 8px; margin-left: 2px;"></i>`;
  }
}

window.changeNickname = function() {
  const modal = document.getElementById("nicknameModal");
  const input = document.getElementById("nicknameInput");
  const errorEl = document.getElementById("nicknameErrorText");
  
  if (modal && input) {
    input.value = currentNickname;
    if (errorEl) errorEl.classList.add("hidden");
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
};

window.closeNicknameModal = function() {
  const modal = document.getElementById("nicknameModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
};

window.saveNewNickname = function() {
  const input = document.getElementById("nicknameInput");
  const errorEl = document.getElementById("nicknameErrorText");
  if (!input) return;
  
  const newName = input.value.trim();
  if (newName.length === 0) {
    if (errorEl) {
      errorEl.innerText = "Please enter a valid nickname / ডাকনাম লিখুন।";
      errorEl.classList.remove("hidden");
    }
    return;
  }
  
  if (newName.length > 15) {
    if (errorEl) {
      errorEl.innerText = "Name must be 15 characters or less / নাম সর্বোচ্চ ১৫ অক্ষর হতে পারবে।";
      errorEl.classList.remove("hidden");
    }
    return;
  }
  
  currentNickname = newName;
  localStorage.setItem("alpha_tv_chat_nickname", newName);
  updateNicknameUI();
  
  appendSystemMessage(`You changed nickname to "${newName}".`);
  closeNicknameModal();
};

function initChatForChannel(channel) {
  if (!channel) return;
  
  const chatHeaderTitle = document.getElementById("chatHeaderTitle");
  if (chatHeaderTitle) {
    chatHeaderTitle.innerHTML = `<i class="fa-solid fa-comments"></i> Live Chat with "${escapeHtml(channel.name)}"`;
  }
  
  initFirebase();
  loadNickname();
  loadChatUIState();
  
  const sanitizedId = getSanitizedChannelId(channel.name);
  shouldScrollToBottom = true;
  
  if (chatRef) {
    chatRef.off();
  }
  
  const chatMessagesEl = document.getElementById("chatMessages");
  if (chatMessagesEl) {
    chatMessagesEl.innerHTML = `<div class="chat-system-message">Connecting to ${escapeHtml(channel.name)} chat... (চ্যাটে সংযুক্ত হচ্ছে...)</div>`;
  }
  
  if (!database) {
    if (chatMessagesEl) {
      chatMessagesEl.innerHTML = `<div class="chat-system-message">Chat offline. Please configure Firebase in script.js. (চ্যাট অফলাইন। ফায়ারবেস কনফিগার করুন।)</div>`;
    }
    return;
  }
  
  chatRef = database.ref('chats/' + sanitizedId);
  
  chatRef.limitToLast(100).on('value', (snapshot) => {
    const messages = [];
    snapshot.forEach((childSnapshot) => {
      const key = childSnapshot.key;
      const data = childSnapshot.val();
      messages.push({
        key: key,
        sender: data.sender || 'Anonymous',
        text: data.text || '',
        timestamp: data.timestamp || 0,
        country: data.country || ''
      });
    });
    
    renderChatMessages(messages);
  }, (err) => {
    console.error("Firebase chat listen error:", err);
    if (chatMessagesEl) {
      chatMessagesEl.innerHTML = `<div class="chat-system-message" style="color: #ff5e5e; padding: 10px; text-align: center;">
        <i class="fa-solid fa-triangle-exclamation"></i> Connection failed (সংযোগ ব্যর্থ):<br>
        <span style="font-size: 11px; opacity: 0.8;">${escapeHtml(err.message || err.code || err)}</span>
      </div>`;
    }
  });
}

function renderChatMessages(messages) {
  const chatMessagesEl = document.getElementById("chatMessages");
  const chatBodyEl = document.getElementById("chatBody");
  if (!chatMessagesEl || !chatBodyEl) return;
  
  if (messages.length === 0) {
    chatMessagesEl.innerHTML = `<div class="chat-system-message">No messages yet. Say hello! (কোনো মেসেজ নেই। হ্যালো বলুন!)</div>`;
    return;
  }
  
  chatMessagesEl.innerHTML = messages.map(msg => {
    const isSelf = msg.sender === currentNickname;
    const timeStr = formatChatTime(msg.timestamp);
    const flag = msg.country ? getFlagEmoji(msg.country) : "";
    const metaStr = [flag, msg.country, timeStr].filter(Boolean).join(" ");
    
    return `
      <div class="chat-msg-row ${isSelf ? 'self' : ''}">
        <span class="chat-msg-sender">${escapeHtml(msg.sender)}</span>
        <div class="chat-msg-bubble">${escapeHtml(msg.text)}</div>
        <span class="chat-msg-meta">${escapeHtml(metaStr)}</span>
      </div>
    `;
  }).join('');
  
  // Always scroll to the bottom of the scrollable container (#chatBody) when messages load or arrive
  setTimeout(() => {
    chatBodyEl.scrollTop = chatBodyEl.scrollHeight;
  }, 30);
}

window.sendChatMessage = function() {
  const inputEl = document.getElementById("chatInput");
  if (!inputEl) return;
  
  const text = inputEl.value.trim();
  if (text.length === 0) return;
  
  if (!chatRef) {
    alert("Chat not connected.");
    return;
  }
  
  const filteredText = filterToxicity(text);
  
  const messageData = {
    sender: currentNickname,
    text: filteredText,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    country: userCountry || ""
  };
  
  chatRef.push(messageData).then(() => {
    inputEl.value = "";
    if (currentChannel) {
      cleanupOldMessages(getSanitizedChannelId(currentChannel.name));
    }
  }).catch(err => {
    console.error("Failed to send message:", err);
    alert("Failed to send message (মেসেজ পাঠানো ব্যর্থ হয়েছে): " + (err.message || err.code || err));
  });
};

function cleanupOldMessages(sanitizedId) {
  if (!database) return;
  const ref = database.ref('chats/' + sanitizedId);
  ref.once('value').then((snapshot) => {
    const numChildren = snapshot.numChildren();
    if (numChildren > 100) {
      let count = 0;
      const limit = numChildren - 100;
      const updates = {};
      snapshot.forEach((child) => {
        if (count < limit) {
          updates[child.key] = null;
          count++;
        } else {
          return true;
        }
      });
      ref.update(updates);
    }
  });
}

function filterToxicity(text) {
  const badWords = ["gali", "badword", "spammer"];
  let cleaned = text;
  badWords.forEach(word => {
    const regex = new RegExp("\\b" + word + "\\b", "gi");
    cleaned = cleaned.replace(regex, "***");
  });
  return cleaned;
}

function appendSystemMessage(text) {
  const chatMessagesEl = document.getElementById("chatMessages");
  if (!chatMessagesEl) return;
  
  const div = document.createElement("div");
  div.className = "chat-system-message";
  div.innerText = text;
  chatMessagesEl.appendChild(div);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

window.handleChatInputKey = function(event) {
  if (event.key === "Enter") {
    sendChatMessage();
  }
};

window.toggleChat = function() {
  const container = document.getElementById("liveChatContainer");
  if (container) {
    container.classList.toggle("hidden");
    const isHidden = container.classList.contains("hidden");
    localStorage.setItem("alpha_tv_chat_hidden", isHidden);
    
    if (!isHidden) {
      setTimeout(() => {
        const chatMessagesEl = document.getElementById("chatMessages");
        if (chatMessagesEl) chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
      }, 100);
    }
  }
};

window.toggleChatCollapse = function() {
  const container = document.getElementById("liveChatContainer");
  if (container) {
    container.classList.toggle("chat-collapsed");
    const isCollapsed = container.classList.contains("chat-collapsed");
    localStorage.setItem("alpha_tv_chat_collapsed", isCollapsed);
    if (!isCollapsed) {
      setTimeout(() => {
        const chatMessagesEl = document.getElementById("chatMessages");
        if (chatMessagesEl) chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
      }, 100);
    }
  }
};

function loadChatUIState() {
  const container = document.getElementById("liveChatContainer");
  if (!container) return;
  
  const isHidden = localStorage.getItem("alpha_tv_chat_hidden") === "true";
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768);
  
  let isCollapsed = false;
  const collapsedVal = localStorage.getItem("alpha_tv_chat_collapsed");
  if (collapsedVal === null) {
    // New user: default to collapsed (folded) on mobile, expanded on desktop
    isCollapsed = isMobile;
  } else {
    isCollapsed = collapsedVal === "true";
  }
  
  if (isHidden) {
    container.classList.add("hidden");
  } else {
    container.classList.remove("hidden");
  }
  
  if (isCollapsed) {
    container.classList.add("chat-collapsed");
  } else {
    container.classList.remove("chat-collapsed");
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setupKeyboardAdjustments() {
  const chatInput = document.getElementById("chatInput");
  const chatContainer = document.getElementById("liveChatContainer");
  const chatMessages = document.getElementById("chatMessages");

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768);

  if (chatInput && chatContainer) {
    chatInput.addEventListener('focus', () => {
      if (isMobile) {
        chatContainer.classList.add("keyboard-visible");
        setTimeout(() => {
          if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        }, 100);
        
        // Prevent browser default scroll shifting by using nearest block alignment
        setTimeout(() => {
          chatInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 250);
      }
    });
    
    chatInput.addEventListener('blur', () => {
      if (isMobile) {
        chatContainer.classList.remove("keyboard-visible");
        // Ensure layout recovers fully when keyboard is closed
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      }
    });
  }

  // Handle mobile keyboard open/close (especially dismiss via back button)
  if (isMobile) {
    if (window.visualViewport) {
      let originalHeight = window.innerHeight;
      
      const updateOriginalHeight = () => {
        const activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          originalHeight = window.innerHeight;
        }
      };
      
      window.addEventListener('resize', updateOriginalHeight);
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          originalHeight = window.innerHeight;
        }, 300);
      });

      window.visualViewport.addEventListener('resize', () => {
        const isKeyboardActive = (window.innerHeight < originalHeight - 100) || 
                                 (window.visualViewport.height < window.innerHeight - 100);

        if (isKeyboardActive) {
          if (document.activeElement === chatInput && chatContainer && !chatContainer.classList.contains("keyboard-visible")) {
            chatContainer.classList.add("keyboard-visible");
            setTimeout(() => {
              if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }
            }, 100);
          }
        } else {
          // Keyboard was closed
          if (chatContainer && chatContainer.classList.contains("keyboard-visible")) {
            chatContainer.classList.remove("keyboard-visible");
          }
          if (document.activeElement === chatInput) {
            chatInput.blur();
          }
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 100);
        }
      });
    } else {
      // Legacy resize logic if visualViewport is not supported
      let originalWindowHeight = window.innerHeight;
      let isKeyboardOpenLegacy = false;

      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          originalWindowHeight = window.innerHeight;
        }, 300);
      });

      window.addEventListener('resize', () => {
        const currentHeight = window.innerHeight;
        if (currentHeight < originalWindowHeight - 120) {
          isKeyboardOpenLegacy = true;
          if (document.activeElement === chatInput && chatContainer && !chatContainer.classList.contains("keyboard-visible")) {
            chatContainer.classList.add("keyboard-visible");
            setTimeout(() => {
              if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }
            }, 100);
          }
        } else if (currentHeight >= originalWindowHeight - 80) {
          if (isKeyboardOpenLegacy) {
            isKeyboardOpenLegacy = false;
            if (chatContainer && chatContainer.classList.contains("keyboard-visible")) {
              chatContainer.classList.remove("keyboard-visible");
            }
            if (chatInput) {
              chatInput.blur();
            }
            setTimeout(() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
          }
        }
      });
    }
  }

  // Handle other inputs (settings, nickname) normally without shrinking the chat
  const otherInputs = ['nicknameInput', 'customM3uUrl', 'customChannelName'];
  otherInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('focus', () => {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
      });
    }
  });
}
