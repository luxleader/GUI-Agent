import { readFileSync } from 'node:fs';
import { Ajv } from 'ajv';
import type { Action } from './contracts.ts';

const schema = JSON.parse(readFileSync(new URL('../../../contracts/action.schema.json', import.meta.url), 'utf8'));
const validator = new Ajv({ allErrors: true, strict: true }).compile(schema);
export class ActionValidationError extends Error {}

export function parseAction(input: unknown): Action {
  if (!validator(input)) {
    throw new ActionValidationError(`Invalid action: ${JSON.stringify(validator.errors)}`);
  }
  return structuredClone(input) as Action;
}
