type MetricPayload = Record<string, unknown>;

type MessageMetricEntry = {
  name: string;
  at: number;
  payload?: MetricPayload;
};

const MAX_METRIC_ENTRIES = 200;

const globalMetrics = globalThis as typeof globalThis & {
  __BUHUB_MESSAGE_METRICS__?: MessageMetricEntry[];
};

function getMetricBuffer(): MessageMetricEntry[] {
  if (!Array.isArray(globalMetrics.__BUHUB_MESSAGE_METRICS__)) {
    globalMetrics.__BUHUB_MESSAGE_METRICS__ = [];
  }
  return globalMetrics.__BUHUB_MESSAGE_METRICS__;
}

export function recordMessageMetric(name: string, payload?: MetricPayload) {
  const entry: MessageMetricEntry = {
    name,
    at: Date.now(),
    ...(payload ? { payload } : {}),
  };
  const buffer = getMetricBuffer();
  buffer.push(entry);
  if (buffer.length > MAX_METRIC_ENTRIES) {
    buffer.splice(0, buffer.length - MAX_METRIC_ENTRIES);
  }
  if (__DEV__) {
    console.log('[MessageMetric]', name, payload ?? {});
  }
}

export function recordTimedMessageMetric(
  name: string,
  startedAt: number,
  payload?: MetricPayload
) {
  recordMessageMetric(name, {
    durationMs: Math.max(0, Date.now() - startedAt),
    ...(payload ?? {}),
  });
}

export function getRecentMessageMetrics(): MessageMetricEntry[] {
  return [...getMetricBuffer()];
}
