const express = require('express');
const os = require('os');
const path = require('path');
const apiRouter = require('./api'); // Include the API router
const app = express();
const port = 80;

app.use('/hls', express.static(path.join(__dirname, 'hls')));

app.get('/', (req, res) => {
  const hostname = os.hostname();
  res.json({
    message: `The device is flingable at ${hostname}`,
    hostname: hostname
  });
});

// Use the API router
app.use('/api', apiRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


app.get('/flingable', (req, res) => {
    const hostname = os.hostname();
    res.json({
      message: `The device is flingable at ${hostname}`,
      hostname: hostname
    });
});