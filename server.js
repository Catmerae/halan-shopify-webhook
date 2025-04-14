const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

const HALAN_AUTH_URL = 'http://halan-shipperapi.dispatchex.info/GetAuthToken';
const HALAN_ORDER_URL = 'https://halan-shipperapi.dispatchex.com/api/order/placebulk';

// Получение токена от Halan
async function getHalanToken() {
  const formData = new URLSearchParams();
  formData.append('username', process.env.HALAN_USERNAME);
  formData.append('password', process.env.HALAN_PASSWORD);
  formData.append('grant_type', 'password');
  formData.append('accountnumber', process.env.HALAN_ACCOUNT);

  const response = await axios.post(HALAN_AUTH_URL, formData.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  return response.data.access_token;
}

// Webhook Shopify
app.post('/webhook', async (req, res) => {
  const order = req.body;

  try {
    const token = await getHalanToken();

    const payload = {
      list: [
        {
          RecipientName: order.shipping_address?.name || 'No Name',
          TotalCOG: parseFloat(order.total_price || 0),
          MobileNumber: order.shipping_address?.phone || '0000000000',
          ShipperRef: String(order.id),
          AddressCountry: "UAE",
          City: order.shipping_address?.city || 'Dubai',
          Area: "",
          Street: order.shipping_address?.address1 || '',
          MobileNumber2: order.shipping_address?.phone || '0000000000',
          Remarks: "Auto-imported from Shopify",
          NumberOfPieces: order.line_items.reduce((sum, item) => sum + item.quantity, 0)
        }
      ]
    };

    const halanRes = await axios.post(HALAN_ORDER_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `bearer ${token}`
      }
    });

    console.log('✅ Halan TrackingNos:', halanRes.data);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Error creating Halan order:', err.response?.data || err.message);
    res.sendStatus(500);
  }
});

// Проверка сервера
app.get('/', (req, res) => {
  res.send('🚚 Halan webhook is live.');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
