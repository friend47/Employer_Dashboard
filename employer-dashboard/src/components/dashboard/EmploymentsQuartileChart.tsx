import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

export type EmploymentsQuartileDatum = {
  jobpostId: string;
  label: string;
  jobType: string;
  start: string;
  end: string;
  wage: number;
  employmentCount: number;
  color: string;
};

type EmploymentsQuartileChartProps = {
  data: EmploymentsQuartileDatum[];
  selectedJobpostId: string | null;
  onSelectJobpost: (jobpostId: string) => void;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const axisNumberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatCurrency = (value: number) => currencyFormatter.format(value);

const formatDateLabel = (value: Date, isMobile: boolean) => format(value, isMobile ? "d MMM yy" : "d MMM yyyy");

const isValidDate = (value: Date) => !Number.isNaN(value.getTime());

function getNiceStep(rawStep: number) {
  const safeStep = rawStep <= 0 ? 1 : rawStep;
  const exponent = Math.floor(Math.log10(safeStep));
  const magnitude = 10 ** exponent;
  const normalized = safeStep / magnitude;

  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function createNumberDomain(min: number, max: number, tickCount: number) {
  if (min === max) {
    const padding = min === 0 ? 1 : Math.abs(min) * 0.2;
    min -= padding;
    max += padding;
  }

  const step = getNiceStep((max - min) / Math.max(1, tickCount - 1));
  const domainMin = Math.floor(min / step) * step;
  const domainMax = Math.ceil(max / step) * step;

  return { domainMin, domainMax, step };
}

function createNumberTicks(min: number, max: number, step: number) {
  const ticks: number[] = [];

  for (let value = min; value <= max + step / 2; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }

  return ticks;
}

function createDateTicks(minMs: number, maxMs: number, tickCount: number) {
  if (minMs >= maxMs) return [minMs];

  return Array.from({ length: tickCount }, (_, index) => {
    const ratio = tickCount === 1 ? 0 : index / (tickCount - 1);
    return minMs + (maxMs - minMs) * ratio;
  });
}

function resolveCenters(
  items: Array<{ id: string; desiredY: number }>,
  minY: number,
  maxY: number,
  gap: number,
) {
  const sorted = [...items].sort((a, b) => a.desiredY - b.desiredY);
  const resolved = sorted.map((item) => ({ ...item, y: item.desiredY }));

  for (let index = 0; index < resolved.length; index += 1) {
    const floor = index === 0 ? minY : resolved[index - 1].y + gap;
    resolved[index].y = Math.max(resolved[index].y, floor);
  }

  const lastItem = resolved[resolved.length - 1];
  if (lastItem && lastItem.y > maxY) {
    const overflow = lastItem.y - maxY;
    for (const item of resolved) {
      item.y -= overflow;
    }
  }

  for (let index = resolved.length - 2; index >= 0; index -= 1) {
    resolved[index].y = Math.min(resolved[index].y, resolved[index + 1].y - gap);
  }

  const firstItem = resolved[0];
  if (firstItem && firstItem.y < minY) {
    const underflow = minY - firstItem.y;
    for (const item of resolved) {
      item.y += underflow;
    }
  }

  return new Map(resolved.map((item) => [item.id, clamp(item.y, minY, maxY)]));
}

const EmploymentsQuartileChart = ({
  data,
  selectedJobpostId,
  onSelectJobpost,
}: EmploymentsQuartileChartProps) => {
  const isMobile = useIsMobile();
  const [hoveredJobpostId, setHoveredJobpostId] = useState<string | null>(null);

  const chartState = useMemo(() => {
    const normalized = data
      .map((item) => {
        const startDate = parseISO(item.start);
        const endDate = parseISO(item.end);

        if (!isValidDate(startDate) || !isValidDate(endDate)) {
          return null;
        }

        const startMs = startDate.getTime();
        const endMs = Math.max(endDate.getTime(), startMs + DAY_MS);

        return {
          ...item,
          startDate,
          endDate,
          startMs,
          endMs,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.startMs - b.startMs || a.wage - b.wage);

    if (!normalized.length) {
      return null;
    }

    const minMs = Math.min(...normalized.map((item) => item.startMs));
    const maxMs = Math.max(...normalized.map((item) => item.endMs));
    const safeMaxMs = minMs === maxMs ? maxMs + DAY_MS : maxMs;

    const minWage = Math.min(...normalized.map((item) => item.wage));
    const maxWage = Math.max(...normalized.map((item) => item.wage));
    const padding = maxWage === minWage ? Math.max(1, maxWage * 0.2) : (maxWage - minWage) * 0.18;
    const { domainMin, domainMax, step } = createNumberDomain(Math.max(0, minWage - padding), maxWage + padding, 5);

    const chartWidth = isMobile ? Math.max(760, normalized.length * 140) : Math.max(960, normalized.length * 150);
    const chartHeight = Math.max(isMobile ? 340 : 420, normalized.length * (isMobile ? 66 : 74));
    const margins = {
      top: 24,
      right: 24,
      bottom: 96,
      left: isMobile ? 76 : 96,
    };
    const innerWidth = chartWidth - margins.left - margins.right;
    const innerHeight = chartHeight - margins.top - margins.bottom;
    const barHeight = isMobile ? 16 : 18;
    const minGap = Math.max(barHeight + 14, Math.min(isMobile ? 52 : 60, innerHeight / Math.max(1, normalized.length)));
    const minCenterY = margins.top + barHeight / 2;
    const maxCenterY = margins.top + innerHeight - barHeight / 2;

    const xScale = (value: number) => margins.left + ((value - minMs) / (safeMaxMs - minMs)) * innerWidth;
    const yScale = (value: number) => margins.top + innerHeight - ((value - domainMin) / (domainMax - domainMin)) * innerHeight;

    const resolvedCenters = resolveCenters(
      normalized.map((item) => ({ id: item.jobpostId, desiredY: yScale(item.wage) })),
      minCenterY,
      maxCenterY,
      minGap,
    );

    const plotted = normalized.map((item) => {
      const actualStart = xScale(item.startMs);
      const actualEnd = xScale(item.endMs);
      const width = Math.max(actualEnd - actualStart, isMobile ? 14 : 18);
      const startX = Math.min(actualStart, margins.left + innerWidth - width);
      const centerY = resolvedCenters.get(item.jobpostId) ?? yScale(item.wage);

      return {
        ...item,
        desiredY: yScale(item.wage),
        centerY,
        startX,
        endX: startX + width,
        rectY: centerY - barHeight / 2,
        rectHeight: barHeight,
      };
    });

    return {
      plotted,
      chartWidth,
      chartHeight,
      margins,
      innerWidth,
      innerHeight,
      axisY: margins.top + innerHeight,
      dateTicks: createDateTicks(minMs, safeMaxMs, isMobile ? 4 : 5),
      wageTicks: createNumberTicks(domainMin, domainMax, step),
      xScale,
      yScale,
    };
  }, [data, isMobile]);

  if (!chartState) {
    return null;
  }

  const activeJobpostId = hoveredJobpostId ?? selectedJobpostId ?? chartState.plotted[0]?.jobpostId ?? null;
  const activeItem = chartState.plotted.find((item) => item.jobpostId === activeJobpostId) ?? chartState.plotted[0];
  const rangeIsCompact = activeItem.endX - activeItem.startX < (isMobile ? 140 : 190);
  const startLabelX = clamp(activeItem.startX, chartState.margins.left, chartState.margins.left + chartState.innerWidth - 70);
  const endLabelX = clamp(activeItem.endX, chartState.margins.left + 70, chartState.margins.left + chartState.innerWidth);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-secondary/60 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Selected Jobpost</p>
          <p className="mt-2 text-sm font-semibold text-card-foreground">{activeItem.label}</p>
        </div>
        <div className="rounded-lg bg-secondary/60 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Range</p>
          <p className="mt-2 text-sm font-semibold text-card-foreground">
            {formatDateLabel(activeItem.startDate, isMobile)} - {formatDateLabel(activeItem.endDate, isMobile)}
          </p>
        </div>
        <div className="rounded-lg bg-secondary/60 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Wage / Employments</p>
          <p className="mt-2 text-sm font-semibold text-card-foreground">
            {formatCurrency(activeItem.wage)} / {activeItem.employmentCount} hires
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="overflow-x-auto pb-2">
          <div style={{ minWidth: `${chartState.chartWidth}px` }}>
            <svg viewBox={`0 0 ${chartState.chartWidth} ${chartState.chartHeight}`} className="h-auto w-full">
              <defs>
                <filter id="quartile-bar-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.08" />
                </filter>
              </defs>

              <rect
                x={chartState.margins.left}
                y={chartState.margins.top}
                width={chartState.innerWidth}
                height={chartState.innerHeight}
                rx="18"
                fill="hsl(var(--background))"
              />

              {chartState.wageTicks.map((tick) => {
                const y = chartState.yScale(tick);

                return (
                  <g key={tick}>
                    <line
                      x1={chartState.margins.left}
                      y1={y}
                      x2={chartState.margins.left + chartState.innerWidth}
                      y2={y}
                      stroke="hsl(var(--border))"
                      strokeDasharray="4 6"
                    />
                    <text
                      x={chartState.margins.left - 12}
                      y={y + 4}
                      textAnchor="end"
                      fontSize={isMobile ? 10 : 11}
                      fill="hsl(var(--muted-foreground))"
                    >
                      {axisNumberFormatter.format(tick)}
                    </text>
                  </g>
                );
              })}

              <line
                x1={chartState.margins.left}
                y1={chartState.margins.top}
                x2={chartState.margins.left}
                y2={chartState.axisY}
                stroke="hsl(var(--ring))"
                strokeWidth="2"
              />
              <line
                x1={chartState.margins.left}
                y1={chartState.axisY}
                x2={chartState.margins.left + chartState.innerWidth}
                y2={chartState.axisY}
                stroke="hsl(var(--ring))"
                strokeWidth="2"
              />

              <text
                x={chartState.margins.left - (isMobile ? 58 : 68)}
                y={chartState.margins.top - 6}
                fontSize={isMobile ? 11 : 12}
                fontWeight="600"
                fill="hsl(var(--ring))"
              >
                Agreed Wage
              </text>
              <text
                x={chartState.margins.left + chartState.innerWidth + 6}
                y={chartState.axisY + 6}
                fontSize={isMobile ? 11 : 12}
                fontWeight="600"
                fill="hsl(var(--ring))"
              >
                Date
              </text>

              <line
                x1={chartState.margins.left}
                y1={activeItem.centerY}
                x2={chartState.margins.left + chartState.innerWidth}
                y2={activeItem.centerY}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="8 8"
                opacity="0.25"
              />

              {chartState.plotted.map((item) => {
                const isActive = item.jobpostId === activeItem.jobpostId;

                return (
                  <g
                    key={item.jobpostId}
                    onMouseEnter={() => setHoveredJobpostId(item.jobpostId)}
                    onMouseLeave={() => setHoveredJobpostId(null)}
                    onClick={() => onSelectJobpost(item.jobpostId)}
                    style={{ cursor: "pointer" }}
                  >
                    <rect
                      x={item.startX}
                      y={item.rectY}
                      width={item.endX - item.startX}
                      height={item.rectHeight}
                      rx={item.rectHeight / 2}
                      fill={item.color}
                      opacity={isActive ? 0.95 : 0.68}
                      stroke={isActive ? "hsl(var(--ring))" : "rgba(255,255,255,0.75)"}
                      strokeWidth={isActive ? 2.5 : 1}
                      filter="url(#quartile-bar-shadow)"
                    />
                  </g>
                );
              })}

              <line
                x1={activeItem.startX}
                y1={activeItem.rectY + activeItem.rectHeight}
                x2={activeItem.startX}
                y2={chartState.axisY + 10}
                stroke={activeItem.color}
                strokeWidth="2"
              />
              <line
                x1={activeItem.endX}
                y1={activeItem.rectY + activeItem.rectHeight}
                x2={activeItem.endX}
                y2={chartState.axisY + 10}
                stroke={activeItem.color}
                strokeWidth="2"
              />

              {chartState.dateTicks.map((tick) => {
                const x = chartState.xScale(tick);

                return (
                  <g key={tick}>
                    <line
                      x1={x}
                      y1={chartState.axisY}
                      x2={x}
                      y2={chartState.axisY + 8}
                      stroke="hsl(var(--ring))"
                      strokeWidth="1.5"
                    />
                    <text
                      x={x}
                      y={chartState.axisY + 28}
                      textAnchor="middle"
                      fontSize={isMobile ? 10 : 11}
                      fill="hsl(var(--muted-foreground))"
                    >
                      {formatDateLabel(new Date(tick), isMobile)}
                    </text>
                  </g>
                );
              })}

              {rangeIsCompact ? (
                <text
                  x={(activeItem.startX + activeItem.endX) / 2}
                  y={chartState.axisY + 52}
                  textAnchor="middle"
                  fontSize={isMobile ? 10 : 11}
                  fontWeight="600"
                  fill={activeItem.color}
                >
                  {`${formatDateLabel(activeItem.startDate, isMobile)} - ${formatDateLabel(activeItem.endDate, isMobile)}`}
                </text>
              ) : (
                <>
                  <text
                    x={startLabelX}
                    y={chartState.axisY + 52}
                    textAnchor="start"
                    fontSize={isMobile ? 10 : 11}
                    fontWeight="600"
                    fill={activeItem.color}
                  >
                    {formatDateLabel(activeItem.startDate, isMobile)}
                  </text>
                  <text
                    x={endLabelX}
                    y={chartState.axisY + 52}
                    textAnchor="end"
                    fontSize={isMobile ? 10 : 11}
                    fontWeight="600"
                    fill={activeItem.color}
                  >
                    {formatDateLabel(activeItem.endDate, isMobile)}
                  </text>
                </>
              )}
            </svg>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {chartState.plotted.map((item) => {
            const isActive = item.jobpostId === activeItem.jobpostId;

            return (
              <button
                key={item.jobpostId}
                type="button"
                onClick={() => onSelectJobpost(item.jobpostId)}
                onMouseEnter={() => setHoveredJobpostId(item.jobpostId)}
                onMouseLeave={() => setHoveredJobpostId(null)}
                className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent/50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium text-card-foreground">{item.label}</p>
                    <div className="mt-1 grid gap-1 text-xs text-muted-foreground">
                      <p>{formatDateLabel(item.startDate, isMobile)} - {formatDateLabel(item.endDate, isMobile)}</p>
                      <p>{formatCurrency(item.wage)} / {item.employmentCount} hires</p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EmploymentsQuartileChart;
