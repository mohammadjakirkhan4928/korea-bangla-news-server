const { google } = require('googleapis');
const axios = require('axios');

const credentials = require('path/to/your/credentials.json'); // Replace with your credentials file path
const viewId = 'your-view-id'; // Replace with your Google Analytics view ID

const oauth2Client = new google.auth.OAuth2(
  credentials.web.client_id,
  credentials.web.client_secret,
  credentials.web.redirect_uris[0]
);

oauth2Client.setCredentials({
  access_token: 'your-access-token', // Replace with your access token
  refresh_token: 'your-refresh-token', // Replace with your refresh token
  expiry_date: 'your-expiry-date', // Replace with your expiry date
});

const analyticsreporting = google.analyticsreporting({
  version: 'v4',
  auth: oauth2Client,
});

async function getAnalyticsData() {
  try {
    const response = await analyticsreporting.reports.batchGet({
      requestBody: {
        reportRequests: [
          {
            viewId: viewId,
            dateRanges: [
              {
                startDate: '7daysAgo',
                endDate: 'today',
              },
            ],
            metrics: [
              {
                expression: 'ga:sessions',
              },
              {
                expression: 'ga:users',
              },
            ],
            dimensions: [
              {
                name: 'ga:date',
              },
            ],
            orderBys: [
              {
                fieldName: 'ga:date',
                sortOrder: 'ASCENDING',
              },
            ],
          },
        ],
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching Google Analytics data:', error);
    throw error;
  }
}

module.exports = {
  getAnalyticsData,
};
