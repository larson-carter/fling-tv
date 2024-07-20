const express = require('express')
const app = express()
const os = require('os');
const port = 80

app.get('/', (req, res) => {
    const hostname = os.hostname();
    res.json({
      message: `Hello from Electron! The device is flingable at ${hostname}`,
      hostname: hostname
    });
  });

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
});
