const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from the weather backend!');
});

app.listen(port, () => {
  console.log(`Weather backend listening at http://localhost:${port}`);
});
