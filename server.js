const express = require('express')
const app = express()
const os = require('os');
const port = 80
const apiRouter = require('./api');

app.get('/', (req, res) => {
    const hostname = os.hostname();
    res.json({
      message: `Hello from Electron! The device is flingable at ${hostname}`,
      hostname: hostname
    });
});

app.get('/flingable', (req, res) => {
    const hostname = os.hostname();
    res.json({
      message: `The device is flingable at ${hostname}`,
      hostname: hostname
    });
});

// Use the API router
app.use('/api', apiRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
});
