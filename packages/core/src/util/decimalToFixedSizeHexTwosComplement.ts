// Convert the decimal number to a hexadecimal string and pad with zeros
const padWithZeros = (hexString: string, targetSize: number): string => {
  while (hexString.length % targetSize !== 0) {
    hexString = '0' + hexString;
  }

  return hexString;
};

/**
 * Converts a decimal number to its two's complement hexadecimal representation with a fixed size.
 * @param decimal The decimal number to be converted.
 * @param size The fixed size of the hexadecimal representation.
 * @return The hexadecimal representation of the decimal number in two's complement.
 */
export function decimalToFixedSizeHexTwosComplement(decimal: number, size = 8): string {
  let hexadecimal: string;

  if (decimal >= 0) {
    hexadecimal = decimal.toString(16);

    return padWithZeros(hexadecimal, size);
  } else {
    hexadecimal = Math.abs(decimal).toString(16);
    hexadecimal = padWithZeros(hexadecimal, size);

    let output = '';

    for (const element of hexadecimal) {
      output += (0x0f - Number.parseInt(element, 16)).toString(16);
    }

    output = (0x01 + Number.parseInt(output, 16)).toString(16);

    return output;
  }
}
