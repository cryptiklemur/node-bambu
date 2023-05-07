/* eslint-disable @typescript-eslint/ban-ts-comment,@typescript-eslint/no-this-alias,unicorn/no-this-assignment */

import { setTimeout } from 'node:timers/promises';

// Create the debounce function
export function debounce<F extends (...arguments_: any[]) => any>(function_: F, delay: number): F {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  // Create a debounced version of the input function
  const debounced = async (...arguments_: Parameters<F>) => {
    // Cancel the previous timeout if it exists
    if (timeoutId) {
      // @ts-expect-error
      clearTimeout(timeoutId);
    }

    // Create a new timeout and wait for the delay
    timeoutId = setTimeout(delay);

    // Wait for the timeout to resolve
    await timeoutId;

    // Call the original function with the provided arguments
    return function_(...arguments_);
  };

  return debounced as F;
}
