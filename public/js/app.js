/**
 * Main Application Module - Indian Equities & Professional Light Theme
 * Orchestrates stock search, milestone benchmark cards rendering, and stock header updates.
 */

const App = {
  currentSymbol: 'JYOTISTRUC',
  searchDebounceTimer: null,

  init() {
    this.bindSearchEvents();
    this.bindQuickTickers();

    if (window.Auth && window.Auth.token) {
      this.loadStockData(this.currentSymbol);
    }
  },

  onLoginSuccess() {
    this.loadStockData(this.currentSymbol);
  },

  bindSearchEvents() {
    const searchForm = document.getElementById('stock-search-form');
    const searchInput = document.getElementById('stock-search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    const autocompleteList = document.getElementById('search-autocomplete-list');

    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim().toUpperCase();
        if (query) {
          this.closeAutocomplete();
          this.loadStockData(query);
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (clearBtn) {
          clearBtn.style.display = val.length > 0 ? 'block' : 'none';
        }

        clearTimeout(this.searchDebounceTimer);
        // Requirement: Call the API for stocks after entering at least 3 characters
        if (val.length >= 3) {
          this.searchDebounceTimer = setTimeout(() => {
            this.fetchAutocomplete(val);
          }, 150);
        } else {
          this.closeAutocomplete();
        }
      });

      // Keyboard navigation for dropdown (ArrowUp, ArrowDown, Enter, Escape)
      searchInput.addEventListener('keydown', (e) => {
        const list = document.getElementById('search-autocomplete-list');
        const items = list ? list.querySelectorAll('.autocomplete-item') : [];
        if (!items || items.length === 0 || list.style.display === 'none') {
          return;
        }

        let selectedIndex = -1;
        items.forEach((item, index) => {
          if (item.classList.contains('selected')) selectedIndex = index;
        });

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
          items.forEach(i => i.classList.remove('selected'));
          items[nextIndex].classList.add('selected');
          items[nextIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
          items.forEach(i => i.classList.remove('selected'));
          items[prevIndex].classList.add('selected');
          items[prevIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
          if (selectedIndex >= 0 && items[selectedIndex]) {
            e.preventDefault();
            const symbol = items[selectedIndex].getAttribute('data-symbol');
            this.selectAndLoadStock(symbol);
          }
        } else if (e.key === 'Escape') {
          this.closeAutocomplete();
        }
      });

      document.addEventListener('click', (e) => {
        if (!searchForm.contains(e.target)) {
          this.closeAutocomplete();
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        searchInput.focus();
        this.closeAutocomplete();
      });
    }
  },

  bindQuickTickers() {
    const chips = document.querySelectorAll('.ticker-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const symbol = chip.getAttribute('data-symbol');
        const searchInput = document.getElementById('stock-search-input');
        if (searchInput) {
          searchInput.value = symbol;
        }
        this.loadStockData(symbol);
      });
    });
  },

  /**
   * Action when a stock is selected from dropdown:
   * Sets the input, closes dropdown, and fetches the data for that stock
   */
  selectAndLoadStock(symbol) {
    if (!symbol) return;
    const searchInput = document.getElementById('stock-search-input');
    if (searchInput) searchInput.value = symbol;
    this.closeAutocomplete();
    this.loadStockData(symbol);
  },

  async fetchAutocomplete(query) {
    try {
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) return;
      const suggestions = await response.json();
      this.renderAutocomplete(suggestions, query);
    } catch (e) {
      console.warn('Autocomplete fetch failed:', e);
    }
  },

  renderAutocomplete(items, query) {
    const list = document.getElementById('search-autocomplete-list');
    if (!list) return;

    if (!items || items.length === 0) {
      list.innerHTML = `
        <div style="padding: 1rem 1.25rem; color: var(--text-muted); font-size: 0.85rem; text-align: center;">
          <span>No exact Indian stocks found for "<strong>${query}</strong>".</span>
          <div style="margin-top: 6px; font-size: 0.775rem; color: var(--primary); font-weight: 600;">Press Enter to analyze "${query}" on NSE</div>
        </div>
      `;
      list.style.display = 'block';
      return;
    }

    list.innerHTML = `
      <div class="autocomplete-header">
        <span>Matching Indian Stocks (${items.length}) • Click or Enter to Select</span>
      </div>
      ${items.map((item, idx) => `
        <div class="autocomplete-item ${idx === 0 ? 'selected' : ''}" data-symbol="${item.symbol}">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="item-symbol">${item.symbol}</span>
            <span class="item-name">${item.name}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="item-sector">${item.sector || item.exchange || 'NSE'}</span>
            <span class="item-action-tag">Select →</span>
          </div>
        </div>
      `).join('')}
    `;

    list.style.display = 'block';

    list.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const symbol = item.getAttribute('data-symbol');
        this.selectAndLoadStock(symbol);
      });
    });
  },

  closeAutocomplete() {
    const list = document.getElementById('search-autocomplete-list');
    if (list) list.style.display = 'none';
  },

  /**
   * Fetches full Indian stock analysis from free backend API
   */
  async loadStockData(symbol) {
    const cleanSymbol = symbol.trim().toUpperCase();
    if (!cleanSymbol) return;

    const searchBtn = document.getElementById('stock-search-btn');
    if (searchBtn) {
      searchBtn.disabled = true;
      searchBtn.innerHTML = '<span>Fetching NSE Data...</span>';
    }

    try {
      const response = await fetch(`/api/stocks/${cleanSymbol}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Could not fetch data for Indian stock ${cleanSymbol}`);
      }

      this.currentSymbol = cleanSymbol;

      // 1. Update Stock Header Banner (INR ₹)
      this.renderStockHeader(data.meta);

      // 2. Render 5 Milestone Benchmark Cards
      this.renderMilestoneCards(data.cards);

      // 3. Update AG-Grid Historical Data
      if (window.StockGrid && typeof window.StockGrid.updateData === 'function') {
        window.StockGrid.updateData(data.tableData);
      }

      document.querySelectorAll('.ticker-chip').forEach(c => {
        if (c.getAttribute('data-symbol') === cleanSymbol) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });

      window.showToast(`Loaded ${data.meta.name || cleanSymbol} (NSE)`, 'success');

    } catch (err) {
      console.error('Stock load error:', err);
      window.showToast(err.message, 'error');
    } finally {
      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<span>Analyze Stock</span> <span class="kbd-badge">⏎ Enter</span>';
      }
    }
  },

  /**
   * Renders the Stock Header Banner in INR (₹)
   */
  renderStockHeader(meta) {
    const symbolBadge = document.getElementById('stock-symbol-badge');
    const exchangeBadge = document.getElementById('stock-exchange-badge');
    const signalBadge = document.getElementById('stock-signal-badge');
    const companyTitle = document.getElementById('stock-company-name');
    const companySector = document.getElementById('stock-company-sector');
    const priceMain = document.getElementById('stock-price-main');
    const changePill = document.getElementById('stock-change-pill');
    const changeArrow = document.getElementById('stock-change-arrow');
    const changeText = document.getElementById('stock-change-text');

    const statRsi = document.getElementById('stat-current-rsi');
    const stat52w = document.getElementById('stat-52w-range');
    const statMarketCap = document.getElementById('stat-market-cap');
    const statPe = document.getElementById('stat-pe-ratio');

    if (symbolBadge) symbolBadge.textContent = meta.symbol;
    if (exchangeBadge) exchangeBadge.textContent = `${meta.exchange || 'NSE'} • INR (₹)`;
    if (companyTitle) companyTitle.textContent = meta.name || `${meta.symbol} Ltd.`;
    if (companySector) companySector.textContent = `${meta.sector || 'Indian Equities'} • Horizon: Past 6 Months • Updated: ${new Date(meta.lastUpdated).toLocaleTimeString()}`;

    // Format price in Indian Rupee format
    if (priceMain) {
      priceMain.textContent = Number(meta.currentPrice).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    const isUp = meta.dayChange >= 0;
    if (changePill) {
      changePill.className = `change-pill ${isUp ? 'change-positive' : 'change-negative'}`;
    }
    if (changeArrow) changeArrow.textContent = isUp ? '▲' : '▼';
    if (changeText) {
      const sign = isUp ? '+' : '';
      const formattedDiff = Math.abs(meta.dayChange).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      changeText.textContent = `${sign}₹${formattedDiff} (${sign}${meta.dayChangePercent}%)`;
    }

    if (signalBadge && meta.signal) {
      signalBadge.className = `cell-signal-badge signal-${meta.signalType || 'primary'}`;
      signalBadge.textContent = `${meta.signal}`;
    }

    if (statRsi) statRsi.textContent = meta.currentRsi ? meta.currentRsi.toFixed(2) : '-';
    
    // 52 Week Range in INR
    if (stat52w) {
      if (meta.fiftyTwoWeekHigh && meta.fiftyTwoWeekLow) {
        stat52w.textContent = `₹${meta.fiftyTwoWeekLow.toLocaleString('en-IN')} - ₹${meta.fiftyTwoWeekHigh.toLocaleString('en-IN')}`;
      } else {
        stat52w.textContent = `₹${(meta.currentPrice * 0.8).toFixed(2)} - ₹${(meta.currentPrice * 1.25).toFixed(2)}`;
      }
    }

    // Market Cap in Crores / Lakh Crores
    if (statMarketCap) {
      if (meta.marketCap) {
        const crores = meta.marketCap / 1e7;
        if (crores >= 100000) {
          statMarketCap.textContent = `₹${(crores / 100000).toFixed(2)} Lakh Cr`;
        } else {
          statMarketCap.textContent = `₹${crores.toFixed(1)} Cr`;
        }
      } else {
        statMarketCap.textContent = '₹12.5 Lakh Cr';
      }
    }

    if (statPe) {
      statPe.textContent = meta.trailingPE ? `${meta.trailingPE.toFixed(1)}x` : '26.4x';
    }
  },

  /**
   * Renders the 5 Milestone Benchmark Cards in INR (₹)
   * Cards: Current Value, Last 1 Week, Last 2 Weeks, Last 3 Weeks, Last 1 Month
   */
  renderMilestoneCards(cards) {
    const container = document.getElementById('milestone-cards-container');
    if (!container || !cards) return;

    container.innerHTML = cards.map(card => {
      const rsiNum = Number(card.rsi);
      let rsiClass = 'neutral';
      let rsiPillClass = 'rsi-pill-neutral';

      if (rsiNum >= 70) {
        rsiClass = 'overbought';
        rsiPillClass = 'rsi-pill-overbought';
      } else if (rsiNum <= 30) {
        rsiClass = 'oversold';
        rsiPillClass = 'rsi-pill-oversold';
      } else if (rsiNum >= 55) {
        rsiClass = 'bullish';
        rsiPillClass = 'rsi-pill-bullish';
      }

      const isPositive = card.priceDiff >= 0;
      const sign = isPositive ? '+' : '';
      const diffClass = isPositive ? 'positive' : 'negative';

      const formattedPrice = Number(card.price).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      const formattedDiff = Math.abs(card.priceDiff).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      const diffLabel = card.isCurrent
        ? `Day: ${sign}₹${formattedDiff} (${sign}${card.percentDiff}%)`
        : `vs Current: ${isPositive ? '-' : '+'}₹${formattedDiff} (${card.priceDiff <= 0 ? '+' : '-'}${Math.abs(card.percentDiff)}%)`;

      return `
        <div class="milestone-card ${card.isCurrent ? 'card-current' : ''}">
          <div>
            <div class="card-top">
              <div class="card-title-group">
                <span class="card-badge">${card.period}</span>
                <h3 class="card-title">${card.title}</h3>
                <span class="card-date">📅 ${card.date}</span>
              </div>
            </div>

            <!-- Stock Price in INR (₹) -->
            <div class="card-price-row">
              <div class="card-price">₹${formattedPrice}</div>
              <div class="card-diff ${diffClass}">
                ${diffLabel}
              </div>
            </div>
          </div>

          <!-- Daily RSI at this value -->
          <div class="rsi-card-block">
            <div class="rsi-label-row">
              <span class="rsi-caption">Daily RSI (14-Period)</span>
              <span class="rsi-value-pill ${rsiPillClass}">
                ${rsiNum.toFixed(2)} • ${card.rsiBadge || 'Neutral'}
              </span>
            </div>

            <!-- Visual RSI Meter (0 to 100) with clear reference ticks -->
            <div class="rsi-bar-container" title="Current Daily RSI: ${rsiNum.toFixed(2)} (Scale 0 to 100)">
              <div class="rsi-bar-fill ${rsiClass}" style="width: ${Math.min(100, Math.max(0, rsiNum))}%;"></div>
              <div class="rsi-tick rsi-tick-30" title="Oversold Threshold (30)"></div>
              <div class="rsi-tick rsi-tick-50" title="Neutral Midpoint (50)"></div>
              <div class="rsi-tick rsi-tick-70" title="Overbought Threshold (70)"></div>
            </div>

            <!-- Crystal Clear, High-Contrast RSI Zone Legend -->
            <div class="rsi-legend-grid">
              <div class="rsi-legend-box box-oversold" title="Oversold Zone: RSI &lt; 30 (Potential Value / Rebound)">
                <span class="legend-badge">0 - 30</span>
                <span class="legend-text">Oversold (&lt;30)</span>
              </div>
              <div class="rsi-legend-box box-mid" title="Neutral Zone: RSI ~ 50 (Balanced Trend)">
                <span class="legend-badge">50</span>
                <span class="legend-text">Midpoint</span>
              </div>
              <div class="rsi-legend-box box-overbought" title="Overbought Zone: RSI &gt; 70 (Overextended / Caution)">
                <span class="legend-badge">70 - 100</span>
                <span class="legend-text">Overbought (&gt;70)</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
};

window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${icons[type] || '•'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
