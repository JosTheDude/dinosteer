import { z } from "zod";
import { ConfirmationRequiredError } from "../../client/errors.js";

export const confirmField = z
  .boolean()
  .default(false)
  .describe("Must be set to true to actually perform this destructive/irreversible action.");

export function assertConfirmed(confirm: boolean | undefined, actionDescription: string): void {
  if (!confirm) {
    throw new ConfirmationRequiredError(actionDescription);
  }
}
