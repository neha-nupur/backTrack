import { buildOptions, assertWriteConfiguration } from './config.js';
import participantJourney from './journey.js';

export const options = buildOptions('smoke');
export function setup() { assertWriteConfiguration(); }
export default participantJourney;
