/**
 * AG-Grid Integration Module - Indian Equities & Light Theme
 * Displays 6-month historical stock data with Wilder's RSI, Moving Averages, and Volume.
 */

const StockGrid = {
  gridApi: null,
  eGridDiv: null,

  init() {
    this.eGridDiv = document.getElementById('stock-ag-grid');
    if (!this.eGridDiv) return;

    const gridOptions = {
      defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true,
        floatingFilter: false,
        minWidth: 100
      },

      // Column Definitions in INR (₹)
      columnDefs: [
        {
          headerName: 'Date',
          field: 'date',
          width: 130,
          pinned: 'left',
          sort: 'desc',
          cellClass: 'cell-date',
          filter: 'agTextColumnFilter',
          cellRenderer: (params) => {
            if (!params.value) return '';
            return `<strong>${params.value}</strong>`;
          }
        },
        {
          headerName: 'Closing Value (₹)',
          field: 'close',
          width: 155,
          pinned: 'left',
          filter: 'agNumberColumnFilter',
          cellClass: 'cell-close',
          valueFormatter: (params) => {
            return params.value !== null && params.value !== undefined 
              ? `₹${Number(params.value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
              : '-';
          }
        },
        {
          headerName: 'Daily RSI (14)',
          field: 'rsi',
          width: 185,
          filter: 'agNumberColumnFilter',
          cellRenderer: (params) => {
            const val = params.value;
            if (val === null || val === undefined) return '-';
            const rsiNum = Number(val);
            
            let badgeClass = 'rsi-pill-neutral';
            let label = 'Neutral';

            if (rsiNum >= 70) {
              badgeClass = 'rsi-pill-overbought';
              label = 'Overbought';
            } else if (rsiNum <= 30) {
              badgeClass = 'rsi-pill-oversold';
              label = 'Oversold';
            } else if (rsiNum >= 55) {
              badgeClass = 'rsi-pill-bullish';
              label = 'Bullish';
            }

            return `
              <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                <span class="cell-rsi-badge ${badgeClass}" title="${label}">
                  ${rsiNum.toFixed(2)}
                </span>
                <div style="flex: 1; height: 6px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
                  <div style="width: ${Math.min(100, Math.max(0, rsiNum))}%; height: 100%; background: ${
                    rsiNum >= 70 ? '#dc2626' : rsiNum <= 30 ? '#16a34a' : '#0284c7'
                  }; border-radius: 9999px;"></div>
                </div>
              </div>
            `;
          }
        },
        {
          headerName: 'Change %',
          field: 'changePercent',
          width: 130,
          filter: 'agNumberColumnFilter',
          cellRenderer: (params) => {
            const val = params.value;
            if (val === null || val === undefined) return '-';
            const num = Number(val);
            const isUp = num >= 0;
            const sign = isUp ? '+' : '';
            const cls = isUp ? 'cell-change-up' : 'cell-change-down';
            const arrow = isUp ? '▲' : '▼';
            return `<span class="cell-change-tag ${cls}">${arrow} ${sign}${num.toFixed(2)}%</span>`;
          }
        },
        {
          headerName: 'Change (₹)',
          field: 'changeAmount',
          width: 130,
          filter: 'agNumberColumnFilter',
          cellRenderer: (params) => {
            const val = params.value;
            if (val === null || val === undefined) return '-';
            const num = Number(val);
            const isUp = num >= 0;
            const sign = isUp ? '+' : '';
            const color = isUp ? 'var(--bull-green)' : 'var(--bear-red)';
            return `<span style="color: ${color}; font-weight: 700;">${sign}₹${Math.abs(num).toFixed(2)}</span>`;
          }
        },
        {
          headerName: 'Open (₹)',
          field: 'open',
          width: 120,
          filter: 'agNumberColumnFilter',
          valueFormatter: (p) => p.value ? `₹${Number(p.value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'
        },
        {
          headerName: 'High (₹)',
          field: 'high',
          width: 120,
          filter: 'agNumberColumnFilter',
          valueFormatter: (p) => p.value ? `₹${Number(p.value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'
        },
        {
          headerName: 'Low (₹)',
          field: 'low',
          width: 120,
          filter: 'agNumberColumnFilter',
          valueFormatter: (p) => p.value ? `₹${Number(p.value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'
        },
        {
          headerName: 'Day Range (₹)',
          field: 'dayRange',
          width: 130,
          filter: 'agNumberColumnFilter',
          valueFormatter: (p) => p.value ? `₹${Number(p.value).toFixed(2)}` : '-'
        },
        {
          headerName: 'Volume',
          field: 'volume',
          width: 145,
          filter: 'agNumberColumnFilter',
          cellRenderer: (params) => {
            const val = params.value;
            if (!val) return '-';
            let formatted = val.toLocaleString('en-IN');
            if (val >= 10000000) {
              formatted = `${(val / 10000000).toFixed(2)} Cr`;
            } else if (val >= 100000) {
              formatted = `${(val / 100000).toFixed(2)} Lakh`;
            } else if (val >= 1000) {
              formatted = `${(val / 1000).toFixed(1)} K`;
            }
            return `<span style="color: var(--text-body); font-weight: 600;">${formatted}</span>`;
          }
        },
        {
          headerName: '20-Day SMA (₹)',
          field: 'sma20',
          width: 135,
          filter: 'agNumberColumnFilter',
          valueFormatter: (p) => p.value ? `₹${Number(p.value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'
        },
        {
          headerName: '50-Day SMA (₹)',
          field: 'sma50',
          width: 135,
          filter: 'agNumberColumnFilter',
          valueFormatter: (p) => p.value ? `₹${Number(p.value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'
        },
        {
          headerName: 'Technical Signal',
          field: 'signal',
          width: 195,
          pinned: 'right',
          filter: 'agTextColumnFilter',
          cellRenderer: (params) => {
            const row = params.data;
            if (!row) return '';
            const type = row.signalType || 'neutral';
            const icon = row.signalIcon || '•';
            return `<span class="cell-signal-badge signal-${type}">${icon} ${row.signal || 'Neutral'}</span>`;
          }
        }
      ],

      // Fixed 200px height with smooth internal scrolling as requested
      pagination: false,
      suppressPaginationPanel: true,
      rowSelection: 'single',
      animateRows: true,
      rowData: []
    };

    try {
      if (typeof agGrid !== 'undefined') {
        if (typeof agGrid.createGrid === 'function') {
          this.gridApi = agGrid.createGrid(this.eGridDiv, gridOptions);
        } else if (typeof agGrid.Grid === 'function') {
          new agGrid.Grid(this.eGridDiv, gridOptions);
          this.gridApi = gridOptions.api;
        }
      }
    } catch (err) {
      console.error('Failed to initialize AG Grid:', err);
    }

    this.bindGridControls();
  },

  bindGridControls() {
    const filterInput = document.getElementById('grid-quick-filter');
    if (filterInput) {
      filterInput.addEventListener('input', (e) => {
        if (this.gridApi) {
          if (typeof this.gridApi.setGridOption === 'function') {
            this.gridApi.setGridOption('quickFilterText', e.target.value);
          } else if (typeof this.gridApi.setQuickFilter === 'function') {
            this.gridApi.setQuickFilter(e.target.value);
          }
        }
      });
    }

    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (this.gridApi && typeof this.gridApi.exportDataAsCsv === 'function') {
          const currentSymbol = document.getElementById('stock-symbol-badge')?.textContent || 'INDIAN_STOCK';
          this.gridApi.exportDataAsCsv({
            fileName: `${currentSymbol}_NSE_6Month_Stock_Analytics.csv`
          });
          if (window.showToast) {
            window.showToast(`Exported ${currentSymbol} data to CSV`, 'success');
          }
        }
      });
    }

    const resetBtn = document.getElementById('reset-grid-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (this.gridApi) {
          if (typeof this.gridApi.setFilterModel === 'function') {
            this.gridApi.setFilterModel(null);
          }
          if (typeof this.gridApi.applyColumnState === 'function') {
            this.gridApi.applyColumnState({
              defaultState: { sort: null }
            });
          }
          const filterInput = document.getElementById('grid-quick-filter');
          if (filterInput) {
            filterInput.value = '';
            if (typeof this.gridApi.setGridOption === 'function') {
              this.gridApi.setGridOption('quickFilterText', '');
            } else if (typeof this.gridApi.setQuickFilter === 'function') {
              this.gridApi.setQuickFilter('');
            }
          }
          if (window.showToast) {
            window.showToast('Table filters and sorting reset', 'info');
          }
        }
      });
    }
  },

  updateData(rows) {
    if (!this.gridApi) {
      this.init();
    }

    if (this.gridApi) {
      if (typeof this.gridApi.setGridOption === 'function') {
        this.gridApi.setGridOption('rowData', rows);
      } else if (typeof this.gridApi.setRowData === 'function') {
        this.gridApi.setRowData(rows);
      }

      const countBadge = document.getElementById('grid-row-count-badge');
      if (countBadge) {
        countBadge.textContent = `${rows.length} Trading Sessions`;
      }
    }
  }
};

window.StockGrid = StockGrid;
document.addEventListener('DOMContentLoaded', () => {
  StockGrid.init();
});
