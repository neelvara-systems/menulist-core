# PhoneNumberInput

`PhoneNumberInput` combines an Ant Design country selector with a telephone input. It uses the shared `@lib/phone/phoneNumber` utilities and the local `countryData.ts` catalog; it does not depend on an external phone-number parsing package.

## Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `countryCode` | `string` | Yes | Selected ISO country code. |
| `phoneNumber` | `string` | Yes | Current local or international phone value. |
| `dialCode` | `string` | Yes | Current dial-code fallback. |
| `countryCodeAriaLabel` | `string` | No | Accessible name for the country selector. |
| `phoneNumberAriaLabel` | `string` | No | Accessible name for the telephone input. |
| `onChange` | `(value: { countryCode: string; phoneNumber: string; dialCode: string }) => void` | No | Receives normalized storage fields. |

## Behavior

- Country choices come from `countryData.ts` and are deduplicated by ISO code.
- `normalizePhoneNumberForStorage()` removes unsupported characters, resolves explicit international prefixes, and caps international digits at 15.
- Country changes preserve and normalize the entered local number under the newly selected dial code.
- Validation beyond the shared structural normalization remains the responsibility of the owning form or server boundary.

## Dependencies

- React
- Ant Design
- `react-icons/lu`
- Shared `@lib/phone/phoneNumber` utilities
