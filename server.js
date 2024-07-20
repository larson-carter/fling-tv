const express = require('express')
const app = express()
const port = 80

app.get('/', (req, res) => {
  res.send('Hello from Electron!')
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
});
