addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const UNUSED_BITS = 1;
const EPOCH_BITS = 45;
const NODE_ID_BITS = 6;
const SEQUENCE_BITS = 12;

const maxNodeId = (1 << NODE_ID_BITS) - 1;
const maxSequence = (1 << SEQUENCE_BITS) - 1;

// Change nodeId if multiple servers are running
const nodeId = 1;
// Custom Epoch (1 January 2020 00:00:00 UTC) in milliseconds, with a 41 bit custom epoch this gives us 69 years
const customEpoch = BigInt(1577836800000);

let lastTimestamp = -1;
let sequence = 0;

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request) {
  const action = request.headers.get('Action') || '';
  if (action === 'Next') {
    return new Response(nextId(), { status: 200 });
  } else if (action === 'Get') {
    const id = BigInt(request.headers.get('Id'));
    return new Response(getTimestamp(id), { status: 200 });
  } else {
    return new Response('No Action provided', { status: 400 });
  }
}

function nextId() {
  const currentTimestamp = BigInt(new Date().getTime()) - customEpoch;

  if (currentTimestamp < lastTimestamp) {
    return new Response('Invalid system clock', { status: 400 });
  }

  if (currentTimestamp == lastTimestamp) {
    sequence = (sequence + 1) & maxSequence;
    if (sequence == 0) {
      // Already have a Snowflake for this millisecond, wait until the next millisecond
      currentTimestamp = waitNextMillis(currentTimestamp);
    }
  } else {
    sequence = 0;
  }

  lastTimestamp = currentTimestamp;

  return currentTimestamp << BigInt(NODE_ID_BITS + SEQUENCE_BITS) | BigInt(nodeId << SEQUENCE_BITS) | BigInt(sequence);
}

function getTimestamp(id) {
  return (id >> BigInt((NODE_ID_BITS + SEQUENCE_BITS))) + customEpoch;
}

function waitNextMillis(currentTimestamp) {
  while (BigInt(currentTimestamp) === BigInt(lastTimestamp)) {
    currentTimestamp = BigInt(new Date().getTime()) - customEpoch;
  }
  return currentTimestamp;
}