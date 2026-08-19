import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type SeriesKey =
  | 'Dispatched'
  | 'Activated'
  | 'Delivered'
  | 'AwaitingVendor'
  | 'InTransit'
  | 'FailedReturned';

type WeekDatum = {
  label: string;
  weekEnd: string;
} & Record<SeriesKey, number>;

const seriesOrder: SeriesKey[] = [
  'Dispatched',
  'Activated',
  'Delivered',
  'AwaitingVendor',
  'InTransit',
  'FailedReturned',
];

const seriesConfig: Record<
  SeriesKey,
  { label: string; statLabel: string; color: string; gradientId: string }
> = {
  Dispatched: {
    label: 'Dispatched',
    statLabel: 'Total dispatched',
    color: '#d66f40',
    gradientId: 'bar-gradient-dispatched',
  },
  Activated: {
    label: 'Activated',
    statLabel: 'Activated',
    color: '#d4a85b',
    gradientId: 'bar-gradient-activated',
  },
  Delivered: {
    label: 'Delivered',
    statLabel: 'Delivered',
    color: '#3aa4a0',
    gradientId: 'bar-gradient-delivered',
  },
  AwaitingVendor: {
    label: 'Awaiting Vendor',
    statLabel: 'Awaiting Vendor',
    color: '#6e90a8',
    gradientId: 'bar-gradient-awaiting-vendor',
  },
  InTransit: {
    label: 'In-transit',
    statLabel: 'In-transit',
    color: '#7f86d9',
    gradientId: 'bar-gradient-in-transit',
  },
  FailedReturned: {
    label: 'Failed/Returned',
    statLabel: 'Failed/Returned',
    color: '#c85d6f',
    gradientId: 'bar-gradient-failed-returned',
  },
};

const rangeOptions = [
  { label: 'Today', days: 0 },
  { label: 'This week', days: 7 },
  { label: 'This month', days: 30 },
  { label: 'Last 3 months', days: 90 },
  { label: 'Last year', days: 365 },
];

const recentChartData: WeekDatum[] = [
  {
    label: 'Jul 13–19',
    weekEnd: '2026-07-19',
    Dispatched: 20,
    Activated: 15,
    Delivered: 13,
    AwaitingVendor: 6,
    InTransit: 5,
    FailedReturned: 2,
  },
  {
    label: 'Jul 20–26',
    weekEnd: '2026-07-26',
    Dispatched: 26,
    Activated: 21,
    Delivered: 22,
    AwaitingVendor: 7,
    InTransit: 6,
    FailedReturned: 3,
  },
  {
    label: 'Jul 27–Aug 2',
    weekEnd: '2026-08-02',
    Dispatched: 27,
    Activated: 20,
    Delivered: 21,
    AwaitingVendor: 8,
    InTransit: 7,
    FailedReturned: 3,
  },
  {
    label: 'Aug 3–9',
    weekEnd: '2026-08-09',
    Dispatched: 25,
    Activated: 18,
    Delivered: 19,
    AwaitingVendor: 7,
    InTransit: 6,
    FailedReturned: 4,
  },
  {
    label: 'Aug 10–16',
    weekEnd: '2026-08-16',
    Dispatched: 29,
    Activated: 25,
    Delivered: 23,
    AwaitingVendor: 9,
    InTransit: 8,
    FailedReturned: 4,
  },
  {
    label: 'Aug 17–23',
    weekEnd: '2026-08-23',
    Dispatched: 29,
    Activated: 25,
    Delivered: 23,
    AwaitingVendor: 10,
    InTransit: 8,
    FailedReturned: 5,
  },
];

const historicalChartData: WeekDatum[] = Array.from({ length: 47 }, (_, index) => {
  const weekEnd = new Date('2026-07-12T00:00:00');
  weekEnd.setDate(weekEnd.getDate() - (46 - index) * 7);

  const dispatched = 14 + (index % 8) * 2 + Math.floor(index / 12);
  return {
    label: weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weekEnd: weekEnd.toISOString().split('T')[0],
    Dispatched: dispatched,
    Activated: dispatched - 4,
    Delivered: dispatched - 6,
    AwaitingVendor: 4 + (index % 4),
    InTransit: 3 + (index % 3),
    FailedReturned: 1 + (index % 3),
  };
});

const chartData: WeekDatum[] = [...historicalChartData, ...recentChartData];

function aggregateMonthlyData(data: WeekDatum[]): WeekDatum[] {
  const monthlyData = new Map<string, WeekDatum>();

  data.forEach((entry) => {
    const monthKey = entry.weekEnd.slice(0, 7);
    const existingMonth = monthlyData.get(monthKey);

    if (existingMonth) {
      seriesOrder.forEach((series) => {
        existingMonth[series] += entry[series];
      });
      existingMonth.weekEnd = entry.weekEnd;
      return;
    }

    const monthDate = new Date(`${monthKey}-01T00:00:00`);
    monthlyData.set(monthKey, {
      label: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      weekEnd: entry.weekEnd,
      ...Object.fromEntries(seriesOrder.map((series) => [series, entry[series]])),
    } as WeekDatum);
  });

  return Array.from(monthlyData.values());
}

const BAR_ANIMATION_MS = 560;
const STAT_COUNT_ANIMATION_MS = 700;
const ENABLE_SHINE_SWEEP = false;

function getYAxisMeta(maxValue: number) {
  const safeMax = Math.max(maxValue, 5);
  const withHeadroom = safeMax * 1.15;

  let step = 5;
  if (withHeadroom > 35 && withHeadroom <= 80) step = 10;
  if (withHeadroom > 80) step = 20;

  const actualMax = Math.max(Math.ceil(withHeadroom / step) * step, step * 2);
  const ticks: number[] = [];

  for (let value = 0; value <= actualMax; value += step) {
    ticks.push(value);
  }

  return { max: actualMax, ticks };
}

function FlipNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const startValue = previousValueRef.current;
    const endValue = value;

    if (startValue === endValue) {
      setDisplayValue(endValue);
      return;
    }

    previousValueRef.current = endValue;
    const startedAt = performance.now();
    let frameId = 0;

    const easeOutQuart = (progress: number) => 1 - (1 - progress) ** 4;

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / STAT_COUNT_ANIMATION_MS, 1);
      const easedProgress = easeOutQuart(progress);
      const nextValue = startValue + (endValue - startValue) * easedProgress;

      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [value]);

  return <>{`${Math.round(displayValue)}${suffix}`}</>;
}

const metricIcons: Record<SeriesKey | 'rate', React.ReactNode> = {
  Dispatched: (
    <svg className="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Activated: (
    <svg className="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Delivered: (
    <svg className="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="16 12 12 8 8 12" />
      <line x1="12" y1="16" x2="12" y2="8" />
    </svg>
  ),
  AwaitingVendor: (
    <svg className="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="1" />
      <path d="M12 8v8M8 12h8" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  InTransit: (
    <svg className="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 17h2v2h-2m-16-3l.5-8.5A1 1 0 0 1 4 5h16a1 1 0 0 1 .977.895L20 14M5 21h14a2 2 0 0 0 2-2v-3H3v3a2 2 0 0 0 2 2z" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
    </svg>
  ),
  FailedReturned: (
    <svg className="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  rate: (
    <svg className="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
      <polyline points="9 17 12 14 15 17" />
    </svg>
  ),
};

function App() {
  const [selectedSeries, setSelectedSeries] = useState<SeriesKey[]>(seriesOrder);
  const [range, setRange] = useState('This week');
  const [dateFrom, setDateFrom] = useState(chartData[0].weekEnd);
  const [dateTo, setDateTo] = useState(chartData[chartData.length - 1].weekEnd);
  const [isSeriesDropdownOpen, setIsSeriesDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsSeriesDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const visibleData = useMemo(() => {
    const selectedRange = rangeOptions.find((option) => option.label === range) ?? rangeOptions[1];
    
    // Calculate the date threshold based on the selected range
    const today = new Date('2026-08-18');
    let thresholdDate = new Date(today);
    
    if (selectedRange.days === 0) {
      // Today: filter to today's date only
      thresholdDate.setDate(thresholdDate.getDate() - 1);
    } else {
      // Other ranges: go back the specified number of days
      thresholdDate.setDate(thresholdDate.getDate() - selectedRange.days);
    }
    
    const thresholdDateStr = thresholdDate.toISOString().split('T')[0];
    const from = dateFrom <= dateTo ? dateFrom : dateTo;
    const to = dateFrom <= dateTo ? dateTo : dateFrom;

    const filteredData = chartData.filter(
      (entry) => entry.weekEnd >= thresholdDateStr && entry.weekEnd >= from && entry.weekEnd <= to,
    );

    return selectedRange.label === 'Last year' ? aggregateMonthlyData(filteredData) : filteredData;
  }, [range, dateFrom, dateTo]);

  const visibleSeries = useMemo(
    () => seriesOrder.filter((series) => selectedSeries.includes(series)),
    [selectedSeries],
  );

  const chartSeriesKey = useMemo(() => visibleSeries.join('|'), [visibleSeries]);

  const totals = useMemo(() => {
    const summary = Object.fromEntries(seriesOrder.map((series) => [series, 0])) as Record<
      SeriesKey,
      number
    >;

    visibleData.forEach((entry) => {
      seriesOrder.forEach((series) => {
        summary[series] += entry[series];
      });
    });

    return summary;
  }, [visibleData]);

  const deliveryRate = totals.Dispatched ? (totals.Delivered / totals.Dispatched) * 100 : 0;

  const statItems = useMemo(() => {
    const items: Array<{ label: string; value: number; suffix?: string; key: string }> = [];

    visibleSeries.forEach((series) => {
      items.push({
        label: seriesConfig[series].statLabel,
        value: totals[series],
        key: series,
      });
    });

    items.push({ label: 'Delivery rate', value: Math.round(deliveryRate), suffix: '%', key: 'rate' });

    return items;
  }, [selectedSeries, totals, deliveryRate]);

  const maxVisibleValue = useMemo(() => {
    const allValues = visibleData.flatMap((entry) =>
      visibleSeries.map((series) => entry[series]),
    );

    return allValues.length ? Math.max(...allValues) : 0;
  }, [visibleData, visibleSeries]);

  const yAxisMeta = useMemo(() => getYAxisMeta(maxVisibleValue), [maxVisibleValue]);

  const toggleSeries = (series: SeriesKey) => {
    setSelectedSeries((current) => {
      if (current.includes(series)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== series);
      }
      return [...current, series];
    });
  };

  const selectionLabel = visibleSeries.length
    ? `${visibleSeries.length} selected`
    : 'None selected';

  const renderValueLabel = ({ x, y, width, value }: any) => {
    if (typeof value !== 'number') return null;

    const offset = value >= 10 ? 12 : 10;

    return (
      <text
        x={x + width / 2}
        y={y - offset}
        fill="#2f3b42"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Avenir Next, Segoe UI, Helvetica Neue, Arial, sans-serif' }}
      >
        {value}
      </text>
    );
  };

  const renderGlossyBarShape = (series: SeriesKey) => (props: any) => {
    const { x, y, width, height } = props;

    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      typeof width !== 'number' ||
      typeof height !== 'number' ||
      height <= 0
    ) {
      return null;
    }

    const safeId = `${series}-${x}-${y}`.replace(/[^a-zA-Z0-9-]/g, '-');
    const clipId = `bar-clip-${safeId}`;

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={x} y={y} width={width} height={height} rx={8} ry={8} />
          </clipPath>
        </defs>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={8}
          ry={8}
          fill={`url(#${seriesConfig[series].gradientId})`}
          stroke="rgba(255, 255, 255, 0.38)"
          strokeWidth={1}
        />
        <rect
          x={x + 1}
          y={y + 1}
          width={Math.max(width - 2, 0)}
          height={Math.max(height - 2, 0)}
          rx={7}
          ry={7}
          fill="url(#bar-surface-gloss)"
          opacity={0.28}
        />
        <rect
          x={x + 1}
          y={y + 1}
          width={Math.max(width - 2, 0)}
          height={Math.max(height * 0.28, 0)}
          rx={7}
          ry={7}
          fill="url(#bar-top-sheen)"
          opacity={0.34}
        />
        {ENABLE_SHINE_SWEEP && (
          <g clipPath={`url(#${clipId})`}>
            <rect
              x={x + 1}
              y={y + height}
              width={Math.max(width - 2, 0)}
              height={Math.max(height * 0.5, 0)}
              fill="url(#bar-shine-band)"
              opacity={0.72}
            >
              <animate
                id={`shine-rise-${safeId}`}
                attributeName="y"
                values={`${y + height};${y - height * 0.45}`}
                keyTimes="0;1"
                dur="3.8s"
                begin={`0s;shine-rise-${safeId}.end+0.4s`}
              />
            </rect>
          </g>
        )}
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const tooltipSeries = payload
      .filter((entry: any) => selectedSeries.includes(entry.dataKey))
      .sort(
        (a: any, b: any) =>
          seriesOrder.indexOf(a.dataKey as SeriesKey) - seriesOrder.indexOf(b.dataKey as SeriesKey),
      );

    return (
      <div className="tooltip-card">
        <div className="tooltip-header">{label}</div>
        {tooltipSeries.map((entry: any) => {
          const key = entry.dataKey as SeriesKey;
          return (
            <div key={key} className="tooltip-row">
              <span className="tooltip-label">
                <span
                  className="tooltip-dot"
                  style={{ backgroundColor: seriesConfig[key].color }}
                />
                {seriesConfig[key].label}
              </span>
              <span className="tooltip-value">{entry.value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page-shell">
      <div className="chart-card">
        <div className="chart-header">
          <h2>Dispatch &amp; Activation Performance</h2>
          <p>Weekly activity and delivery completion</p>
        </div>

        <div className="section-label">Filters</div>

        <div className="filters-row" ref={wrapperRef}>
          <div className="filter-card">
            <span className="filter-title">Metric selector</span>
            <div className="select-group">
              <button
                type="button"
                className="dropdown-button"
                onClick={() => {
                  setIsSeriesDropdownOpen((value) => !value);
                }}
              >
                <span>{selectionLabel}</span>
                <span className="caret" aria-hidden="true" />
              </button>

              {isSeriesDropdownOpen && (
                <div className="checklist-menu">
                  {seriesOrder.map((series) => {
                    const checked = selectedSeries.includes(series);
                    return (
                      <button
                        key={series}
                        type="button"
                        className="check-item"
                        onClick={() => toggleSeries(series)}
                      >
                        <span className="check-box-wrap">
                          <span className={`check-box ${checked ? 'is-checked' : ''}`} />
                        </span>
                        <span
                          className="check-dot"
                          style={{ backgroundColor: seriesConfig[series].color }}
                        />
                        <span>{seriesConfig[series].label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="filter-card">
            <span className="filter-title">Date range</span>
            <div className="date-range-filter">
              <label className="date-input-group">
                <span>From</span>
                <input
                  type="date"
                  className="date-input"
                  value={dateFrom}
                  min={chartData[0].weekEnd}
                  max={chartData[chartData.length - 1].weekEnd}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
                <svg className="date-calendar-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </label>
              <label className="date-input-group">
                <span>To</span>
                <input
                  type="date"
                  className="date-input"
                  value={dateTo}
                  min={chartData[0].weekEnd}
                  max={chartData[chartData.length - 1].weekEnd}
                  onChange={(event) => setDateTo(event.target.value)}
                />
                <svg className="date-calendar-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </label>
            </div>
          </div>

          <div className="filter-card">
            <span className="filter-title">Quick filters</span>
            <div className="quick-filters-group">
              {rangeOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className={`quick-filter-button ${range === option.label ? 'is-active' : ''}`}
                  onClick={() => setRange(option.label)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="section-label">Performance Metrics</div>

        <div className="stats-row">
          {statItems.map((item) => {
            const itemKey = item.key as SeriesKey | 'rate';
            const bgColor = itemKey !== 'rate' ? seriesConfig[itemKey as SeriesKey].color : '#818d96';
            
            return (
              <div key={item.key} className="metric-card">
                <div className="metric-header">
                  <div className="metric-icon-badge" style={{ backgroundColor: bgColor }}>
                    {metricIcons[itemKey]}
                  </div>
                  <span className="metric-status-label">{itemKey === 'rate' ? 'Delivery rate' : itemKey === 'AwaitingVendor' ? 'Awaiting vendor' : itemKey === 'FailedReturned' ? 'Failed/returned' : seriesConfig[itemKey as SeriesKey].label}</span>
                </div>
                <div className="metric-value">
                  <FlipNumber value={item.value} suffix={item.suffix} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="section-label">Activity Chart</div>

        <div className="chart-panel">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart
              key={chartSeriesKey}
              data={visibleData}
              margin={{ top: 26, right: 14, bottom: 18, left: 4 }}
              barGap={10}
              barCategoryGap="24%"
            >
              <defs>
                {seriesOrder.map((series) => (
                  <linearGradient
                    key={seriesConfig[series].gradientId}
                    id={seriesConfig[series].gradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={seriesConfig[series].color} stopOpacity={1} />
                    <stop offset="42%" stopColor={seriesConfig[series].color} stopOpacity={0.96} />
                    <stop offset="78%" stopColor={seriesConfig[series].color} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={seriesConfig[series].color} stopOpacity={0.82} />
                  </linearGradient>
                ))}
                <linearGradient id="bar-top-sheen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.52} />
                  <stop offset="52%" stopColor="#ffffff" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bar-surface-gloss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.26} />
                  <stop offset="30%" stopColor="#ffffff" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bar-shine-band" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0} />
                  <stop offset="35%" stopColor="#ffffff" stopOpacity={0.12} />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity={0.76} />
                  <stop offset="68%" stopColor="#ffffff" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#dfe5e9" strokeDasharray="0" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#818d96', fontSize: 12, fontWeight: 500 }}
                dy={10}
                interval={0}
              />
              <YAxis
                domain={[0, yAxisMeta.max]}
                ticks={yAxisMeta.ticks}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#818d96', fontSize: 12 }}
                width={32}
              />
              <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />

              {visibleSeries.map((series) => (
                <Bar
                  key={series}
                  dataKey={series}
                  radius={[8, 8, 0, 0]}
                  shape={renderGlossyBarShape(series)}
                  background={false}
                  isAnimationActive
                  animationBegin={0}
                  animationDuration={BAR_ANIMATION_MS}
                  animationEasing="ease-out"
                >
                  <LabelList dataKey={series} content={renderValueLabel} position="top" />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="legend-row">
          {seriesOrder.map((series) => {
            const isVisible = selectedSeries.includes(series);
            if (!isVisible) return null;

            return (
              <div key={series} className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: seriesConfig[series].color }} />
                <span>{seriesConfig[series].label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
