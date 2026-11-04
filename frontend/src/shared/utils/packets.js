export const STATE_PACKET_CODE = {
  1: 'FL',
  2: 'IN',
  3: 'GA',
  fl: 'FL',
  in: 'IN',
  ga: 'GA',
  florida: 'FL',
  indiana: 'IN',
  georgia: 'GA',
};

export function packetUrl(code) {
  const safe = STATE_PACKET_CODE[String(code ?? '').trim().toLowerCase()] || STATE_PACKET_CODE[1];
  return `/packets/${safe}-Employment-Packet.pdf`;
}

export const ADMISSION_PACKET_ITEMS = {
  FL: ['Client Admission Record', 'Authorization for Service', 'Plan of Care Overview', 'Home Care Agreement', 'Client Rights Notice'],
  IN: ['Client Admission Record', 'Authorization for Service', 'Plan of Care Overview', 'Home Care Agreement', 'Client Rights Notice'],
  GA: ['Client Admission Record', 'Authorization for Service', 'Plan of Care Overview', 'Home Care Agreement', 'Client Rights Notice'],
};

export function admissionPacketUrl(code) {
  const safe = STATE_PACKET_CODE[String(code ?? '').trim().toLowerCase()] || STATE_PACKET_CODE[1];
  return `/packets/${safe}-Admission-Packet.pdf`;
}
