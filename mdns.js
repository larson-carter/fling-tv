const bonjour = require('bonjour')();
const os = require('os');

// Advertise the Fling service on port 80
const service = bonjour.publish({
  name: `${os.hostname()}'s Fling`,
  type: 'fling',
  port: 80,
});

service.on('up', () => {
  console.log(`Service ${os.hostname()}'s Fling" is up and running on port 80`);
});

service.on('error', (error) => {
  console.error('Service error:', error);
});

console.log(`Publishing service: ${os.hostname()}'s Fling on port 80`);

// Gracefully shut down the service when the app quits
process.on('exit', () => {
  service.stop(() => {
    console.log('Service stopped');
  });
});

// Additional logging for service details
console.log(`Service details: ${JSON.stringify(service)}`);