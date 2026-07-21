const { BetaAnalyticsDataClient } = require('@google-analytics/data');

function metricValue(report, index) {
  const row = report?.rows?.[0];
  if (!row?.metricValues?.[index]?.value) return 0;
  return parseFloat(row.metricValues[index].value) || 0;
}

function dimensionRows(report, dimIndex, metricIndex, limit) {
  const rows = report?.rows || [];
  return rows.slice(0, limit).map((row) => ({
    label: row.dimensionValues?.[dimIndex]?.value || '(unknown)',
    value: parseFloat(row.metricValues?.[metricIndex]?.value || '0') || 0,
  }));
}

async function fetchSiteAnalytics() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const credsRaw = process.env.GA4_SERVICE_ACCOUNT_JSON;

  if (!propertyId || !credsRaw) {
    return {
      configured: false,
      message:
        'Website analytics not connected yet. Add GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON in Netlify (see SETUP-ANALYTICS.md).',
    };
  }

  let credentials;
  try {
    credentials = JSON.parse(credsRaw);
  } catch {
    return { configured: false, message: 'GA4_SERVICE_ACCOUNT_JSON is invalid JSON.' };
  }

  const client = new BetaAnalyticsDataClient({ credentials });
  const property = `properties/${propertyId}`;

  try {
    const [realtime] = await client.runRealtimeReport({
      property,
      metrics: [{ name: 'activeUsers' }],
    });

    const [overview] = await client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
    });

    const [today] = await client.runReport({
      property,
      dateRanges: [{ startDate: 'today', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
    });

    const [pages] = await client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    });

    const [channels] = await client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    });

    const bounce = metricValue(overview, 3);
    const avgSeconds = metricValue(overview, 4);

    return {
      configured: true,
      liveVisitors: metricValue(realtime, 0),
      today: {
        visitors: metricValue(today, 0),
        pageViews: metricValue(today, 1),
      },
      last30Days: {
        visitors: metricValue(overview, 0),
        sessions: metricValue(overview, 1),
        pageViews: metricValue(overview, 2),
        bounceRate: Math.round(bounce * 10) / 10,
        avgSessionMinutes: Math.round((avgSeconds / 60) * 10) / 10,
      },
      topPages: dimensionRows(pages, 0, 0, 10),
      topChannels: dimensionRows(channels, 0, 0, 8),
    };
  } catch (err) {
    console.error('GA4 fetch failed', err.message);
    return {
      configured: false,
      message:
        'Could not load Google Analytics. Check GA4_PROPERTY_ID, service account access, and that tracking is installed on the site.',
    };
  }
}

module.exports = { fetchSiteAnalytics };
