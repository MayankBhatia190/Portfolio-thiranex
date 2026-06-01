const express = require('express');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.get('/', (req, res) => res.send('Backend running'));
app.listen(port, () => console.log(`Server listening on port ${port}`));
